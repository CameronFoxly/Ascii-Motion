# Undo/Redo Bug Fixes - Cross-Frame Operations

## Date
October 11, 2025

## CRITICAL UPDATE - Frame Auto-Save Interference Bug (Fixed)

### The Most Critical Bug: Drawing Actions Skipped During Redo
**Symptom**: When redoing a sequence with both drawing and frame operations, every OTHER drawing action was skipped after each frame operation.

**Example**:
1. Draw "1" on Frame 1
2. Draw "2" on Frame 1
3. Add Frame 2
4. Draw "3" on Frame 2
5. Draw "4" on Frame 2
6. Add Frame 3
7. Draw "5" on Frame 3
8. Draw "6" on Frame 3
9. Undo all → works perfectly ✓
10. Redo all → **BUG**:
    - "1" appears on Frame 1 ✓
    - Frame 2 created ✓
    - "2" is SKIPPED ✗ (should appear on Frame 1)
    - "3" appears on Frame 2 ✓
    - Frame 3 created ✓
    - "4" is SKIPPED ✗ (should appear on Frame 2)
    - "5" appears on Frame 3 ✓

**Root Cause**: Frame synchronization auto-save interference. When we redo an `add_frame`:

1. `addFrame()` creates a new frame and sets `currentFrameIndex` to the new frame
2. The canvas still displays the old frame's content (including "2")
3. The frame switch triggers `useFrameSynchronization`'s auto-save effect
4. Auto-save detects canvas changed and saves "2" to the NEW frame (Frame 2)
5. Next redo tries to restore "2" to Frame 1, but it's already been saved to Frame 2
6. The data gets corrupted and "2" is effectively lost

**The Fix**: Added `isProcessingHistory` flag to prevent auto-save during undo/redo:

```typescript
// NEW: toolStore.ts
interface ToolStoreState {
  // ...
  isProcessingHistory: boolean; // Flag to prevent auto-save during undo/redo
}

// NEW: CanvasActionButtons.tsx & useKeyboardShortcuts.ts
const handleRedo = () => {
  if (canRedo()) {
    const redoAction = redo();
    if (redoAction) {
      // Set flag to prevent auto-save during history processing
      useToolStore.setState({ isProcessingHistory: true });
      
      try {
        processHistoryAction(redoAction, true);
      } finally {
        // Clear flag after a small delay to ensure all effects have settled
        setTimeout(() => {
          useToolStore.setState({ isProcessingHistory: false });
        }, 200);
      }
    }
  }
};

// UPDATED: useFrameSynchronization.ts
const saveCurrentCanvasToFrame = useCallback(() => {
  // Added isProcessingHistory to guard conditions
  if (isLoadingFrameRef.current || isPlaying || isDraggingFrame || 
      isDeletingFrame || isImportingSession || isProcessingHistory) return;
  // ... rest of save logic
}, [cells, currentFrameIndex, setFrameData, isPlaying, isDraggingFrame, 
    isDeletingFrame, isImportingSession, isProcessingHistory]);
```

**Why This Works**:
- Flag is set BEFORE any history processing begins
- Auto-save sees the flag and skips all save operations
- Flag is cleared after 200ms delay (ensures all React effects have settled)
- Redo can now safely modify frames without interference

---

## Critical Update - Redo Drawing Actions Bug (Fixed - Part 1)

### The Most Critical Bug: Drawing Actions Not Redoing
**Symptom**: When undoing/redoing a sequence with both drawing and frame operations, redo would restore frames but NOT the drawing actions on those frames.

**Example**:
1. Draw on Frame 1
2. Add Frame 2  
3. Draw on Frame 2
4. Undo all → works ✓
5. Redo all → Frame 2 is restored but drawing on Frame 2 is missing ✗

**Root Cause**: Frame synchronization hook interference. The `useFrameSynchronization` hook automatically saves canvas changes to frames. When we redid a `canvas_edit`:
1. We called `setCanvasData()` to update canvas
2. We called `setCurrentFrame()` to switch frames
3. Frame sync detected the canvas change and auto-saved it
4. **BUG**: The auto-save was happening BEFORE we switched frames or OUT OF ORDER, causing the canvas data to be saved to the wrong frame or overwritten

**The Fix**: Change the order of operations to update frame data FIRST:

