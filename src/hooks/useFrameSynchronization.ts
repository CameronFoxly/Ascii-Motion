import React, { useEffect, useCallback, useRef } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import { useToolStore } from '../stores/toolStore';
import type { Cell } from '../types';

/**
 * Hook that manages synchronization between canvas state and animation frames
 * - Auto-saves canvas changes to current frame
 * - Auto-loads frame data when switching frames
 * - Handles frame switching with proper data persistence
 */
export const useFrameSynchronization = (
  moveStateParam?: { 
    originalData: Map<string, Cell>;
    startPos: { x: number; y: number };
    baseOffset: { x: number; y: number };
    currentOffset: { x: number; y: number };
  } | null,
  setMoveStateParam?: React.Dispatch<React.SetStateAction<{ 
    originalData: Map<string, Cell>;
    startPos: { x: number; y: number };
    baseOffset: { x: number; y: number };
    currentOffset: { x: number; y: number };
  } | null>>
) => {
  const { cells, setCanvasData, width, height } = useCanvasStore();
  const { 
    currentFrameIndex, 
    setFrameData, 
    getFrameData, 
    getCurrentFrame,
    isPlaying,
    isDraggingFrame,
    isDeletingFrame
  } = useAnimationStore();
  
  // Get selection state and clearing functions  
  const { 
    selection,
    lassoSelection, 
    magicWandSelection,
    clearSelection,
    clearLassoSelection,
    clearMagicWandSelection
  } = useToolStore();
  
  const lastFrameIndexRef = useRef<number>(currentFrameIndex);
  const lastCellsRef = useRef<Map<string, Cell>>(new Map());
  const isLoadingFrameRef = useRef<boolean>(false);

  // Auto-save current canvas to current frame whenever canvas changes
  const saveCurrentCanvasToFrame = useCallback(() => {
    if (isLoadingFrameRef.current || isPlaying || isDraggingFrame || isDeletingFrame) return; // Don't save during frame loading, playback, dragging, or deletion
    
    // Add small delay to prevent race conditions during frame reordering
    setTimeout(() => {
      if (isLoadingFrameRef.current || isPlaying || isDraggingFrame || isDeletingFrame) return;
      
      const currentCells = new Map(cells);
      setFrameData(currentFrameIndex, currentCells);
      lastCellsRef.current = currentCells;
    }, 50);
  }, [cells, currentFrameIndex, setFrameData, isPlaying, isDraggingFrame, isDeletingFrame]);

  // Load frame data into canvas when frame changes
  const loadFrameToCanvas = useCallback((frameIndex: number) => {
    isLoadingFrameRef.current = true;
    
    const frameData = getFrameData(frameIndex);
    if (frameData) {
      setCanvasData(frameData);
    } else {
      // If frame has no data, clear canvas
      setCanvasData(new Map());
    }
    
    // Small delay to ensure canvas update completes
    setTimeout(() => {
      isLoadingFrameRef.current = false;
    }, 0);
  }, [getFrameData, setCanvasData]);

  // Handle frame switching
  useEffect(() => {
    const previousFrameIndex = lastFrameIndexRef.current;
    
    if (currentFrameIndex !== previousFrameIndex) {
      let currentCellsToSave = new Map(cells);
      
      // Commit any pending move operations to the original frame before clearing state
      if (moveStateParam && setMoveStateParam) {
        const totalOffset = {
          x: moveStateParam.baseOffset.x + moveStateParam.currentOffset.x,
          y: moveStateParam.baseOffset.y + moveStateParam.currentOffset.y
        };

        // Create a new canvas data map with the moved cells
        const newCells = new Map(cells);

        // Clear original positions
        moveStateParam.originalData.forEach((_, key) => {
          newCells.delete(key);
        });

        // Place cells at new positions
        moveStateParam.originalData.forEach((cell, key) => {
          const [origX, origY] = key.split(',').map(Number);
          const newX = origX + totalOffset.x;
          const newY = origY + totalOffset.y;
          
          // Only place if within bounds
          if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
            newCells.set(`${newX},${newY}`, cell);
          }
        });

        // Update the cells to save with the committed move
        currentCellsToSave = newCells;
        
        // Update canvas data with committed move
        setCanvasData(newCells);
        
        // Clear move state after committing
        setMoveStateParam(null);
      }
      
      // Clear all active selections when navigating between frames
      // This prevents selection content from being copied to the new frame
      if (selection.active) {
        clearSelection();
      }
      if (lassoSelection.active) {
        clearLassoSelection();
      }
      if (magicWandSelection.active) {
        clearMagicWandSelection();
      }
      
      // Save current canvas (with committed moves) to the frame we're leaving
      if (!isPlaying && !isLoadingFrameRef.current && !isDraggingFrame && !isDeletingFrame) {
        setFrameData(previousFrameIndex, currentCellsToSave);
      }
      
      // Load the new frame's data
      loadFrameToCanvas(currentFrameIndex);
      
      lastFrameIndexRef.current = currentFrameIndex;
    }
  }, [currentFrameIndex, cells, setFrameData, loadFrameToCanvas, isPlaying, isDraggingFrame, isDeletingFrame, moveStateParam, setMoveStateParam, selection.active, lassoSelection.active, magicWandSelection.active, clearSelection, clearLassoSelection, clearMagicWandSelection]);

  // Auto-save canvas changes to current frame (debounced)
  useEffect(() => {
    if (isLoadingFrameRef.current || isPlaying || isDraggingFrame || isDeletingFrame) return;
    
    // Check if cells actually changed to avoid unnecessary saves
    const currentCellsString = JSON.stringify(Array.from(cells.entries()).sort());
    const lastCellsString = JSON.stringify(Array.from(lastCellsRef.current.entries()).sort());
    
    if (currentCellsString !== lastCellsString) {
      // Longer delay to prevent interference with drag operations
      const timeoutId = setTimeout(() => {
        if (!isLoadingFrameRef.current && !isPlaying) {
          saveCurrentCanvasToFrame();
        }
      }, 150);
      
      return () => clearTimeout(timeoutId);
    }
  }, [cells, saveCurrentCanvasToFrame, isPlaying, isDraggingFrame, isDeletingFrame]);

  // Initialize first frame with current canvas data if empty
  useEffect(() => {
    const currentFrame = getCurrentFrame();
    if (currentFrame && currentFrame.data.size === 0 && cells.size > 0) {
      setFrameData(currentFrameIndex, new Map(cells));
    }
  }, []); // Only run once on mount

  return {
    saveCurrentCanvasToFrame,
    loadFrameToCanvas,
    isLoadingFrame: isLoadingFrameRef.current
  };
};
