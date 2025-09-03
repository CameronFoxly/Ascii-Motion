import { useCallback } from 'react';
import { useCanvasContext, useCanvasDimensions } from '../contexts/CanvasContext';
import { useCanvasState } from './useCanvasState';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import type { Cell } from '../types';

/**
 * Hook for handling selection tool behavior
 * Manages selection creation, movement, and drag operations
 */
export const useCanvasSelection = () => {
  const { canvasRef, mouseButtonDown, setMouseButtonDown } = useCanvasContext();
  const { getGridCoordinates } = useCanvasDimensions();
  const {
    selectionMode,
    moveState,
    pendingSelectionStart,
    justCommittedMove,
    isPointInEffectiveSelection,
    commitMove,
    setSelectionMode,
    setMoveState,
    setPendingSelectionStart,
    setJustCommittedMove,
  } = useCanvasState();
  
  const { width, height, cells, getCell } = useCanvasStore();
  const { 
    selection, 
    startSelection, 
    updateSelection, 
    clearSelection, 
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

  // Handle selection tool mouse down
  const handleSelectionMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGridCoordinatesFromEvent(event);
    
    // Save current state for undo
    pushToHistory(new Map(cells));

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
            if (cell && cell.char !== ' ') {
              originalData.set(`${cx},${cy}`, cell);
            }
          }
        }
        
        setMoveState({
          originalData,
          startPos: { x, y },
          baseOffset: { x: 0, y: 0 },
          currentOffset: { x: 0, y: 0 }
        });
      }
      setSelectionMode('moving');
      setMouseButtonDown(true);
    } else if (!selection.active || event.shiftKey) {
      // Start new selection or extend current with shift-click
      setJustCommittedMove(false);
      if (pendingSelectionStart && event.shiftKey) {
        // Complete pending selection with shift-click
        startSelection(pendingSelectionStart.x, pendingSelectionStart.y);
        updateSelection(x, y);
        setPendingSelectionStart(null);
      } else {
        // Start new selection
        startSelection(x, y);
        setPendingSelectionStart({ x, y });
        setMouseButtonDown(true);
      }
    }
  }, [
    getGridCoordinatesFromEvent, cells, pushToHistory, moveState, selection, 
    isPointInEffectiveSelection, commitMove, clearSelection, setJustCommittedMove,
    justCommittedMove, startSelection, setPendingSelectionStart, setMouseButtonDown,
    setMoveState, setSelectionMode, getCell, updateSelection, pendingSelectionStart
  ]);

  // Handle selection tool mouse move
  const handleSelectionMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
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
  }, [
    getGridCoordinatesFromEvent, selectionMode, moveState, setMoveState, 
    selection, updateSelection, mouseButtonDown, pendingSelectionStart, setPendingSelectionStart
  ]);

  // Handle selection tool mouse up
  const handleSelectionMouseUp = useCallback(() => {
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
  }, [selectionMode, moveState, setMoveState, setSelectionMode, setMouseButtonDown]);

  return {
    handleSelectionMouseDown,
    handleSelectionMouseMove,
    handleSelectionMouseUp,
  };
};
