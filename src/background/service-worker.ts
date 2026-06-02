/**
 * Background Service Worker for Bookmark Navigator.
 * 
 * - Listens for Alt+B command
 * - Sends toggle message to the active tab's content script
 * - Handles tab operations (open in current/new tab)
 * - Returns bookmark tree data to content script
 * - Records recent bookmarks in chrome.storage
 * - Caches bookmark tree on install for fast access
 */

import { recordRecentBookmark } from '../shared/storage';

// Cache bookmarks on extension install/start
chrome.runtime.onInstalled.addListener(() => {
  console.debug('[BookmarkNav] Extension installed, caching bookmarks...');
  cacheBookmarks();
});

chrome.runtime.onStartup.addListener(() => {
  console.debug('[BookmarkNav] Browser started, caching bookmarks...');
  cacheBookmarks();
});

async function cacheBookmarks() {
  try {
    const tree = await chrome.bookmarks.getTree();
    await chrome.storage.local.set({ bookmarkCache: tree });
  } catch (err) {
    console.error('[BookmarkNav] Failed to cache bookmarks:', err);
  }
}

// Listen for the keyboard shortcut command
chrome.commands.onCommand.addListener((command: string) => {
  if (command === 'open-bookmark-navigator') {
    toggleOverlay();
  }
});

async function toggleOverlay() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    // Send toggle message to content script
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' });
  } catch (err) {
    console.debug('[BookmarkNav] Could not send toggle message. Content script may not be loaded yet.');
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message: { type: string; url?: string; bookmarkId?: string }, _sender, sendResponse) => {
  if (message.type === 'GET_BOOKMARKS') {
    // Content script requests bookmark data
    chrome.bookmarks.getTree()
      .then(tree => {
        sendResponse({ success: true, data: tree });
      })
      .catch(err => {
        console.error('[BookmarkNav] Failed to get bookmarks:', err);
        sendResponse({ success: false, error: String(err) });
      });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'OPEN_CURRENT_TAB' && message.url) {
    chrome.tabs.update({ url: message.url });
    if (message.bookmarkId) recordRecentBookmark(message.bookmarkId);
    sendResponse({ success: true });
  } else if (message.type === 'OPEN_NEW_TAB' && message.url) {
    chrome.tabs.create({ url: message.url, active: true });
    if (message.bookmarkId) recordRecentBookmark(message.bookmarkId);
    sendResponse({ success: true });
  } else if (message.type === 'RECORD_RECENT' && message.bookmarkId) {
    recordRecentBookmark(message.bookmarkId)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: String(err) }));
    return true;
  }
  return true; // Keep message channel open for async response
});

// Listen for bookmark changes and update cache
chrome.bookmarks.onCreated.addListener(() => cacheBookmarks());
chrome.bookmarks.onRemoved.addListener(() => cacheBookmarks());
chrome.bookmarks.onChanged.addListener(() => cacheBookmarks());
chrome.bookmarks.onMoved.addListener(() => cacheBookmarks());
