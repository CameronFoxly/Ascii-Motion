import { useCallback, useEffect, useMemo } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useCanvasContext } from '../contexts/CanvasContext';
import { useCanvasState } from './useCanvasState';
import { useMemoizedGrid } from './useMemoizedGrid';
import { measureCanvasRender, finishCanvasRender } from '../utils/performance';
import type { Cell } from '../types';

/**
 * Hook for optimized canvas rendering with memoization
 * Implements Step 5.1 performance optimizations:
 * - Memoized font and style calculations
 * - Grid-level change detection
 * - Performance measurement
 */
export const useCanvasRenderer = () => {
  const { canvasRef, pasteMode } = useCanvasContext();
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

  // Use memoized grid for optimized rendering  
  const { selectionData } = useMemoizedGrid(
    moveState,
    getTotalOffset
  );

  // Memoize font and style calculations (Phase B optimization)
  const drawingStyles = useMemo(() => {
    return {
      font: `${cellSize - 2}px 'Courier New', monospace`,
      gridLineColor: '#E5E7EB',
      gridLineWidth: 0.5,
      textAlign: 'center' as CanvasTextAlign,
      textBaseline: 'middle' as CanvasTextBaseline,
      defaultTextColor: '#000000',
      defaultBgColor: '#FFFFFF'
    };
  }, [cellSize]);

  // Optimized drawCell function with memoized styles
  const drawCell = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, cell?: Cell) => {
    const pixelX = x * cellSize;
    const pixelY = y * cellSize;

    // Use pre-computed styles
    const bgColor = cell?.bgColor || drawingStyles.defaultBgColor;
    const textColor = cell?.color || drawingStyles.defaultTextColor;

    // Draw background
    ctx.fillStyle = bgColor;
    ctx.fillRect(pixelX, pixelY, cellSize, cellSize);

    // Draw character if present
    if (cell?.char && cell.char !== ' ') {
      ctx.fillStyle = textColor;
      // Set font once per render batch instead of per cell
      if (ctx.font !== drawingStyles.font) {
        ctx.font = drawingStyles.font;
        ctx.textAlign = drawingStyles.textAlign;
        ctx.textBaseline = drawingStyles.textBaseline;
      }
      ctx.fillText(
        cell.char, 
        pixelX + cellSize / 2, 
        pixelY + cellSize / 2
      );
    }

    // Draw grid lines
    ctx.strokeStyle = drawingStyles.gridLineColor;
    ctx.lineWidth = drawingStyles.gridLineWidth;
    ctx.strokeRect(pixelX, pixelY, cellSize, cellSize);
  }, [cellSize, drawingStyles]);

  // Optimized render function with performance measurement
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Start performance measurement
    measureCanvasRender();

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Set font context once for the entire render batch
    ctx.font = drawingStyles.font;
    ctx.textAlign = drawingStyles.textAlign;
    ctx.textBaseline = drawingStyles.textBaseline;

    // Create a set of coordinates that are being moved (optimized)
    const movingCells = new Set<string>();
    if (moveState && moveState.originalData.size > 0) {
      moveState.originalData.forEach((_, key: string) => {
        movingCells.add(key);
      });
    }

    // Draw static cells (excluding cells being moved)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = `${x},${y}`;
        
        if (movingCells.has(key)) {
          // Draw empty cell in original position during move
          drawCell(ctx, x, y, { 
            char: ' ', 
            color: drawingStyles.defaultTextColor, 
            bgColor: drawingStyles.defaultBgColor 
          });
        } else {
          const cell = getCell(x, y);
          drawCell(ctx, x, y, cell);
        }
      }
    }

    // Draw moved cells at their new positions
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

    // Draw selection overlay
    if (selectionData) {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        selectionData.startX * cellSize,
        selectionData.startY * cellSize,
        selectionData.width * cellSize,
        selectionData.height * cellSize
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
        
        // Only draw if within canvas bounds
        if (absoluteX >= 0 && absoluteX < width && absoluteY >= 0 && absoluteY < height) {
          drawCell(ctx, absoluteX, absoluteY, {
            char: cell.char || ' ',
            color: cell.color || drawingStyles.defaultTextColor,
            bgColor: cell.bgColor || 'transparent'
          });
        }
      });
      ctx.globalAlpha = 1.0;
    }

    // Finish performance measurement
    const totalCells = width * height;
    finishCanvasRender(totalCells);

  }, [
    width, 
    height, 
    cells, 
    getCell, 
    drawCell, 
    canvasWidth, 
    canvasHeight, 
    moveState, 
    getTotalOffset, 
    selectionData, 
    cellSize, 
    canvasRef,
    drawingStyles,
    pasteMode
  ]);

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
