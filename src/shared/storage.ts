import type { StorageData } from './types';

const STORAGE_KEY = 'bookmarkNavData';
const MAX_RECENT = 50;

const DEFAULT_DATA: StorageData = {
  recentBookmarks: [],
};

/**
 * Load storage data from chrome.storage.local.
 * Works in both content script and service worker contexts.
 */
export async function loadStorage(): Promise<StorageData> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as StorageData) ?? { ...DEFAULT_DATA };
}

/**
 * Save storage data to chrome.storage.local.
 */
async function saveStorage(data: StorageData): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

/**
 * Record a bookmark as recently accessed.
 */
export async function recordRecentBookmark(bookmarkId: string): Promise<void> {
  const data = await loadStorage();
  // Remove if already present, then prepend
  data.recentBookmarks = [
    bookmarkId,
    ...data.recentBookmarks.filter(id => id !== bookmarkId),
  ].slice(0, MAX_RECENT);
  await saveStorage(data);
}

/**
 * Get the list of recent bookmark IDs.
 */
export async function getRecentBookmarks(): Promise<string[]> {
  const data = await loadStorage();
  return data.recentBookmarks;
}
