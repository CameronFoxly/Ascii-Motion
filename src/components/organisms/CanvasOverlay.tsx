import React, { useCallback, useEffect } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useCanvasState } from '../../hooks/useCanvasState';

export const CanvasOverlay: React.FC = () => {
  // Canvas context and state
  const { canvasRef, pasteMode } = useCanvasContext();
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

    // Clear previous overlay
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw selection overlay
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

    // Draw paste preview overlay
    if (pasteMode.isActive && pasteMode.preview) {
      const { position, data, bounds } = pasteMode.preview;
      
      // Calculate preview rectangle
      const previewStartX = position.x + bounds.minX;
      const previewStartY = position.y + bounds.minY;
      const previewWidth = bounds.maxX - bounds.minX + 1;
      const previewHeight = bounds.maxY - bounds.minY + 1;

      // Draw paste preview marquee
      ctx.strokeStyle = '#A855F7'; // Purple color
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(
        previewStartX * cellSize,
        previewStartY * cellSize,
        previewWidth * cellSize,
        previewHeight * cellSize
      );

      // Add semi-transparent background
      ctx.fillStyle = 'rgba(168, 85, 247, 0.1)';
      ctx.fillRect(
        previewStartX * cellSize,
        previewStartY * cellSize,
        previewWidth * cellSize,
        previewHeight * cellSize
      );

      ctx.setLineDash([]);

      // Draw paste content preview with transparency
      ctx.globalAlpha = 0.7;
      data.forEach((cell, key) => {
        const [relX, relY] = key.split(',').map(Number);
        const absoluteX = position.x + relX;
        const absoluteY = position.y + relY;
        
        const pixelX = absoluteX * cellSize;
        const pixelY = absoluteY * cellSize;

        // Draw cell background
        if (cell.backgroundColor && cell.backgroundColor !== 'transparent') {
          ctx.fillStyle = cell.backgroundColor;
          ctx.fillRect(pixelX, pixelY, cellSize, cellSize);
        }

        // Draw character
        if (cell.character && cell.character !== ' ') {
          ctx.fillStyle = cell.color || '#000000';
          ctx.font = `${cellSize - 2}px 'Courier New', monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            cell.character, 
            pixelX + cellSize / 2, 
            pixelY + cellSize / 2
          );
        }
      });
      ctx.globalAlpha = 1.0;
    }
  }, [selection, cellSize, moveState, getTotalOffset, canvasRef, pasteMode]);

  // Re-render overlay when dependencies change
  useEffect(() => {
    renderOverlay();
  }, [renderOverlay]);

  return null; // This component only handles overlay rendering logic, no UI
};
