# Multi-Frame Selection - Implementation Plan

**Status**: Planning Phase  
**Date**: October 3, 2025  
**Feature**: Timeline Multi-Frame Selection with Batch Operations

---

## 📋 Overview

This document outlines the complete implementation plan for adding multi-frame selection capabilities to the ASCII Motion timeline. Users will be able to select ranges of frames using Shift+Click, perform batch operations (delete, drag-and-drop, set duration), with full undo/redo support.

## 🎯 Goals

1. **Range Selection**: Shift+Click to select contiguous frame ranges
2. **Visual Clarity**: Clear differentiation between active frame, selected frames, and unselected frames
3. **Batch Operations**: Delete multiple frames, drag entire groups, set durations for selection
4. **Professional UX**: Industry-standard selection patterns with keyboard/mouse shortcuts
5. **History Integration**: All batch operations recorded as single undo/redo entries
6. **Onion Skin Compatibility**: Redesigned indicators that don't conflict with selection borders

## 🏗️ Architecture Overview

### Core Principles

1. **Single Active Frame**: Only one frame is "active" and displayed on canvas at a time
2. **Contiguous Selection**: Only shift+click range selection (no Ctrl+Click discontinuous selection)
3. **Selection Preservation**: Selection persists until explicitly cleared by user actions
4. **Batch History**: Multi-frame operations recorded as single history entries
5. **Clear Deselection**: Multiple intuitive ways to clear selection

---

## 📐 State Management Design

### File: `src/stores/animationStore.ts`

**New State Properties:**

```typescript
interface AnimationState extends Animation {
  // ... existing state ...
  
  // Multi-frame selection state
  selectedFrameIndices: Set<number>; // Set of selected frame indices (includes active frame)
  
  // ... existing actions ...
  
  // Selection management actions
  selectFrameRange: (startIndex: number, endIndex: number) => void;
  clearSelection: () => void;
  isFrameSelected: (index: number) => boolean;
  getSelectedFrameIndices: () => number[];
  getSelectionRange: () => { start: number; end: number } | null;
}
```

**Implementation:**

```typescript
export const useAnimationStore = create<AnimationState>((set, get) => ({
  // Initial state
  frames: [createEmptyFrame(undefined, "Frame 1")],
  currentFrameIndex: 0,
  selectedFrameIndices: new Set([0]), // Active frame is always selected
  // ... other existing state ...
  
  // Selection management
  selectFrameRange: (startIndex: number, endIndex: number) => {
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    const indices = new Set<number>();
    
    for (let i = start; i <= end; i++) {
      if (i >= 0 && i < get().frames.length) {
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
  
  // Modified: setCurrentFrame now updates selection
  setCurrentFrame: (index: number) => {
    set((state) => {
      if (index < 0 || index >= state.frames.length) return state;
      return { 
        currentFrameIndex: index,
        selectedFrameIndices: new Set([index]) // Reset to single selection
      };
    });
  },
  
  // Modified: play/pause/stop clear selection
  play: () => {
    set((state) => ({
      isPlaying: true,
      selectedFrameIndices: new Set([state.currentFrameIndex]), // Clear to single
      onionSkin: {
        ...state.onionSkin,
        wasEnabledBeforePlayback: state.onionSkin.enabled,
        enabled: false
      }
    }));
  },
  
  // ... rest of existing implementation ...
}));
```

---

## 🎨 UI Components Updates

### 1. AnimationTimeline.tsx

**New State and Handlers:**

