import React, { useCallback, useEffect } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useCanvasState } from '../../hooks/useCanvasState';

export const CanvasOverlay: React.FC = () => {
  // Canvas context and state
  const { canvasRef } = useCanvasContext();
  const {
    cellSize,
    moveState,
    getTotalOffset,
  } = useCanvasState();

  const { selection } = useToolStore();

  // Render selection overlay
  const renderOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Only draw selection overlay if selection is active
    if (selection.active) {
      let startX = Math.min(selection.start.x, selection.end.x);
      let startY = Math.min(selection.start.y, selection.end.y);
      let endX = Math.max(selection.start.x, selection.end.x);
      let endY = Math.max(selection.start.y, selection.end.y);

      // If moving, adjust the marquee position by the move offset
      if (moveState) {
        const totalOffset = getTotalOffset(moveState);
        startX += totalOffset.x;
        startY += totalOffset.y;
        endX += totalOffset.x;
        endY += totalOffset.y;
      }

      // Draw selection rectangle with dashed border
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        startX * cellSize,
        startY * cellSize,
        (endX - startX + 1) * cellSize,
        (endY - startY + 1) * cellSize
      );
      ctx.setLineDash([]);
    }
  }, [selection, cellSize, moveState, getTotalOffset, canvasRef]);

  // Re-render overlay when dependencies change
  useEffect(() => {
    renderOverlay();
  }, [renderOverlay]);

  return null; // This component only handles overlay rendering logic, no UI
};
