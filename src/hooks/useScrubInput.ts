/**
 * useScrubInput — Figma-style drag-to-scrub behavior for numeric inputs.
 *
 * When the user clicks on numeric input and drags horizontally, the value
 * changes like a slider. The cursor changes to ew-resize and the input
 * doesn't receive focus during the drag.
 *
 * Usage:
 *   const scrub = useScrubInput({ value, onChange, step, min, max });
 *   <input {...scrub.inputProps} />
 *   — OR attach scrub.onMouseDown to a wrapper element
 */

import { useCallback, useRef } from 'react';

interface UseScrubInputOptions {
  /** Current numeric value */
  value: number;
  /** Called with the new value during and after scrub */
  onChange: (value: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  /** Value change per pixel of drag (default: step or 1) */
  sensitivity?: number;
  /** Step size for rounding (default: 1) */
  step?: number;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
}

interface UseScrubInputResult {
  /** Attach to the input or wrapper element's onMouseDown */
  onMouseDown: (e: React.MouseEvent) => void;
}

export function useScrubInput({
  value,
  onChange,
  onScrubStart,
  onScrubEnd,
  sensitivity,
  step = 1,
  min,
  max,
}: UseScrubInputOptions): UseScrubInputResult {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startValue = useRef(0);

  const clamp = useCallback(
    (v: number) => {
      let result = v;
      if (min !== undefined) result = Math.max(min, result);
      if (max !== undefined) result = Math.min(max, result);
      // Round to step
      if (step > 0) {
        result = Math.round(result / step) * step;
        // Fix floating point
        const decimals = step.toString().split('.')[1]?.length ?? 0;
        result = parseFloat(result.toFixed(decimals));
      }
      return result;
    },
    [min, max, step],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only respond to left button
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      const input = target.closest('input') as HTMLInputElement | null;

      // If clicking directly in an input and it's already focused, let normal editing work
      if (input && document.activeElement === input) return;

      e.preventDefault();

      startX.current = e.clientX;
      startValue.current = value;
      isDragging.current = false;

      const pxPerStep = sensitivity ?? (step >= 1 ? 1 : Math.max(1, 1 / step));

      const handleMouseMove = (me: MouseEvent) => {
        const dx = me.clientX - startX.current;
        if (!isDragging.current && Math.abs(dx) < 3) return;

        if (!isDragging.current) {
          isDragging.current = true;
          document.body.style.cursor = 'ew-resize';
          document.body.style.userSelect = 'none';
          // Blur input to prevent text selection during drag
          if (input) input.blur();
          onScrubStart?.();
        }

        const delta = dx / pxPerStep * step;
        const newValue = clamp(startValue.current + delta);
        onChange(newValue);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        if (isDragging.current) {
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          isDragging.current = false;
          onScrubEnd?.();
        } else {
          // No drag — focus the input for direct editing
          if (input) {
            input.focus();
            input.select();
          }
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [value, onChange, onScrubStart, onScrubEnd, sensitivity, step, clamp],
  );

  return { onMouseDown };
}
