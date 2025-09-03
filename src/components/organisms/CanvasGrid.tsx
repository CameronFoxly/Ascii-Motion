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
  const [selectionMode, setSelectionMode] = useState<'none' | 'dragging' | 'moving'>('none');
  const [mouseButtonDown, setMouseButtonDown] = useState(false);
  const [pendingSelectionStart, setPendingSelectionStart] = useState<{x: number, y: number} | null>(null);
  const [moveState, setMoveState] = useState<{
    originalData: Map<string, Cell>;
    startPos: {x: number, y: number};
    offset: {x: number, y: number};
  } | null>(null);

  const { 
    width, 
    height, 
    cells, 
    getCell,
    setCell
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

  // Check if a point is inside the current selection
  const isPointInSelection = useCallback((x: number, y: number) => {
    if (!selection.active) return false;
    
    const startX = Math.min(selection.start.x, selection.end.x);
    const endX = Math.max(selection.start.x, selection.end.x);
    const startY = Math.min(selection.start.y, selection.end.y);
    const endY = Math.max(selection.start.y, selection.end.y);
    
    return x >= startX && x <= endX && y >= startY && y <= endY;
  }, [selection]);

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
    if (selectionMode === 'moving' && moveState) {
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
    if (selectionMode === 'moving' && moveState && moveState.originalData.size > 0) {
      moveState.originalData.forEach((cell, key) => {
        const [origX, origY] = key.split(',').map(Number);
        const newX = origX + moveState.offset.x;
        const newY = origY + moveState.offset.y;
        
        // Only draw if within bounds
        if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
          drawCell(ctx, newX, newY, cell);
        }
      });
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
  }, [width, height, cells, selection, cellSize, getCell, drawCell, canvasWidth, canvasHeight, selectionMode, moveState]);

  // Handle drawing operations
  const handleDrawing = useCallback((x: number, y: number) => {
    drawAtPosition(x, y);
  }, [drawAtPosition]);

  // Mouse event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGridCoordinates(event);
    
    // Save current state for undo
    pushToHistory(new Map(cells));

    if (activeTool === 'select') {
      if (selection.active && isPointInSelection(x, y) && !event.shiftKey) {
        // Click inside existing selection - enter move mode
        const startX = Math.min(selection.start.x, selection.end.x);
        const endX = Math.max(selection.start.x, selection.end.x);
        const startY = Math.min(selection.start.y, selection.end.y);
        const endY = Math.max(selection.start.y, selection.end.y);
        
        // Store only the non-empty cells from the selection
        const originalData = new Map<string, Cell>();
        for (let cy = startY; cy <= endY; cy++) {
          for (let cx = startX; cx <= endX; cx++) {
            const cell = getCell(cx, cy);
            // Only store non-empty cells (not spaces or empty cells)
            if (cell && cell.char && cell.char.trim() !== '') {
              originalData.set(`${cx},${cy}`, { ...cell });
            }
          }
        }
        
        setMoveState({
          originalData,
          startPos: { x, y },
          offset: { x: 0, y: 0 }
        });
        setSelectionMode('moving');
        setMouseButtonDown(true);
      } else if (event.shiftKey && pendingSelectionStart) {
        // Shift+Click with pending start: create selection from start to current position
        startSelection(pendingSelectionStart.x, pendingSelectionStart.y);
        updateSelection(x, y);
        setPendingSelectionStart(null);
      } else {
        // Normal click: select single cell and set as pending start for potential Shift+Click
        startSelection(x, y);
        setPendingSelectionStart({ x, y });
        setMouseButtonDown(true);
      }
    } else if (activeTool === 'rectangle') {
      startSelection(x, y);
      setSelectionMode('dragging');
      setMouseButtonDown(true);
    } else {
      setIsDrawing(true);
      handleDrawing(x, y);
    }
  }, [getGridCoordinates, activeTool, cells, pushToHistory, startSelection, updateSelection, handleDrawing, pendingSelectionStart, selection, isPointInSelection, getCell]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGridCoordinates(event);

    if (activeTool === 'select') {
      if (selectionMode === 'moving' && moveState) {
        // Update the move offset for preview only - don't modify canvas yet
        const newOffset = {
          x: x - moveState.startPos.x,
          y: y - moveState.startPos.y
        };
        setMoveState({
          ...moveState,
          offset: newOffset
        });
        // Note: Canvas modification happens in renderGrid for preview, actual move on mouse release
      } else if (mouseButtonDown && selection.active && pendingSelectionStart) {
        // Mouse button is down and we have a pending selection start - switch to drag mode
        if (x !== pendingSelectionStart.x || y !== pendingSelectionStart.y) {
          setSelectionMode('dragging');
          setPendingSelectionStart(null);
        }
        updateSelection(x, y);
      } else if (selectionMode === 'dragging' && selection.active) {
        // Update selection bounds while dragging
        updateSelection(x, y);
      }
    } else if (activeTool === 'rectangle' && selection.active) {
      updateSelection(x, y);
    } else if (isDrawing && (activeTool === 'pencil' || activeTool === 'eraser')) {
      handleDrawing(x, y);
    }
  }, [getGridCoordinates, activeTool, selection, isDrawing, updateSelection, handleDrawing, selectionMode, mouseButtonDown, pendingSelectionStart, moveState, setCell, width, height]);

  const handleMouseUp = useCallback(() => {
    if (activeTool === 'select') {
      if (selectionMode === 'moving' && moveState) {
        // Move completed - apply the actual move to the canvas
        const startX = Math.min(selection.start.x, selection.end.x);
        const endX = Math.max(selection.start.x, selection.end.x);
        const startY = Math.min(selection.start.y, selection.end.y);
        const endY = Math.max(selection.start.y, selection.end.y);
        
        // First, clear the original positions of moved cells
        moveState.originalData.forEach((_, key) => {
          const [origX, origY] = key.split(',').map(Number);
          setCell(origX, origY, { char: ' ', color: '#000000', bgColor: '#FFFFFF' });
        });
        
        // Then, place the moved cells at their new positions
        moveState.originalData.forEach((cell, key) => {
          const [origX, origY] = key.split(',').map(Number);
          const newX = origX + moveState.offset.x;
          const newY = origY + moveState.offset.y;
          
          // Only place if within bounds
          if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
            setCell(newX, newY, cell);
          }
        });
        
        // Update selection bounds to new position
        const newStartX = startX + moveState.offset.x;
        const newStartY = startY + moveState.offset.y;
        const newEndX = endX + moveState.offset.x;
        const newEndY = endY + moveState.offset.y;
        
        // Only update selection if the new position is within bounds
        if (newStartX >= 0 && newEndX < width && newStartY >= 0 && newEndY < height) {
          startSelection(newStartX, newStartY);
          updateSelection(newEndX, newEndY);
        }
        
        setMoveState(null);
        setSelectionMode('none');
        setMouseButtonDown(false);
      } else if (selectionMode === 'dragging') {
        // Drag completed - finish the selection
        setSelectionMode('none');
        setMouseButtonDown(false);
        // Selection remains active with current bounds
      } else {
        // Single click completed - clear mouse button state but keep pending selection
        setMouseButtonDown(false);
      }
    } else if (activeTool === 'rectangle' && selection.active) {
      // Draw rectangle and clear selection
      drawRectangle(selection.start.x, selection.start.y, selection.end.x, selection.end.y);
      clearSelection();
      setSelectionMode('none');
    }
    
    setIsDrawing(false);
  }, [activeTool, selection, drawRectangle, clearSelection, selectionMode, moveState, startSelection, updateSelection, width, height, setCell]);

  const handleMouseLeave = useCallback(() => {
    setIsDrawing(false);
    setMouseButtonDown(false);
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

  // Reset selection mode when tool changes
  useEffect(() => {
    if (activeTool !== 'select') {
      setSelectionMode('none');
      setMouseButtonDown(false);
      setPendingSelectionStart(null);
      setMoveState(null);
    }
  }, [activeTool]);

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
        <span>
          {activeTool === 'select' && selectionMode === 'moving'
            ? 'Moving selection - release to place'
            : activeTool === 'select' && pendingSelectionStart
              ? 'Shift+Click on another cell to create selection' 
              : activeTool === 'select' && selection.active && selectionMode === 'none'
                ? 'Selection ready - copy/paste/move available'
                : `Cell size: ${cellSize}px`
          }
        </span>
      </div>
    </div>
  );
};
