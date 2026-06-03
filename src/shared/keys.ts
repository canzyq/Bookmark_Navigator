import type { KeyAction } from './types';

/** Minimal keyboard event interface — works with both DOM and React keyboard events */
export interface KeyEventLike {
  key: string;
  keyCode: number;
  altKey: boolean;
  ctrlKey: boolean;
  preventDefault(): void;
}

/** IME composition keyCode — Chrome sends keyCode 229 during IME composition.
 *  These are not real key presses and must be ignored (Vimium does the same). */
const IME_KEY_CODE = 229;

/**
 * Check if a keyboard event represents a real Escape press.
 * Filters out IME composition events (keyCode 229).
 */
export function isEscape(e: KeyEventLike): boolean {
  return e.key === 'Escape' && e.keyCode !== IME_KEY_CODE;
}

/**
 * Parse keyboard events into KeyActions for Vim-style navigation.
 *
 * Key mappings:
 * - q (normal mode)       → close overlay
 * - Escape (search has text) → exitSearch (clear text, return to bookmark view)
 * - Escape (search empty)   → close overlay (best-effort; may be intercepted by Vimium)
 * - IME composition ESC (keyCode 229) is ignored
 *
 * @param hasSearchText Whether the search input currently contains text
 * @param isSearchFocused Whether the search input currently has focus
 */
export function parseKeyEvent(
  e: KeyEventLike,
  hasSearchText: boolean,
  isSearchFocused: boolean,
): KeyAction | null {
  // ── ESC: exit search or close overlay ──
  if (isEscape(e)) {
    if (hasSearchText) return { type: 'exitSearch' };
    return { type: 'close' };
  }

  // ── Search-focused mode: Tab exits search, Ctrl+j/k navigate ──
  if (isSearchFocused) {
    if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) { e.preventDefault(); return { type: 'exitSearch' }; }
    if (e.ctrlKey && e.key === 'j') { e.preventDefault(); return { type: 'moveDown' }; }
    if (e.ctrlKey && e.key === 'k') { e.preventDefault(); return { type: 'moveUp' }; }
    return null; // Let normal typing through
  }

  // ── Normal mode: vim-style keys ──
  switch (e.key) {
    case 'q': return { type: 'close' };
    case 'j': return { type: 'moveDown' };
    case 'k': return { type: 'moveUp' };
    case 'h': return { type: 'focusLeft' };
    case 'l': return { type: 'focusRight' };
    case 'Enter': return e.ctrlKey ? { type: 'openBookmarkNewTab' } : { type: 'openBookmark' };
    case '/': e.preventDefault(); return { type: 'toggleSearch' };
    case 'g': return { type: 'jumpToTop' };
    case 'G': return { type: 'jumpToBottom' };
    default: return null;
  }
}
