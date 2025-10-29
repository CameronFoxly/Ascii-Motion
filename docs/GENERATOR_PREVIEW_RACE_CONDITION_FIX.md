# Generator Preview Race Condition Fix

**Date:** October 29, 2025  
**Status:** ✅ Resolved  
**Related:** `GENERATORS_IMPLEMENTATION_PLAN.md`

---

## Problem Summary

The generator mapping preview was not updating live when users adjusted mapping settings (character palettes, color palettes) in the Mapping tab. Users had to switch tabs back and forth to force a preview refresh, breaking the intended real-time feedback loop.

### Root Cause

**Race condition between rapid mapping changes and async preview generation:**

1. User changes mapping setting → `isPreviewDirty` flag set to `true`
2. Debounced regeneration starts → `isPreviewDirty` cleared to `false` at start of generation
3. User makes *another* mapping change during generation → `isPreviewDirty` set to `true` again
4. First generation completes → `isPreviewDirty` cleared to `false` (losing the pending change)
5. **Result:** Second mapping change never triggers regeneration

The issue was that `isPreviewDirty` was being cleared at both the *start* and *end* of generation, causing it to lose track of changes that occurred mid-flight.

---

## Solution Design

### Pattern: Pending Dirty Flag Capture

The fix uses a **functional state update** to capture the dirty flag value *at completion time*, then schedules a follow-up regeneration if changes were pending:

```typescript
// Clear dirty flag at START of regeneration
set({ isGenerating: true, lastError: null, isPreviewDirty: false });

// ... async generation work ...

// At completion, capture current dirty state before clearing it
let hadPendingDirtyChanges = false;
set((state) => {
  hadPendingDirtyChanges = state.isPreviewDirty; // ← Capture before clearing
  return {
    previewFrames: result.frames,
    convertedFrames,
    totalPreviewFrames: result.frameCount,
    isPreviewDirty: false,
    isGenerating: false,
    // ... other state updates
  };
});

// If changes arrived during generation, schedule another pass
if (hadPendingDirtyChanges) {
  setTimeout(() => {
    const { regeneratePreview: rerunPreview } = useGeneratorsStore.getState();
    rerunPreview();
  }, 0);
}
```

### Why This Works

1. **Dirty flag cleared early** – prevents duplicate work if user stops making changes
2. **Functional `set()` captures race condition** – reads `isPreviewDirty` *atomically* at the exact moment of completion
3. **Closure preserves captured value** – `hadPendingDirtyChanges` is safe to use in the `setTimeout` callback
4. **`setTimeout(..., 0)` breaks call stack** – allows React to process current state updates before scheduling the next generation
5. **Recursive regeneration safe** – the debounce timer in `useGeneratorPreview` prevents runaway loops

---

## Implementation Location

**File:** `src/stores/generatorsStore.ts`  
**Function:** `regeneratePreview`  
**Lines:** ~555-585

```typescript
// Preview Generation Actions
regeneratePreview: async () => {
  const state = get();
  const { activeGenerator, isGenerating } = state;
  
  if (!activeGenerator || isGenerating) return;
  
  set({ isGenerating: true, lastError: null, isPreviewDirty: false }); // ← Clear early
  
  try {
    // ... generate frames ...
    // ... convert to ASCII ...
    
    let hadPendingDirtyChanges = false;
    set((state) => {
      hadPendingDirtyChanges = state.isPreviewDirty; // ← Capture
      return {
        previewFrames: result.frames,
        convertedFrames,
        totalPreviewFrames: result.frameCount,
        isPreviewDirty: false, // ← Clear
        isGenerating: false,
        uiState: { ...state.uiState, currentPreviewFrame: 0 }
      };
    });

    if (hadPendingDirtyChanges) {
      setTimeout(() => {
        const { regeneratePreview: rerunPreview } = useGeneratorsStore.getState();
        rerunPreview();
      }, 0);
    }
    
    // ... sync preview overlay ...
  } catch (error) {
    // ... error handling ...
  }
}
```

---

## Pattern Compatibility with App Architecture

### ✅ Aligns with Existing Patterns

