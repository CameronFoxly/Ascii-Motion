import React, { useCallback, useEffect } from 'react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useCanvasState } from '../../hooks/useCanvasState';
import type { Cell } from '../../types';

export const CanvasRenderer: React.FC = () => {
  // Canvas context and state
  const { canvasRef } = useCanvasContext();
  const {
    cellSize,
    moveState,
    canvasWidth,
    canvasHeight,
    getTotalOffset,
  } = useCanvasState();

  // Canvas store data
  const { 
    width, 
    height, 
    canvasBackgroundColor,
    showGrid,
    getCell
  } = useCanvasStore();

  // Draw a single cell on the canvas
  const drawCell = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, cell?: Cell) => {
    const pixelX = x * cellSize;
    const pixelY = y * cellSize;

    // Only draw cell background if it's not the default transparent background
    if (cell && cell.bgColor !== 'transparent' && cell.bgColor !== '#FFFFFF') {
      ctx.fillStyle = cell.bgColor;
      ctx.fillRect(pixelX, pixelY, cellSize, cellSize);
    }

    // Draw character if present
    if (cell?.char && cell.char !== ' ') {
      ctx.fillStyle = cell.color || '#FFFFFF';
      ctx.font = `${cellSize - 2}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        cell.char, 
        pixelX + cellSize / 2, 
        pixelY + cellSize / 2
      );
    }

    // Draw grid lines only if grid is visible
    if (showGrid) {
      ctx.strokeStyle = canvasBackgroundColor === '#000000' ? '#333333' : '#E5E7EB';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(pixelX, pixelY, cellSize, cellSize);
    }
  }, [cellSize, canvasBackgroundColor, showGrid]);

  // Render the entire grid
  const renderGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas and fill with background color
    ctx.fillStyle = canvasBackgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Create a set of coordinates that are being moved (to skip in normal rendering)
    const movingCells = new Set<string>();
    if (moveState && moveState.originalData.size > 0) {
      moveState.originalData.forEach((_, key) => {
        movingCells.add(key);
      });
    }

    // Draw all cells (excluding cells that are being moved)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = `${x},${y}`;
        
        // Skip cells that are being moved during preview
        if (movingCells.has(key)) {
          // Draw empty cell in original position during move (use default black background)
          drawCell(ctx, x, y, { char: ' ', color: '#FFFFFF', bgColor: '#000000' });
        } else {
          const cell = getCell(x, y);
          drawCell(ctx, x, y, cell);
        }
      }
    }

    // Draw moved cells at their new positions during preview
    if (moveState && moveState.originalData.size > 0) {
      const totalOffset = getTotalOffset(moveState);
      moveState.originalData.forEach((cell, key) => {
        const [origX, origY] = key.split(',').map(Number);
        const newX = origX + totalOffset.x;
        const newY = origY + totalOffset.y;
        
        // Only draw if within bounds
        if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
          drawCell(ctx, newX, newY, cell);
        }
      });
    }
  }, [width, height, getCell, drawCell, canvasWidth, canvasHeight, moveState, getTotalOffset, canvasBackgroundColor, showGrid]);

  // Re-render when dependencies change
  useEffect(() => {
    renderGrid();
  }, [renderGrid]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Re-render after resize
    renderGrid();
  }, [canvasWidth, canvasHeight, renderGrid]);

  return null; // This component only handles rendering logic, no UI
};