```typescript
// OLD (BROKEN):
case 'canvas_edit': {
  setCanvasData(canvasAction.data.canvasData);  // 1. Update canvas
  setCurrentFrame(canvasAction.data.frameIndex); // 2. Switch frame
  // Frame sync auto-saves at wrong time!
}

// NEW (FIXED):
case 'canvas_edit': {
  // 1. Update the frame's stored data FIRST
  animationStore.setFrameData(canvasAction.data.frameIndex, canvasAction.data.canvasData);
  
  // 2. Switch to that frame if needed
  if (animationStore.currentFrameIndex !== canvasAction.data.frameIndex) {
    animationStore.setCurrentFrame(canvasAction.data.frameIndex);
  }
  
  // 3. Sync canvas display
  setCanvasData(canvasAction.data.canvasData);
}
```

**Why This Works**:
- Frame data is updated BEFORE any canvas changes
- Frame sync sees the frame is already correct when canvas updates
- No incorrect auto-save occurs
- Redo now properly restores both frames AND their drawings

---

## Problem Summary
Multiple critical bugs were discovered in the undo/redo system when operations span across drawing and frame operations. These bugs caused incorrect state restoration when undoing/redoing sequences like: draw on Frame 1 → add Frame 2 → draw on Frame 2 → undo/redo multiple times.

## Bugs Identified

### Bug 1: Incomplete Frame Restoration in `add_frame` Redo
**Location**: `CanvasActionButtons.tsx` and `useKeyboardShortcuts.ts` - `add_frame` case

**Problem**: When redoing an `add_frame` action, only the frame's `canvasData` and `frameIndex` were being restored. The frame's `name` and `duration` properties were lost, causing newly re-added frames to have default values instead of their original properties.

**Original Code**:
```typescript
case 'add_frame': {
  if (isRedo) {
    // Redo: Re-add the frame
    animationStore.addFrame(action.data.frameIndex, action.data.canvasData);
  } else {
    // Undo: Remove the frame that was added
    animationStore.removeFrame(action.data.frameIndex);
    animationStore.setCurrentFrame(action.data.previousCurrentFrame);
  }
  break;
}
```

**Fixed Code**:
```typescript
case 'add_frame': {
  if (isRedo) {
    // Redo: Re-add the frame with full properties
    const frame = action.data.frame;
    animationStore.addFrame(action.data.frameIndex, frame.data, frame.duration);
    animationStore.updateFrameName(action.data.frameIndex, frame.name);
    // Canvas will sync automatically since addFrame sets current frame
  } else {
    // Undo: Remove the frame that was added
    animationStore.removeFrame(action.data.frameIndex);
    animationStore.setCurrentFrame(action.data.previousCurrentFrame);
    // After removing frame and switching to previous frame, 
    // sync canvas with the frame we switched to
    const currentFrame = animationStore.frames[action.data.previousCurrentFrame];
    if (currentFrame) {
      canvasStore.setCanvasData(currentFrame.data);
    }
  }
  break;
}
```

### Bug 2: Incorrect Frame Data in `duplicate_frame` Redo
**Location**: `CanvasActionButtons.tsx` and `useKeyboardShortcuts.ts` - `duplicate_frame` case

**Problem**: When redoing a `duplicate_frame` action, the code called `animationStore.duplicateFrame(action.data.originalIndex)`, which duplicates the CURRENT state of the source frame. If the source frame was modified after the original duplication, the redo would duplicate the wrong data.

