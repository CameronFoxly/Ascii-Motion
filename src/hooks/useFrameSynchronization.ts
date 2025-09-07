import { useEffect, useCallback, useRef } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import type { Cell } from '../types';

/**
 * Hook that manages synchronization between canvas state and animation frames
 * - Auto-saves canvas changes to current frame
 * - Auto-loads frame data when switching frames
 * - Handles frame switching with proper data persistence
 */
export const useFrameSynchronization = () => {
  const { cells, setCanvasData } = useCanvasStore();
  const { 
    currentFrameIndex, 
    setFrameData, 
    getFrameData, 
    getCurrentFrame,
    isPlaying,
    isDraggingFrame
  } = useAnimationStore();
  
  const lastFrameIndexRef = useRef<number>(currentFrameIndex);
  const lastCellsRef = useRef<Map<string, Cell>>(new Map());
  const isLoadingFrameRef = useRef<boolean>(false);

  // Auto-save current canvas to current frame whenever canvas changes
  const saveCurrentCanvasToFrame = useCallback(() => {
    if (isLoadingFrameRef.current || isPlaying || isDraggingFrame) return; // Don't save during frame loading, playback, or dragging
    
    // Add small delay to prevent race conditions during frame reordering
    setTimeout(() => {
      if (isLoadingFrameRef.current || isPlaying || isDraggingFrame) return;
      
      const currentCells = new Map(cells);
      setFrameData(currentFrameIndex, currentCells);
      lastCellsRef.current = currentCells;
    }, 50);
  }, [cells, currentFrameIndex, setFrameData, isPlaying, isDraggingFrame]);

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
      // Save current canvas to the frame we're leaving (if not during playback or dragging)
      if (!isPlaying && !isLoadingFrameRef.current && !isDraggingFrame) {
        setFrameData(previousFrameIndex, new Map(cells));
      }
      
      // Load the new frame's data
      loadFrameToCanvas(currentFrameIndex);
      
      lastFrameIndexRef.current = currentFrameIndex;
    }
  }, [currentFrameIndex, cells, setFrameData, loadFrameToCanvas, isPlaying, isDraggingFrame]);

  // Auto-save canvas changes to current frame (debounced)
  useEffect(() => {
    if (isLoadingFrameRef.current || isPlaying || isDraggingFrame) return;
    
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
  }, [cells, saveCurrentCanvasToFrame, isPlaying, isDraggingFrame]);

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
