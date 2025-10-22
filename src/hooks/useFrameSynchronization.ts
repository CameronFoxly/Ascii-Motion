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
    originalPositions: Set<string>;
    startPos: { x: number; y: number };
    baseOffset: { x: number; y: number };
    currentOffset: { x: number; y: number };
  } | null,
  setMoveStateParam?: React.Dispatch<React.SetStateAction<{ 
    originalData: Map<string, Cell>;
    originalPositions: Set<string>;
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
    isDeletingFrame,
    isImportingSession
  } = useAnimationStore();
  
  // Get selection state and clearing functions  
  const { 
    selection,
    lassoSelection, 
    magicWandSelection,
    clearSelection,
    clearLassoSelection,
    clearMagicWandSelection,
    isProcessingHistory
  } = useToolStore();
  
  const lastFrameIndexRef = useRef<number>(currentFrameIndex);
  const lastCellsRef = useRef<Map<string, Cell>>(new Map());
  const isLoadingFrameRef = useRef<boolean>(false);
  const frameWasEmptyOnLoadRef = useRef<boolean>(false);

  // Auto-save current canvas to current frame whenever canvas changes
  const saveCurrentCanvasToFrame = useCallback(() => {
    if (isLoadingFrameRef.current || isPlaying || isDraggingFrame || isDeletingFrame || isImportingSession || isProcessingHistory) return; // Don't save during frame loading, playback, dragging, deletion, session import, or undo/redo
    
    // Add small delay to prevent race conditions during frame reordering
    setTimeout(() => {
      if (isLoadingFrameRef.current || isPlaying || isDraggingFrame || isDeletingFrame || isImportingSession || isProcessingHistory) return;
      
      const currentCells = new Map(cells);
      setFrameData(currentFrameIndex, currentCells);
      lastCellsRef.current = currentCells;
    }, 50);
  }, [cells, currentFrameIndex, setFrameData, isPlaying, isDraggingFrame, isDeletingFrame, isImportingSession, isProcessingHistory]);

  // Load frame data into canvas when frame changes
  const loadFrameToCanvas = useCallback((frameIndex: number) => {
    isLoadingFrameRef.current = true;
    
    const frameData = getFrameData(frameIndex);
    
    if (frameData && frameData.size > 0) {
      setCanvasData(frameData);
      // Update the reference to prevent false auto-save triggers
      lastCellsRef.current = new Map(frameData);
      frameWasEmptyOnLoadRef.current = false;
    } else {
      // If frame has no data, clear canvas
      setCanvasData(new Map());
      // Update the reference to reflect the empty canvas
      lastCellsRef.current = new Map();
      frameWasEmptyOnLoadRef.current = true;
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
        // CRITICAL: Use the last known cells state, not current cells which may have already been updated
      let currentCellsToSave = new Map(lastCellsRef.current);
      
      // Commit any pending move operations to the original frame before clearing state
      if (moveStateParam && setMoveStateParam) {
        const totalOffset = {
          x: moveStateParam.baseOffset.x + moveStateParam.currentOffset.x,
          y: moveStateParam.baseOffset.y + moveStateParam.currentOffset.y
        };

        // Create a new canvas data map with the moved cells
        const newCells = new Map(cells);

        // Clear original positions
        const originalKeys = moveStateParam.originalPositions ?? new Set(moveStateParam.originalData.keys());
        originalKeys.forEach((key) => {
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
      if (!isPlaying && !isLoadingFrameRef.current && !isDraggingFrame && !isDeletingFrame && !isImportingSession && !isProcessingHistory) {
        // Only save if the canvas content has actually changed from what was last loaded
        const lastLoadedCells = lastCellsRef.current;
        const cellsChanged = JSON.stringify(Array.from(currentCellsToSave.entries()).sort()) !== 
                           JSON.stringify(Array.from(lastLoadedCells.entries()).sort());
        
        // Don't save to frames that were empty when loaded unless user actually added content
        const previousFrameData = getFrameData(previousFrameIndex);
        const previousFrameWasEmpty = !previousFrameData || previousFrameData.size === 0;
        const userAddedContentToEmptyFrame = previousFrameWasEmpty && currentCellsToSave.size > 0;
        
        if (cellsChanged && (!previousFrameWasEmpty || userAddedContentToEmptyFrame)) {
          setFrameData(previousFrameIndex, currentCellsToSave);
        }
      }
      
      // Load the new frame's data
      loadFrameToCanvas(currentFrameIndex);
      
      lastFrameIndexRef.current = currentFrameIndex;
    }
  }, [currentFrameIndex, cells, setFrameData, getFrameData, loadFrameToCanvas, isPlaying, isDraggingFrame, isDeletingFrame, isImportingSession, isProcessingHistory, moveStateParam, setMoveStateParam, selection.active, lassoSelection.active, magicWandSelection.active, clearSelection, clearLassoSelection, clearMagicWandSelection, width, height, setCanvasData]);

  // Auto-save canvas changes to current frame (debounced)
  useEffect(() => {
    if (isLoadingFrameRef.current || isPlaying || isDraggingFrame || isDeletingFrame || isImportingSession || isProcessingHistory) return;
    
    // Check if cells actually changed from the last known state to avoid unnecessary saves
    const currentCellsString = JSON.stringify(Array.from(cells.entries()).sort());
    const lastCellsString = JSON.stringify(Array.from(lastCellsRef.current.entries()).sort());
    
    if (currentCellsString !== lastCellsString) {
      // Only save if the canvas content doesn't match the current frame's stored content
      // This prevents saving when the canvas is loaded with frame data
      const timeoutId = setTimeout(() => {
        if (!isLoadingFrameRef.current && !isPlaying && !isDraggingFrame && !isDeletingFrame && !isImportingSession && !isProcessingHistory) {
          saveCurrentCanvasToFrame();
        }
      }, 150);
      
      return () => clearTimeout(timeoutId);
    }
  }, [cells, saveCurrentCanvasToFrame, isPlaying, isDraggingFrame, isDeletingFrame, isImportingSession, isProcessingHistory]);

  // Initialize first frame with current canvas data if empty (only on app startup)
  // CRITICAL: This useEffect was previously contaminating ALL empty frames when switching
  // See docs/FRAME_SYNCHRONIZATION_DEBUGGING_GUIDE.md for detailed analysis and prevention patterns
  useEffect(() => {
    const currentFrame = getCurrentFrame();
    // Only initialize if we're on frame 0 AND it's empty AND canvas has content
    // This prevents contaminating empty frames when switching between frames
    if (currentFrameIndex === 0 && currentFrame && currentFrame.data.size === 0 && cells.size > 0 && !isLoadingFrameRef.current) {
      setFrameData(currentFrameIndex, new Map(cells));
    }
  }, [getCurrentFrame, cells, currentFrameIndex, setFrameData]);

  return {
    saveCurrentCanvasToFrame,
    loadFrameToCanvas,
    isLoadingFrame: isLoadingFrameRef.current
  };
};
