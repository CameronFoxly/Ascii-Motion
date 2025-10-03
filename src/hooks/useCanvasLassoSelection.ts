import { useCallback, useRef } from 'react';
import { useCanvasContext, useCanvasDimensions } from '../contexts/CanvasContext';
import { useCanvasState } from './useCanvasState';
import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import { useToolStore } from '../stores/toolStore';
import { getCellsInPolygon, smoothPolygonPath } from '../utils/polygon';
import { unionSelectionMasks, subtractSelectionMask } from '../utils/selectionUtils';
import type { Cell } from '../types';

/**
 * Hook for handling lasso selection tool behavior
 * Manages freeform selection creation, movement, and drag operations
 */
export const useCanvasLassoSelection = () => {
  const { canvasRef, mouseButtonDown, setMouseButtonDown, setSelectionPreview } = useCanvasContext();
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
  const { currentFrameIndex } = useAnimationStore();
  const { 
    lassoSelection, 
    startLassoSelection,
    addLassoPoint,
    updateLassoSelectedCells,
    finalizeLassoSelection,
    clearLassoSelection,
    pushCanvasHistory,
    setLassoSelectionFromMask
  } = useToolStore();

  const selectionModifierRef = useRef<'replace' | 'add' | 'subtract'>('replace');
  const baseSelectionMaskRef = useRef<Set<string>>(new Set());
  const selectionGestureActiveRef = useRef(false);

  const resetSelectionGesture = useCallback(() => {
    selectionModifierRef.current = 'replace';
    baseSelectionMaskRef.current = new Set();
    selectionGestureActiveRef.current = false;
    setSelectionPreview({
      active: false,
      modifier: 'replace',
      tool: null,
      baseCells: [],
      gestureCells: []
    });
  }, [setSelectionPreview]);

  const beginSelectionPreview = useCallback((modifier: 'replace' | 'add' | 'subtract') => {
    if (modifier === 'replace') {
      setSelectionPreview({
        active: false,
        modifier: 'replace',
        tool: null,
        baseCells: [],
        gestureCells: []
      });
      return;
    }

    setSelectionPreview({
      active: true,
      modifier,
      tool: 'lasso',
      baseCells: Array.from(baseSelectionMaskRef.current),
      gestureCells: []
    });
  }, [setSelectionPreview]);

  const updateSelectionPreview = useCallback((gestureCells: Set<string>) => {
    if (!selectionGestureActiveRef.current) {
      return;
    }

    if (selectionModifierRef.current === 'replace') {
      setSelectionPreview({
        active: false,
        modifier: 'replace',
        tool: null,
        baseCells: [],
        gestureCells: []
      });
      return;
    }

    setSelectionPreview({
      active: true,
      modifier: selectionModifierRef.current,
      tool: 'lasso',
      baseCells: Array.from(baseSelectionMaskRef.current),
      gestureCells: Array.from(gestureCells)
    });
  }, [setSelectionPreview]);

  const finalizeSelectionGesture = useCallback(() => {
    if (!selectionGestureActiveRef.current) {
      return;
    }

    const currentMask = lassoSelection.active ? new Set(lassoSelection.selectedCells) : new Set<string>();
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

    const finalPath = selectionModifierRef.current === 'replace' ? lassoSelection.path : [];
    setLassoSelectionFromMask(nextMask, finalPath);
    resetSelectionGesture();
  }, [lassoSelection, setLassoSelectionFromMask, resetSelectionGesture]);

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
    const modifier: 'replace' | 'add' | 'subtract' = event.altKey ? 'subtract' : (event.shiftKey ? 'add' : 'replace');
    selectionModifierRef.current = modifier;

    const existingMask = lassoSelection.active ? new Set(lassoSelection.selectedCells) : new Set<string>();
    
    // Save current state for undo
    pushCanvasHistory(new Map(cells), currentFrameIndex, 'Lasso selection action');

    // If there's an uncommitted move and clicking outside selection, commit it first
    if (moveState && lassoSelection.active && !isPointInLassoSelection(x, y) && modifier === 'replace') {
      commitMove();
      clearLassoSelection();
      setJustCommittedMove(true);
      resetSelectionGesture();
      return;
    }

    if (justCommittedMove) {
      // Previous click committed a move, this click starts fresh
      setJustCommittedMove(false);
      baseSelectionMaskRef.current = existingMask;
      selectionGestureActiveRef.current = true;
      beginSelectionPreview(modifier);
      startLassoSelection();
      addLassoPoint(x, y);
      setMouseButtonDown(true);
      setSelectionMode('dragging');
      return;
    }

    if (lassoSelection.active && isPointInLassoSelection(x, y) && !lassoSelection.isDrawing && modifier === 'replace') {
      // Click inside existing lasso selection - enter move mode
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
        // Store only the non-empty cells from the selection
        const originalData = new Map<string, Cell>();
        lassoSelection.selectedCells.forEach((cellKey) => {
          const [cx, cy] = cellKey.split(',').map(Number);
          const cell = getCell(cx, cy);
          if (cell && cell.char !== ' ') {
            originalData.set(cellKey, cell);
          }
        });
        
        setMoveState({
          originalData,
          originalPositions: new Set(originalData.keys()),
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

    if (lassoSelection.active && !isPointInLassoSelection(x, y) && !lassoSelection.isDrawing && modifier === 'replace') {
      // Click outside existing lasso selection without modifiers - clear selection
      setJustCommittedMove(false);
      clearLassoSelection();
      resetSelectionGesture();
      return;
    }

    setJustCommittedMove(false);
    baseSelectionMaskRef.current = existingMask;
    selectionGestureActiveRef.current = true;
    beginSelectionPreview(modifier);
    startLassoSelection();
    addLassoPoint(x, y);
    setMouseButtonDown(true);
    setSelectionMode('dragging');
  }, [
    getGridCoordinatesFromEvent,
    lassoSelection,
    pushCanvasHistory,
    cells,
    currentFrameIndex,
    moveState,
    isPointInLassoSelection,
    commitMove,
    clearLassoSelection,
    setJustCommittedMove,
  resetSelectionGesture,
  beginSelectionPreview,
    startLassoSelection,
    addLassoPoint,
    setMouseButtonDown,
    setSelectionMode,
    justCommittedMove,
    setMoveState,
    getCell
  ]);

    // Handle lasso selection mouse move
  const handleLassoMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
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
    } else if (mouseButtonDown && lassoSelection.isDrawing && selectionMode === 'dragging') {
      // Add point to lasso path and update selected cells in real-time
      addLassoPoint(x, y);
      
      // Calculate selected cells from current path for real-time feedback
      if (lassoSelection.path.length >= 2) {
        // Create a closed path by connecting to the first point for preview
        const previewPath = [...lassoSelection.path, lassoSelection.path[0]];
        // Use minimal smoothing for precision
        const smoothedPath = smoothPolygonPath(previewPath, 0.2);
        const selectedCells = getCellsInPolygon(smoothedPath, width, height);
        updateLassoSelectedCells(selectedCells);
        updateSelectionPreview(selectedCells);
      }
    }
  }, [
    getGridCoordinatesFromEvent, selectionMode, moveState, setMoveState, 
    mouseButtonDown, lassoSelection, addLassoPoint, updateLassoSelectedCells,
    width, height, updateSelectionPreview
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
        // Close the polygon and smooth it minimally
        const smoothedPath = smoothPolygonPath(lassoSelection.path, 0.2);
        const selectedCells = getCellsInPolygon(smoothedPath, width, height);
        updateLassoSelectedCells(selectedCells);
        updateSelectionPreview(selectedCells);
        finalizeLassoSelection();
      } else {
        // Not enough points for a valid lasso, clear it
        clearLassoSelection();
        resetSelectionGesture();
      }
      setSelectionMode('none');
      setMouseButtonDown(false);
    } else {
      // Single click completed - clear mouse button state
      setMouseButtonDown(false);
    }

    if (selectionGestureActiveRef.current) {
      finalizeSelectionGesture();
    }
  }, [
    selectionMode, moveState, setMoveState, setSelectionMode, setMouseButtonDown,
    lassoSelection, updateLassoSelectedCells, finalizeLassoSelection, 
    clearLassoSelection, width, height, finalizeSelectionGesture, resetSelectionGesture,
    updateSelectionPreview
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
