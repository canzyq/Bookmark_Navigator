import type { BookmarkFolder, BookmarkItem } from './types';

/**
 * Convert chrome.bookmarks.BookmarkTreeNode tree into flat Folder/Item structures.
 * Skips the root "Bookmarks Bar" / "Other Bookmarks" containers —
 * their children become top-level folders.
 */
export function buildBookmarkIndex(tree: chrome.bookmarks.BookmarkTreeNode[]): {
  folders: BookmarkFolder[];
  itemsById: Map<string, BookmarkItem>;
  itemsByParentId: Map<string, BookmarkItem[]>;
} {
  const folders: BookmarkFolder[] = [];
  const itemsById = new Map<string, BookmarkItem>();
  const itemsByParentId = new Map<string, BookmarkItem[]>();

  function walk(nodes: chrome.bookmarks.BookmarkTreeNode[]) {
    for (const node of nodes) {
      if (node.url) {
        // Leaf node — a bookmark
        const item: BookmarkItem = {
          id: node.id,
          title: node.title || node.url,
          url: node.url,
          parentId: node.parentId ?? '',
        };
        itemsById.set(item.id, item);
        const siblings = itemsByParentId.get(item.parentId) ?? [];
        siblings.push(item);
        itemsByParentId.set(item.parentId, siblings);
      } else if (node.children) {
        // Folder node
        const folder: BookmarkFolder = {
          id: node.id,
          title: node.title || 'Unnamed Folder',
          children: [],
        };
        // Collect bookmark children
        for (const child of node.children) {
          if (child.url) {
            const item: BookmarkItem = {
              id: child.id,
              title: child.title || child.url,
              url: child.url,
              parentId: child.parentId ?? '',
            };
            folder.children.push(item);
            itemsById.set(item.id, item);
            const siblings = itemsByParentId.get(item.parentId) ?? [];
            siblings.push(item);
            itemsByParentId.set(item.parentId, siblings);
          }
        }
        // Only add non-empty folders
        if (folder.children.length > 0 || node.children.some(c => !c.url)) {
          folders.push(folder);
        }
        // Recurse into sub-folders
        walk(node.children);
      }
    }
  }

  // The root node has 1 child (the actual root). Dive one level deeper
  // to skip the synthetic root and get "Bookmarks Bar" / "Other Bookmarks" directly.
  for (const root of tree) {
    if (root.children) {
      for (const top of root.children) {
        if (top.children) {
          // Each top-level container becomes a folder
          const folder: BookmarkFolder = {
            id: top.id,
            title: top.title || 'Bookmarks',
            children: [],
          };
          for (const child of top.children) {
            if (child.url) {
              const item: BookmarkItem = {
                id: child.id,
                title: child.title || child.url,
                url: child.url,
                parentId: top.id,
              };
              folder.children.push(item);
              itemsById.set(item.id, item);
              const siblings = itemsByParentId.get(top.id) ?? [];
              siblings.push(item);
              itemsByParentId.set(top.id, siblings);
            }
          }
          if (folder.children.length > 0) {
            folders.push(folder);
          }
          // Also walk deeper sub-folders
          walk(top.children);
        }
      }
    }
  }

  return { folders, itemsById, itemsByParentId };
}

/**
 * Fetch bookmarks from Chrome API and build the index.
 */
export async function fetchBookmarks(): Promise<{
  folders: BookmarkFolder[];
  itemsById: Map<string, BookmarkItem>;
  itemsByParentId: Map<string, BookmarkItem[]>;
}> {
  const tree = await chrome.bookmarks.getTree();
  return buildBookmarkIndex(tree);
}
