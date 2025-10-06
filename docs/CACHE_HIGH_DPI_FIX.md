# Frame Cache High-DPI Scaling Fix

## Date: October 5, 2025
## Issue: Cached frames displayed at 200% scale during playback

---

## Problem Description

When playing back cached frames on high-DPI (Retina) displays, the animation appeared at 200% scale - twice as large as it should be.

### Root Cause

The canvas has two different sizes due to high-DPI scaling:

1. **Internal resolution** (canvas.width/height): Scaled by devicePixelRatio (e.g., 2000×1000 on 2x displays)
2. **CSS display size** (style.width/height): The visual size (e.g., 1000×500 pixels)

When copying the cached canvas:
```typescript
// WRONG - uses logical coordinates, ignores internal scaling
ctx.drawImage(cachedCanvas, 0, 0);
```

This drew the 2000×1000 internal canvas at 2000×1000 logical coordinates, making it appear 2x too large!

---

## Solution

Reset the transform, draw at actual canvas dimensions, then restore transform:

```typescript
// Reset transform to identity (no scaling)
ctx.setTransform(1, 0, 0, 1, 0, 0);

// Clear at actual internal dimensions
ctx.clearRect(0, 0, canvas.width, canvas.height);

// Copy cached canvas at actual internal dimensions
ctx.drawImage(cachedCanvas, 0, 0, canvas.width, canvas.height);

// Restore device pixel ratio scaling for future operations
const devicePixelRatio = window.devicePixelRatio || 1;
ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
```

---

## Why This Works

### Before (Broken):
- Canvas internal size: 2000×1000 (2x DPI)
- Context has 2x scale transform applied
- `drawImage(cached, 0, 0)` → draws at logical (0,0) → appears at (0,0) to (2000,2000) internally → 2x too big!

### After (Fixed):
- Reset transform to identity (no scaling)
- `drawImage(cached, 0, 0, canvas.width, canvas.height)` → draws to full internal resolution
- Restore 2x transform for consistency
- Result: Correct 1:1 copy of cached frame

---

## Files Modified

- ✅ `src/hooks/useCanvasRenderer.ts` - Fixed cache copy operation

---

## Testing

1. **On standard display (1x DPI)**:
   - Should look identical (transform is 1x, no change)
   
2. **On Retina display (2x DPI)**:
   - Cached playback should now match non-cached playback size
   - Animation should maintain consistent scale throughout

3. **On high-DPI display (3x)**:
   - Same fix applies, correctly handles 3x scaling

---

## Prevention

When working with canvas and high-DPI:
- ✅ Always be aware of internal vs display dimensions
- ✅ Reset transforms before pixel-perfect operations
- ✅ Test on both 1x and 2x displays
- ✅ Use `canvas.width/height` (internal) not `canvasConfig.canvasWidth/Height` (logical)

---

**Status**: ✅ Fixed - Ready for re-testing
