import { useLayoutEffect, useRef } from 'react';
import type { BookmarkFolder } from '../shared/types';

interface FolderPaneProps {
  folders: BookmarkFolder[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isFocused: boolean;
}

export function FolderPane({ folders, selectedIndex, onSelect, isFocused }: FolderPaneProps) {
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

  if (folders.length === 0) {
    return (
      <div className="bn-folder-pane">
        <div className="bn-empty">No folders</div>
      </div>
    );
  }

  return (
    <div className={`bn-folder-pane ${isFocused ? 'focused' : ''}`} ref={containerRef}>
      {folders.map((folder, index) => (
        <div
          key={folder.id}
          className={`bn-item bn-folder-item ${index === selectedIndex ? 'selected' : ''}`}
          onClick={() => onSelect(index)}
        >
          {folder.title}
          <span style={{ fontSize: 11, color: '#565f89', marginLeft: 6 }}>
            {folder.children.length}
          </span>
        </div>
      ))}
    </div>
  );
}
