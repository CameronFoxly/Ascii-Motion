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
import { cloneFrame, cloneFrames } from '../utils/frameUtils';

/**
 * Custom hook that provides animation actions with integrated undo/redo history
 * This ensures all timeline operations are recorded in the history stack
 */
export const useAnimationHistory = () => {
  const { 
    frames, 
    currentFrameIndex, 
    selectedFrameIndices,
    addFrame: addFrameStore, 
    removeFrame: removeFrameStore, 
    duplicateFrame: duplicateFrameStore, 
    duplicateFrameRange: duplicateFrameRangeStore,
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
        frame: cloneFrame(frameToDuplicate),
        previousCurrentFrame
      }
    };
    
    // Execute the action
    duplicateFrameStore(index);
    
    // Record in history
    pushToHistory(historyAction);
  }, [frames, currentFrameIndex, duplicateFrameStore, pushToHistory]);

  const duplicateFrameRange = useCallback((frameIndices: number[]) => {
    if (frameIndices.length === 0) return;

    const uniqueIndices = Array.from(new Set(frameIndices)).sort((a, b) => a - b);

    if (uniqueIndices.length === 1) {
      duplicateFrame(uniqueIndices[0]);
      return;
    }

    if (uniqueIndices.some(idx => idx < 0 || idx >= frames.length)) {
      return;
    }

    const previousFramesSnapshot = cloneFrames(frames);
    const previousSelection = Array.from(selectedFrameIndices).sort((a, b) => a - b);
    const previousCurrentFrame = currentFrameIndex;

    duplicateFrameRangeStore(uniqueIndices);

    const {
      frames: framesAfter,
      selectedFrameIndices: selectionAfter,
      currentFrameIndex: currentAfter
    } = useAnimationStore.getState();

    const newFramesSnapshot = cloneFrames(framesAfter);
    const newSelection = Array.from(selectionAfter).sort((a, b) => a - b);
    const previousFrameIds = new Set(previousFramesSnapshot.map(frame => frame.id));
    const insertedFrameIds = framesAfter
      .filter(frame => !previousFrameIds.has(frame.id))
      .map(frame => frame.id);

    const historyAction: import('../types').DuplicateFrameRangeHistoryAction = {
      type: 'duplicate_frame_range',
      timestamp: Date.now(),
      description: `Duplicate ${uniqueIndices.length} frame${uniqueIndices.length > 1 ? 's' : ''}`,
      data: {
        originalFrameIndices: uniqueIndices,
        insertedFrameIds,
        previousFrames: previousFramesSnapshot,
        newFrames: newFramesSnapshot,
        previousSelection,
        newSelection,
        previousCurrentFrame,
        newCurrentFrame: currentAfter
      }
    };

    pushToHistory(historyAction);
  }, [frames, currentFrameIndex, duplicateFrameRangeStore, pushToHistory, selectedFrameIndices, duplicateFrame]);

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
        frame: cloneFrame(frameToDelete),
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

  /**
   * Add multiple frames with history recording
   */
  const addMultipleFrames = useCallback((count: number, sourceFrame?: any) => {
    if (count <= 0) return;
    
    // For now, add frames one by one using the existing single-frame method
    // This ensures each frame is properly tracked in history
    for (let i = 0; i < count; i++) {
      if (sourceFrame) {
        // Use duplicate frame functionality
        const currentLength = frames.length + i;
        duplicateFrame(Math.min(currentFrameIndex, currentLength - 1));
      } else {
        // Add blank frame
        addFrame();
      }
    }
  }, [frames.length, currentFrameIndex, addFrame, duplicateFrame]);

  /**
   * Delete multiple frames at once with history recording
   */
  const deleteFrameRange = useCallback((frameIndices: number[]) => {
    if (frameIndices.length === 0) return;
    
    // Sort indices to get correct frame data before deletion
    const sortedIndices = [...frameIndices].sort((a, b) => a - b);
    
    // Collect frames to be deleted
    const framesToDelete = sortedIndices
      .map(idx => frames[idx])
      .filter((frame): frame is typeof frames[number] => Boolean(frame));
    
    if (framesToDelete.length === 0 || framesToDelete.length >= frames.length) {
      // Can't delete all frames
      return;
    }
    
    const previousCurrentFrame = currentFrameIndex;
    
    // Calculate new current frame after deletion
    const removedBeforeCurrent = sortedIndices.filter(idx => idx < currentFrameIndex).length;
    const newCurrentFrame = Math.max(0, Math.min(
      currentFrameIndex - removedBeforeCurrent,
      frames.length - framesToDelete.length - 1
    ));
    
    // Create history action
    const previousFramesSnapshot = cloneFrames(frames);

    const selectionBeforeDelete = Array.from(selectedFrameIndices).sort((a, b) => a - b);

    const historyAction: import('../types').DeleteFrameRangeHistoryAction = {
      type: 'delete_frame_range',
      timestamp: Date.now(),
      description: `Delete ${framesToDelete.length} frame${framesToDelete.length > 1 ? 's' : ''}`,
      data: {
        frameIndices: sortedIndices,
  frames: framesToDelete.map((frame) => cloneFrame(frame)),
        previousCurrentFrame,
        newCurrentFrame,
        previousFrames: previousFramesSnapshot,
        previousSelection: selectionBeforeDelete
      }
    };
    
    // Execute the action
    useAnimationStore.getState().removeFrameRange(sortedIndices);
    
    // Record in history
    pushToHistory(historyAction);
  }, [frames, currentFrameIndex, pushToHistory]);

  /**
   * Delete all frames and reset to single blank frame with history recording
   */
  const deleteAllFramesWithReset = useCallback(() => {
    const previousCurrentFrame = currentFrameIndex;
    const framesToSave = cloneFrames(frames);
    
    // Create history action
    const historyAction: import('../types').DeleteAllFramesHistoryAction = {
      type: 'delete_all_frames',
      timestamp: Date.now(),
      description: 'Delete all frames',
      data: {
        frames: framesToSave,
        previousCurrentFrame
      }
    };
    
    // Execute the action
    useAnimationStore.getState().clearAllFrames();
    
    // Record in history
    pushToHistory(historyAction);
  }, [frames, currentFrameIndex, pushToHistory, selectedFrameIndices]);

  /**
   * Reorder multiple frames as a contiguous group with history recording
   */
  const reorderFrameRange = useCallback((frameIndices: number[], targetIndex: number) => {
    if (frameIndices.length === 0) return;
    
    const sortedIndices = [...frameIndices].sort((a, b) => a - b);
    
    // Validate indices
    if (sortedIndices.some(idx => idx < 0 || idx >= frames.length)) {
      return;
    }
    
    const previousCurrentFrame = currentFrameIndex;
    
    // Calculate new current frame after reordering
    let newCurrentFrame = currentFrameIndex;
    
    if (sortedIndices.includes(currentFrameIndex)) {
      // Current frame is being moved
      const framesBefore = sortedIndices.filter(idx => idx < targetIndex).length;
      const adjustedTarget = Math.max(0, targetIndex - framesBefore);
      const positionInSelection = sortedIndices.indexOf(currentFrameIndex);
      newCurrentFrame = adjustedTarget + positionInSelection;
    } else {
      // Adjust current index based on movement
      const movedFromBefore = sortedIndices.filter(idx => idx < currentFrameIndex).length;
      const movedToBefore = targetIndex <= currentFrameIndex ? frameIndices.length : 0;
      newCurrentFrame = currentFrameIndex - movedFromBefore + movedToBefore;
    }
    
    newCurrentFrame = Math.max(0, Math.min(newCurrentFrame, frames.length - 1));
    
    // Create history action
    const movedFrameIds = sortedIndices
      .map(idx => frames[idx])
      .filter((frame): frame is typeof frames[number] => Boolean(frame))
      .map(frame => frame.id);

    const previousSelectionFrameIds = Array.from(selectedFrameIndices)
      .map(idx => frames[idx])
      .filter((frame): frame is typeof frames[number] => Boolean(frame))
      .map(frame => frame.id);

    const historyAction: import('../types').ReorderFrameRangeHistoryAction = {
      type: 'reorder_frame_range',
      timestamp: Date.now(),
      description: `Move ${frameIndices.length} frame${frameIndices.length > 1 ? 's' : ''} to position ${targetIndex + 1}`,
      data: {
        frameIndices: sortedIndices,
        targetIndex,
        previousCurrentFrame,
        newCurrentFrame,
        movedFrameIds,
        previousSelectionFrameIds,
        newSelectionFrameIds: movedFrameIds
      }
    };
    
    // Execute the action
    useAnimationStore.getState().reorderFrameRange(sortedIndices, targetIndex);
    
    // Record in history
    pushToHistory(historyAction);
  }, [frames, currentFrameIndex, pushToHistory, selectedFrameIndices]);

  return {
    addFrame,
    duplicateFrame,
    duplicateFrameRange,
    removeFrame,
    reorderFrames,
    updateFrameDuration,
    updateFrameName,
    addMultipleFrames,
    deleteFrameRange,
    deleteAllFramesWithReset,
    reorderFrameRange
  };
};
