import { create } from 'zustand';
import type { Animation, Frame, FrameId, Cell } from '../types';
import { DEFAULT_FRAME_DURATION } from '../constants';

interface AnimationState extends Animation {
  // Drag state for frame reordering
  isDraggingFrame: boolean;
  
  // Deletion state for frame removal
  isDeletingFrame: boolean;
  
  // Timeline zoom state
  timelineZoom: number; // 0.5 to 1.0 (50% to 100%)
  
  // Multi-frame selection state
  selectedFrameIndices: Set<number>; // Set of selected frame indices (includes active frame)
  
  // Onion skin state
  onionSkin: {
    enabled: boolean;
    previousFrames: number; // 0-10 frames back
    nextFrames: number;     // 0-10 frames forward
    wasEnabledBeforePlayback: boolean; // To restore after pause
  };
  
  // Actions (enhanced with history support)
  addFrame: (atIndex?: number, canvasData?: Map<string, Cell>, duration?: number) => void;
  removeFrame: (index: number) => void;
  duplicateFrame: (index: number) => void;
  setCurrentFrame: (index: number) => void;
  setCurrentFrameOnly: (index: number) => void; // Set current frame without clearing selection
  updateFrameDuration: (index: number, duration: number) => void;
  updateFrameName: (index: number, name: string) => void;
  reorderFrames: (fromIndex: number, toIndex: number) => void;
  
  // Batch operations for multi-frame selection
  removeFrameRange: (frameIndices: number[]) => void;
  clearAllFrames: () => void;
  reorderFrameRange: (frameIndices: number[], targetIndex: number) => void;
  
  // Bulk import operations
  importFramesOverwrite: (frames: Array<{ data: Map<string, Cell>, duration: number }>, startIndex: number) => void;
  importFramesAppend: (frames: Array<{ data: Map<string, Cell>, duration: number }>) => void;
  importSessionFrames: (frames: Array<{ id: string, name: string, duration: number, data: Map<string, Cell>, thumbnail?: string }>) => void;
  
  // Drag controls
  setDraggingFrame: (isDragging: boolean) => void;
  
  // Deletion controls  
  setDeletingFrame: (isDeleting: boolean) => void;
  
  // Timeline zoom actions
  setTimelineZoom: (zoom: number) => void;
  
  // Onion skin actions
  toggleOnionSkin: () => void;
  setPreviousFrames: (count: number) => void;
  setNextFrames: (count: number) => void;
  setOnionSkinEnabled: (enabled: boolean) => void;
  
  // Selection management actions
  selectFrameRange: (startIndex: number, endIndex: number) => void;
  clearSelection: () => void;
  isFrameSelected: (index: number) => boolean;
  getSelectedFrameIndices: () => number[];
  getSelectionRange: () => { start: number; end: number } | null;
  
  // Frame data management
  setFrameData: (frameIndex: number, data: Map<string, Cell>) => void;
  getFrameData: (frameIndex: number) => Map<string, Cell> | undefined;
  
  // Playback controls
  play: () => void;
  pause: () => void;
  stop: () => void;
  togglePlayback: () => void;
  setLooping: (looping: boolean) => void;
  setFrameRate: (fps: number) => void;
  
  // Navigation
  nextFrame: () => void;
  previousFrame: () => void;
  goToFrame: (index: number) => void;
  
  // Computed values
  getCurrentFrame: () => Frame | undefined;
  getTotalFrames: () => number;
  calculateTotalDuration: () => number;
  getFrameAtTime: (time: number) => number;
}

const createEmptyFrame = (id?: FrameId, name?: string): Frame => ({
  id: (id || `frame-${Date.now()}-${Math.random()}`) as FrameId,
  name: name || `Frame ${Date.now()}`,
  duration: DEFAULT_FRAME_DURATION,
  data: new Map<string, Cell>(),
  thumbnail: undefined
});