```typescript
export const AnimationTimeline: React.FC = () => {
  const {
    frames,
    currentFrameIndex,
    selectedFrameIndices,
    selectFrameRange,
    clearSelection,
    isFrameSelected,
    getSelectedFrameIndices,
    // ... existing state ...
  } = useAnimationStore();
  
  // ... existing drag and drop state ...
  
  // Track if shift key is pressed during frame click
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  
  // Handle frame selection (modified)
  const handleFrameSelect = useCallback((frameIndex: number, event: React.MouseEvent) => {
    if (isPlaying) return;
    
    if (event.shiftKey) {
      // Shift+Click: Range selection from current to clicked
      selectFrameRange(currentFrameIndex, frameIndex);
      // Set the clicked frame as the new active frame
      navigateToFrame(frameIndex);
    } else {
      // Normal click: Clear selection and set as active
      navigateToFrame(frameIndex);
    }
  }, [isPlaying, currentFrameIndex, selectFrameRange, navigateToFrame]);
  
  // Handle clicking on empty timeline area
  const handleTimelineClick = useCallback((event: React.MouseEvent) => {
    // Check if click was on the timeline background (not a frame)
    if (event.target === event.currentTarget) {
      clearSelection();
    }
  }, [clearSelection]);
  
  // Handle drag start for single or multiple frames
  const handleDragStart = useCallback((event: React.DragEvent, index: number) => {
    if (isPlaying) return;
    
    const selectedIndices = getSelectedFrameIndices();
    
    // If dragging a frame that's not in selection, clear selection first
    if (!selectedIndices.includes(index)) {
      clearSelection();
      setCurrentFrame(index);
    }
    
    // Store selection data for drag operation
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify({
      draggedIndices: getSelectedFrameIndices(),
      originalIndex: index
    }));
    
    setDraggedIndex(index);
    setDraggingFrame(true);
  }, [isPlaying, getSelectedFrameIndices, clearSelection, setCurrentFrame, setDraggingFrame]);
  
  // Modified drop handler for multi-frame drag
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    try {
      const data = JSON.parse(event.dataTransfer.getData('text/plain'));
      const { draggedIndices, originalIndex } = data;
      
      if (!draggedIndices || dragOverIndex === null) return;
      
      // Perform multi-frame reorder if selection exists
      if (draggedIndices.length > 1) {
        reorderFrameRange(draggedIndices, dragOverIndex);
      } else {
        // Single frame reorder (existing logic)
        const dragIndex = draggedIndices[0];
        let targetIndex = dragOverIndex;
        
        if (dragOverIndex < frames.length && dragIndex < dragOverIndex) {
          targetIndex = dragOverIndex - 1;
        }
        
        reorderFrames(dragIndex, targetIndex);
      }
    } catch (error) {
      console.error('Error handling frame drop:', error);
    }
    
    setTimeout(() => {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDraggingFrame(false);
    }, 100);
  }, [dragOverIndex, reorderFrames, reorderFrameRange, frames.length, setDraggingFrame]);
  
  // ... rest of component ...
};
```

### 2. FrameThumbnail.tsx

**Updated Props:**

```typescript
interface FrameThumbnailProps {
  frame: Frame;
  frameIndex: number;
  isActive: boolean;      // NEW: Is this the active frame (on canvas)?
  isSelected: boolean;    // MODIFIED: Is this frame in the selection?
  canvasWidth: number;
  canvasHeight: number;
  scaleZoom?: number;
  onSelect: (event: React.MouseEvent) => void; // MODIFIED: Now passes event
  onDuplicate: () => void;
  onDelete: () => void;
  onDurationChange: (duration: number) => void;
  isDragging?: boolean;
  dragHandleProps?: any;
  isOnionSkinPrevious?: boolean;
  isOnionSkinNext?: boolean;
  onionSkinDistance?: number;
}
```

**Visual States:**

