import { useState, useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onLongPress: (e: any) => void;
  onClick?: (e: any) => void;
  ms?: number;
}

export default function useLongPress({ onLongPress, onClick, ms = 600 }: UseLongPressOptions) {
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef<any>(null);
  const isLongPressed = useRef(false);
  const hasMoved = useRef(false);
  const initialClientY = useRef(0);
  const initialClientX = useRef(0);

  const start = useCallback((e: any) => {
    e.persist?.();
    isLongPressed.current = false;
    hasMoved.current = false;
    if (e.touches && e.touches.length > 0) {
      initialClientY.current = e.touches[0].clientY;
      initialClientX.current = e.touches[0].clientX;
    }
    setIsHolding(true);
    timerRef.current = setTimeout(() => {
      // Don't trigger long press if user started scrolling/moving
      if (!hasMoved.current) {
        onLongPress(e);
        isLongPressed.current = true;
        setIsHolding(false);
      }
    }, ms);
  }, [onLongPress, ms]);

  const move = useCallback((e: any) => {
    if (e.touches && e.touches.length > 0) {
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      // If drag distance exceeds 20px, consider it a scroll/swipe
      if (Math.abs(currentY - initialClientY.current) > 20 || Math.abs(currentX - initialClientX.current) > 20) {
        hasMoved.current = true;
        setIsHolding(false);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      }
    }
  }, []);

  const stop = useCallback((e: any, isMouseLeave = false) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsHolding(false);
    
    // Trigger click only if:
    // 1. Didn't long press
    // 2. Didn't scroll (hasMoved)
    // 3. Didn't leave target area
    if (!isLongPressed.current && !hasMoved.current && !isMouseLeave && onClick) {
      onClick(e);
    }
    
    hasMoved.current = false; // reset for next interaction
  }, [onClick]);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: (e: any) => stop(e, true), // Prevent click firing when dragging mouse away
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: stop,
    isHolding
  };
}