export const useAnimationStore = create<AnimationState>((set, get) => ({
  // Initial state
  frames: [createEmptyFrame(undefined, "Frame 1")],
  currentFrameIndex: 0,
  selectedFrameIndices: new Set([0]), // Active frame is always selected
  isPlaying: false,
  frameRate: 12,
  totalDuration: DEFAULT_FRAME_DURATION,
  looping: false,
  isDraggingFrame: false,
  isDeletingFrame: false,
  
  // Timeline zoom initial state (always reset to 100% on load)
  timelineZoom: 1.0,

  // Onion skin initial state
  onionSkin: {
    enabled: false,
    previousFrames: 1,
    nextFrames: 1,
    wasEnabledBeforePlayback: false,
  },

  // Actions (return data for history recording)
  addFrame: (atIndex?: number, canvasData?: Map<string, Cell>, duration?: number) => {
    set((state) => {
      const newFrame = createEmptyFrame();
      
      // If canvas data provided, use it, otherwise use empty frame
      if (canvasData) {
        newFrame.data = new Map(canvasData);
      }
      
      // If duration provided, use it instead of default
      if (duration !== undefined) {
        newFrame.duration = duration;
      }
      
      const insertIndex = atIndex !== undefined ? atIndex : state.frames.length;
      const newFrames = [...state.frames];
      newFrames.splice(insertIndex, 0, newFrame);
      
      return {
        frames: newFrames,
        currentFrameIndex: insertIndex,
        selectedFrameIndices: new Set([insertIndex]), // Update selection to new frame
        totalDuration: get().calculateTotalDuration()
      };
    });
  },

  removeFrame: (index: number) => {
    // Perform deletion in a single atomic operation with isDeletingFrame flag
    set((state) => {
      if (state.frames.length <= 1) return state; // Can't remove last frame
      
      const newFrames = state.frames.filter((_, i) => i !== index);
      let newCurrentIndex = state.currentFrameIndex;
      
      if (index <= state.currentFrameIndex && state.currentFrameIndex > 0) {
        newCurrentIndex = state.currentFrameIndex - 1;
      } else if (newCurrentIndex >= newFrames.length) {
        newCurrentIndex = newFrames.length - 1;
      }
      
      return {
        frames: newFrames,
        currentFrameIndex: newCurrentIndex,
        selectedFrameIndices: new Set([Math.max(0, newCurrentIndex)]),
        totalDuration: get().calculateTotalDuration(),
        isDeletingFrame: true // Set flag during the same update to prevent frame sync
      };
    });
    
    // Reset the flag after a brief delay to re-enable frame synchronization
    setTimeout(() => {
      set({ isDeletingFrame: false });
    }, 100);
  },

  duplicateFrame: (index: number) => {
    set((state) => {
      const frameToDuplicate = state.frames[index];
      if (!frameToDuplicate) return state;
      
      const duplicatedFrame: Frame = {
        ...frameToDuplicate,
        id: `frame-${Date.now()}-${Math.random()}` as FrameId,
        name: `${frameToDuplicate.name} Copy`,
        data: new Map(frameToDuplicate.data) // Deep copy the data
      };
      
      const newFrames = [...state.frames];
      newFrames.splice(index + 1, 0, duplicatedFrame);
      
      return {
        frames: newFrames,
        currentFrameIndex: index + 1,
        selectedFrameIndices: new Set([index + 1]),
        totalDuration: get().calculateTotalDuration()
      };
    });
  },

  setCurrentFrame: (index: number) => {
    set((state) => {
      if (index < 0 || index >= state.frames.length) return state;
      return { 
        currentFrameIndex: index,
        selectedFrameIndices: new Set([index]) // Reset to single selection
      };
    });
  },

  setCurrentFrameOnly: (index: number) => {
    set((state) => {
      if (index < 0 || index >= state.frames.length) return state;
      return { 
        currentFrameIndex: index
        // Don't modify selectedFrameIndices
      };
    });
  },

  updateFrameDuration: (index: number, duration: number) => {
    set((state) => {
      const newFrames = [...state.frames];
      if (newFrames[index]) {
        newFrames[index] = { ...newFrames[index], duration };
      }
      return {
        frames: newFrames,
        totalDuration: get().calculateTotalDuration()
      };
    });
  },

  updateFrameName: (index: number, name: string) => {
    set((state) => {
      const newFrames = [...state.frames];
      if (newFrames[index]) {
        newFrames[index] = { ...newFrames[index], name };
      }
      return { frames: newFrames };
    });
  },

  reorderFrames: (fromIndex: number, toIndex: number) => {
    set((state) => {
      // Validate indices - toIndex can be frames.length for "append to end"
      if (fromIndex < 0 || fromIndex >= state.frames.length ||
          toIndex < 0 || toIndex > state.frames.length ||
          fromIndex === toIndex) {
        return state; // No change if indices are invalid
      }

      // Create a deep copy of frames to avoid reference issues
      const newFrames = state.frames.map(frame => ({
        id: frame.id,
        name: frame.name,
        duration: frame.duration,
        thumbnail: frame.thumbnail,
        data: new Map(Array.from(frame.data.entries()).map(([key, cell]) => [
          key,
          {
            char: cell.char,
            color: cell.color,
            bgColor: cell.bgColor
          }
        ]))
      }));
      
      // Perform the move operation
      const [movedFrame] = newFrames.splice(fromIndex, 1);
      
      // Handle end-of-list insertion
      if (toIndex >= newFrames.length) {
        newFrames.push(movedFrame); // Append to end
      } else {
        newFrames.splice(toIndex, 0, movedFrame); // Insert at position
      }
      
      // Calculate new current frame index
      let newCurrentIndex = state.currentFrameIndex;
      
      if (state.currentFrameIndex === fromIndex) {
        // The current frame is being moved
        newCurrentIndex = toIndex;
      } else if (fromIndex < state.currentFrameIndex && toIndex >= state.currentFrameIndex) {
        // Frame moved from before current to after/at current position
        newCurrentIndex = state.currentFrameIndex - 1;
      } else if (fromIndex > state.currentFrameIndex && toIndex <= state.currentFrameIndex) {
        // Frame moved from after current to before/at current position
        newCurrentIndex = state.currentFrameIndex + 1;
      }
      
      // Ensure the new index is within bounds
      newCurrentIndex = Math.max(0, Math.min(newCurrentIndex, newFrames.length - 1));
      
      return {
        ...state,
        frames: newFrames,
        currentFrameIndex: newCurrentIndex,
        totalDuration: newFrames.reduce((total, frame) => total + frame.duration, 0),
        isDraggingFrame: true // Keep dragging flag during reorder to prevent frame sync
      };
    });
    
    // Reset the dragging flag after a brief delay to re-enable frame synchronization
    setTimeout(() => {
      set({ isDraggingFrame: false });
    }, 100);
  },

  // Batch operation: Remove multiple frames at once
  removeFrameRange: (frameIndices: number[]) => {
    set((state) => {
      if (frameIndices.length === 0) return state;
      
      // Sort indices in descending order for safe removal
      const sortedIndices = [...frameIndices].sort((a, b) => b - a);
      
      // Check if we'd be removing all frames
      if (sortedIndices.length >= state.frames.length) {
        // Can't remove all frames - must keep at least one
        return state;
      }
      
      // Filter out frames at the specified indices
      const indicesToRemove = new Set(sortedIndices);
      const newFrames = state.frames.filter((_, index) => !indicesToRemove.has(index));
      
      // Calculate new current frame index
      let newCurrentIndex = state.currentFrameIndex;
      
      // Count how many frames before current are being removed
      const removedBeforeCurrent = sortedIndices.filter(idx => idx < state.currentFrameIndex).length;
      newCurrentIndex -= removedBeforeCurrent;
      
      // Ensure new index is within bounds
      newCurrentIndex = Math.max(0, Math.min(newCurrentIndex, newFrames.length - 1));
      
      return {
        frames: newFrames,
        currentFrameIndex: newCurrentIndex,
        selectedFrameIndices: new Set([newCurrentIndex]),
        totalDuration: get().calculateTotalDuration(),
        isDeletingFrame: true
      };
    });
    
    setTimeout(() => {
      set({ isDeletingFrame: false });
    }, 100);
  },

  // Batch operation: Clear all frames and create a single blank frame
  clearAllFrames: () => {
    set(() => ({
      frames: [createEmptyFrame(undefined, "Frame 1")],
      currentFrameIndex: 0,
      selectedFrameIndices: new Set([0]),
      totalDuration: DEFAULT_FRAME_DURATION,
      isDeletingFrame: true
    }));
    
    setTimeout(() => {
      set({ isDeletingFrame: false });
    }, 100);
  },

  // Batch operation: Reorder multiple frames as a contiguous group
  reorderFrameRange: (frameIndices: number[], targetIndex: number) => {
    set((state) => {
      if (frameIndices.length === 0) return state;
      
      // Sort frame indices to maintain order
      const sortedIndices = [...frameIndices].sort((a, b) => a - b);
      
      // Validate indices
      if (sortedIndices.some(idx => idx < 0 || idx >= state.frames.length)) {
        return state;
      }
      
      // Extract frames to move
      const framesToMove = sortedIndices.map(idx => state.frames[idx]);
      
      // Remove moved frames from original positions (in descending order)
      const newFrames = state.frames.filter((_, idx) => !sortedIndices.includes(idx));
      
      // Calculate adjusted target index after removal
      const framesBefore = sortedIndices.filter(idx => idx < targetIndex).length;
      const adjustedTarget = Math.max(0, targetIndex - framesBefore);
      
      // Insert frames at target position
      newFrames.splice(adjustedTarget, 0, ...framesToMove);
      
      // Calculate new current frame index
      let newCurrentIndex = state.currentFrameIndex;
      
      if (sortedIndices.includes(state.currentFrameIndex)) {
        // Current frame is being moved
        const positionInSelection = sortedIndices.indexOf(state.currentFrameIndex);
        newCurrentIndex = adjustedTarget + positionInSelection;
      } else {
        // Adjust current index based on how many frames moved around it
        const movedFromBefore = sortedIndices.filter(idx => idx < state.currentFrameIndex).length;
        const movedToBefore = adjustedTarget <= state.currentFrameIndex ? framesToMove.length : 0;
        newCurrentIndex = state.currentFrameIndex - movedFromBefore + movedToBefore;
      }
      
      newCurrentIndex = Math.max(0, Math.min(newCurrentIndex, newFrames.length - 1));
      
      return {
        ...state,
        frames: newFrames,
        currentFrameIndex: newCurrentIndex,
        totalDuration: newFrames.reduce((total, frame) => total + frame.duration, 0),
        isDraggingFrame: true
      };
    });
    
    setTimeout(() => {
      set({ isDraggingFrame: false });
    }, 100);
  },

  // Frame data management
  setFrameData: (frameIndex: number, data: Map<string, Cell>) => {
    set((state) => {
      const newFrames = [...state.frames];
      if (newFrames[frameIndex]) {
        newFrames[frameIndex] = {
          ...newFrames[frameIndex],
          data: new Map(data)
        };
      }
      return { frames: newFrames };
    });
  },

  getFrameData: (frameIndex: number) => {
    const { frames } = get();
    return frames[frameIndex]?.data;
  },

  // Playback controls
  play: () => {
    set((state) => ({
      isPlaying: true,
      selectedFrameIndices: new Set([state.currentFrameIndex]), // Clear selection to single frame
      onionSkin: {
        ...state.onionSkin,
        wasEnabledBeforePlayback: state.onionSkin.enabled,
        enabled: false // Disable onion skin during playback for performance
      }
    }));
  },
  
  pause: () => {
    set((state) => ({
      isPlaying: false,
      onionSkin: {
        ...state.onionSkin,
        enabled: state.onionSkin.wasEnabledBeforePlayback // Restore previous state
      }
    }));
  },
  
  stop: () => {
    set((state) => ({
      isPlaying: false,
      currentFrameIndex: 0,
      selectedFrameIndices: new Set([0]), // Clear selection to first frame
      onionSkin: {
        ...state.onionSkin,
        enabled: state.onionSkin.wasEnabledBeforePlayback // Restore previous state
      }
    }));
  },
  
  togglePlayback: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  setLooping: (looping: boolean) => set({ looping }),
  setFrameRate: (frameRate: number) => set({ frameRate }),
  setDraggingFrame: (isDraggingFrame: boolean) => set({ isDraggingFrame }),
  setDeletingFrame: (isDeletingFrame: boolean) => set({ isDeletingFrame }),
  
  // Timeline zoom control (60% to 100% range)
  setTimelineZoom: (zoom: number) => {
    const clampedZoom = Math.max(0.60, Math.min(1.0, zoom));
    set({ timelineZoom: clampedZoom });
  },

  // Navigation
  nextFrame: () => {
    set((state) => {
      const nextIndex = state.currentFrameIndex + 1;
      if (nextIndex >= state.frames.length) {
        if (!state.looping) {
          return state;
        }
        return {
          currentFrameIndex: 0,
          selectedFrameIndices: new Set([0])
        };
      }
      return {
        currentFrameIndex: nextIndex,
        selectedFrameIndices: new Set([nextIndex])
      };
    });
  },

  previousFrame: () => {
    set((state) => {
      const prevIndex = state.currentFrameIndex - 1;
      if (prevIndex < 0) {
        if (!state.looping) {
          return state;
        }
        const lastIndex = Math.max(0, state.frames.length - 1);
        return {
          currentFrameIndex: lastIndex,
          selectedFrameIndices: new Set([lastIndex])
        };
      }
      return {
        currentFrameIndex: prevIndex,
        selectedFrameIndices: new Set([prevIndex])
      };
    });
  },

  goToFrame: (index: number) => {
    const { frames } = get();
    if (index >= 0 && index < frames.length) {
      set({
        currentFrameIndex: index,
        selectedFrameIndices: new Set([index])
      });
    }
  },

  // Computed values
  getCurrentFrame: () => {
    const { frames, currentFrameIndex } = get();
    return frames[currentFrameIndex];
  },

  getTotalFrames: () => get().frames.length,

  calculateTotalDuration: () => {
    const { frames } = get();
    return frames.reduce((total, frame) => total + frame.duration, 0);
  },

  getFrameAtTime: (time: number) => {
    const { frames } = get();
    let elapsed = 0;
    
    for (let i = 0; i < frames.length; i++) {
      elapsed += frames[i].duration;
      if (time <= elapsed) {
        return i;
      }
    }
    
    return frames.length - 1; // Return last frame if time exceeds total duration
  },

  // Onion skin actions
  toggleOnionSkin: () => {
    set((state) => ({
      onionSkin: {
        ...state.onionSkin,
        enabled: !state.onionSkin.enabled
      }
    }));
  },

  setPreviousFrames: (count: number) => {
    const clampedCount = Math.max(0, Math.min(10, count));
    set((state) => ({
      onionSkin: {
        ...state.onionSkin,
        previousFrames: clampedCount
      }
    }));
  },

  setNextFrames: (count: number) => {
    const clampedCount = Math.max(0, Math.min(10, count));
    set((state) => ({
      onionSkin: {
        ...state.onionSkin,
        nextFrames: clampedCount
      }
    }));
  },

  setOnionSkinEnabled: (enabled: boolean) => {
    set((state) => ({
      onionSkin: {
        ...state.onionSkin,
        enabled
      }
    }));
  },

  // Selection management actions
  selectFrameRange: (startIndex: number, endIndex: number) => {
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    const indices = new Set<number>();
    const { frames } = get();
    
    for (let i = start; i <= end; i++) {
      if (i >= 0 && i < frames.length) {
        indices.add(i);
      }
    }
    
    set({ selectedFrameIndices: indices });
  },
  
  clearSelection: () => {
    const { currentFrameIndex } = get();
    // Keep only the active frame selected
    set({ selectedFrameIndices: new Set([currentFrameIndex]) });
  },
  
  isFrameSelected: (index: number) => {
    return get().selectedFrameIndices.has(index);
  },
  
  getSelectedFrameIndices: () => {
    return Array.from(get().selectedFrameIndices).sort((a, b) => a - b);
  },
  
  getSelectionRange: () => {
    const indices = get().getSelectedFrameIndices();
    if (indices.length === 0) return null;
    return { start: indices[0], end: indices[indices.length - 1] };
  },

  // Bulk import operations
  importFramesOverwrite: (frames: Array<{ data: Map<string, Cell>, duration: number }>, startIndex: number) => {
    set((state) => {
      const newFrames = [...state.frames];
      
      // Replace frames starting from startIndex
      frames.forEach((frameData, i) => {
        const targetIndex = startIndex + i;
        const newFrame = createEmptyFrame();
        newFrame.data = new Map(frameData.data);
        newFrame.duration = frameData.duration;
        newFrame.name = `Frame ${targetIndex + 1}`;
        
        if (targetIndex < newFrames.length) {
          // Replace existing frame
          newFrames[targetIndex] = newFrame;
        } else {
          // Add new frame if beyond current length
          newFrames.push(newFrame);
        }
      });
      
      return {
        frames: newFrames,
        currentFrameIndex: startIndex,
        totalDuration: get().calculateTotalDuration()
      };
    });
  },

  importFramesAppend: (frames: Array<{ data: Map<string, Cell>, duration: number }>) => {
    set((state) => {
      const newFrames = [...state.frames];
      const startIndex = newFrames.length;
      
      // Append all frames to the end
      frames.forEach((frameData, i) => {
        const newFrame = createEmptyFrame();
        newFrame.data = new Map(frameData.data);
        newFrame.duration = frameData.duration;
        newFrame.name = `Frame ${startIndex + i + 1}`;
        newFrames.push(newFrame);
      });
      
      return {
        frames: newFrames,
        currentFrameIndex: startIndex, // Jump to first imported frame
        totalDuration: get().calculateTotalDuration()
      };
    });
  },

  // Session-specific import that preserves all frame properties
  importSessionFrames: (frames: Array<{ id: string, name: string, duration: number, data: Map<string, Cell>, thumbnail?: string }>) => {
    set((state) => {
      // Completely replace the frames array with the imported frames
      // This ensures exact order preservation and no interference from existing frames
      return {
        ...state,
        frames: frames.map(frameData => ({
          id: frameData.id as FrameId, // Cast to proper type
          name: frameData.name,
          duration: frameData.duration,
          data: new Map(frameData.data), // Deep copy the cell data
          thumbnail: frameData.thumbnail
        })),
        currentFrameIndex: 0, // Start at first frame
        totalDuration: frames.reduce((total, frame) => total + frame.duration, 0)
      };
    });
  }
}));