```typescript
export const FrameThumbnail: React.FC<FrameThumbnailProps> = ({
  frame,
  frameIndex,
  isActive,
  isSelected,
  // ... other props ...
}) => {
  // Determine border styling based on state
  const getBorderStyle = () => {
    if (isDragging) {
      return 'border-primary/50 bg-primary/10';
    }
    
    if (isActive) {
      // Active frame: Full white border
      return 'border-white bg-white/5';
    }
    
    if (isSelected) {
      // Selected but not active: Dimmer white border (60% opacity)
      return 'border-white/60 bg-white/5';
    }
    
    // Unselected: Default border
    return 'border-border hover:border-primary/50';
  };
  
  // Onion skin indicator on canvas preview box (not card border)
  const getCanvasPreviewBorder = () => {
    if (isOnionSkinPrevious) {
      return 'border-purple-500/60';
    }
    if (isOnionSkinNext) {
      return 'border-red-500/60';
    }
    return 'border-border';
  };
  
  return (
    <Card
      className={`
        relative flex-shrink-0 cursor-pointer transition-all duration-150 ease-out select-none overflow-hidden flex flex-col
        ${getBorderStyle()}
        ${isDragging ? 'opacity-50 scale-95' : ''}
      `}
      onClick={(e) => onSelect(e)} // Pass event to parent
      {...dragHandleProps}
      data-frame-index={frameIndex}
      style={{
        width: `${scaledCardSize}px`,
        height: `${scaledCardSize}px`,
        // ... other styles ...
      }}
    >
      {/* ... frame number and controls ... */}
      
      {/* Frame preview with onion skin border */}
      <div className="flex-1 mb-1 overflow-hidden min-h-0">
        <div className={`bg-muted/30 p-1 rounded border h-full flex items-center justify-center ${getCanvasPreviewBorder()}`}>
          {thumbnailCanvas ? (
            <img 
              src={thumbnailCanvas} 
              alt={`Frame ${frameIndex} preview`}
              className="max-w-full max-h-full object-contain rounded-sm pointer-events-none"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <div className="text-muted-foreground italic text-center text-xs pointer-events-none">
              Empty
            </div>
          )}
        </div>
      </div>
      
      {/* ... duration control ... */}
    </Card>
  );
};
```

---

## 🔄 Batch Operations with History

### File: `src/hooks/useAnimationHistory.ts`

**New Multi-Frame Operations:**

