import { useEffect, useState } from 'react';

export function useTVNav() {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Basic implementation: focus the nearest element with data-nav property
      const focusable = Array.from(document.querySelectorAll('[data-nav-id]'));
      if (focusable.length === 0) return;

      const currentIndex = focusable.findIndex(el => el === document.activeElement);
      let nextIndex = -1;

      switch (e.key) {
        case 'ArrowRight':
          nextIndex = currentIndex + 1;
          break;
        case 'ArrowLeft':
          nextIndex = currentIndex - 1;
          break;
        case 'ArrowDown':
          // Spatial logic would be better, but for now:
          nextIndex = currentIndex + 4; // Assuming 4 columns
          break;
        case 'ArrowUp':
          nextIndex = currentIndex - 4;
          break;
        case 'Enter':
          (document.activeElement as HTMLElement)?.click();
          break;
        case 'Escape':
        case 'Backspace':
          // Handle back
          break;
      }

      if (nextIndex >= 0 && nextIndex < focusable.length) {
        (focusable[nextIndex] as HTMLElement).focus();
        setFocusedId(focusable[nextIndex].getAttribute('data-nav-id'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { focusedId };
}
