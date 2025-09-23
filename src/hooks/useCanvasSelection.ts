import { useCallback } from 'react';
import { useCanvasContext, useCanvasDimensions } from '../contexts/CanvasContext';
import { useCanvasState } from './useCanvasState';
import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
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
    commitMove,
    setSelectionMode,
    setMoveState,
    setPendingSelectionStart,
    setJustCommittedMove,
  } = useCanvasState();
  
  const { width, height, cells, getCell } = useCanvasStore();
  const { currentFrameIndex } = useAnimationStore();
  const { 
    selection, 
    startSelection, 
    updateSelection,
    updateSelectionAdditive,
    updateSelectionSubtractive,
    addToSelection,
    subtractFromSelection,
    clearSelection, 
    pushCanvasHistory 
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



  // Check if a point is in any of the selected cells (for move operations)
  const isPointInSelection = useCallback((x: number, y: number): boolean => {
    if (!selection.active) return false;
    return selection.selectedCells.has(`${x},${y}`);
  }, [selection]);

  // Handle selection tool mouse down
  const handleSelectionMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGridCoordinatesFromEvent(event);
    
    // Save current state for undo
    pushCanvasHistory(new Map(cells), currentFrameIndex, 'Selection action');

    // Determine selection mode based on modifier keys
    const isAdditive = event.shiftKey && !event.altKey;
    const isSubtractive = event.altKey && !event.shiftKey;
    const isNormalSelection = !event.shiftKey && !event.altKey;

    // If there's an uncommitted move and clicking outside selection, commit it first
    if (moveState && selection.active && !isPointInSelection(x, y)) {
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
    } else if (selection.active && isPointInSelection(x, y) && isNormalSelection) {
      // Click inside existing selection without modifiers - enter move mode
      setJustCommittedMove(false);
      if (moveState) {
        // Already have a moveState (continuing from arrow key movement) 
        // Adjust startPos to account for existing currentOffset so position doesn't jump
        const adjustedStartPos = {
          x: x - moveState.currentOffset.x,
          y: y - moveState.currentOffset.y
        };
        setMoveState({
          ...moveState,
          startPos: adjustedStartPos
        });
      } else {
        // First time moving - create new moveState from all selected cells
        const originalData = new Map<string, Cell>();
        selection.selectedCells.forEach(cellKey => {
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
    } else if (isAdditive) {
      // Shift+click: Add to existing selection
      setJustCommittedMove(false);
      if (selection.active) {
        addToSelection(x, y);
      } else {
        startSelection(x, y);
      }
      setPendingSelectionStart({ x, y });
      setMouseButtonDown(true);
      // Selection mode will be set to 'dragging-add' in mouse move if drag occurs
    } else if (isSubtractive) {
      // Alt+click: Subtract from existing selection
      setJustCommittedMove(false);
      if (selection.active) {
        subtractFromSelection(x, y);
      } else {
        // No existing selection to subtract from, start new selection
        startSelection(x, y);
      }
      setPendingSelectionStart({ x, y });
      setMouseButtonDown(true);
      // Selection mode will be set to 'dragging-subtract' in mouse move if drag occurs
    } else if (selection.active && !isPointInSelection(x, y) && isNormalSelection) {
      // Click outside existing selection without modifiers - clear selection
      setJustCommittedMove(false);
      clearSelection();
      // Don't start a new selection on this click, just clear
    } else {
      // Normal click: Start new selection
      setJustCommittedMove(false);
      if (pendingSelectionStart && event.shiftKey) {
        // Complete pending selection with shift-click (legacy behavior)
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
    getGridCoordinatesFromEvent, cells, pushCanvasHistory, currentFrameIndex, moveState, selection, 
    isPointInSelection, commitMove, clearSelection, setJustCommittedMove,
    justCommittedMove, startSelection, setPendingSelectionStart, setMouseButtonDown,
    setMoveState, setSelectionMode, getCell, updateSelection, pendingSelectionStart,
    addToSelection, subtractFromSelection
  ]);

  // Handle selection tool mouse move
  const handleSelectionMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGridCoordinatesFromEvent(event);

    if (selectionMode === 'moving' && moveState && mouseButtonDown) {
      // Only update move position if mouse button is down (mouse-initiated move)
      // This prevents arrow key-initiated moves from jumping to follow mouse movement
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
      // Mouse button is down and we have a pending selection start - switch to appropriate drag mode
      if (x !== pendingSelectionStart.x || y !== pendingSelectionStart.y) {
        // Determine drag mode based on current modifier keys  
        const isAdditive = event.shiftKey && !event.altKey;
        const isSubtractive = event.altKey && !event.shiftKey;
        
        if (isAdditive) {
          setSelectionMode('dragging-add');
        } else if (isSubtractive) {
          setSelectionMode('dragging-subtract');
        } else {
          setSelectionMode('dragging');
        }
        setPendingSelectionStart(null);
      }
      
      // Use appropriate update function based on current mode after setting it
      const currentMode = (x !== pendingSelectionStart.x || y !== pendingSelectionStart.y) ? 
        (event.shiftKey && !event.altKey ? 'dragging-add' : 
         event.altKey && !event.shiftKey ? 'dragging-subtract' : 'dragging') : 
        selectionMode;
      
      if (currentMode === 'dragging-add') {
        updateSelectionAdditive(x, y);
      } else if (currentMode === 'dragging-subtract') {
        updateSelectionSubtractive(x, y);
      } else {
        updateSelection(x, y);
      }
    } else if (selectionMode === 'dragging' && selection.active) {
      // Update selection bounds while dragging normally
      updateSelection(x, y);
    } else if (selectionMode === 'dragging-add' && selection.active) {
      // Update selection bounds while dragging additively
      updateSelectionAdditive(x, y);
    } else if (selectionMode === 'dragging-subtract' && selection.active) {
      // Update selection bounds while dragging subtractively
      updateSelectionSubtractive(x, y);
    }
  }, [
    getGridCoordinatesFromEvent, selectionMode, moveState, setMoveState, 
    selection, updateSelection, updateSelectionAdditive, updateSelectionSubtractive,
    mouseButtonDown, pendingSelectionStart, setPendingSelectionStart, setSelectionMode
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
    } else if (selectionMode === 'dragging' || selectionMode === 'dragging-add' || selectionMode === 'dragging-subtract') {
      // Drag completed - finish the selection (all drag modes)
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