```typescript
/**
 * Delete multiple frames with history recording (single entry)
 */
const deleteFrameRange = useCallback((frameIndices: number[]) => {
  if (frameIndices.length === 0) return;
  
  // Sort indices in descending order for safe deletion
  const sortedIndices = [...frameIndices].sort((a, b) => b - a);
  
  // Special case: If all frames selected, clear and create one blank frame
  if (sortedIndices.length === frames.length) {
    deleteAllFramesWithReset();
    return;
  }
  
  // Save frame data for undo
  const deletedFrames = sortedIndices.map(index => ({
    index,
    frame: {
      ...frames[index],
      data: new Map(frames[index].data)
    }
  }));
  
  const previousCurrentFrame = currentFrameIndex;
  
  // Calculate new active frame (frame before deleted range)
  const minDeletedIndex = Math.min(...sortedIndices);
  let newCurrentFrame = Math.max(0, minDeletedIndex - 1);
  
  // If deletion includes frame 0, new active should be 0
  if (sortedIndices.includes(0)) {
    newCurrentFrame = 0;
  }
  
  // Create history action
  const historyAction: DeleteFrameRangeHistoryAction = {
    type: 'delete_frame_range',
    timestamp: Date.now(),
    description: `Delete ${sortedIndices.length} frames`,
    data: {
      deletedFrames,
      previousCurrentFrame,
      newCurrentFrame
    }
  };
  
  // Execute deletions (in reverse order to preserve indices)
  sortedIndices.forEach(index => {
    removeFrameStore(index);
  });
  
  // Set new active frame
  setCurrentFrameStore(newCurrentFrame);
  
  // Record in history
  pushToHistory(historyAction);
}, [frames, currentFrameIndex, removeFrameStore, setCurrentFrameStore, pushToHistory]);

/**
 * Delete all frames and reset to single blank frame
 */
const deleteAllFramesWithReset = useCallback(() => {
  // Save all frames for undo
  const allFrames = frames.map((frame, index) => ({
    index,
    frame: {
      ...frame,
      data: new Map(frame.data)
    }
  }));
  
  const historyAction: DeleteAllFramesHistoryAction = {
    type: 'delete_all_frames',
    timestamp: Date.now(),
    description: 'Delete all frames and reset',
    data: {
      deletedFrames: allFrames,
      previousCurrentFrame: currentFrameIndex
    }
  };
  
  // Clear all frames and add one blank
  clearAllFramesStore();
  
  pushToHistory(historyAction);
}, [frames, currentFrameIndex, clearAllFramesStore, pushToHistory]);

/**
 * Reorder a contiguous block of frames to a new position
 */
const reorderFrameRange = useCallback((frameIndices: number[], targetIndex: number) => {
  if (frameIndices.length === 0) return;
  
  const sortedIndices = [...frameIndices].sort((a, b) => a - b);
  
  // Ensure contiguous selection
  const isContiguous = sortedIndices.every((val, i, arr) => 
    i === 0 || val === arr[i - 1] + 1
  );
  
  if (!isContiguous) {
    console.error('Can only reorder contiguous frame ranges');
    return;
  }
  
  const startIndex = sortedIndices[0];
  const endIndex = sortedIndices[sortedIndices.length - 1];
  const rangeLength = endIndex - startIndex + 1;
  
  // Calculate actual drop position
  let actualTargetIndex = targetIndex;
  
  // Adjust target if dropping after the range
  if (targetIndex > endIndex) {
    actualTargetIndex = targetIndex - rangeLength;
  }
  
  const previousCurrentFrame = currentFrameIndex;
  
  // Create history action
  const historyAction: ReorderFrameRangeHistoryAction = {
    type: 'reorder_frame_range',
    timestamp: Date.now(),
    description: `Move ${rangeLength} frames from position ${startIndex} to ${actualTargetIndex}`,
    data: {
      startIndex,
      endIndex,
      targetIndex: actualTargetIndex,
      previousCurrentFrame
    }
  };
  
  // Execute the reorder
  reorderFrameRangeStore(startIndex, endIndex, actualTargetIndex);
  
  pushToHistory(historyAction);
}, [currentFrameIndex, reorderFrameRangeStore, pushToHistory]);

/**
 * Set duration for multiple frames (respects selection)
 */
const setFrameDurationsForSelection = useCallback((
  frameIndices: number[], 
  duration: number
) => {
  if (frameIndices.length === 0) return false;
  
  const clampedDuration = Math.max(
    FRAME_DURATION_LIMITS.MIN_MS,
    Math.min(FRAME_DURATION_LIMITS.MAX_MS, duration)
  );
  
  // Save previous durations
  const previousDurations = frameIndices.map(index => ({
    frameIndex: index,
    duration: frames[index].duration
  }));
  
  // Apply new duration
  const animationStore = useAnimationStore.getState();
  frameIndices.forEach(frameIndex => {
    animationStore.updateFrameDuration(frameIndex, clampedDuration);
  });
  
  // Create history action
  const historyAction: SetFrameDurationsHistoryAction = {
    type: 'set_frame_durations',
    timestamp: Date.now(),
    description: `Set duration to ${clampedDuration}ms for ${frameIndices.length} frame(s)`,
    data: {
      affectedFrameIndices: frameIndices,
      newDuration: clampedDuration,
      previousDurations
    }
  };
  
  pushToHistory(historyAction);
  return true;
}, [frames, pushToHistory]);
```

---

## 📝 History System Updates

### File: `src/types/index.ts`

**New History Action Types:**

```typescript
export type HistoryActionType = 
  | 'canvas_edit'
  | 'add_frame'
  | 'duplicate_frame'
  | 'delete_frame'
  | 'delete_frame_range'     // NEW: Batch frame deletion
  | 'delete_all_frames'      // NEW: Delete all and reset
  | 'reorder_frames'
  | 'reorder_frame_range'    // NEW: Batch frame reordering
  | 'update_duration'
  | 'update_name'
  | 'navigate_frame'
  | 'apply_effect'
  | 'apply_time_effect'
  | 'set_frame_durations';

export interface DeleteFrameRangeHistoryAction extends HistoryAction {
  type: 'delete_frame_range';
  data: {
    deletedFrames: Array<{
      index: number;
      frame: Frame;
    }>;
    previousCurrentFrame: number;
    newCurrentFrame: number;
  };
}

export interface DeleteAllFramesHistoryAction extends HistoryAction {
  type: 'delete_all_frames';
  data: {
    deletedFrames: Array<{
      index: number;
      frame: Frame;
    }>;
    previousCurrentFrame: number;
  };
}

export interface ReorderFrameRangeHistoryAction extends HistoryAction {
  type: 'reorder_frame_range';
  data: {
    startIndex: number;      // Start of range being moved
    endIndex: number;        // End of range being moved
    targetIndex: number;     // Where range is moved to
    previousCurrentFrame: number;
  };
}
```

