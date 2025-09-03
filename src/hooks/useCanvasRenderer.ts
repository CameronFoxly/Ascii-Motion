import { useCallback, useEffect } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import { useCanvasContext } from '../contexts/CanvasContext';
import { useCanvasState } from './useCanvasState';
import type { Cell } from '../types';

/**
 * Hook for coordinated canvas rendering
 * Handles both grid rendering and overlay rendering in correct order
 */
export const useCanvasRenderer = () => {
  const { canvasRef } = useCanvasContext();
  const {
    cellSize,
    moveState,
    canvasWidth,
    canvasHeight,
    getTotalOffset,
  } = useCanvasState();

  const { 
    width, 
    height, 
    cells,
    getCell
  } = useCanvasStore();

  const { selection } = useToolStore();

  // Draw a single cell on the canvas
  const drawCell = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, cell?: Cell) => {
    const pixelX = x * cellSize;
    const pixelY = y * cellSize;

    // Draw background
    ctx.fillStyle = cell?.bgColor || '#FFFFFF';
    ctx.fillRect(pixelX, pixelY, cellSize, cellSize);

    // Draw character if present
    if (cell?.char && cell.char !== ' ') {
      ctx.fillStyle = cell.color || '#000000';
      ctx.font = `${cellSize - 2}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        cell.char, 
        pixelX + cellSize / 2, 
        pixelY + cellSize / 2
      );
    }

    // Draw grid lines
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(pixelX, pixelY, cellSize, cellSize);
  }, [cellSize]);

  // Render the entire canvas (grid + overlay)
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Create a set of coordinates that are being moved (to skip in normal rendering)
    const movingCells = new Set<string>();
    if (moveState && moveState.originalData.size > 0) {
      moveState.originalData.forEach((_, key: string) => {
        movingCells.add(key);
      });
    }

    // Draw all cells (excluding cells that are being moved)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = `${x},${y}`;
        
        // Skip cells that are being moved during preview
        if (movingCells.has(key)) {
          // Draw empty cell in original position during move
          drawCell(ctx, x, y, { char: ' ', color: '#000000', bgColor: '#FFFFFF' });
        } else {
          const cell = getCell(x, y);
          drawCell(ctx, x, y, cell);
        }
      }
    }

    // Draw moved cells at their new positions during preview
    if (moveState && moveState.originalData.size > 0) {
      const totalOffset = getTotalOffset(moveState);
      moveState.originalData.forEach((cell: Cell, key: string) => {
        const [origX, origY] = key.split(',').map(Number);
        const newX = origX + totalOffset.x;
        const newY = origY + totalOffset.y;
        
        // Only draw if within bounds
        if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
          drawCell(ctx, newX, newY, cell);
        }
      });
    }

    // Draw selection overlay on top
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
  }, [width, height, cells, getCell, drawCell, canvasWidth, canvasHeight, moveState, getTotalOffset, selection, cellSize, canvasRef]);

  // Re-render when dependencies change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Re-render after resize
    renderCanvas();
  }, [canvasWidth, canvasHeight, renderCanvas]);

  return {
    renderCanvas
  };
};
