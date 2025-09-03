import React, { useCallback, useEffect } from 'react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useToolStore } from '../../stores/toolStore';
import { useDrawingTool } from '../../hooks/useDrawingTool';
import { useCanvasContext, useCanvasDimensions } from '../../contexts/CanvasContext';
import { useCanvasState } from '../../hooks/useCanvasState';
import type { Cell } from '../../types';

interface CanvasGridProps {
  className?: string;
}

export const CanvasGrid: React.FC<CanvasGridProps> = ({ className = '' }) => {
  // Use our new context and state management
  const { canvasRef, isDrawing, setIsDrawing, mouseButtonDown, setMouseButtonDown } = useCanvasContext();
  const { getGridCoordinates } = useCanvasDimensions();
  const {
    cellSize,
    selectionMode,
    moveState,
    pendingSelectionStart,
    justCommittedMove,
    canvasWidth,
    canvasHeight,
    statusMessage,
    // Remove unused: effectiveSelectionBounds, resetSelectionState are available but not used in this refactor step
    getTotalOffset,
    isPointInEffectiveSelection,
    commitMove,
    setSelectionMode,
    setMoveState,
    setPendingSelectionStart,
    setJustCommittedMove,
  } = useCanvasState();

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

  // Convert mouse coordinates to grid coordinates using our context helper
  const getGridCoordinatesFromEvent = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    return getGridCoordinates(mouseX, mouseY, rect, width, height);
  }, [getGridCoordinates, width, height]);

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

  // Handle drawing operations
  const handleDrawing = useCallback((x: number, y: number) => {
    drawAtPosition(x, y);
  }, [drawAtPosition]);

  // Mouse event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGridCoordinatesFromEvent(event);
    
    // Save current state for undo
    pushToHistory(new Map(cells));

    if (activeTool === 'select') {
      // If there's an uncommitted move and clicking outside selection, commit it first
      if (moveState && selection.active && !isPointInEffectiveSelection(x, y)) {
        commitMove();
        clearSelection();
        setJustCommittedMove(true);
        // Don't start new selection on this click - just commit and clear
        return;
      } else if (justCommittedMove) {
        // Previous click committed a move, this click starts fresh
        setJustCommittedMove(false);
        startSelection(x, y);
        setPendingSelectionStart({ x, y });
        setMouseButtonDown(true);
      } else if (selection.active && isPointInEffectiveSelection(x, y) && !event.shiftKey) {
        // Click inside existing selection - enter move mode
        setJustCommittedMove(false);
        if (moveState) {
          // Already have a moveState (continuing from preview) - just update start position
          setMoveState({
            ...moveState,
            startPos: { x, y }
          });
        } else {
          // First time moving - create new moveState
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
          
          // Preserve any existing accumulated offset or start fresh
          const existingBaseOffset = { x: 0, y: 0 }; // Start fresh when creating new moveState
          
          setMoveState({
            originalData,
            startPos: { x, y },
            baseOffset: existingBaseOffset,
            currentOffset: { x: 0, y: 0 }
          });
        }
        setSelectionMode('moving');
        setMouseButtonDown(true);
      } else if (event.shiftKey && pendingSelectionStart) {
        // Shift+Click with pending start: create selection from start to current position
        setJustCommittedMove(false);
        startSelection(pendingSelectionStart.x, pendingSelectionStart.y);
        updateSelection(x, y);
        setPendingSelectionStart(null);
      } else {
        // Normal click: select single cell and set as pending start for potential Shift+Click
        setJustCommittedMove(false);
        startSelection(x, y);
        setPendingSelectionStart({ x, y });
        setMouseButtonDown(true);
      }
    } else if (activeTool === 'rectangle') {
      setJustCommittedMove(false);
      startSelection(x, y);
      setSelectionMode('dragging');
      setMouseButtonDown(true);
    } else {
      setJustCommittedMove(false);
      setIsDrawing(true);
      handleDrawing(x, y);
    }
  }, [getGridCoordinatesFromEvent, activeTool, cells, pushToHistory, startSelection, updateSelection, handleDrawing, pendingSelectionStart, selection, isPointInEffectiveSelection, getCell, moveState, commitMove, clearSelection]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGridCoordinatesFromEvent(event);

    if (activeTool === 'select') {
      if (selectionMode === 'moving' && moveState) {
        // Calculate current drag offset from the start position
        const currentDragOffset = {
          x: x - moveState.startPos.x,
          y: y - moveState.startPos.y
        };
        
        // Update the current offset for preview
        setMoveState({
          ...moveState,
          currentOffset: currentDragOffset
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
        // Move drag completed - persist the current offset into base offset for continued editing
        setMoveState({
          ...moveState,
          baseOffset: {
            x: moveState.baseOffset.x + moveState.currentOffset.x,
            y: moveState.baseOffset.y + moveState.currentOffset.y
          },
          currentOffset: { x: 0, y: 0 }
        });
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
