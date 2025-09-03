import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useToolStore } from '../../stores/toolStore';
import { useDrawingTool } from '../../hooks/useDrawingTool';
import type { Cell } from '../../types';

interface CanvasGridProps {
  className?: string;
}

export const CanvasGrid: React.FC<CanvasGridProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cellSize] = useState(12); // Default cell size in pixels

  const { 
    width, 
    height, 
    cells, 
    getCell
  } = useCanvasStore();

  const { 
    selection,
    startSelection,
    updateSelection,
    clearSelection,
    pushToHistory
  } = useToolStore();

  const { drawAtPosition, drawRectangle, activeTool } = useDrawingTool();

  // Calculate canvas dimensions
  const canvasWidth = width * cellSize;
  const canvasHeight = height * cellSize;

  // Convert mouse coordinates to grid coordinates
  const getGridCoordinates = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const x = Math.floor(mouseX / cellSize);
    const y = Math.floor(mouseY / cellSize);

    return { 
      x: Math.max(0, Math.min(x, width - 1)), 
      y: Math.max(0, Math.min(y, height - 1)) 
    };
  }, [cellSize, width, height]);

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

  // Render the entire grid
  const renderGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw all cells
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = getCell(x, y);
        drawCell(ctx, x, y, cell);
      }
    }

    // Draw selection overlay
    if (selection.active) {
      const startX = Math.min(selection.start.x, selection.end.x);
      const startY = Math.min(selection.start.y, selection.end.y);
      const endX = Math.max(selection.start.x, selection.end.x);
      const endY = Math.max(selection.start.y, selection.end.y);

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
  }, [width, height, cells, selection, cellSize, getCell, drawCell, canvasWidth, canvasHeight]);

  // Handle drawing operations
  const handleDrawing = useCallback((x: number, y: number) => {
    drawAtPosition(x, y);
  }, [drawAtPosition]);

  // Mouse event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGridCoordinates(event);
    
    // Save current state for undo
    pushToHistory(new Map(cells));

    if (activeTool === 'select' || activeTool === 'rectangle') {
      startSelection(x, y);
    } else {
      setIsDrawing(true);
      handleDrawing(x, y);
    }
  }, [getGridCoordinates, activeTool, cells, pushToHistory, startSelection, handleDrawing]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGridCoordinates(event);

    if ((activeTool === 'select' || activeTool === 'rectangle') && selection.start) {
      updateSelection(x, y);
    } else if (isDrawing && (activeTool === 'pencil' || activeTool === 'eraser')) {
      handleDrawing(x, y);
    }
  }, [getGridCoordinates, activeTool, selection, isDrawing, updateSelection, handleDrawing]);

  const handleMouseUp = useCallback(() => {
    // If we were drawing a rectangle, draw it now
    if (activeTool === 'rectangle' && selection.active) {
      drawRectangle(selection.start.x, selection.start.y, selection.end.x, selection.end.y);
      clearSelection();
    }
    
    setIsDrawing(false);
  }, [activeTool, selection, drawRectangle, clearSelection]);

  const handleMouseLeave = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Handle right-click context menu prevention
  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
  }, []);

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

  return (
    <div className={`canvas-grid-container ${className}`}>
      <div className="canvas-wrapper border-2 border-gray-300 rounded-lg overflow-auto max-h-96">
        <canvas
          ref={canvasRef}
          className="canvas-grid cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu}
          style={{
            imageRendering: 'pixelated',
            background: '#FFFFFF'
          }}
        />
      </div>
      
      {/* Canvas info */}
      <div className="mt-2 text-sm text-gray-600 flex justify-between">
        <span>Grid: {width} × {height}</span>
        <span>Cell size: {cellSize}px</span>
      </div>
    </div>
  );
};