1. **`setTimeout` for state cascade scheduling:**
   - Matches `animationStore.ts` deletion/duplication flow (lines 192, 307, 397)
   - Prevents immediate recursive calls that could block the UI

2. **Functional `set()` for race-safe reads:**
   - Standard Zustand pattern for atomic state transitions
   - Used throughout app for consistency

3. **Debounced regeneration:**
   - Existing `useGeneratorPreview` hook already debounces with `PREVIEW_DEBOUNCE_MS` (500ms)
   - This fix works *with* the debounce to handle rapid changes gracefully

4. **Dirty flag tracking:**
   - `isPreviewDirty` follows same pattern as effects system's preview invalidation
   - Clear-early, check-late pattern prevents duplicate work

### 🔄 Similar Patterns in Codebase

| System | File | Pattern |
|--------|------|---------|
| **Animation Deletion** | `animationStore.ts:192` | `setTimeout` to reset flags after state updates |
| **Effects Preview** | `effectsStore.ts:382-394` | Dirty flag for preview regeneration triggers |
| **Time Effects** | `timeEffectsStore.ts:212-227` | Preview state synchronization with flags |
| **Generator Debounce** | `useGeneratorPreview.ts:42` | `setTimeout` for debounced regeneration |

---

## Testing Checklist

- [x] Open generator panel (Radio Waves)
- [x] Switch to Mapping tab
- [x] Rapidly change character palette while preview is generating
- [x] Verify preview updates to show final palette without tab toggle
- [x] Change text color palette → preview updates automatically
- [x] Adjust multiple settings in quick succession → all changes reflected
- [x] Switch back to Animation tab → settings preserved correctly
- [x] No console errors or infinite regeneration loops
- [x] Debounce still working (500ms delay on rapid slider changes)

---

## Performance Considerations

### Memory
- **No leaks:** Closure only captures a single boolean flag
- **Cleanup:** `setTimeout` is fire-and-forget, no refs to track

### CPU
- **Debouncing intact:** Rapid changes still batched by `PREVIEW_DEBOUNCE_MS`
- **Max 2 regenerations:** Early clear prevents >1 pending regeneration at a time
- **Async safe:** Preview generation is already Promise-based and non-blocking

### Edge Cases Handled
1. **User closes panel mid-generation:** `isGenerating` guard prevents orphan callbacks
2. **User switches generators mid-generation:** `activeGenerator` guard rejects stale requests
3. **Multiple rapid changes:** Debounce timer coalesces into single final regeneration
4. **Network/CPU slowdown:** Each generation completes fully before next starts

---

## Future Improvements

### Potential Optimizations (Not Required)
1. **Incremental conversion:** Only re-convert frames if *mapping* changed, reuse RGBA if only palette changed
2. **Web Worker offload:** Move ASCII conversion to worker thread for larger animations
3. **Progressive preview:** Show partial frames during long generations (like video scrubbing)

### Related Systems That Could Adopt This Pattern
- Media Import preview regeneration (currently doesn't have rapid-change protection)
- Effects preview live updates (already uses similar dirty flag pattern)
- Character palette live preview in import panel (could benefit from same fix)

---

## Documentation Updates

### Files Modified
- ✅ `src/stores/generatorsStore.ts` – Added pending dirty flag capture pattern

### Documentation Created
- ✅ `docs/GENERATOR_PREVIEW_RACE_CONDITION_FIX.md` – This file

### Related Docs to Update
- `GENERATORS_IMPLEMENTATION_PLAN.md` – ✅ No changes needed (implementation detail)
- `ANIMATION_SYSTEM_GUIDE.md` – ✅ No changes needed (generators are separate system)

---

## Key Takeaways

1. **Always clear dirty flags early** in async operations to prevent duplicate work
2. **Use functional `set()`** when you need to read-then-clear state atomically
3. **`setTimeout(..., 0)`** is the right tool for scheduling follow-up state updates
4. **Closures are safe** for capturing values across async boundaries in Zustand stores
5. **Guard clauses prevent runaway recursion** even with scheduled callbacks

This pattern is now the recommended approach for handling rapid user input during async preview generation throughout the app.
