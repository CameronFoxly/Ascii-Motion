import { useCallback } from 'react';
import { useCanvasContext, useCanvasDimensions } from '../contexts/CanvasContext';
import { useCanvasState } from './useCanvasState';
import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import { useToolStore } from '../stores/toolStore';
import type { Cell } from '../types';

/**
 * Hook for handling magic wand selection tool behavior
 * Manages character/color-based selection creation, movement, and drag operations
 */
export const useCanvasMagicWandSelection = () => {
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
  
  const { currentFrameIndex } = useAnimationStore();
  const { width, height, cells, getCell } = useCanvasStore();
  const { 
    magicWandSelection, 
    magicWandContiguous,
    startMagicWandSelection,
    clearMagicWandSelection,
    pushCanvasHistory,
    magicMatchChar,
    magicMatchColor,
    magicMatchBgColor
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

  // Check if a cell is empty (has no character or default character)
  const isCellEmpty = useCallback((cell: Cell | undefined) => {
    if (!cell) return true;
    return !cell.char || cell.char === '' || cell.char === ' ';
  }, []);

  // Check if two cells match according to enabled criteria (AND semantics)
  const cellsMatch = useCallback((cell1: Cell | undefined, cell2: Cell | undefined) => {
    // Both empty considered match only if character matching is enabled (so they represent same absence)
    if (isCellEmpty(cell1) && isCellEmpty(cell2)) {
      return magicMatchChar; // Only match empties if char criterion is on
    }
    if (isCellEmpty(cell1) || isCellEmpty(cell2)) return false;
    if (!cell1 || !cell2) return false;
    if (magicMatchChar && cell1.char !== cell2.char) return false;
    if (magicMatchColor && cell1.color !== cell2.color) return false;
    if (magicMatchBgColor && cell1.bgColor !== cell2.bgColor) return false;
    // If all enabled criteria passed
    return true;
  }, [isCellEmpty, magicMatchChar, magicMatchColor, magicMatchBgColor]);

  // Find all matching cells using flood fill (contiguous) or scan (non-contiguous)
  const findMatchingCells = useCallback((targetX: number, targetY: number, targetCell: Cell | undefined) => {
    // If no criteria enabled, do nothing
    if (!magicMatchChar && !magicMatchColor && !magicMatchBgColor) {
      return new Set<string>();
    }
    // If target is empty and char not part of criteria -> nothing
    if (isCellEmpty(targetCell) && !magicMatchChar) {
      return new Set<string>();
    }

    const matchingCells = new Set<string>();

    if (magicWandContiguous) {
      // Contiguous selection using flood fill
      const visited = new Set<string>();
      const queue: { x: number; y: number }[] = [{ x: targetX, y: targetY }];

      while (queue.length > 0) {
        const { x, y } = queue.shift()!;
        const cellKey = `${x},${y}`;

        // Skip if out of bounds or already visited
        if (x < 0 || x >= width || y < 0 || y >= height || visited.has(cellKey)) {
          continue;
        }

        visited.add(cellKey);
        const currentCell = getCell(x, y);

        // If this cell matches the target, add it and check neighbors
        if (cellsMatch(currentCell, targetCell)) {
          matchingCells.add(cellKey);

          // Add neighbors to queue
          queue.push(
            { x: x - 1, y }, // left
            { x: x + 1, y }, // right
            { x, y: y - 1 }, // up
            { x, y: y + 1 }  // down
          );
        }
      }
    } else {
      // Non-contiguous selection - scan entire canvas
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const currentCell = getCell(x, y);
          if (cellsMatch(currentCell, targetCell)) {
            matchingCells.add(`${x},${y}`);
          }
        }
      }
    }

    return matchingCells;
  }, [width, height, getCell, cellsMatch, isCellEmpty, magicWandContiguous, magicMatchChar, magicMatchColor, magicMatchBgColor]);

  // Check if a point is inside the current magic wand selection
  const isPointInMagicWandSelection = useCallback((x: number, y: number) => {
    if (!magicWandSelection.active || magicWandSelection.selectedCells.size === 0) return false;
    
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
      return magicWandSelection.selectedCells.has(`${originalX},${originalY}`);
    }
    
    // No move state, check directly
    return magicWandSelection.selectedCells.has(`${x},${y}`);
  }, [magicWandSelection, moveState]);

  // Handle magic wand selection mouse down
  const handleMagicWandMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGridCoordinatesFromEvent(event);
    
    // Save current state for undo
    pushCanvasHistory(new Map(cells), currentFrameIndex);

    // If there's an uncommitted move and clicking outside selection, commit it first
    if (moveState && magicWandSelection.active && !isPointInMagicWandSelection(x, y)) {
      commitMove();
      clearMagicWandSelection();
      setJustCommittedMove(true);
      // Don't start new selection on this click - just commit and clear
      return;
    } else if (justCommittedMove) {
      // Previous click committed a move, this click starts fresh
      setJustCommittedMove(false);
      
      // Clear any existing selection and create new one
      clearMagicWandSelection();
      
      // Get the target cell
      const targetCell = getCell(x, y);
      
      // Find all matching cells
      const matchingCells = findMatchingCells(x, y, targetCell);
      
      // Only create selection if we found matching cells
      if (matchingCells.size > 0) {
        startMagicWandSelection(targetCell, matchingCells);
        setSelectionMode('none');
      }
      
      setMouseButtonDown(true);
      return;
    }

    // Check if we clicked inside an existing selection to start move mode
    if (magicWandSelection.active && isPointInMagicWandSelection(x, y)) {
      // Start move mode
      setSelectionMode('moving');
      
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
        // Store only the selected cells, not all cells
        const originalData = new Map<string, Cell>();
        magicWandSelection.selectedCells.forEach((cellKey) => {
          const [cx, cy] = cellKey.split(',').map(Number);
          const cell = getCell(cx, cy);
          // Only store non-empty cells
          if (cell && !isCellEmpty(cell)) {
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
      setMouseButtonDown(true);
      return;
    }

    // Clear any existing selection and create new one
    clearMagicWandSelection();

    // Get the target cell
    const targetCell = getCell(x, y);

    // Find all matching cells
    const matchingCells = findMatchingCells(x, y, targetCell);

    // Only create selection if we found matching cells
    if (matchingCells.size > 0) {
      startMagicWandSelection(targetCell, matchingCells);
      setSelectionMode('none');
    }

    setMouseButtonDown(true);
  }, [
    getGridCoordinatesFromEvent, 
    pushCanvasHistory, 
    cells, 
    currentFrameIndex,
    moveState, 
    magicWandSelection, 
    isPointInMagicWandSelection,
    commitMove,
    setSelectionMode,
    setMoveState,
    setMouseButtonDown,
    clearMagicWandSelection,
    setJustCommittedMove,
    justCommittedMove,
    getCell,
    isCellEmpty,
    findMatchingCells,
    startMagicWandSelection
  ]);

  // Handle mouse move during magic wand selection
  const handleMagicWandMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGridCoordinatesFromEvent(event);

    // Handle move mode - only update position if mouse button is down (mouse-initiated move)
    // This prevents arrow key-initiated moves from jumping to follow mouse movement
    if (selectionMode === 'moving' && moveState && mouseButtonDown) {
      const newOffset = {
        x: x - moveState.startPos.x,
        y: y - moveState.startPos.y
      };
      
      setMoveState({
        ...moveState,
        currentOffset: newOffset
      });
    }
  }, [
    mouseButtonDown, 
    magicWandSelection, 
    getGridCoordinatesFromEvent, 
    selectionMode, 
    moveState, 
    setMoveState
  ]);

  // Handle mouse up for magic wand selection
  const handleMagicWandMouseUp = useCallback(() => {
    if (!mouseButtonDown) return;

    setMouseButtonDown(false);

    // If we were in moving mode, that's the end of the move operation
    // The move will be committed when the user clicks elsewhere or presses Enter/Escape
    if (selectionMode === 'moving' && moveState) {
      // Move operation is complete, but not committed yet
      // User can continue adjusting or commit/cancel
    }

    // Reset just committed flag after a short delay to allow for proper click detection
    if (justCommittedMove) {
      setTimeout(() => setJustCommittedMove(false), 100);
    }
  }, [mouseButtonDown, setMouseButtonDown, selectionMode, moveState, justCommittedMove, setJustCommittedMove]);

  return {
    handleMagicWandMouseDown,
    handleMagicWandMouseMove,
    handleMagicWandMouseUp,
    isPointInMagicWandSelection,
  };
};
