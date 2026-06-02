import type { KeyAction } from './types';

/** Minimal keyboard event interface — works with both DOM and React keyboard events */
interface KeyEventLike {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  preventDefault(): void;
}

/**
 * Parse keyboard events into KeyActions for Vim-style navigation.
 */
export function parseKeyEvent(
  e: KeyEventLike,
  isSearchFocused: boolean
): KeyAction | null {
  if (isSearchFocused) {
    if (e.key === 'Escape') return { type: 'close' };
    if (e.ctrlKey && e.key === 'j') { e.preventDefault(); return { type: 'moveDown' }; }
    if (e.ctrlKey && e.key === 'k') { e.preventDefault(); return { type: 'moveUp' }; }
    return null;
  }

  switch (e.key) {
    case 'j': return { type: 'moveDown' };
    case 'k': return { type: 'moveUp' };
    case 'h': return { type: 'focusLeft' };
    case 'l': return { type: 'focusRight' };
    case 'Enter': return e.ctrlKey ? { type: 'openBookmarkNewTab' } : { type: 'openBookmark' };
    case 'Escape': return { type: 'close' };
    case '/': e.preventDefault(); return { type: 'toggleSearch' };
    case 'g': return { type: 'jumpToTop' };
    case 'G': return { type: 'jumpToBottom' };
    default: return null;
  }
}
