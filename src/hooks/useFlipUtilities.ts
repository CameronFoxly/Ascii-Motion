/**
 * Flip utilities hook with undo/redo history integration
 * Provides flip actions that work with all selection types
 */

import { useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import { useAnimationStore } from '../stores/animationStore';
import { 
  applyHorizontalFlip, 
  applyVerticalFlip, 
  getActiveSelectionBounds,
  transformLassoPathForFlip,
  transformSelectedCellsForFlip
} from '../utils/flipUtils';
import { useCanvasContext } from '../contexts/CanvasContext';

/**
 * Custom hook providing flip utilities with integrated undo/redo history
 */
export const useFlipUtilities = () => {
  const { cells, width, height, setCanvasData } = useCanvasStore();
  const { currentFrameIndex } = useAnimationStore();
  const { moveState, setMoveState } = useCanvasContext();
  const { 
    pushCanvasHistory, 
    selection, 
    lassoSelection, 
    magicWandSelection,
    updateLassoSelectedCells,
    setLassoPath,
    updateMagicWandSelectedCells
  } = useToolStore();

  /**
   * Flip canvas content horizontally around selection center
   * Works with any active selection or entire canvas if no selection
   */
  const flipHorizontal = useCallback(() => {
    // Save current state for undo
    pushCanvasHistory(new Map(cells), currentFrameIndex, 'Flip horizontal');

    // Get active selection bounds and cells
    const { bounds, selectedCells } = getActiveSelectionBounds(
      { selection, lassoSelection, magicWandSelection },
      width,
      height
    );

    const hasMagicSelection = magicWandSelection.active && magicWandSelection.selectedCells.size > 0;
    const hasLassoSelection = !hasMagicSelection && lassoSelection.active && lassoSelection.selectedCells.size > 0;

    const transformedCells = selectedCells
      ? transformSelectedCellsForFlip(selectedCells, bounds, 'horizontal')
      : null;

    // Apply horizontal flip
    if (moveState) {
      const flippedMoveData = applyHorizontalFlip(moveState.originalData, bounds, selectedCells || undefined);
      setMoveState({
        ...moveState,
        originalData: flippedMoveData
      });
    } else {
      const flippedData = applyHorizontalFlip(cells, bounds, selectedCells || undefined);
      setCanvasData(flippedData);
    }

    if (hasMagicSelection && transformedCells) {
      updateMagicWandSelectedCells(transformedCells);
    } else if (hasLassoSelection && transformedCells) {
      updateLassoSelectedCells(transformedCells);
      if (lassoSelection.path.length > 0) {
        const flippedPath = transformLassoPathForFlip(lassoSelection.path, bounds, 'horizontal');
        setLassoPath(flippedPath);
      }
    }
  }, [
    cells,
    width,
    height,
    currentFrameIndex,
    pushCanvasHistory,
    selection,
    lassoSelection,
    magicWandSelection,
    setCanvasData,
    moveState,
    setMoveState,
    updateLassoSelectedCells,
    setLassoPath,
    updateMagicWandSelectedCells
  ]);

  /**
   * Flip canvas content vertically around selection center
   * Works with any active selection or entire canvas if no selection
   */
  const flipVertical = useCallback(() => {
    // Save current state for undo
    pushCanvasHistory(new Map(cells), currentFrameIndex, 'Flip vertical');

    // Get active selection bounds and cells
    const { bounds, selectedCells } = getActiveSelectionBounds(
      { selection, lassoSelection, magicWandSelection },
      width,
      height
    );

    const hasMagicSelection = magicWandSelection.active && magicWandSelection.selectedCells.size > 0;
    const hasLassoSelection = !hasMagicSelection && lassoSelection.active && lassoSelection.selectedCells.size > 0;

    const transformedCells = selectedCells
      ? transformSelectedCellsForFlip(selectedCells, bounds, 'vertical')
      : null;

    // Apply vertical flip
    if (moveState) {
      const flippedMoveData = applyVerticalFlip(moveState.originalData, bounds, selectedCells || undefined);
      setMoveState({
        ...moveState,
        originalData: flippedMoveData
      });
    } else {
      const flippedData = applyVerticalFlip(cells, bounds, selectedCells || undefined);
      setCanvasData(flippedData);
    }

    if (hasMagicSelection && transformedCells) {
      updateMagicWandSelectedCells(transformedCells);
    } else if (hasLassoSelection && transformedCells) {
      updateLassoSelectedCells(transformedCells);
      if (lassoSelection.path.length > 0) {
        const flippedPath = transformLassoPathForFlip(lassoSelection.path, bounds, 'vertical');
        setLassoPath(flippedPath);
      }
    }
  }, [
    cells,
    width,
    height,
    currentFrameIndex,
    pushCanvasHistory,
    selection,
    lassoSelection,
    magicWandSelection,
    setCanvasData,
    moveState,
    setMoveState,
    updateLassoSelectedCells,
    setLassoPath,
    updateMagicWandSelectedCells
  ]);

  /**
   * Get description of what will be flipped for UI feedback
   */
  const getFlipDescription = useCallback((): string => {
    if (magicWandSelection.active && magicWandSelection.selectedCells.size > 0) {
      return `magic wand selection (${magicWandSelection.selectedCells.size} cells)`;
    }
    
    if (lassoSelection.active && lassoSelection.selectedCells.size > 0) {
      return `lasso selection (${lassoSelection.selectedCells.size} cells)`;
    }
    
    if (selection.active) {
      const width = Math.abs(selection.end.x - selection.start.x) + 1;
      const height = Math.abs(selection.end.y - selection.start.y) + 1;
      return `rectangular selection (${width}×${height})`;
    }
    
    return `entire canvas (${width}×${height})`;
  }, [
    selection,
    lassoSelection,
    magicWandSelection,
    width,
    height
  ]);

  return {
    flipHorizontal,
    flipVertical,
    getFlipDescription
  };
};