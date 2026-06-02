import { useLayoutEffect, useRef } from 'react';
import type { BookmarkItem } from '../shared/types';

interface BookmarkPaneProps {
  bookmarks: BookmarkItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onOpen: (bookmark: BookmarkItem) => void;
  isFocused: boolean;
}

export function BookmarkPane({ bookmarks, selectedIndex, onSelect, onOpen, isFocused }: BookmarkPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // Scroll selected item into view — useLayoutEffect fires synchronously after DOM mutation,
  // and requestAnimationFrame batches rapid j/k presses into one scroll per frame.
  useLayoutEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const items = containerRef.current.querySelectorAll('.bn-item');
      items[selectedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [selectedIndex]);

  if (bookmarks.length === 0) {
    return (
      <div className="bn-bookmark-pane">
        <div className="bn-empty">No bookmarks in this folder</div>
      </div>
    );
  }

  return (
    <div className={`bn-bookmark-pane ${isFocused ? 'focused' : ''}`} ref={containerRef}>
      {bookmarks.map((bookmark, index) => (
        <div
          key={bookmark.id}
          className={`bn-item ${index === selectedIndex ? 'selected' : ''}`}
          onClick={() => onSelect(index)}
          onDoubleClick={() => onOpen(bookmark)}
        >
          <span className="bn-bookmark-title">{bookmark.title}</span>
          <span className="bn-bookmark-url">{bookmark.url}</span>
        </div>
      ))}
    </div>
  );
}