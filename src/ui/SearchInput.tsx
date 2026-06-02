import { useRef, useEffect, useCallback } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  isFocused: boolean;
  onFocusChange: (focused: boolean) => void;
}

export function SearchInput({ value, onChange, isFocused, onFocusChange }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  const handleBlur = useCallback(() => {
    // When search input loses focus, re-focus the hidden focus trap
    // to keep Vimium in Insert Mode
    setTimeout(() => {
      const focusTrap = document.querySelector('#bookmark-navigator-root')?.shadowRoot?.querySelector('input[data-vimium]');
      if (focusTrap instanceof HTMLElement) {
        focusTrap.focus();
      }
    }, 0);
    onFocusChange(false);
  }, [onFocusChange]);

  return (
    <div className="bn-search-wrapper">
      <input
        ref={inputRef}
        type="text"
        className="bn-search-input"
        placeholder="Search bookmarks... (type to filter, Esc to close)"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => onFocusChange(true)}
        onBlur={handleBlur}
      />
    </div>
  );
}
