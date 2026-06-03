import { createRoot } from 'react-dom/client';
import { App } from '../ui/App';
import overlayCSS from './overlay.css?inline';
import { parseKeyEvent } from '../shared/keys';
import { getKeyActionHandler, getSearchHasText, setUnmountCallback, resetBridge } from '../shared/overlay-bridge';

let container: HTMLElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;
let focusTrap: HTMLInputElement | null = null;
let focusOutHandler: ((e: FocusEvent) => void) | null = null;
let lastToggleTime = 0;

// ── Keyup suppression (Vimium consumeKeyup pattern) ──
// After consuming a keydown, we register a one-shot keyup listener
// that suppresses the matching keyup event. This prevents other
// handlers (Vimium, page scripts) from seeing an orphan keyup.
let keyupSuppressorFn: ((e: KeyboardEvent) => void) | null = null;

function suppressFollowingKeyup(code: string) {
  // Remove any existing keyup suppressor first
  if (keyupSuppressorFn) {
    window.removeEventListener('keyup', keyupSuppressorFn, true);
  }
  const targetCode = code;
  keyupSuppressorFn = (e: KeyboardEvent) => {
    if (e.code === targetCode) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    // One-shot: remove after firing (whether matched or not)
    window.removeEventListener('keyup', keyupSuppressorFn!, true);
    keyupSuppressorFn = null;
  };
  window.addEventListener('keyup', keyupSuppressorFn, true);
}

// ── Overlay lifecycle ──

function mountOverlay() {
  if (container) return;

  container = document.createElement('div');
  container.id = 'bookmark-navigator-root';
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.zIndex = '2147483647';

  const shadowRoot = container.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = overlayCSS;
  shadowRoot.appendChild(style);

  focusTrap = document.createElement('input');
  focusTrap.type = 'text';
  focusTrap.readOnly = true;
  focusTrap.className = 'bn-focus-trap';
  focusTrap.setAttribute('autocomplete', 'off');
  focusTrap.tabIndex = -1;
  shadowRoot.appendChild(focusTrap);

  focusOutHandler = (e: FocusEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && shadowRoot.contains(related)) return;
    setTimeout(() => focusTrap?.focus(), 0);
  };
  shadowRoot.addEventListener('focusout', focusOutHandler as EventListener);

  const appRoot = document.createElement('div');
  shadowRoot.appendChild(appRoot);

  root = createRoot(appRoot);
  root.render(<App />);

  setUnmountCallback(unmountOverlay);

  document.body.appendChild(container);
  requestAnimationFrame(() => focusTrap?.focus());
}

function unmountOverlay() {
  if (focusOutHandler && container?.shadowRoot) {
    container.shadowRoot.removeEventListener('focusout', focusOutHandler as EventListener);
    focusOutHandler = null;
  }
  if (root) { root.unmount(); root = null; }
  if (container) { container.remove(); container = null; }
  focusTrap = null;
  resetBridge();
  // Remove any pending keyup suppressor
  if (keyupSuppressorFn) {
    window.removeEventListener('keyup', keyupSuppressorFn, true);
    keyupSuppressorFn = null;
  }
}

function toggleOverlay() {
  if (container) { unmountOverlay(); } else { mountOverlay(); }
}

// ── Keyboard handling on WINDOW (capture phase) ──
// Vimium registers all key handlers on window in capture phase.
// This is the earliest possible interception point — before any
// document-level or element-level handlers can consume the event.
//
// Event propagation: window capture → document capture → … → target → … → bubble
// By handling everything on window capture, we guarantee that Vimium and
// page scripts cannot eat our keys before we see them.
window.addEventListener('keydown', (e: KeyboardEvent) => {
  // ── Alt+B: toggle overlay ──
  if (e.altKey && e.key === 'b') {
    e.preventDefault();
    e.stopImmediatePropagation();
    suppressFollowingKeyup(e.code);
    toggleOverlay();
    lastToggleTime = Date.now();
    return;
  }

  // ── Only process overlay keys when overlay is open ──
  if (!container) return;

  // ── IME composition: ignore all keys during composition ──
  // Chrome sends keyCode 229 during IME composition. These are not
  // real key presses — they should not trigger any overlay actions.
  if (e.keyCode === 229) return;

  // ── Determine search focus state ──
  const shadow = container.shadowRoot;
  const active = shadow?.activeElement;
  const isSearchFocused = !!(active?.closest?.('.bn-search-wrapper')) ||
    (active?.classList?.contains('bn-search-input') ?? false);

  // ── Parse the key event ──
  const action = parseKeyEvent(e, getSearchHasText(), isSearchFocused);
  if (!action) return; // Normal typing in search input — let it through

  // ── Consume the event (Vimium pattern: preventDefault + stopImmediatePropagation) ──
  e.preventDefault();
  e.stopImmediatePropagation();
  suppressFollowingKeyup(e.code);

  // ── Execute the action ──
  if (action.type === 'close') {
    unmountOverlay();
    return;
  }

  if (action.type === 'exitSearch') {
    // Exit search mode: clear text, re-focus the focus trap
    const handler = getKeyActionHandler();
    if (handler) handler(action);
    setTimeout(() => focusTrap?.focus(), 0);
    return;
  }

  // All other actions: delegate to the React key handler
  const handler = getKeyActionHandler();
  if (handler) handler(action);
}, true);

chrome.runtime.onMessage.addListener((message: { type: string }) => {
  if (message.type === 'TOGGLE_OVERLAY') {
    if (Date.now() - lastToggleTime < 100) return;
    toggleOverlay();
  }
});