### File: `src/hooks/useKeyboardShortcuts.ts`

**History Processing for New Actions:**

```typescript
const processHistoryAction = (
  action: AnyHistoryAction, 
  isRedo: boolean,
  canvasStore: any,
  animationStore: any
) => {
  switch (action.type) {
    // ... existing cases ...
    
    case 'delete_frame_range':
      const deleteRangeAction = action as DeleteFrameRangeHistoryAction;
      if (isRedo) {
        // Redo: Re-delete all frames in range (reverse order)
        deleteRangeAction.data.deletedFrames
          .sort((a, b) => b.index - a.index)
          .forEach(({ index }) => {
            animationStore.removeFrame(index);
          });
        animationStore.setCurrentFrame(deleteRangeAction.data.newCurrentFrame);
      } else {
        // Undo: Re-add all deleted frames
        deleteRangeAction.data.deletedFrames
          .sort((a, b) => a.index - b.index)
          .forEach(({ index, frame }) => {
            animationStore.addFrame(index, frame.data);
            animationStore.updateFrameName(index, frame.name);
            animationStore.updateFrameDuration(index, frame.duration);
          });
        animationStore.setCurrentFrame(deleteRangeAction.data.previousCurrentFrame);
      }
      break;
      
    case 'delete_all_frames':
      const deleteAllAction = action as DeleteAllFramesHistoryAction;
      if (isRedo) {
        // Redo: Clear all and reset
        animationStore.clearAllFrames();
      } else {
        // Undo: Restore all frames
        deleteAllAction.data.deletedFrames
          .sort((a, b) => a.index - b.index)
          .forEach(({ index, frame }) => {
            animationStore.addFrame(index, frame.data);
            animationStore.updateFrameName(index, frame.name);
            animationStore.updateFrameDuration(index, frame.duration);
          });
        animationStore.setCurrentFrame(deleteAllAction.data.previousCurrentFrame);
      }
      break;
      
    case 'reorder_frame_range':
      const reorderRangeAction = action as ReorderFrameRangeHistoryAction;
      if (isRedo) {
        // Redo: Re-perform the range reorder
        animationStore.reorderFrameRange(
          reorderRangeAction.data.startIndex,
          reorderRangeAction.data.endIndex,
          reorderRangeAction.data.targetIndex
        );
      } else {
        // Undo: Reverse the range reorder
        // Calculate reverse operation indices
        const rangeLength = reorderRangeAction.data.endIndex - reorderRangeAction.data.startIndex + 1;
        const currentStart = reorderRangeAction.data.targetIndex;
        const currentEnd = currentStart + rangeLength - 1;
        const originalStart = reorderRangeAction.data.startIndex;
        
        animationStore.reorderFrameRange(currentStart, currentEnd, originalStart);
        animationStore.setCurrentFrame(reorderRangeAction.data.previousCurrentFrame);
      }
      break;
      
    // ... other cases ...
  }
};
```

---

## 🔧 Store Implementation Details

### File: `src/stores/animationStore.ts`

**New Store Methods:**

