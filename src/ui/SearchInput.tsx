import { useRef, useEffect, useCallback } from 'react';
import { setSearchHasText } from '../shared/overlay-bridge';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  isFocused: boolean;
  onFocusChange: (focused: boolean) => void;
  onExitSearch?: () => void;
}

export function SearchInput({ value, onChange, isFocused, onFocusChange, onExitSearch }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  // ── Handle onChange: sync searchHasText synchronously ──
  // This must be synchronous (not useEffect) so the native key handler
  // sees the correct state when the next keydown fires.
  const handleChange = useCallback((text: string) => {
    setSearchHasText(text.length > 0);
    onChange(text);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    // When search input loses focus, re-focus the hidden focus trap
    // to keep Vimium in Insert Mode
    setTimeout(() => {
      const focusTrap = document.querySelector('#bookmark-navigator-root')
        ?.shadowRoot?.querySelector('.bn-focus-trap');
      if (focusTrap instanceof HTMLElement) {
        focusTrap.focus();
      }
    }, 0);
    onFocusChange(false);
  }, [onFocusChange]);

  // ── ESC / e fallback: handle exit-search directly on the input ──
  // This is a defense-in-depth layer. If Vimium or another handler
  // intercepts ESC at the window capture phase, the native handler
  // won't fire. But if ESC/e does reach this input, we handle it here.
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const isEscape = e.key === 'Escape' && e.keyCode !== 229;
    const isExitKey = e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey;
    if (isEscape || isExitKey) {
      e.preventDefault();
      e.stopPropagation();
      // Sync state before exiting search
      setSearchHasText(false);
      if (onExitSearch) onExitSearch();
    }
  }, [onExitSearch]);

  return (
    <div className="bn-search-wrapper">
      <input
        ref={inputRef}
        type="text"
        className="bn-search-input"
        placeholder="Search bookmarks... (type to filter, Esc to exit)"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => onFocusChange(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}