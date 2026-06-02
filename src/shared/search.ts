import Fuse from 'fuse.js';
import type { BookmarkItem, SearchResult } from './types';

/**
 * Build a Fuse.js index over bookmarks for fuzzy search.
 */
export function createSearchIndex(bookmarks: BookmarkItem[]): Fuse<BookmarkItem> {
  return new Fuse(bookmarks, {
    keys: [
      { name: 'title', weight: 0.6 },
      { name: 'url', weight: 0.3 },
    ],
    threshold: 0.4,
    includeScore: true,
  });
}

/**
 * Search bookmarks by query string.
 */
export function searchBookmarks(
  fuse: Fuse<BookmarkItem>,
  query: string
): SearchResult[] {
  if (!query.trim()) return [];
  return fuse.search(query).map(result => ({
    item: result.item,
    score: result.score ?? 1,
  }));
}