```typescript
// Clear all frames and create one blank frame
clearAllFrames: () => {
  set({
    frames: [createEmptyFrame(undefined, "Frame 1")],
    currentFrameIndex: 0,
    selectedFrameIndices: new Set([0]),
    totalDuration: DEFAULT_FRAME_DURATION
  });
},

// Reorder a contiguous range of frames
reorderFrameRange: (startIndex: number, endIndex: number, targetIndex: number) => {
  set((state) => {
    const frames = [...state.frames];
    
    // Extract the range
    const range = frames.splice(startIndex, endIndex - startIndex + 1);
    
    // Insert at new position
    frames.splice(targetIndex, 0, ...range);
    
    // Update current frame index if it was in the moved range
    let newCurrentFrame = state.currentFrameIndex;
    const rangeLength = endIndex - startIndex + 1;
    
    if (state.currentFrameIndex >= startIndex && state.currentFrameIndex <= endIndex) {
      // Current frame is in the moved range
      const offsetInRange = state.currentFrameIndex - startIndex;
      newCurrentFrame = targetIndex + offsetInRange;
    } else if (state.currentFrameIndex > endIndex && state.currentFrameIndex <= targetIndex) {
      // Current frame is between old and new positions (moving forward)
      newCurrentFrame = state.currentFrameIndex - rangeLength;
    } else if (state.currentFrameIndex < startIndex && state.currentFrameIndex >= targetIndex) {
      // Current frame is between new and old positions (moving backward)
      newCurrentFrame = state.currentFrameIndex + rangeLength;
    }
    
    // Update selection to track the moved frames
    const newSelection = new Set<number>();
    state.selectedFrameIndices.forEach(index => {
      if (index >= startIndex && index <= endIndex) {
        // Frame was in moved range
        const offsetInRange = index - startIndex;
        newSelection.add(targetIndex + offsetInRange);
      } else {
        // Frame was not moved, but index may have shifted
        let newIndex = index;
        if (index > endIndex && index <= targetIndex + rangeLength - 1) {
          newIndex = index - rangeLength;
        } else if (index < startIndex && index >= targetIndex) {
          newIndex = index + rangeLength;
        }
        newSelection.add(newIndex);
      }
    });
    
    return {
      frames,
      currentFrameIndex: newCurrentFrame,
      selectedFrameIndices: newSelection,
      totalDuration: frames.reduce((total, frame) => total + frame.duration, 0),
      isDraggingFrame: true
    };
  });
  
  setTimeout(() => {
    set({ isDraggingFrame: false });
  }, 100);
},
```

---

## 🎮 User Interaction Patterns

### Selection Actions

| Action | Behavior |
|--------|----------|
| **Click frame** | Clear selection, make clicked frame active |
| **Shift+Click frame** | Extend selection from current active to clicked frame (inclusive), make clicked frame active |
| **Click empty timeline** | Clear selection (keep only active frame) |
| **Press Escape** | Clear selection (keep only active frame) |
| **Click canvas (any tool)** | Clear selection (keep only active frame) |
| **Comma/Period navigation** | Clear selection, navigate to prev/next frame |
| **Play/Pause/Stop** | Clear selection (keep only active frame) |

### Drag & Drop

| Scenario | Behavior |
|----------|----------|
| **Drag single selected frame** | Move single frame (existing behavior) |
| **Drag one of multiple selected frames** | Move entire selection as contiguous block |
| **Drag unselected frame** | Clear selection first, then drag that frame alone |
| **Drop indicator** | Show single indicator line at drop position (same as existing) |

### Deletion

| Scenario | Behavior |
|----------|----------|
| **Delete single frame** | Remove frame, previous frame becomes active |
| **Delete multiple frames** | Remove all selected, frame before range becomes active |
| **Delete all frames** | Clear all, create one blank frame at index 0 |
| **Delete keyboard shortcut** | Works with current selection (Ctrl+Delete) |

### Set Duration

| Scenario | Dialog Note |
|----------|-------------|
| **Single frame selected** | "This will set the same duration for **all N frames** in your animation." |
| **Multiple frames selected** | "This will set the duration for **M selected frames**." |

---

## 🎨 Visual Design Specifications

### Frame Card Border States

```css
/* Active frame (on canvas) */
.frame-active {
  border: 2px solid rgba(255, 255, 255, 1.0);
  background: rgba(255, 255, 255, 0.05);
}

/* Selected but not active */
.frame-selected {
  border: 2px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.05);
}

/* Unselected */
.frame-unselected {
  border: 2px solid var(--border);
}

.frame-unselected:hover {
  border-color: rgba(var(--primary), 0.5);
}

/* Dragging state */
.frame-dragging {
  opacity: 0.5;
  transform: scale(0.95);
}
```

