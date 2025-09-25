import { useCallback } from 'react';
import { useAnimationStore } from '../stores/animationStore';
import { useToolStore } from '../stores/toolStore';
import type { 
  Cell,
  AddFrameHistoryAction, 
  DuplicateFrameHistoryAction, 
  DeleteFrameHistoryAction, 
  ReorderFramesHistoryAction, 
  UpdateDurationHistoryAction,
  UpdateNameHistoryAction
} from '../types';

/**
 * Custom hook that provides animation actions with integrated undo/redo history
 * This ensures all timeline operations are recorded in the history stack
 */
export const useAnimationHistory = () => {
  const { 
    frames, 
    currentFrameIndex, 
    addFrame: addFrameStore, 
    removeFrame: removeFrameStore, 
    duplicateFrame: duplicateFrameStore, 
    updateFrameDuration: updateFrameDurationStore, 
    updateFrameName: updateFrameNameStore, 
    reorderFrames: reorderFramesStore 
  } = useAnimationStore();
  
  const { pushToHistory } = useToolStore();

  /**
   * Add a new blank frame with history recording
   */
  const addFrame = useCallback((atIndex?: number) => {
    const insertIndex = atIndex !== undefined ? atIndex : frames.length;
    const previousCurrentFrame = currentFrameIndex;
    
    // Create blank canvas data for new frame
    const blankCanvasData = new Map<string, Cell>();
    
    // Create history action before making the change
    const historyAction: AddFrameHistoryAction = {
      type: 'add_frame',
      timestamp: Date.now(),
      description: `Add frame at position ${insertIndex + 1}`,
      data: {
        frameIndex: insertIndex,
        frame: {
          id: `frame-${Date.now()}-${Math.random()}` as any,
          name: `Frame ${insertIndex + 1}`,
          duration: 1000, // Default duration
          data: new Map(blankCanvasData),
          thumbnail: undefined
        },
        canvasData: new Map(blankCanvasData),
        previousCurrentFrame
      }
    };
    
    // Execute the action
    addFrameStore(insertIndex, blankCanvasData);
    
    // Record in history
    pushToHistory(historyAction);
  }, [frames.length, currentFrameIndex, addFrameStore, pushToHistory]);

  /**
   * Duplicate a frame with history recording
   */
  const duplicateFrame = useCallback((index: number) => {
    const frameToDuplicate = frames[index];
    if (!frameToDuplicate) return;
    
    const previousCurrentFrame = currentFrameIndex;
    
    // Create history action
    const historyAction: DuplicateFrameHistoryAction = {
      type: 'duplicate_frame',
      timestamp: Date.now(),
      description: `Duplicate frame ${index + 1}`,
      data: {
        originalIndex: index,
        newIndex: index + 1,
        frame: {
          ...frameToDuplicate,
          data: new Map(frameToDuplicate.data)
        },
        previousCurrentFrame
      }
    };
    
    // Execute the action
    duplicateFrameStore(index);
    
    // Record in history
    pushToHistory(historyAction);
  }, [frames, currentFrameIndex, duplicateFrameStore, pushToHistory]);

  /**
   * Remove a frame with history recording
   */
  const removeFrame = useCallback((index: number) => {
    const frameToDelete = frames[index];
    if (!frameToDelete || frames.length <= 1) return;
    
    const previousCurrentFrame = currentFrameIndex;
    let newCurrentFrame = currentFrameIndex;
    
    if (index <= currentFrameIndex && currentFrameIndex > 0) {
      newCurrentFrame = currentFrameIndex - 1;
    } else if (newCurrentFrame >= frames.length - 1) {
      newCurrentFrame = frames.length - 2;
    }
    
    // Create history action
    const historyAction: DeleteFrameHistoryAction = {
      type: 'delete_frame',
      timestamp: Date.now(),
      description: `Delete frame ${index + 1}`,
      data: {
        frameIndex: index,
        frame: {
          ...frameToDelete,
          data: new Map(frameToDelete.data)
        },
        previousCurrentFrame,
        newCurrentFrame
      }
    };
    
    // Execute the action
    removeFrameStore(index);
    
    // Record in history
    pushToHistory(historyAction);
  }, [frames, currentFrameIndex, removeFrameStore, pushToHistory]);

  /**
   * Reorder frames with history recording
   */
  const reorderFrames = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || fromIndex >= frames.length ||
        toIndex < 0 || toIndex > frames.length ||
        fromIndex === toIndex) {
      return;
    }
    
    const previousCurrentFrame = currentFrameIndex;
    let newCurrentFrame = currentFrameIndex;
    
    if (currentFrameIndex === fromIndex) {
      newCurrentFrame = toIndex;
    } else if (fromIndex < currentFrameIndex && toIndex >= currentFrameIndex) {
      newCurrentFrame = currentFrameIndex - 1;
    } else if (fromIndex > currentFrameIndex && toIndex <= currentFrameIndex) {
      newCurrentFrame = currentFrameIndex + 1;
    }
    
    // Create history action
    const historyAction: ReorderFramesHistoryAction = {
      type: 'reorder_frames',
      timestamp: Date.now(),
      description: `Move frame ${fromIndex + 1} to position ${toIndex + 1}`,
      data: {
        fromIndex,
        toIndex,
        previousCurrentFrame,
        newCurrentFrame
      }
    };
    
    // Execute the action
    reorderFramesStore(fromIndex, toIndex);
    
    // Record in history
    pushToHistory(historyAction);
  }, [frames.length, currentFrameIndex, reorderFramesStore, pushToHistory]);

  /**
   * Update frame duration with history recording
   */
  const updateFrameDuration = useCallback((index: number, duration: number) => {
    const frame = frames[index];
    if (!frame || frame.duration === duration) return;
    
    // Create history action
    const historyAction: UpdateDurationHistoryAction = {
      type: 'update_duration',
      timestamp: Date.now(),
      description: `Change frame ${index + 1} duration to ${duration}ms`,
      data: {
        frameIndex: index,
        oldDuration: frame.duration,
        newDuration: duration
      }
    };
    
    // Execute the action
    updateFrameDurationStore(index, duration);
    
    // Record in history
    pushToHistory(historyAction);
  }, [frames, updateFrameDurationStore, pushToHistory]);

  /**
   * Update frame name with history recording
   */
  const updateFrameName = useCallback((index: number, name: string) => {
    const frame = frames[index];
    if (!frame || frame.name === name) return;
    
    // Create history action
    const historyAction: UpdateNameHistoryAction = {
      type: 'update_name',
      timestamp: Date.now(),
      description: `Rename frame ${index + 1} to "${name}"`,
      data: {
        frameIndex: index,
        oldName: frame.name,
        newName: name
      }
    };
    
    // Execute the action
    updateFrameNameStore(index, name);
    
    // Record in history
    pushToHistory(historyAction);
  }, [frames, updateFrameNameStore, pushToHistory]);

  return {
    addFrame,
    duplicateFrame,
    removeFrame,
    reorderFrames,
    updateFrameDuration,
    updateFrameName
  };
};
