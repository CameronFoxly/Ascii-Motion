import { useCallback, useRef } from 'react';
import { useCanvasContext, useCanvasDimensions } from '../contexts/CanvasContext';
import { useCanvasState } from './useCanvasState';
import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import { useToolStore } from '../stores/toolStore';
import type { Cell } from '../types';
import { unionSelectionMasks, subtractSelectionMask, createRectSelectionMask } from '../utils/selectionUtils';

/**
 * Hook for handling selection tool behavior
 * Manages selection creation, movement, and drag operations
 */
export const useCanvasSelection = () => {
  const { canvasRef, mouseButtonDown, setMouseButtonDown, setSelectionPreview } = useCanvasContext();
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
  const { currentFrameIndex } = useAnimationStore();
  const { 
    selection, 
    startSelection, 
    updateSelection, 
    clearSelection, 
    pushCanvasHistory,
    setSelectionFromMask
  } = useToolStore();

  const selectionModifierRef = useRef<'replace' | 'add' | 'subtract'>('replace');
  const baseSelectionMaskRef = useRef<Set<string>>(new Set());
  const selectionGestureActiveRef = useRef(false);
  const gestureStartRef = useRef<{ x: number; y: number } | null>(null);

  const clearSelectionPreview = useCallback(() => {
    setSelectionPreview({
      active: false,
      modifier: 'replace',
      tool: null,
      baseCells: [],
      gestureCells: []
    });
  }, [setSelectionPreview]);

  const resetSelectionGesture = useCallback(() => {
    selectionModifierRef.current = 'replace';
    baseSelectionMaskRef.current = new Set();
    selectionGestureActiveRef.current = false;
    gestureStartRef.current = null;
    clearSelectionPreview();
  }, [clearSelectionPreview]);

  const beginSelectionPreview = useCallback((modifier: 'replace' | 'add' | 'subtract', start: { x: number; y: number }) => {
    gestureStartRef.current = start;
    if (modifier === 'replace') {
      clearSelectionPreview();
      return;
    }

    setSelectionPreview({
      active: true,
      modifier,
      tool: 'select',
      baseCells: Array.from(baseSelectionMaskRef.current),
      gestureCells: []
    });
  }, [setSelectionPreview, clearSelectionPreview]);

  const updateSelectionPreview = useCallback((endX: number, endY: number) => {
    if (!selectionGestureActiveRef.current) {
      return;
    }

    if (selectionModifierRef.current === 'replace') {
      clearSelectionPreview();
      return;
    }

    const start = gestureStartRef.current;
    if (!start) {
      return;
    }

    const gestureMask = createRectSelectionMask(start, { x: endX, y: endY });
    setSelectionPreview({
      active: true,
      modifier: selectionModifierRef.current,
      tool: 'select',
      baseCells: Array.from(baseSelectionMaskRef.current),
      gestureCells: Array.from(gestureMask)
    });
  }, [setSelectionPreview, clearSelectionPreview]);

  const finalizeSelectionGesture = useCallback(() => {
    if (!selectionGestureActiveRef.current) {
      return;
    }

    const currentMask = selection.active ? new Set(selection.selectedCells) : new Set<string>();
    let nextMask: Set<string>;

    switch (selectionModifierRef.current) {
      case 'add':
        nextMask = unionSelectionMasks(baseSelectionMaskRef.current, currentMask);
        break;
      case 'subtract':
        nextMask = subtractSelectionMask(baseSelectionMaskRef.current, currentMask);
        break;
      default:
        nextMask = currentMask;
        break;
    }

    setSelectionFromMask(nextMask);
    resetSelectionGesture();
  }, [selection, setSelectionFromMask, resetSelectionGesture]);

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
    const modifier: 'replace' | 'add' | 'subtract' = event.altKey ? 'subtract' : (event.shiftKey ? 'add' : 'replace');
    selectionModifierRef.current = modifier;

    const existingMask = selection.active ? new Set(selection.selectedCells) : new Set<string>();
    
    // Save current state for undo
    pushCanvasHistory(new Map(cells), currentFrameIndex, 'Selection action');

    // If there's an uncommitted move and clicking outside selection, commit it first
    if (moveState && selection.active && !isPointInEffectiveSelection(x, y)) {
      commitMove();
      clearSelection();
      setJustCommittedMove(true);
      resetSelectionGesture();
      return;
    }

    if (justCommittedMove) {
      // Previous click committed a move, this click starts fresh
      setJustCommittedMove(false);
      baseSelectionMaskRef.current = existingMask;
      selectionGestureActiveRef.current = true;
      beginSelectionPreview(modifier, { x, y });
      startSelection(x, y);
      setPendingSelectionStart({ x, y });
      setMouseButtonDown(true);
      return;
    }

    if (selection.active && isPointInEffectiveSelection(x, y) && modifier === 'replace') {
      // Click inside existing selection - enter move mode
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
        // First time moving - create new moveState
        const originalData = new Map<string, Cell>();
        const originalPositions = new Set<string>();

        selection.selectedCells.forEach((cellKey) => {
          originalPositions.add(cellKey);
          const [cx, cy] = cellKey.split(',').map(Number);
          const cell = getCell(cx, cy);
          if (cell && cell.char !== ' ') {
            originalData.set(cellKey, cell);
          }
        });

        setMoveState({
          originalData,
          originalPositions,
          startPos: { x, y },
          baseOffset: { x: 0, y: 0 },
          currentOffset: { x: 0, y: 0 }
        });
      }
      setSelectionMode('moving');
      setMouseButtonDown(true);
      resetSelectionGesture();
      return;
    }

    if (selection.active && !isPointInEffectiveSelection(x, y) && modifier === 'replace') {
      // Click outside existing selection without modifiers - clear selection
      setJustCommittedMove(false);
      clearSelection();
      resetSelectionGesture();
      return;
    }

    // Start new selection (add/subtract/replace)
    setJustCommittedMove(false);
    baseSelectionMaskRef.current = existingMask;
    selectionGestureActiveRef.current = true;

    if (pendingSelectionStart && modifier !== 'replace') {
      // Complete pending anchor selection for additive/subtractive mode
      beginSelectionPreview(modifier, pendingSelectionStart);
      startSelection(pendingSelectionStart.x, pendingSelectionStart.y);
      updateSelection(x, y);
      updateSelectionPreview(x, y);
      setPendingSelectionStart(null);
    } else {
      beginSelectionPreview(modifier, { x, y });
      startSelection(x, y);
      setPendingSelectionStart({ x, y });
      setMouseButtonDown(true);
    }
  }, [
    getGridCoordinatesFromEvent,
    selection,
    pushCanvasHistory,
    cells,
    currentFrameIndex,
    moveState,
    isPointInEffectiveSelection,
    commitMove,
    clearSelection,
    setJustCommittedMove,
    beginSelectionPreview,
    startSelection,
    setPendingSelectionStart,
    setMouseButtonDown,
    setMoveState,
    setSelectionMode,
    getCell,
    updateSelection,
    pendingSelectionStart,
    justCommittedMove,
    resetSelectionGesture,
    updateSelectionPreview
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
      // Mouse button is down and we have a pending selection start - switch to drag mode
      if (x !== pendingSelectionStart.x || y !== pendingSelectionStart.y) {
        setSelectionMode('dragging');
        setPendingSelectionStart(null);
      }
      updateSelection(x, y);
      updateSelectionPreview(x, y);
    } else if (selectionMode === 'dragging' && selection.active) {
      // Update selection bounds while dragging
      updateSelection(x, y);
      updateSelectionPreview(x, y);
    }
  }, [
    getGridCoordinatesFromEvent,
    selectionMode,
    moveState,
    setMoveState,
    selection,
    updateSelection,
    mouseButtonDown,
    pendingSelectionStart,
    setPendingSelectionStart,
    updateSelectionPreview,
    setSelectionMode
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

    if (selectionGestureActiveRef.current) {
      finalizeSelectionGesture();
    }
  }, [
    selectionMode,
    moveState,
    setMoveState,
    setSelectionMode,
    setMouseButtonDown,
    finalizeSelectionGesture
  ]);

  return {
    handleSelectionMouseDown,
    handleSelectionMouseMove,
    handleSelectionMouseUp,
  };
};