### Onion Skin Indicators (Redesigned)

**OLD** (conflicts with selection):
- Frame card border changes to purple (previous) or red (next)

**NEW** (no conflict):
- Inner canvas preview box border changes to purple/red
- Frame card border remains selection-aware

```css
/* Canvas preview box onion skin borders */
.canvas-preview-onion-previous {
  border: 2px solid rgba(139, 92, 246, 0.6); /* Purple */
}

.canvas-preview-onion-next {
  border: 2px solid rgba(239, 68, 68, 0.6); /* Red */
}

.canvas-preview-normal {
  border: 2px solid var(--border);
}
```

---

## 🧪 Testing Plan

### Manual Test Cases

#### Selection Mechanics
- [ ] Click single frame: Clears previous selection, sets as active
- [ ] Shift+Click from frame 2 to 5: Selects frames 2, 3, 4, 5 (inclusive)
- [ ] Shift+Click from frame 5 to 2: Selects frames 2, 3, 4, 5 (reversed range)
- [ ] Shift+Click frame 7 when on frame 3 (with 3-5 selected): Extends to 3-7
- [ ] Click empty timeline area: Clears selection
- [ ] Press Escape: Clears selection
- [ ] Click canvas with any tool: Clears selection

#### Visual States
- [ ] Active frame has full white border (opacity 1.0)
- [ ] Selected non-active frames have dimmed white border (opacity 0.6)
- [ ] Unselected frames have default border
- [ ] Onion skin previous frames: Purple border on inner canvas preview box
- [ ] Onion skin next frames: Red border on inner canvas preview box
- [ ] Selection + onion skin: Both indicators visible simultaneously

#### Drag & Drop
- [ ] Drag single selected frame: Moves frame normally
- [ ] Drag one frame from multi-selection: Moves entire group
- [ ] Drag unselected frame: Clears selection first, then drags alone
- [ ] Drop indicator shows at correct position for single/group
- [ ] Dragged frames maintain relative order
- [ ] Selection updates to track moved frames at new positions

#### Deletion
- [ ] Delete single frame: Removes frame, previous becomes active
- [ ] Delete frames 3-7: Removes all, frame 2 becomes active
- [ ] Delete frames 0-2: Removes all, frame 0 (after deletion) becomes active
- [ ] Delete all frames: Creates one blank frame
- [ ] Ctrl+Delete keyboard shortcut: Works with selection

#### Set Duration
- [ ] Single frame: Dialog shows "all N frames"
- [ ] Multiple frames selected: Dialog shows "M selected frames"
- [ ] Set duration applies only to selected frames (when multi-selected)
- [ ] Set duration applies to all frames (when single selected)

#### History/Undo
- [ ] Delete 5 frames → Undo: All 5 restored in original positions
- [ ] Move range of 4 frames → Undo: Range restored to original position
- [ ] Set duration for 3 frames → Undo: Original durations restored
- [ ] All batch operations create single history entry

#### Edge Cases
- [ ] Select frames, navigate with comma/period: Selection clears
- [ ] Select frames, start playback: Selection clears
- [ ] Select frames, drag non-selected frame: Selection clears first
- [ ] Delete last 3 frames in 4-frame timeline: Frame 0 becomes active
- [ ] Shift+Click beyond timeline end: Selection stops at last frame

---

## 🚀 Implementation Checklist

### Phase 1: State Management Foundation
- [ ] Add `selectedFrameIndices` Set to `animationStore.ts`
- [ ] Implement `selectFrameRange()` method
- [ ] Implement `clearSelection()` method
- [ ] Implement `isFrameSelected()` method
- [ ] Implement `getSelectedFrameIndices()` method
- [ ] Implement `getSelectionRange()` method
- [ ] Update `setCurrentFrame()` to reset selection
- [ ] Update `play()`, `pause()`, `stop()` to clear selection

