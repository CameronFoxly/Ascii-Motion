import React, { useCallback, useEffect } from 'react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useCanvasState } from '../../hooks/useCanvasState';
import { useCanvasMouseHandlers } from '../../hooks/useCanvasMouseHandlers';
import type { Cell } from '../../types';

interface CanvasGridProps {
  className?: string;
}

export const CanvasGrid: React.FC<CanvasGridProps> = ({ className = '' }) => {
  // Use our new context and state management
  const { canvasRef, setMouseButtonDown } = useCanvasContext();
  
  // Get active tool
  const { activeTool } = useToolStore();
  // Canvas dimensions hooks already provide computed values
  const {
    cellSize,
    selectionMode,
    moveState,
    canvasWidth,
    canvasHeight,
    statusMessage,
    getTotalOffset,
    commitMove,
    setSelectionMode,
    setMoveState,
    setPendingSelectionStart,
  } = useCanvasState();

  // Use our new mouse handlers
  const {
    handleMouseDown,
    handleMouseMove, 
    handleMouseUp,
    handleMouseLeave,
    handleContextMenu
  } = useCanvasMouseHandlers();

  const { 
    width, 
    height, 
    cells, 
    getCell
  } = useCanvasStore();

  const { 
    selection,
    clearSelection
  } = useToolStore();

  // Convert mouse coordinates to grid coordinates using our context helper
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
  }, [width, height, cells, selection, cellSize, getCell, drawCell, canvasWidth, canvasHeight, selectionMode, moveState]);

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

  // Handle Escape key for committing moves and clearing selections
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selection.active && activeTool === 'select') {
        event.preventDefault();
        event.stopPropagation();
        
        if (moveState) {
          // Commit move first, then clear selection
          commitMove();
        }
        clearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [moveState, selection.active, activeTool, commitMove, clearSelection]);

  // Reset selection mode when tool changes
  useEffect(() => {
    if (activeTool !== 'select') {
      // Commit any pending move before clearing
      if (moveState) {
        commitMove();
      }
      setSelectionMode('none');
      setMouseButtonDown(false);
      setPendingSelectionStart(null);
      setMoveState(null);
    }
  }, [activeTool, moveState, commitMove]);

  return (
    <div className={`canvas-grid-container ${className}`}>
      <div className="canvas-wrapper border-2 border-gray-300 rounded-lg overflow-auto max-h-96">
        <canvas
          ref={canvasRef}
          className={`canvas-grid ${
            activeTool === 'select' 
              ? 'cursor-crosshair'
              : 'cursor-crosshair'
          }`}
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
        <span>{statusMessage}</span>
      </div>
    </div>
  );
};