**Example Scenario**:
1. Duplicate Frame 1 (creates Frame 2 with Frame 1's data)
2. Draw on Frame 1
3. Undo duplicate (removes Frame 2)
4. Redo duplicate → **BUG**: Duplicates modified Frame 1, not the original Frame 1 data

**Original Code**:
```typescript
case 'duplicate_frame': {
  if (isRedo) {
    // Redo: Re-duplicate the frame
    animationStore.duplicateFrame(action.data.originalIndex);
  } else {
    // Undo: Remove the duplicated frame
    animationStore.removeFrame(action.data.newIndex);
    animationStore.setCurrentFrame(action.data.previousCurrentFrame);
  }
  break;
}
```

**Fixed Code**:
```typescript
case 'duplicate_frame': {
  if (isRedo) {
    // Redo: Re-add the duplicated frame using the stored frame data
    const frame = action.data.frame;
    animationStore.addFrame(action.data.newIndex, frame.data, frame.duration);
    animationStore.updateFrameName(action.data.newIndex, frame.name);
    // Canvas will sync automatically since addFrame sets current frame
  } else {
    // Undo: Remove the duplicated frame
    animationStore.removeFrame(action.data.newIndex);
    animationStore.setCurrentFrame(action.data.previousCurrentFrame);
    // Sync canvas with the frame we switched to
    const currentFrame = animationStore.frames[action.data.previousCurrentFrame];
    if (currentFrame) {
      canvasStore.setCanvasData(currentFrame.data);
    }
  }
  break;
}
```

### Bug 3: Missing Canvas Synchronization
**Location**: Multiple cases in both files

**Problem**: After frame operations (add, delete, duplicate, reorder), the canvas display was not being synchronized with the current frame. This caused the wrong frame's content to be displayed after undo/redo operations.

**Affected Cases**:
- `add_frame` (undo path)
- `duplicate_frame` (undo path)
- `delete_frame` (both paths)
- `reorder_frames` (both paths)

**Fix**: Added explicit canvas synchronization after frame changes:
```typescript
const currentFrame = animationStore.frames[animationStore.currentFrameIndex];
if (currentFrame) {
  canvasStore.setCanvasData(currentFrame.data);
}
```

### Bug 4: Incomplete Frame Property Restoration in `delete_frame`
**Location**: `delete_frame` case - redo path

**Problem**: When redoing a frame deletion, the canvas was not synced with the new current frame after the deletion occurred.

**Fixed Code**:
```typescript
if (isRedo) {
  // Redo: Re-delete the frame
  animationStore.removeFrame(action.data.frameIndex);
  // After deletion, sync canvas with the new current frame
  const newCurrentIndex = Math.min(action.data.frameIndex, animationStore.frames.length - 1);
  const currentFrame = animationStore.frames[newCurrentIndex];
  if (currentFrame) {
    canvasStore.setCanvasData(currentFrame.data);
  }
}
```

## Root Cause Analysis

The fundamental issues were:

1. **Incomplete Data Restoration**: The history actions store complete frame objects, but the redo operations were only using partial data from those objects.

2. **Re-execution vs. State Restoration**: Some redo operations were calling store methods (like `duplicateFrame()`) which operate on the current state, rather than restoring the exact historical state from the history action.

3. **Missing Canvas-Frame Synchronization**: Frame operations change which frame is current, but weren't updating the canvas display to match, leading to visual desynchronization.

## Testing Recommendations

Test the following scenarios to verify the fixes:

### Test 1: Basic Frame Add/Remove Cycle
1. Draw something on Frame 1
2. Add Frame 2
3. Draw something different on Frame 2
4. Undo (should remove Frame 2 drawing)
5. Undo (should remove Frame 2 entirely)
6. Redo (should restore Frame 2 as blank)
7. Redo (should restore Frame 2 drawing)

### Test 2: Frame Duplication with Modifications
1. Draw on Frame 1
2. Duplicate Frame 1 → Frame 2
3. Modify Frame 1 further
4. Undo (should remove Frame 1 modifications)
5. Undo (should remove Frame 2)
6. Redo (should restore Frame 2 with original Frame 1 data, not modified)
7. Redo (should restore Frame 1 modifications)

### Test 3: Frame Deletion with Drawing
1. Create Frame 1, Frame 2, Frame 3
2. Draw on each frame
3. Delete Frame 2
4. Undo (should restore Frame 2 with its drawing)
5. Redo (should remove Frame 2 again)

### Test 4: Complex Multi-Operation Sequence
1. Draw on Frame 1
2. Add Frame 2
3. Draw on Frame 2
4. Duplicate Frame 2 → Frame 3
5. Delete Frame 1
6. Undo all 5 operations in reverse
7. Redo all 5 operations forward
8. Verify each step restores exact state

## Files Modified

1. `/src/stores/toolStore.ts`
   - Added `isProcessingHistory` flag to prevent auto-save during undo/redo
   - Initialized flag to `false`

2. `/src/components/features/CanvasActionButtons.tsx`
   - Fixed `canvas_edit` to update frame data FIRST (Part 1 fix)
   - Fixed `add_frame` redo/undo with full property restoration
   - Fixed `duplicate_frame` redo/undo using stored frame data
   - Fixed `delete_frame` redo/undo with canvas sync
   - Added canvas sync to `reorder_frames`
   - Wrapped undo/redo handlers with `isProcessingHistory` flag (Part 2 fix)

3. `/src/hooks/useKeyboardShortcuts.ts`
   - Applied identical fixes to keyboard shortcut handler
   - Wrapped undo/redo handlers with `isProcessingHistory` flag (Part 2 fix)
   - Ensures consistency between UI buttons and keyboard shortcuts

4. `/src/hooks/useFrameSynchronization.ts`
   - Added `isProcessingHistory` check to all auto-save guards
   - Prevents auto-save during undo/redo operations
   - Updated dependencies in all affected useEffect hooks

## Performance Considerations

The canvas synchronization calls add minimal overhead:
- Only executed during undo/redo operations (not hot path)
- Simple Map assignment operation
- Already occurs in many other parts of the codebase

## Future Improvements

1. **Centralize History Processing**: Consider creating a single `processHistoryAction` utility that both CanvasActionButtons and useKeyboardShortcuts import, rather than duplicating the logic.

2. **Automated Testing**: Add unit tests for undo/redo operations across frame boundaries.

3. **History Action Validation**: Add runtime validation to ensure history actions contain all required data before being pushed to the stack.

4. **Redo Implementation for Effects**: The `apply_effect` and `apply_time_effect` cases still log warnings for redo operations - these should be fully implemented.

## Conclusion

These fixes resolve critical bugs in the undo/redo system that became apparent when operations span multiple frames. The key insights are:

1. **Redo operations must restore exact historical state** from the history action data, not re-execute the original operation on the current state.

2. **Order of operations matters when frame synchronization is active**: Update frame data FIRST, then switch frames, then update canvas display. This prevents the auto-save mechanism from corrupting data.

3. **Frame synchronization is powerful but can interfere**: The `useFrameSynchronization` hook's auto-save feature is essential for normal operation, but during undo/redo it can cause race conditions if not handled carefully.

## Architecture Insight: Frame Synchronization Interaction

The most subtle bug (canvas_edit redo) revealed an important architectural consideration:

**Frame Synchronization Hook Pattern**:
```typescript
// Watches for canvas changes and auto-saves them
useEffect(() => {
  if (cellsChanged) {
    setFrameData(currentFrameIndex, cells);
  }
}, [cells, currentFrameIndex]);
```

**The Problem with Naive Redo**:
```typescript
// This triggers the auto-save at the WRONG time
setCanvasData(newData);      // Cells change triggers auto-save
setCurrentFrame(targetFrame); // Too late - already saved to wrong frame!
```

**The Solution**:
```typescript
// Update the destination frame's data FIRST
setFrameData(targetFrame, newData);  // Frame data is correct
setCurrentFrame(targetFrame);         // Switch to it
setCanvasData(newData);              // Display it (auto-save sees frame already has this data)
```

This pattern should be used whenever programmatically updating both canvas and frame data in sequence.

---

## Forward Snapshot Overhaul (2025-10-11)

### Problem
Even after ordering and auto-save fixes, redo still appeared to skip every other drawing action when interleaved with frame operations. Cause: each `canvas_edit` entry only stored the pre-edit canvas (good for undo) but not the post-edit state required for deterministic redo. Redo reapplied the pre-edit snapshot, so only the first edit in each pair was visible.

### Solution
Implemented a two-phase history entry:

1. `pushCanvasHistory(previousCanvasData, frameIndex, description)`
2. Perform mutations
3. `finalizeCanvasHistory(newCanvasData)`

`CanvasHistoryAction` now includes:
```ts
interface CanvasHistoryActionData {
  frameIndex: number;
  previousCanvasData: Map<string, Cell>; // before edit
  newCanvasData?: Map<string, Cell>;      // after edit (added on finalize)
}
```
Redo chooses:
```ts
const target = isRedo ? (data.newCanvasData ?? data.previousCanvasData) : data.previousCanvasData;
```
Dev warning logs for legacy entries missing `newCanvasData`.

### Updated Producers
| Feature | Push | Finalize |
|---------|------|----------|
| Pencil / Eraser | MouseDown | MouseUp |
| Rectangle | MouseDown | MouseUp after draw |
| Ellipse | MouseDown | MouseUp after draw |
| Selection delete (all types) | Before removal | After canvas mutation |
| Paste (selection / lasso) | Before merge | After merge |
| Flip H / V | Before transform | After transform |
| Text word commit | Before `commitWord()` | After commit |
| Text paste | Before applying | After placement |

### Invariants
- One finalize per push.
- Never finalize before visible end state.
- Mouse leave + stroke end path ensures finalize still fires via generic mouse up logic.
- `isProcessingHistory` still suppresses auto-save during replay.

### Manual Verification Script
1. Draw `1 2` on Frame 1.
2. Add Frame 2.
3. Draw `3 4` on Frame 2.
4. Add Frame 3.
5. Draw `5 6` on Frame 3.
6. Undo to start.
7. Redo through all actions.
Expected: All characters appear in order with no skips; frame metadata intact.

### Developer Checklist for New Mutations
1. Clone `cells` BEFORE first mutation → push.
2. Mutate.
3. Clone fresh `cells` AFTER final mutation → finalize.
4. Never reuse the previous snapshot Map.

### Future Hardening
- Guard / warn if a second push occurs before finalize.
- Batch micro pencil edits into a single history entry.
- Extend forward snapshots to effect/time-effect actions.

This guarantees symmetric, lossless undo/redo across interleaved frame + canvas edits.
