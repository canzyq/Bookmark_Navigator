// ── Bookmark data types ──

export interface BookmarkFolder {
  id: string;
  title: string;
  children: BookmarkItem[];
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  parentId: string;
}

// ── App state ──

export interface AppState {
  folders: BookmarkFolder[];
  selectedFolderIndex: number;
  bookmarks: BookmarkItem[];
  selectedBookmarkIndex: number;
  focusPane: 'folder' | 'bookmark';
  searchText: string;
  isOpen: boolean;
}

// ── Search result ──

export interface SearchResult {
  item: BookmarkItem;
  score: number;
}

// ── Key action types ──

export type KeyAction =
  | { type: 'moveDown' }
  | { type: 'moveUp' }
  | { type: 'focusLeft' }
  | { type: 'focusRight' }
  | { type: 'openBookmark' }
  | { type: 'openBookmarkNewTab' }
  | { type: 'close' }
  | { type: 'search'; text: string }
  | { type: 'jumpToTop' }
  | { type: 'jumpToBottom' }
  | { type: 'toggleSearch' };

// ── Storage types ──

export interface StorageData {
  recentBookmarks: string[];
}
