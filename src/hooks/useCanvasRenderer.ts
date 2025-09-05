import { useCallback, useEffect, useMemo } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import { useCanvasContext } from '../contexts/CanvasContext';
import { useCanvasState } from './useCanvasState';
import { useMemoizedGrid } from './useMemoizedGrid';
import { useDrawingTool } from './useDrawingTool';
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
  const { canvasRef, pasteMode, panOffset } = useCanvasContext();
  const {
    effectiveCellSize,
    moveState,
    canvasWidth,
    canvasHeight,
    getTotalOffset,
  } = useCanvasState();

  const { 
    width, 
    height, 
    cells,
    canvasBackgroundColor,
    showGrid,
    getCell
  } = useCanvasStore();

  const { activeTool, rectangleFilled, lassoSelection } = useToolStore();
  const { getEllipsePoints } = useDrawingTool();

  // Use memoized grid for optimized rendering  
  const { selectionData } = useMemoizedGrid(
    moveState,
    getTotalOffset
  );

  // Memoize font and style calculations (Phase B optimization)
  const drawingStyles = useMemo(() => {
    return {
      font: `${effectiveCellSize - 2}px 'Courier New', monospace`,
      gridLineColor: canvasBackgroundColor === '#000000' ? '#333333' : '#E5E7EB',
      gridLineWidth: 0.5,
      textAlign: 'center' as CanvasTextAlign,
      textBaseline: 'middle' as CanvasTextBaseline,
      defaultTextColor: '#FFFFFF',
      defaultBgColor: '#000000'
    };
  }, [effectiveCellSize, canvasBackgroundColor]);

    // Optimized drawCell function with memoized styles
  const drawCell = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, cell: Cell) => {
    const pixelX = x * effectiveCellSize + panOffset.x;
    const pixelY = y * effectiveCellSize + panOffset.y;

    // Draw background (only if different from canvas background)
    if (cell.bgColor && cell.bgColor !== 'transparent' && cell.bgColor !== canvasBackgroundColor) {
      ctx.fillStyle = cell.bgColor;
      ctx.fillRect(pixelX, pixelY, effectiveCellSize, effectiveCellSize);
    }

    // Draw character
    if (cell.char && cell.char !== ' ') {
      ctx.fillStyle = cell.color || drawingStyles.defaultTextColor;
      ctx.font = drawingStyles.font;
      ctx.textAlign = drawingStyles.textAlign;
      ctx.textBaseline = drawingStyles.textBaseline;
      ctx.fillText(
        cell.char, 
        pixelX + effectiveCellSize / 2, 
        pixelY + effectiveCellSize / 2
      );
    }

    // Draw grid lines (only if grid is enabled)
    if (showGrid) {
      ctx.strokeStyle = drawingStyles.gridLineColor;
      ctx.lineWidth = drawingStyles.gridLineWidth;
      ctx.strokeRect(pixelX, pixelY, effectiveCellSize, effectiveCellSize);
    }
  }, [effectiveCellSize, panOffset, canvasBackgroundColor, drawingStyles, showGrid]);

  // Optimized render function with performance measurement
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Start performance measurement
    measureCanvasRender();

    // Clear canvas and fill with background color
    ctx.fillStyle = canvasBackgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

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
          if (cell) {
            drawCell(ctx, x, y, cell);
          }
        }
      }
    }

    // Draw moved cells at their new positions
    if (moveState && moveState.originalData.size > 0) {
      const totalOffset = getTotalOffset(moveState);
      console.log('Renderer: Drawing moved cells with offset:', totalOffset, 'data size:', moveState.originalData.size);
      moveState.originalData.forEach((cell: Cell, key: string) => {
        const [origX, origY] = key.split(',').map(Number);
        const newX = origX + totalOffset.x;
        const newY = origY + totalOffset.y;
        
        console.log('Renderer: Moving cell from', [origX, origY], 'to', [newX, newY]);
        
        // Only draw if within bounds
        if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
          drawCell(ctx, newX, newY, cell);
        }
      });
    }

    // Draw selection overlay
    if (selectionData) {
      if (activeTool === 'ellipse') {
        // Draw ellipse preview with highlighted cells
        const centerX = (selectionData.startX + selectionData.startX + selectionData.width - 1) / 2;
        const centerY = (selectionData.startY + selectionData.startY + selectionData.height - 1) / 2;
        const radiusX = (selectionData.width - 1) / 2;
        const radiusY = (selectionData.height - 1) / 2;

        // Get ellipse points to highlight exactly which cells will be affected
        const ellipsePoints = getEllipsePoints(centerX, centerY, radiusX, radiusY, rectangleFilled);
        
        // Highlight each cell that will be part of the ellipse
        ctx.fillStyle = 'rgba(168, 85, 247, 0.3)'; // Purple highlight
        ellipsePoints.forEach(({ x, y }) => {
          if (x >= 0 && y >= 0 && x < width && y < height) {
            ctx.fillRect(
              x * effectiveCellSize + panOffset.x,
              y * effectiveCellSize + panOffset.y,
              effectiveCellSize,
              effectiveCellSize
            );
          }
        });

        // Draw ellipse outline
        ctx.strokeStyle = '#A855F7'; // Purple border
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        // Draw ellipse path using HTML5 Canvas ellipse method
        ctx.beginPath();
        ctx.ellipse(
          (centerX + 0.5) * effectiveCellSize + panOffset.x,  // center x
          (centerY + 0.5) * effectiveCellSize + panOffset.y,  // center y  
          (radiusX + 0.5) * effectiveCellSize,  // radius x
          (radiusY + 0.5) * effectiveCellSize,  // radius y
          0,                           // rotation
          0,                           // start angle
          2 * Math.PI                  // end angle
        );
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Default rectangle preview for rectangle tool and selection tool
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          selectionData.startX * effectiveCellSize + panOffset.x,
          selectionData.startY * effectiveCellSize + panOffset.y,
          selectionData.width * effectiveCellSize,
          selectionData.height * effectiveCellSize
        );
        ctx.setLineDash([]);
      }
    }

    // Draw lasso selection overlay
    if (lassoSelection.active) {
      if (lassoSelection.isDrawing && lassoSelection.path.length > 1) {
        // Draw the lasso path being drawn
        ctx.strokeStyle = '#A855F7'; // Purple
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        
        ctx.beginPath();
        const firstPoint = lassoSelection.path[0];
        ctx.moveTo(
          (firstPoint.x + 0.5) * effectiveCellSize + panOffset.x,
          (firstPoint.y + 0.5) * effectiveCellSize + panOffset.y
        );
        
        for (let i = 1; i < lassoSelection.path.length; i++) {
          const point = lassoSelection.path[i];
          ctx.lineTo(
            (point.x + 0.5) * effectiveCellSize + panOffset.x,
            (point.y + 0.5) * effectiveCellSize + panOffset.y
          );
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Highlight selected cells
      if (lassoSelection.selectedCells.size > 0) {
        ctx.fillStyle = 'rgba(168, 85, 247, 0.2)'; // Purple highlight with transparency
        
        lassoSelection.selectedCells.forEach(cellKey => {
          const [x, y] = cellKey.split(',').map(Number);
          
          // Apply move offset if in move mode
          let displayX = x;
          let displayY = y;
          if (moveState) {
            const totalOffset = getTotalOffset(moveState);
            displayX = x + totalOffset.x;
            displayY = y + totalOffset.y;
          }
          
          // Only draw if within canvas bounds
          if (displayX >= 0 && displayY >= 0 && displayX < width && displayY < height) {
            ctx.fillRect(
              displayX * effectiveCellSize + panOffset.x,
              displayY * effectiveCellSize + panOffset.y,
              effectiveCellSize,
              effectiveCellSize
            );
          }
        });

        // Draw selection border for completed lasso
        if (!lassoSelection.isDrawing && lassoSelection.path.length > 2) {
          ctx.strokeStyle = '#A855F7'; // Purple border
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          
          ctx.beginPath();
          const firstPoint = lassoSelection.path[0];
          
          // Apply move offset to path if in move mode
          let startX = firstPoint.x;
          let startY = firstPoint.y;
          if (moveState) {
            const totalOffset = getTotalOffset(moveState);
            startX = firstPoint.x + totalOffset.x;
            startY = firstPoint.y + totalOffset.y;
          }
          
          ctx.moveTo(
            (startX + 0.5) * effectiveCellSize + panOffset.x,
            (startY + 0.5) * effectiveCellSize + panOffset.y
          );
          
          for (let i = 1; i < lassoSelection.path.length; i++) {
            const point = lassoSelection.path[i];
            let pathX = point.x;
            let pathY = point.y;
            
            if (moveState) {
              const totalOffset = getTotalOffset(moveState);
              pathX = point.x + totalOffset.x;
              pathY = point.y + totalOffset.y;
            }
            
            ctx.lineTo(
              (pathX + 0.5) * effectiveCellSize + panOffset.x,
              (pathY + 0.5) * effectiveCellSize + panOffset.y
            );
          }
          
          // Close the path
          ctx.closePath();
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
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
        previewStartX * effectiveCellSize + panOffset.x,
        previewStartY * effectiveCellSize + panOffset.y,
        previewWidth * effectiveCellSize,
        previewHeight * effectiveCellSize
      );

      // Add semi-transparent background
      ctx.fillStyle = 'rgba(168, 85, 247, 0.1)';
      ctx.fillRect(
        previewStartX * effectiveCellSize + panOffset.x,
        previewStartY * effectiveCellSize + panOffset.y,
        previewWidth * effectiveCellSize,
        previewHeight * effectiveCellSize
      );

      ctx.setLineDash([]);

      // Draw paste content preview with transparency
      ctx.globalAlpha = 0.85; // Make preview more visible
      data.forEach((cell, key) => {
        const [relX, relY] = key.split(',').map(Number);
        const absoluteX = position.x + relX;
        const absoluteY = position.y + relY;
        
        // Only draw if within canvas bounds
        if (absoluteX >= 0 && absoluteX < width && absoluteY >= 0 && absoluteY < height) {
          // Draw the actual cell content
          drawCell(ctx, absoluteX, absoluteY, {
            char: cell.char || ' ',
            color: cell.color || drawingStyles.defaultTextColor,
            bgColor: cell.bgColor || 'transparent'
          });
          
          // Add a subtle highlight border around preview cells
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(
            absoluteX * effectiveCellSize + panOffset.x, 
            absoluteY * effectiveCellSize + panOffset.y, 
            effectiveCellSize, 
            effectiveCellSize
          );
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
    effectiveCellSize,
    panOffset,
    canvasRef,
    drawingStyles,
    pasteMode,
    activeTool,
    getEllipsePoints,
    rectangleFilled,
    canvasBackgroundColor,
    showGrid,
    lassoSelection
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
