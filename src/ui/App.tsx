import { useState, useEffect, useCallback, useMemo } from 'react';
import type { BookmarkItem, AppState, KeyAction } from '../shared/types';
import { buildBookmarkIndex } from '../shared/bookmark';
import { createSearchIndex, searchBookmarks } from '../shared/search';
import { setKeyActionHandler, getUnmountCallback, setSearchHasText } from '../shared/overlay-bridge';
import { Overlay } from './Overlay';
import { SearchInput } from './SearchInput';
import { FolderPane } from './FolderPane';
import { BookmarkPane } from './BookmarkPane';

const INITIAL_STATE: AppState = {
  folders: [],
  selectedFolderIndex: 0,
  bookmarks: [],
  selectedBookmarkIndex: 0,
  focusPane: 'folder',
  searchText: '',
  isOpen: true,
};

/**
 * Fetch bookmark tree via background service worker.
 * Content scripts cannot access chrome.bookmarks directly.
 */
async function fetchBookmarks(): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
  const response = await chrome.runtime.sendMessage({ type: 'GET_BOOKMARKS' });
  if (!response?.success) {
    throw new Error(response?.error ?? 'Failed to fetch bookmarks');
  }
  return response.data as chrome.bookmarks.BookmarkTreeNode[];
}

export function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchMode, setSearchMode] = useState(false);

  // ── Load bookmarks (via background service worker) ──
  useEffect(() => {
    async function load() {
      try {
        const tree = await fetchBookmarks();
        const { folders } = buildBookmarkIndex(tree);
        const firstFolderBookmarks = folders[0]?.children ?? [];
        setState(s => ({
          ...s,
          folders,
          bookmarks: firstFolderBookmarks as BookmarkItem[],
          selectedFolderIndex: 0,
          selectedBookmarkIndex: 0,
        }));
      } catch (err) {
        console.error('[BookmarkNav] Failed to load bookmarks:', err);
      }
    }
    load();
  }, []);

  // ── Update bookmarks when folder changes ──
  useEffect(() => {
    const folder = state.folders[state.selectedFolderIndex];
    if (folder) {
      setState(s => ({
        ...s,
        bookmarks: folder.children as BookmarkItem[],
        selectedBookmarkIndex: 0,
      }));
    }
  }, [state.selectedFolderIndex, state.folders]);

  // ── Search index ──
  const allBookmarks = useMemo(() => {
    return state.folders.flatMap(f => f.children as BookmarkItem[]);
  }, [state.folders]);

  const fuse = useMemo(() => createSearchIndex(allBookmarks), [allBookmarks]);

  const searchResults = useMemo(() => {
    if (!state.searchText.trim()) return null;
    return searchBookmarks(fuse, state.searchText);
  }, [fuse, state.searchText]);

  // ── Displayed bookmarks ──
  const displayedBookmarks: BookmarkItem[] = searchResults
    ? searchResults.map(r => r.item)
    : state.bookmarks;

  // ── Close overlay ──
  const close = useCallback(() => {
    const unmount = getUnmountCallback();
    if (unmount) unmount();
  }, []);

  // ── Open bookmark (via background service worker) ──
  const openBookmark = useCallback(async (bookmark: BookmarkItem, newTab = false) => {
    if (newTab) {
      chrome.runtime.sendMessage({ type: 'OPEN_NEW_TAB', url: bookmark.url, bookmarkId: bookmark.id });
    } else {
      chrome.runtime.sendMessage({ type: 'OPEN_CURRENT_TAB', url: bookmark.url, bookmarkId: bookmark.id });
    }
    close();
  }, [close]);

  // ── Keyboard handling (called from native shadow-root listener) ──
  const handleKeyAction = useCallback((action: KeyAction) => {
    setState(prev => {
      switch (action.type) {
        case 'moveDown': {
          if (searchMode || searchResults) {
            const max = displayedBookmarks.length - 1;
            return { ...prev, selectedBookmarkIndex: Math.min(prev.selectedBookmarkIndex + 1, max), focusPane: 'bookmark' };
          }
          if (prev.focusPane === 'folder') {
            return { ...prev, selectedFolderIndex: Math.min(prev.selectedFolderIndex + 1, prev.folders.length - 1) };
          }
          return { ...prev, selectedBookmarkIndex: Math.min(prev.selectedBookmarkIndex + 1, (prev.folders[prev.selectedFolderIndex]?.children.length ?? 1) - 1) };
        }
        case 'moveUp': {
          if (searchMode || searchResults) {
            return { ...prev, selectedBookmarkIndex: Math.max(prev.selectedBookmarkIndex - 1, 0), focusPane: 'bookmark' };
          }
          if (prev.focusPane === 'folder') {
            return { ...prev, selectedFolderIndex: Math.max(prev.selectedFolderIndex - 1, 0) };
          }
          return { ...prev, selectedBookmarkIndex: Math.max(prev.selectedBookmarkIndex - 1, 0) };
        }
        case 'focusLeft':
          if (searchMode || searchResults) return prev;
          return { ...prev, focusPane: 'folder' };
        case 'focusRight':
          if (searchMode || searchResults) return prev;
          return { ...prev, focusPane: 'bookmark' };
        case 'openBookmark': {
          const bm = displayedBookmarks[prev.selectedBookmarkIndex];
          if (bm) openBookmark(bm);
          return prev;
        }
        case 'openBookmarkNewTab': {
          const bm2 = displayedBookmarks[prev.selectedBookmarkIndex];
          if (bm2) openBookmark(bm2, true);
          return prev;
        }
        case 'close':
          close();
          return prev;
        case 'exitSearch':
          // Exit search mode: clear text, return focus to focus trap
          // Note: focus trap re-focus is handled by overlay.tsx
          setSearchMode(false);
          setIsSearchFocused(false);
          setSearchHasText(false);
          return { ...prev, searchText: '', selectedBookmarkIndex: 0 };
        case 'jumpToTop':
          if (prev.focusPane === 'folder') {
            return { ...prev, selectedFolderIndex: 0 };
          }
          return { ...prev, selectedBookmarkIndex: 0 };
        case 'jumpToBottom':
          if (prev.focusPane === 'folder') {
            return { ...prev, selectedFolderIndex: prev.folders.length - 1 };
          }
          return { ...prev, selectedBookmarkIndex: displayedBookmarks.length - 1 };
        case 'toggleSearch':
          setSearchMode(m => !m);
          setIsSearchFocused(true);
          return { ...prev, searchText: '', selectedBookmarkIndex: 0 };
        default:
          return prev;
      }
    });
  }, [isSearchFocused, searchMode, searchResults, displayedBookmarks, openBookmark, close]);


  // ── Register native key handler (via exported callback, not window global) ──
  useEffect(() => {
    setKeyActionHandler(handleKeyAction);
    return () => { setKeyActionHandler(null); };
  }, [handleKeyAction]);

  // ── Search text change ──
  const handleSearchChange = useCallback((text: string) => {
    setState(prev => ({ ...prev, searchText: text, selectedBookmarkIndex: 0 }));
    if (text.trim()) {
      setSearchMode(true);
    }
  }, []);

  // ── Exit search: reset to folder/bookmark view ──
  const handleExitSearch = useCallback(() => {
    setSearchMode(false);
    setIsSearchFocused(false);
    setSearchHasText(false);
    setState(prev => ({ ...prev, searchText: '', selectedBookmarkIndex: 0 }));
  }, []);

  return (
    <Overlay onClose={close}>
      <SearchInput
        value={state.searchText}
        onChange={handleSearchChange}
        isFocused={isSearchFocused}
        onFocusChange={setIsSearchFocused}
        onExitSearch={handleExitSearch}
      />
      <div className="bn-panes">
        {searchMode || searchResults ? (
          <BookmarkPane
            bookmarks={displayedBookmarks}
            selectedIndex={state.selectedBookmarkIndex}
            onSelect={i => setState(prev => ({ ...prev, selectedBookmarkIndex: i, focusPane: 'bookmark' }))}
            onOpen={bm => openBookmark(bm)}
            isFocused={true}
          />
        ) : (
          <>
            <FolderPane
              folders={state.folders}
              selectedIndex={state.selectedFolderIndex}
              onSelect={i => setState(prev => ({ ...prev, selectedFolderIndex: i, focusPane: 'folder' }))}
              isFocused={state.focusPane === 'folder'}
            />
            <BookmarkPane
              bookmarks={displayedBookmarks}
              selectedIndex={state.selectedBookmarkIndex}
              onSelect={i => setState(prev => ({ ...prev, selectedBookmarkIndex: i, focusPane: 'bookmark' }))}
              onOpen={bm => openBookmark(bm)}
              isFocused={state.focusPane === 'bookmark'}
            />
          </>
        )}
      </div>
      <div className="bn-hint">
        <span><kbd>j</kbd>/<kbd>k</kbd> Navigate</span>
        <span><kbd>h</kbd>/<kbd>l</kbd> Switch pane</span>
        <span><kbd>Enter</kbd> Open</span>
        <span><kbd>Ctrl+Enter</kbd> New tab</span>
        <span><kbd>/</kbd> Search</span>
        <span><kbd>q</kbd> Close</span>
        <span><kbd>Tab</kbd> Exit search</span>
      </div>
    </Overlay>
  );
}
