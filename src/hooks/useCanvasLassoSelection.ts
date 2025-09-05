import { useCallback } from 'react';
import { useCanvasContext, useCanvasDimensions } from '../contexts/CanvasContext';
import { useCanvasState } from './useCanvasState';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import { getCellsInPolygon, smoothPolygonPath } from '../utils/polygon';
import type { Cell } from '../types';

/**
 * Hook for handling lasso selection tool behavior
 * Manages freeform selection creation, movement, and drag operations
 */
export const useCanvasLassoSelection = () => {
  const { canvasRef, mouseButtonDown, setMouseButtonDown } = useCanvasContext();
  const { getGridCoordinates } = useCanvasDimensions();
  const {
    selectionMode,
    moveState,
    justCommittedMove,
    commitMove,
    setSelectionMode,
    setMoveState,
    setJustCommittedMove,
  } = useCanvasState();
  
  const { width, height, cells, getCell } = useCanvasStore();
  const { 
    lassoSelection, 
    startLassoSelection,
    addLassoPoint,
    updateLassoSelectedCells,
    finalizeLassoSelection,
    clearLassoSelection,
    pushToHistory 
  } = useToolStore();

  // Convert mouse coordinates to grid coordinates
  const getGridCoordinatesFromEvent = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    return getGridCoordinates(mouseX, mouseY, rect, width, height);
  }, [getGridCoordinates, width, height, canvasRef]);

  // Check if a point is inside the current lasso selection
  const isPointInLassoSelection = useCallback((x: number, y: number) => {
    if (!lassoSelection.active || lassoSelection.selectedCells.size === 0) return false;
    
    // If there's a move state, we need to check against the original (non-offset) coordinates
    // because the selectedCells are stored in original coordinates
    if (moveState) {
      const totalOffset = {
        x: moveState.baseOffset.x + moveState.currentOffset.x,
        y: moveState.baseOffset.y + moveState.currentOffset.y
      };
      
      // Convert the click point back to original coordinates
      const originalX = x - totalOffset.x;
      const originalY = y - totalOffset.y;
      return lassoSelection.selectedCells.has(`${originalX},${originalY}`);
    }
    
    // No move state, check directly
    return lassoSelection.selectedCells.has(`${x},${y}`);
  }, [lassoSelection, moveState]);

  // Handle lasso selection mouse down
  const handleLassoMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGridCoordinatesFromEvent(event);
    
    // Save current state for undo
    pushToHistory(new Map(cells));

    // If there's an uncommitted move and clicking outside selection, commit it first
    if (moveState && lassoSelection.active && !isPointInLassoSelection(x, y)) {
      commitMove();
      clearLassoSelection();
      setJustCommittedMove(true);
      // Don't start new selection on this click - just commit and clear
      return;
    } else if (justCommittedMove) {
      // Previous click committed a move, this click starts fresh
      setJustCommittedMove(false);
      startLassoSelection();
      addLassoPoint(x, y);
      setMouseButtonDown(true);
      setSelectionMode('dragging');
    } else if (lassoSelection.active && isPointInLassoSelection(x, y) && !lassoSelection.isDrawing) {
      // Click inside existing lasso selection - enter move mode
      setJustCommittedMove(false);
      if (moveState) {
        // Already have a moveState (continuing from preview) - just update start position
        setMoveState({
          ...moveState,
          startPos: { x, y }
        });
      } else {
        // First time moving - create new moveState
        // Store only the non-empty cells from the selection
        const originalData = new Map<string, Cell>();
        lassoSelection.selectedCells.forEach((cellKey) => {
          const [cx, cy] = cellKey.split(',').map(Number);
          const cell = getCell(cx, cy);
          // Only store non-empty cells (not spaces or empty cells)
          if (cell && cell.char !== ' ') {
            originalData.set(cellKey, cell);
          }
        });
        
        setMoveState({
          originalData,
          startPos: { x, y },
          baseOffset: { x: 0, y: 0 },
          currentOffset: { x: 0, y: 0 }
        });
      }
      setSelectionMode('moving');
      setMouseButtonDown(true);
    } else if (lassoSelection.active && !isPointInLassoSelection(x, y) && !lassoSelection.isDrawing) {
      // Click outside existing lasso selection - clear selection
      setJustCommittedMove(false);
      clearLassoSelection();
      // Don't start a new selection on this click, just clear
    } else if (!lassoSelection.active || !lassoSelection.isDrawing) {
      // Start new lasso selection
      setJustCommittedMove(false);
      startLassoSelection();
      addLassoPoint(x, y);
      setMouseButtonDown(true);
      setSelectionMode('dragging');
    }
  }, [
    getGridCoordinatesFromEvent, cells, pushToHistory, moveState, lassoSelection, 
    isPointInLassoSelection, commitMove, clearLassoSelection, setJustCommittedMove,
    justCommittedMove, startLassoSelection, addLassoPoint, setMouseButtonDown,
    setMoveState, setSelectionMode, getCell
  ]);

  // Handle lasso selection mouse move
  const handleLassoMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGridCoordinatesFromEvent(event);

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
    } else if (mouseButtonDown && lassoSelection.isDrawing && selectionMode === 'dragging') {
      // Add point to lasso path and update selected cells in real-time
      addLassoPoint(x, y);
      
      // Calculate selected cells from current path for real-time feedback
      if (lassoSelection.path.length >= 2) {
        // Create a closed path by connecting to the first point for preview
        const previewPath = [...lassoSelection.path, lassoSelection.path[0]];
        const smoothedPath = smoothPolygonPath(previewPath, 1.5);
        const selectedCells = getCellsInPolygon(smoothedPath, width, height);
        updateLassoSelectedCells(selectedCells);
      }
    }
  }, [
    getGridCoordinatesFromEvent, selectionMode, moveState, setMoveState, 
    mouseButtonDown, lassoSelection, addLassoPoint, updateLassoSelectedCells,
    width, height
  ]);

  // Handle lasso selection mouse up
  const handleLassoMouseUp = useCallback(() => {
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
    } else if (selectionMode === 'dragging' && lassoSelection.isDrawing) {
      // Lasso drawing completed - finalize the selection
      if (lassoSelection.path.length >= 3) {
        // Close the polygon and smooth it
        const smoothedPath = smoothPolygonPath(lassoSelection.path, 1.5);
        const selectedCells = getCellsInPolygon(smoothedPath, width, height);
        updateLassoSelectedCells(selectedCells);
        finalizeLassoSelection();
      } else {
        // Not enough points for a valid lasso, clear it
        clearLassoSelection();
      }
      setSelectionMode('none');
      setMouseButtonDown(false);
    } else {
      // Single click completed - clear mouse button state
      setMouseButtonDown(false);
    }
  }, [
    selectionMode, moveState, setMoveState, setSelectionMode, setMouseButtonDown,
    lassoSelection, updateLassoSelectedCells, finalizeLassoSelection, 
    clearLassoSelection, width, height
  ]);

  // Get effective lasso selection bounds for rendering
  const getLassoSelectionBounds = useCallback(() => {
    if (!lassoSelection.active || lassoSelection.selectedCells.size === 0) return null;
    
    const cellCoords = Array.from(lassoSelection.selectedCells).map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
    
    const minX = Math.min(...cellCoords.map(c => c.x));
    const maxX = Math.max(...cellCoords.map(c => c.x));
    const minY = Math.min(...cellCoords.map(c => c.y));
    const maxY = Math.max(...cellCoords.map(c => c.y));

    // If there's a move state, adjust bounds by the total offset
    if (moveState) {
      const totalOffset = {
        x: moveState.baseOffset.x + moveState.currentOffset.x,
        y: moveState.baseOffset.y + moveState.currentOffset.y
      };
      
      return {
        minX: minX + totalOffset.x,
        maxX: maxX + totalOffset.x,
        minY: minY + totalOffset.y,
        maxY: maxY + totalOffset.y
      };
    }

    return { minX, maxX, minY, maxY };
  }, [lassoSelection, moveState]);

  return {
    handleLassoMouseDown,
    handleLassoMouseMove,
    handleLassoMouseUp,
    isPointInLassoSelection,
    getLassoSelectionBounds,
  };
};
