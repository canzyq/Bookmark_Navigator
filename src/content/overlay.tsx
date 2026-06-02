import { createRoot } from 'react-dom/client';
import { App } from '../ui/App';
import overlayCSS from './overlay.css?inline';
import { parseKeyEvent } from '../shared/keys';

let container: HTMLElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;
let focusTrap: HTMLInputElement | null = null;

function handleKeyDown(e: KeyboardEvent) {
  // Check if search input is focused
  const shadow = container?.shadowRoot;
  const active = shadow?.activeElement;
  const isSearchFocused = active?.classList?.contains('bn-search-input') ?? false;

  const action = parseKeyEvent(e, isSearchFocused);
  if (!action) return;

  e.preventDefault();
  e.stopPropagation();

  // Forward to React handler registered on window
  const handler = (window as any).__bookmarkNavKeyHandler;
  if (handler) {
    handler(action);
  }
}

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

  // Hidden input focus trap — Vimium enters Insert Mode when this has focus
  focusTrap = document.createElement('input');
  focusTrap.type = 'text';
  focusTrap.readOnly = true;
  focusTrap.className = 'bn-focus-trap';
  focusTrap.setAttribute('autocomplete', 'off');
  shadowRoot.appendChild(focusTrap);

  // Keyboard events from focusTrap bubble to shadowRoot
  shadowRoot.addEventListener('keydown', handleKeyDown as EventListener, true);

  const appRoot = document.createElement('div');
  shadowRoot.appendChild(appRoot);

  root = createRoot(appRoot);
  root.render(<App />);

  document.body.appendChild(container);
  focusTrap.focus();
}

function unmountOverlay() {
  if (root) { root.unmount(); root = null; }
  if (container) { container.remove(); container = null; }
  focusTrap = null;
}

function toggleOverlay() {
  if (container) { unmountOverlay(); } else { mountOverlay(); }
}

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.altKey && e.key === 'b') {
    e.preventDefault();
    e.stopImmediatePropagation();
    toggleOverlay();
  }
}, true);

chrome.runtime.onMessage.addListener((message: { type: string }) => {
  if (message.type === 'TOGGLE_OVERLAY') { toggleOverlay(); }
});

window.addEventListener('message', (event: MessageEvent) => {
  if (event.data?.type === 'BOOKMARK_NAV_CLOSE') { unmountOverlay(); }
});

console.debug('[BookmarkNav] Content script loaded');
