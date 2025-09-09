import { useCallback } from 'react';
import { useCanvasContext } from '../contexts/CanvasContext';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';

/**
 * Custom hook that provides canvas state management functionality
 * Combines local canvas context with global store actions
 */
export const useCanvasState = () => {
  const canvasContext = useCanvasContext();
  const { width, height, cells, setCanvasData } = useCanvasStore();
  const { selection, lassoSelection, activeTool } = useToolStore();

  const {
    cellSize,
    cellWidth,
    cellHeight,
    zoom,
    panOffset,
    selectionMode,
    moveState,
    pendingSelectionStart,
    justCommittedMove,
    setMoveState,
    setSelectionMode,
    setPendingSelectionStart,
    setJustCommittedMove,
  } = canvasContext;

  // Calculate total offset for move operations
  const getTotalOffset = useCallback((state: typeof moveState) => {
    if (!state) return { x: 0, y: 0 };
    return {
      x: state.baseOffset.x + state.currentOffset.x,
      y: state.baseOffset.y + state.currentOffset.y,
    };
  }, []);

  // Get effective selection bounds (accounting for move offset)
  const getEffectiveSelectionBounds = useCallback(() => {
    if (!selection.active) return null;
    
    let startX = Math.min(selection.start.x, selection.end.x);
    let startY = Math.min(selection.start.y, selection.end.y);
    let endX = Math.max(selection.start.x, selection.end.x);
    let endY = Math.max(selection.start.y, selection.end.y);

    // If there's a move state, adjust bounds by the total offset
    if (moveState) {
      const totalOffset = getTotalOffset(moveState);
      startX += totalOffset.x;
      startY += totalOffset.y;
      endX += totalOffset.x;
      endY += totalOffset.y;
    }

    return { startX, startY, endX, endY };
  }, [selection, moveState, getTotalOffset]);

  // Check if a point is inside the effective selection
  const isPointInEffectiveSelection = useCallback((x: number, y: number) => {
    const bounds = getEffectiveSelectionBounds();
    if (!bounds) return false;
    
    return x >= bounds.startX && x <= bounds.endX && y >= bounds.startY && y <= bounds.endY;
  }, [getEffectiveSelectionBounds]);

    // Commit move operation to canvas
  const commitMove = useCallback(() => {
    if (!moveState) {
      return;
    }

    const totalOffset = {
      x: moveState.baseOffset.x + moveState.currentOffset.x,
      y: moveState.baseOffset.y + moveState.currentOffset.y
    };

    // Create a new canvas data map with the moved cells
    const newCells = new Map(cells);

    // Clear original positions
    moveState.originalData.forEach((_, key) => {
      newCells.delete(key);
    });

    // Place cells at new positions
    moveState.originalData.forEach((cell, key) => {
      const [origX, origY] = key.split(',').map(Number);
      const newX = origX + totalOffset.x;
      const newY = origY + totalOffset.y;
      
      // Only place if within bounds
      if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
        newCells.set(`${newX},${newY}`, cell);
      }
    });

    // Update canvas data
    setCanvasData(newCells);

    // Clear move state
    setMoveState(null);
    setJustCommittedMove(true);
  }, [moveState, cells, width, height, setCanvasData, setMoveState, setJustCommittedMove]);

  // Cancel move operation without committing changes
  const cancelMove = useCallback(() => {
    if (!moveState) return;

    // Simply clear the move state without making any changes to the canvas
    setMoveState(null);
    setJustCommittedMove(false);
  }, [moveState, setMoveState, setJustCommittedMove]);

  // Reset selection-related state when tool changes
  const resetSelectionState = useCallback(() => {
    if (moveState) {
      commitMove();
    }
    setSelectionMode('none');
    setPendingSelectionStart(null);
    setMoveState(null);
  }, [moveState, commitMove, setSelectionMode, setPendingSelectionStart, setMoveState]);

  // Get status message for UI display
  const getStatusMessage = useCallback(() => {
    if ((activeTool === 'select' || activeTool === 'lasso') && selectionMode === 'moving') {
      return 'Moving selection - release to place';
    }
    if (activeTool === 'select' && moveState && selection.active) {
      return 'Content moved - press Escape or click outside to commit';
    }
    if (activeTool === 'lasso' && moveState && lassoSelection.active) {
      return 'Content moved - press Escape or click outside to commit';
    }
    if (activeTool === 'select' && pendingSelectionStart) {
      return 'Shift+Click on another cell to create selection';
    }
    if (activeTool === 'select' && selection.active && selectionMode === 'none') {
      return 'Selection ready - copy/paste/move available';
    }
    if (activeTool === 'lasso' && lassoSelection.active && selectionMode === 'none') {
      return 'Lasso selection ready - copy/paste/move available';
    }
    return `Font: ${cellSize}px | Cell: ${cellWidth.toFixed(1)}×${cellHeight.toFixed(1)}`;
  }, [activeTool, selectionMode, moveState, selection.active, lassoSelection.active, pendingSelectionStart, cellSize, cellWidth, cellHeight]);

  return {
    // State
    cellSize,
    cellWidth,
    cellHeight,
    zoom,
    panOffset,
    selectionMode,
    moveState,
    pendingSelectionStart,
    justCommittedMove,
    
    // Canvas dimensions (with zoom applied)
    canvasWidth: width * cellWidth * zoom,
    canvasHeight: height * cellHeight * zoom,
    
    // Effective cell dimensions for rendering  
    effectiveCellWidth: cellWidth * zoom,
    effectiveCellHeight: cellHeight * zoom,
    
    // Computed values
    effectiveSelectionBounds: getEffectiveSelectionBounds(),
    statusMessage: getStatusMessage(),
    
    // Helper functions
    getTotalOffset,
    getEffectiveSelectionBounds,
    isPointInEffectiveSelection,
    commitMove,
    cancelMove,
    resetSelectionState,
    
    // State setters (from context)
    setSelectionMode,
    setMoveState,
    setPendingSelectionStart,
    setJustCommittedMove,
  };
};