### Phase 2: UI Component Updates
- [ ] Update `FrameThumbnail` props (add `isActive`, modify `isSelected`)
- [ ] Implement border state logic in `FrameThumbnail`
- [ ] Redesign onion skin indicators (move to inner canvas preview border)
- [ ] Update `AnimationTimeline` frame select handler (add Shift+Click)
- [ ] Add timeline empty area click handler
- [ ] Update drag start to handle multi-frame selection
- [ ] Update drop handler to support range reordering

### Phase 3: Batch Operations
- [ ] Implement `deleteFrameRange()` in `useAnimationHistory`
- [ ] Implement `deleteAllFramesWithReset()` in `useAnimationHistory`
- [ ] Implement `reorderFrameRange()` in `useAnimationHistory`
- [ ] Implement `clearAllFrames()` in `animationStore`
- [ ] Implement `reorderFrameRange()` in `animationStore`
- [ ] Update `FrameControls` delete button to work with selection

### Phase 4: History Integration
- [ ] Add new history action types to `types/index.ts`
- [ ] Create `DeleteFrameRangeHistoryAction` interface
- [ ] Create `DeleteAllFramesHistoryAction` interface
- [ ] Create `ReorderFrameRangeHistoryAction` interface
- [ ] Implement history processing in `useKeyboardShortcuts.ts`
- [ ] Test undo/redo for all batch operations

### Phase 5: Set Duration Integration
- [ ] Update `setFrameDurationsWithHistory()` to use selection
- [ ] Update `SetFrameDurationDialog` to show selection count
- [ ] Modify dialog note text based on selection state
- [ ] Test duration setting with various selection sizes

### Phase 6: Deselection Triggers
- [ ] Add Escape key handler to clear selection
- [ ] Add canvas click handler to clear selection
- [ ] Update frame navigation (comma/period) to clear selection
- [ ] Test all deselection methods

### Phase 7: Keyboard Shortcuts
- [ ] Update Ctrl+Delete to work with selection
- [ ] Update frame navigation shortcuts
- [ ] Document new behaviors in `KeyboardShortcutsDialog`

### Phase 8: Polish & Edge Cases
- [ ] Test selection with timeline zoom
- [ ] Test selection during drag operations
- [ ] Verify selection state after imports/exports
- [ ] Test with single-frame timeline edge case
- [ ] Test with maximum frame count

### Phase 9: Documentation
- [ ] Update `COPILOT_INSTRUCTIONS.md` with selection patterns
- [ ] Update `DEVELOPMENT.md` with architecture details
- [ ] Create user-facing documentation for selection feature
- [ ] Add selection examples to development docs

---

## 📚 Dependencies

### Internal
- `useAnimationStore` - Core state management
- `useAnimationHistory` - History-enabled operations
- `useKeyboardShortcuts` - Keyboard interaction
- `useFrameNavigation` - Frame navigation with selection clearing
- `AnimationTimeline` - Main timeline component
- `FrameThumbnail` - Individual frame display
- `SetFrameDurationDialog` - Duration setting with selection awareness

### External
- React event system for Shift+Click detection
- Zustand for state management
- Existing drag-and-drop infrastructure

---

## 🎯 Success Criteria

- ✅ Users can select ranges of frames with Shift+Click
- ✅ Visual distinction between active, selected, and unselected frames is clear
- ✅ Onion skin indicators don't conflict with selection borders
- ✅ Batch delete operations work with full undo support
- ✅ Multi-frame drag & drop maintains frame order
- ✅ Set duration respects selection (selected frames vs all frames)
- ✅ All batch operations create single history entries
- ✅ Multiple intuitive deselection methods work consistently
- ✅ Edge cases (delete all, single frame, etc.) handled gracefully
- ✅ Performance remains smooth with large frame counts
- ✅ Feature integrates seamlessly with existing timeline functionality

---

## 🔮 Future Enhancements (Out of Scope)

- Ctrl+Click for non-contiguous selection
- Copy/paste multiple frames
- Batch apply effects to selection
- Selection-aware playback (play only selected frames)
- Rubber band selection (click and drag to select)
- Select all keyboard shortcut (Cmd/Ctrl+A)

---

**Implementation Priority**: High  
**Estimated Complexity**: Medium-High  
**Breaking Changes**: None (purely additive feature)
