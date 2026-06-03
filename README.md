# Bookmark Navigator

> Vim-style bookmark navigator for Chrome — like Telescope/Raycast for your bookmarks.

![Version](https://img.shields.io/badge/version-0.1.0-blue)

## Features

- **Alt+B** to toggle the overlay on any page
- **Dual-pane UI** — folders on the left, bookmarks on the right
- **Vim-style navigation** — `j`/`k` move up/down, `h`/`l` switch panes
- **Fuzzy search** — press `/` to search across all bookmarks (powered by [Fuse.js](https://fusejs.io/))
- **Instant open** — `Enter` opens in current tab, `Ctrl+Enter` opens in new tab
- **Dark theme** with glassmorphism styling
- **Vimium compatible** — Shadow DOM isolation + focus trap keeps both extensions working

## Keyboard Shortcuts

| Key | Mode | Action |
|---|---|---|
| `Alt+B` | Any | Open / close overlay |
| `j` | Normal | Move down |
| `k` | Normal | Move up |
| `h` | Normal | Focus folder pane |
| `l` | Normal | Focus bookmark pane |
| `g` | Normal | Jump to top |
| `G` | Normal | Jump to bottom |
| `Enter` | Normal | Open bookmark in current tab |
| `Ctrl+Enter` | Normal | Open bookmark in new tab |
| `/` | Normal | Enter search mode |
| `q` | Normal | Close overlay |
| `Ctrl+j` | Search | Move down |
| `Ctrl+k` | Search | Move up |
| `Tab` | Search | Exit search, return to bookmark view |
| `Esc` | Search | Exit search (best-effort; may be intercepted by Vimium) |

## Install

### From Source

1. Clone this repo
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Open Chrome → `chrome://extensions` → enable **Developer mode**
5. Click **Load unpacked** → select the `dist/` folder

## Tech Stack

- **Chrome Extension Manifest V3** — service worker + content scripts
- **React 19** — UI rendering inside Shadow DOM
- **Fuse.js** — fuzzy search
- **Vite** — multi-entry IIFE build for Chrome extension
- **TypeScript** — type-safe throughout

## Project Structure

```
src/
├── background/service-worker.ts   # chrome.bookmarks API, tab management
├── content/
│   ├── overlay.tsx                 # Shadow DOM mount, keyboard capture, Vimium compat
│   ├── overlay.css                 # Dark theme styles (bn- prefixed)
│   └── keyblock.ts                 # Placeholder for key interception
├── shared/
│   ├── types.ts                    # AppState, KeyAction, BookmarkItem, etc.
│   ├── keys.ts                     # parseKeyEvent — keyboard → KeyAction mapping (ESC, Tab, Vim keys)
│   ├── overlay-bridge.ts           # Overlay ↔ React communication (breaks circular dep)
│   ├── bookmark.ts                 # buildBookmarkIndex — flatten bookmark tree
│   ├── search.ts                   # createSearchIndex / searchBookmarks (Fuse.js)
│   └── storage.ts                  # chrome.storage helpers for recent bookmarks
└── ui/
    ├── App.tsx                     # State management, keyboard handler registration
    ├── Overlay.tsx                 # Backdrop container
    ├── SearchInput.tsx             # Fuzzy search input + blur → refocus trap
    ├── FolderPane.tsx              # Folder list with scroll-into-view
    └── BookmarkPane.tsx            # Bookmark list with scroll-into-view
```

## How It Works

1. **Alt+B** triggers `toggleOverlay()` via content script keydown listener + Chrome commands API
2. Overlay mounts inside a **Shadow DOM** for style isolation
3. A hidden `<input>` focus trap forces Vimium into Insert Mode, preventing hjkl conflicts
4. All keyboard events are captured on **`window` in capture phase** (Vimium pattern) — before Vimium or page scripts can intercept them
5. `parseKeyEvent()` maps keys to `KeyAction` objects, forwarded to React via the `overlay-bridge` module
6. Consumed keys get `preventDefault()` + `stopImmediatePropagation()` + a one-shot keyup suppressor (Vimium `consumeKeyup` pattern) to prevent orphan events
7. IME composition events (keyCode 229) are filtered out to avoid false ESC triggers
8. `chrome.bookmarks.getTree()` runs in the background service worker; content script communicates via `chrome.runtime.sendMessage`

## License

MIT