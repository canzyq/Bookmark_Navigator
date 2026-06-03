/**
 * Bridge module for overlay ↔ React communication.
 *
 * This module breaks the circular dependency between:
 *   content/overlay.tsx → ui/App.tsx → content/overlay.tsx
 *
 * overlay.tsx reads callbacks here; App.tsx and SearchInput.tsx
 * write them. No circular imports because neither side imports
 * the other — they both import this shared module.
 */

import type { KeyAction } from './types';

/** Key action handler, registered by App.tsx on mount */
let keyActionHandler: ((action: KeyAction) => void) | null = null;

/** Whether the search input currently contains text */
let searchHasText = false;

/** Unmount callback, set by overlay.tsx on mount */
let unmountCallback: (() => void) | null = null;

export function setKeyActionHandler(handler: ((action: KeyAction) => void) | null) {
  keyActionHandler = handler;
}

export function getKeyActionHandler(): ((action: KeyAction) => void) | null {
  return keyActionHandler;
}

export function setSearchHasText(value: boolean) {
  searchHasText = value;
}

export function getSearchHasText(): boolean {
  return searchHasText;
}

export function setUnmountCallback(cb: (() => void) | null) {
  unmountCallback = cb;
}

export function getUnmountCallback(): (() => void) | null {
  return unmountCallback;
}

/** Reset all bridge state (called on overlay unmount) */
export function resetBridge() {
  keyActionHandler = null;
  searchHasText = false;
  unmountCallback = null;
}