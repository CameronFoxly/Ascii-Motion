# Generator Canvas Preview Optimization

**Date:** October 29, 2025  
**Status:** ✅ Implemented  
**Related:** `GENERATOR_PREVIEW_RACE_CONDITION_FIX.md`

---

## Overview

Enhanced the generator system to provide live canvas preview in both Animation and Mapping tabs while optimizing performance by only updating the canvas when the sidepanel animation is paused.

---

## Changes Summary

### 1. Default to Paused State
- Changed initial `isPlaying` from `true` → `false` on generator panel open
- Allows users to see the first frame immediately on canvas for tuning
- Users can start playback when ready to preview animation

### 2. Canvas Preview in Both Tabs
- **Previous:** Canvas preview only visible in Mapping tab
- **New:** Canvas preview visible in both Animation and Mapping tabs when paused
- Enables real-time feedback while adjusting generator settings

### 3. Performance Optimization
- Canvas preview **only updates when playback is paused**
- When playing: preview is cleared to avoid expensive canvas updates during animation
- When paused: preview syncs with current frame for immediate visual feedback

---

## Implementation Details

### Modified Functions in `generatorsStore.ts`

#### `openGenerator`
```typescript
// Before: isPlaying: true
// After:  isPlaying: false
uiState: { 
  ...DEFAULT_UI_STATE,
  isPlaying: false  // Start paused for canvas preview tuning
}
```

#### `setActiveTab`
```typescript
// Before: Only updated preview in mapping tab
// After:  Updates preview in both tabs when not playing

// Update canvas preview with current frame when not playing
if (!currentState.uiState.isPlaying) {
  const frame = currentState.convertedFrames[currentState.uiState.currentPreviewFrame];
  if (frame) {
    previewStore.setPreviewData(frame.data);
  }
} else {
  // Clear preview when playing to avoid canvas updates during animation
  previewStore.clearPreview();
}
```

#### `setPlaying`
```typescript
// New: Syncs canvas when pausing, clears when playing

if (!playing) {
  // When pausing, sync canvas with current frame for live preview
  const frame = currentState.convertedFrames[currentState.uiState.currentPreviewFrame];
  if (frame) {
    previewStore.setPreviewData(frame.data);
  }
} else {
  // When playing, clear canvas preview to avoid updates during animation
  previewStore.clearPreview();
}
```

#### `setPreviewFrame`
```typescript
// Before: Only synced canvas in mapping tab
// After:  Syncs canvas when not playing (regardless of tab)

if (!state.uiState.isPlaying) {
  const frame = state.convertedFrames[clampedIndex];
  if (frame) {
    previewStore.setPreviewData(frame.data);
  }
}
```

#### `regeneratePreview`
```typescript
// Before: Only synced in mapping tab
// After:  Syncs first frame when not playing

if (!updatedState.uiState.isPlaying) {
  const frame = updatedState.convertedFrames[updatedState.uiState.currentPreviewFrame];
  if (frame) {
    previewStore.setPreviewData(frame.data);
  }
}
```

### Removed from `GeneratorsPanel.tsx`
- Removed `wasPlayingBeforeMapping` state tracking
- Removed auto-pause/resume logic on tab changes
- Simplified component to rely on store-level preview management

---

## User Experience Flow

### Opening Generator Panel
1. User clicks generator (e.g., Radio Waves)
2. Panel opens with playback **paused**
3. First frame immediately visible on canvas
4. User can adjust settings and see live updates

### Adjusting Settings (Paused)
1. User adjusts animation settings (frequency, amplitude, etc.)
2. Preview regenerates with debounce
3. Canvas updates automatically with new first frame
4. Immediate visual feedback without playing animation

### Adjusting Settings (Playing)
1. User clicks Play button
2. Canvas preview clears (performance optimization)
3. Sidepanel shows looping animation preview
4. User can still adjust settings (preview regenerates in background)

### Scrubbing Frames
1. User drags frame scrubber
2. Playback automatically pauses
3. Canvas syncs with scrubbed frame
4. User can fine-tune mapping at specific frame

### Mapping Tab
1. Works identically to Animation tab
2. Palette changes trigger regeneration
3. Canvas updates when paused
4. No tab-specific behavior differences

---

## Performance Characteristics

### Canvas Update Frequency

| State | Canvas Updates | Rationale |
|-------|---------------|-----------|
| **Paused** | Every frame change | Immediate feedback for tuning |
| **Playing** | None | Avoid 30-60 FPS canvas redraws |
| **Scrubbing** | Every scrub event | User-initiated preview |
| **Regenerating** | On completion | Show new first frame |

### Memory/CPU Impact
- **Paused preview:** ~1 canvas update per user action (negligible)
- **Playing preview:** 0 canvas updates (optimal)
- **No additional memory:** Reuses existing `previewStore` infrastructure

---

## Testing Checklist

- [x] Panel opens with playback paused (not auto-playing)
- [x] First frame visible on canvas immediately
- [x] Adjusting animation settings updates canvas (when paused)
- [x] Clicking Play clears canvas preview
- [x] Clicking Pause syncs canvas with current frame
- [x] Scrubbing frames updates canvas
- [x] Switching tabs preserves playback state
- [x] Mapping changes update canvas (when paused)
- [x] No performance degradation during playback
- [x] Canvas clears when closing panel

---

## Edge Cases Handled

### 1. Empty Preview Frames
- Checks `convertedFrames` existence before syncing
- Clears preview if frame not available

### 2. Tab Switching Mid-Playback
- Preserves playback state across tabs
- Canvas remains clear while playing
- Syncs when user pauses in either tab

### 3. Rapid Setting Changes While Playing
- Preview regenerates in background
- Canvas remains clear during regeneration
- No canvas flicker or partial updates

### 4. Panel Close While Playing
- `closeGenerator()` clears preview store
- No orphaned canvas preview after close

---

## Future Enhancements

### Potential Optimizations
1. **Incremental Canvas Updates:** Only redraw changed cells (not entire canvas)
2. **Canvas Diff Detection:** Skip update if frame data unchanged
3. **Throttled Preview:** Limit canvas updates to 10 FPS even when paused

### Related Feature Requests
- **Canvas Preview Opacity Slider:** Let users adjust preview overlay strength
- **Side-by-Side Preview:** Show both sidepanel and canvas simultaneously
- **Preview Zones:** Only preview portion of canvas (crop region)

---

## Key Takeaways

1. **User control over performance:** Pausing enables detailed tuning, playing optimizes CPU
2. **Consistent behavior across tabs:** No special mapping tab logic needed
3. **Store-level preview management:** Component stays simple, store handles sync logic
4. **Performance by default:** Canvas updates disabled during animation playback
5. **Immediate feedback when paused:** Every setting change reflects on canvas

This pattern can be applied to other preview systems (media import, effects) for consistent performance optimization across the app.
