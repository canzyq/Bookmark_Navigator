import { useEffect, useRef } from 'react';

interface OverlayProps {
  children: React.ReactNode;
  onClose: () => void;
}

export function Overlay({ children, onClose }: OverlayProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) { onClose(); }
  };

  return (
    <div
      ref={backdropRef}
      className="bn-overlay-backdrop"
      onClick={handleBackdropClick}
    >
      <div className="bn-overlay-container">
        {children}
      </div>
    </div>
  );
}