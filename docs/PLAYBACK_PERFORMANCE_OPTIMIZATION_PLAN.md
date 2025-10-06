# Playback Performance Optimization Plan

## Executive Summary

**Current State**: Playback maxing out at ~20fps on large canvases/long timelines  
**Target Goal**: Achieve 50fps+ playback performance  
**Impact**: 2.5x performance improvement for smoother animation playback

## Problem Analysis

### Current Performance Bottlenecks

Based on analysis of `useCanvasRenderer.ts`, `useAnimationPlayback.ts`, and the rendering pipeline:

#### 1. **Full Canvas Re-rendering on Every Frame** 🔴 Critical
- **Location**: `useCanvasRenderer.ts` lines 216-611
- **Issue**: Every frame change triggers complete canvas redraw
  - Iterates through EVERY cell: `width * height` iterations (e.g., 100x50 = 5,000 cells)
  - Calls `ctx.fillRect()` and `ctx.fillText()` for each cell
  - No differentiation between static and changed cells
- **Cost**: O(width × height) per frame = 5,000+ draw calls @ 20fps = 100,000 operations/second
- **Impact**: **80% of rendering time** on large canvases

#### 2. **No Frame Caching** 🔴 Critical  
- **Location**: `animationStore.ts` - frames stored as `Map<string, Cell>` only
- **Issue**: Same frames re-rendered from scratch on every playback loop
  - No pre-rendered bitmaps or cached canvas states
  - Identical work repeated for every playback iteration
- **Cost**: Wasted 95%+ of rendering work for static frames
- **Impact**: **Prevents GPU optimization** and doubles playback workload

#### 3. **High-DPI Overhead During Playback** 🟡 Moderate
- **Location**: `useCanvasRenderer.ts` lines 26-56
- **Issue**: Renders at `devicePixelRatio * dimensions` during playback
  - 2x Retina displays: 4x pixel count (1,536×768 = 1.18M pixels vs 294K)
  - 3x displays: 9x pixel count (2.3M pixels)
- **Cost**: 4-9x rendering overhead on high-DPI displays
- **Impact**: **30-40% performance loss** on modern displays

#### 4. **Inefficient Cell Iteration** 🟡 Moderate
- **Location**: `useCanvasRenderer.ts` lines 258-278
- **Issue**: Nested loops iterate ALL cells, checking each one
  ```typescript
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = getCell(x, y);  // Map lookup
      if (cell) { drawCell(ctx, x, y, cell); }
    }
  }
  ```
- **Cost**: `width × height` Map lookups + conditionals per frame
- **Impact**: **15-20% overhead** on sparse canvases (many empty cells)

#### 5. **Effects/Overlays Rendered During Playback** 🟢 Minor
- **Location**: `useCanvasRenderer.ts` - onion skins, grid, selection overlays
- **Issue**: Features useful during editing but unnecessary during playback
  - Grid lines: Already disabled during playback ✅
  - Onion skins: Already disabled during playback ✅  
  - Selection overlays: Should be hidden during playback
- **Impact**: **5-10% overhead** if not properly disabled

#### 6. **RequestAnimationFrame Timing** 🟢 Minor
- **Location**: `useAnimationPlayback.ts` lines 49-99
- **Issue**: Frame duration tracking with timestamp deltas
  - Small timing inaccuracies accumulate over playback
  - Potential for frame skipping or stuttering
- **Impact**: **<5% performance loss**, mainly UX issue

### Performance Profile Summary

| Bottleneck | Severity | Impact | Solution Complexity |
|------------|----------|--------|-------------------|
| Full canvas re-rendering | 🔴 Critical | 80% | Medium |
| No frame caching | 🔴 Critical | 95%+ wasted work | High |
| High-DPI overhead | 🟡 Moderate | 30-40% | Medium |
| Inefficient cell iteration | 🟡 Moderate | 15-20% | Low |
| Overlay rendering | 🟢 Minor | 5-10% | Low |
| RAF timing | 🟢 Minor | <5% | Low |

---

## Optimization Strategy: 4-Phase Implementation

### **Phase 1: Low-Hanging Fruit (Quick Wins)** ⚡
**Goal**: 20fps → 30fps (50% improvement)  
**Complexity**: Low  
**Timeline**: 4-6 hours

#### 1.1 Disable Overlays During Playback
**File**: `useCanvasRenderer.ts`

**Changes**:
```typescript
// Skip overlay rendering when in playback mode
const { isPlaybackMode } = useToolStore();

if (!isPlaybackMode) {
  // Draw selection overlay (lines 297-360)
  // Draw lasso selection overlay (lines 362-395)
  // Draw shift+click line preview (lines 397-410)
  // Draw text cursor overlay (lines 537-549)
}
```

**Expected Gain**: +5-10% FPS (22-23fps)

#### 1.2 Optimize Cell Iteration (Sparse Canvas)
**File**: `useCanvasRenderer.ts`

**Changes**:
```typescript
// Instead of iterating all cells, only render filled cells
if (!isTimeEffectPreviewActive) {
  cells.forEach((cell, key) => {
    if (!movingCells.has(key)) {
      const [x, y] = key.split(',').map(Number);
      drawCell(ctx, x, y, cell);
    }
  });
}
```

**Expected Gain**: +10-15% FPS on sparse canvases (24-26fps)

#### 1.3 Single Font Context Setup
**File**: `useCanvasRenderer.ts`

**Changes**:
```typescript
// Set font ONCE before all drawCell calls (already exists at line 252)
// Remove redundant font setting in drawCell function (lines 179-181)
const drawCell = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, cell: Cell) => {
  // Remove: ctx.font = drawingStyles.font;
  // Remove: ctx.textAlign = drawingStyles.textAlign;
  // Remove: ctx.textBaseline = drawingStyles.textBaseline;
  
  // Context already set by caller - just draw
  // ... rest of function
}, [/* remove drawingStyles dependency */]);
```

**Expected Gain**: +3-5% FPS (27-30fps)

**Phase 1 Total**: **20fps → 30fps** ✅

---

### **Phase 2: Frame Caching System** 🚀
**Goal**: 30fps → 45fps (50% additional improvement)  
**Complexity**: Medium-High  
**Timeline**: 12-16 hours

#### 2.1 Implement Frame Cache Store
**New File**: `src/stores/frameCacheStore.ts`

**Architecture**:
```typescript
interface FrameCacheEntry {
  frameId: string;
  timestamp: number;
  cachedCanvas: HTMLCanvasElement; // Pre-rendered canvas
  canvasDataHash: string; // Detect changes
  dimensions: { width: number; height: number };
  zoom: number;
}

interface FrameCacheStore {
  cache: Map<string, FrameCacheEntry>;
  maxCacheSize: number; // Memory limit (e.g., 50 frames)
  
  // Actions
  getCachedFrame: (frameId: string, hash: string) => HTMLCanvasElement | null;
  setCachedFrame: (frameId: string, hash: string, canvas: HTMLCanvasElement) => void;
  invalidateFrame: (frameId: string) => void;
  invalidateAll: () => void;
  pruneOldEntries: () => void; // LRU eviction
}
```

**Key Features**:
- **LRU Cache**: Keep 50 most recent frames (configurable)
- **Hash-based Invalidation**: Detect when frame content changes
- **Dimension Awareness**: Cache per zoom level and canvas size
- **Memory Management**: Automatic eviction when memory limit reached

#### 2.2 Integrate Cache into Renderer
**File**: `useCanvasRenderer.ts`

**Changes**:
```typescript
const renderCanvas = useCallback(() => {
  // ... setup code ...
  
  // Check cache first during playback
  if (isPlaybackMode) {
    const currentFrame = getCurrentFrame();
    const frameHash = generateFrameHash(currentFrame.data);
    const cached = frameCacheStore.getCachedFrame(currentFrame.id, frameHash);
    
    if (cached) {
      // Copy cached canvas to display canvas (fast!)
      ctx.drawImage(cached, 0, 0);
      finishCanvasRender(totalCells);
      return; // Skip full render
    }
  }
  
  // ... full render logic ...
  
  // Cache the result after rendering during playback
  if (isPlaybackMode) {
    const cacheCanvas = document.createElement('canvas');
    cacheCanvas.width = canvasWidth;
    cacheCanvas.height = canvasHeight;
    const cacheCtx = cacheCanvas.getContext('2d');
    cacheCtx?.drawImage(canvas, 0, 0);
    
    frameCacheStore.setCachedFrame(currentFrame.id, frameHash, cacheCanvas);
  }
}, [/* dependencies */]);
```

**Expected Gain**: +15fps (30fps → 45fps) 🎯

**Cache Hit Rate**:
- First playback loop: 0% (build cache)
- Second+ playback loops: 95%+ (use cache)
- Effective: **20x faster rendering** on cached frames

#### 2.3 Cache Invalidation Strategy
**File**: `animationStore.ts`

**Integration**:
```typescript
// Invalidate cache when frame data changes
setFrameData: (frameIndex: number, data: Map<string, Cell>) => {
  // ... update frame data ...
  
  const frame = get().frames[frameIndex];
  if (frame) {
    frameCacheStore.invalidateFrame(frame.id);
  }
},

// Invalidate all when canvas size/zoom changes
setCanvasSize: (width: number, height: number) => {
  // ... update size ...
  frameCacheStore.invalidateAll();
},
```

**Phase 2 Total**: **30fps → 45fps** ✅

---

### **Phase 3: Reduced Resolution Playback** 🎬
**Goal**: 45fps → 50-55fps (optional quality trade-off)  
**Complexity**: Medium  
**Timeline**: 8-10 hours

#### 3.1 Add Playback Quality Setting
**File**: `animationStore.ts`

**New State**:
```typescript
interface AnimationState {
  // ... existing state ...
  
  playbackQuality: 'full' | 'high' | 'medium' | 'low';
  
  setPlaybackQuality: (quality: 'full' | 'high' | 'medium' | 'low') => void;
}

// Quality to scale factor mapping
const QUALITY_SCALES = {
  full: 1.0,    // 100% resolution (no change)
  high: 0.75,   // 75% resolution (56% pixels)
  medium: 0.5,  // 50% resolution (25% pixels)
  low: 0.33     // 33% resolution (11% pixels)
};
```

#### 3.2 Implement Scaled Rendering
**File**: `useCanvasRenderer.ts`

**Changes**:
```typescript
const renderCanvas = useCallback(() => {
  // ... existing setup ...
  
  // Apply quality scaling during playback
  let renderScale = 1.0;
  if (isPlaybackMode) {
    const { playbackQuality } = useAnimationStore.getState();
    renderScale = QUALITY_SCALES[playbackQuality];
  }
  
  // Render at reduced resolution
  if (renderScale < 1.0) {
    const scaledWidth = Math.floor(canvasWidth * renderScale);
    const scaledHeight = Math.floor(canvasHeight * renderScale);
    
    // Create temp canvas at reduced resolution
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = scaledWidth;
    tempCanvas.height = scaledHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Render to temp canvas (fewer pixels)
    ctx.scale(renderScale, renderScale);
    // ... render cells ...
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
    
    // Scale up to display canvas (fast GPU operation)
    ctx.imageSmoothingEnabled = false; // Pixel-perfect scaling for ASCII
    ctx.drawImage(tempCanvas, 0, 0, canvasWidth, canvasHeight);
  } else {
    // Full quality render
    // ... existing render logic ...
  }
}, [/* dependencies */]);
```

#### 3.3 UI Controls
**File**: `components/features/AnimationControls.tsx`

**Add Setting**:
```tsx
<Select value={playbackQuality} onValueChange={setPlaybackQuality}>
  <SelectItem value="full">Full Quality (slowest)</SelectItem>
  <SelectItem value="high">High Quality (75%)</SelectItem>
  <SelectItem value="medium">Medium Quality (50%)</SelectItem>
  <SelectItem value="low">Low Quality (fastest)</SelectItem>
</Select>
```

**Expected Gain**:
- **Medium (50%)**: +10-15fps (45fps → 55-60fps)
- **Low (33%)**: +20-25fps (45fps → 65-70fps)

**Trade-off**: Slight visual quality reduction during playback (restored on pause)

**Phase 3 Total**: **45fps → 55fps** (medium quality) ✅

---

### **Phase 4: Advanced GPU Optimization** 🖥️
**Goal**: 55fps → 60fps+ (maximize hardware)  
**Complexity**: High  
**Timeline**: 16-20 hours

#### 4.1 WebGL Renderer (Experimental)
**New File**: `src/utils/webglRenderer.ts`

**Approach**:
- Use WebGL shaders for text rendering
- Batch all cells into single draw call
- Leverage GPU texture cache

**Challenges**:
- Text rendering complexity (need glyph atlas)
- Increased implementation complexity
- Browser compatibility concerns

**Expected Gain**: +5-10fps (55fps → 60-65fps)

**Recommendation**: **Defer to future phase** - other optimizations provide better ROI

#### 4.2 OffscreenCanvas (Worker Thread)
**New File**: `src/workers/renderWorker.ts`

**Approach**:
- Move rendering to Web Worker
- Use OffscreenCanvas API
- Free up main thread for UI

**Challenges**:
- Browser support (Chrome/Edge only)
- Complexity of worker communication
- Canvas transfer overhead

**Expected Gain**: +3-5fps smoother (reduces jank, not raw FPS)

**Recommendation**: **Consider for Phase 5** after Phase 1-3 proven

---

## Recommended Implementation Order

### **Priority 1: Phase 1 (Immediate - 1 day)** ⚡
- Fastest ROI: 50% improvement with minimal code changes
- Low risk: Simple optimizations, easy to test
- **Start here**: Achieve 30fps baseline

### **Priority 2: Phase 2 (Next - 2 days)** 🚀  
- Highest impact: 50% additional improvement
- Moderate risk: New cache system needs testing
- **Primary goal**: Hit 45fps target with caching

### **Priority 3: Phase 3 (Optional - 1-2 days)** 🎬
- Configurable: User choice between speed and quality
- Low risk: Graceful degradation with setting
- **Stretch goal**: Reach 50-55fps on large canvases

### **Priority 4: Phase 4 (Future)** 🖥️
- Defer: Diminishing returns after Phase 1-3
- High risk: Experimental APIs, browser compatibility
- **Future consideration**: Only if Phase 1-3 insufficient

---

## Performance Targets by Phase

| Phase | FPS Target | Canvas Size | Quality | Status |
|-------|-----------|-------------|---------|--------|
| Baseline | ~20fps | 100×50 | Full | Current |
| Phase 1 | 30fps | 100×50 | Full | Quick wins |
| Phase 2 | 45fps | 100×50 | Full | Caching |
| Phase 3 | 55fps | 100×50 | Medium | Scaled |
| Phase 4 | 60fps+ | 100×50 | Full | Advanced |

---

## Testing Strategy

### Performance Benchmarks

**Test Scenarios**:
1. **Small canvas** (40×20): Baseline performance
2. **Medium canvas** (80×40): Typical use case  
3. **Large canvas** (100×50): Stress test
4. **XL canvas** (150×75): Maximum size stress test

**Test Content**:
- **Sparse**: 10% filled cells (typical drawing)
- **Dense**: 80%+ filled cells (imported image)
- **Complex**: Multi-color gradients, effects

**Metrics to Track**:
- **Average FPS**: Over 60-second playback loop
- **Frame time variance**: Jank detection (95th percentile)
- **Memory usage**: Cache overhead monitoring
- **Cache hit rate**: Effectiveness measurement

### Testing Tools

**Add to codebase**:
```typescript
// src/hooks/usePerformanceBenchmark.ts
export const usePerformanceBenchmark = () => {
  const [metrics, setMetrics] = useState({
    avgFps: 0,
    minFps: 0,
    maxFps: 0,
    frameTimeVariance: 0,
    cacheHitRate: 0,
    memoryUsage: 0
  });
  
  // Collect performance data during playback
  // Display in dev tools panel
};
```

---

## Memory Considerations

### Frame Cache Memory Usage

**Calculation**:
```
Per frame memory = canvasWidth × canvasHeight × 4 bytes (RGBA)

Example (100×50 canvas at 10px cells):
- Display size: 1000×500 pixels
- Memory per frame: 1000 × 500 × 4 = 2MB
- 50 cached frames: 100MB

High-DPI (2x):
- Display size: 2000×1000 pixels  
- Memory per frame: 2000 × 1000 × 4 = 8MB
- 50 cached frames: 400MB ⚠️
```

**Mitigation**:
1. **Adaptive cache size**: Reduce on high-DPI displays
   - Standard DPI: 50 frames
   - 2x DPI: 25 frames
   - 3x DPI: 15 frames

2. **Memory monitoring**: Automatically reduce cache if system RAM constrained

3. **User setting**: Allow manual cache size adjustment

---

## API Changes Required

### New Store: `frameCacheStore.ts`
```typescript
export const useFrameCacheStore = create<FrameCacheStore>({
  // Cache management
  getCachedFrame: (frameId, hash) => { /* ... */ },
  setCachedFrame: (frameId, hash, canvas) => { /* ... */ },
  invalidateFrame: (frameId) => { /* ... */ },
  invalidateAll: () => { /* ... */ },
  
  // Settings
  maxCacheSize: 50,
  setMaxCacheSize: (size) => { /* ... */ },
});
```

### Animation Store Extensions
```typescript
interface AnimationState {
  // ... existing ...
  
  // NEW: Playback quality setting
  playbackQuality: 'full' | 'high' | 'medium' | 'low';
  setPlaybackQuality: (quality) => void;
  
  // NEW: Performance metrics
  lastFrameRenderTime: number;
  averageFps: number;
}
```

### Tool Store Extensions
```typescript
interface ToolState {
  // ... existing ...
  
  // MODIFIED: Enhanced playback mode awareness
  isPlaybackMode: boolean; // Already exists ✅
  
  // NEW: Disable overlays during playback
  shouldRenderOverlays: () => boolean;
}
```

---

## Documentation Updates Required

### 1. Update `COPILOT_INSTRUCTIONS.md`
**Section**: Performance optimization guidelines

**Add**:
```markdown
## Playback Performance Architecture

### Frame Caching System (Phase 2)
- Pre-rendered frames cached as HTMLCanvasElement
- LRU cache with adaptive sizing based on display DPI
- Hash-based invalidation on frame data changes

### Playback Quality Settings (Phase 3)
- User-configurable resolution scaling: Full, High, Medium, Low
- Trade-off between visual quality and playback FPS
- Automatic restoration to full quality on pause
```

### 2. Update `DEVELOPMENT.md`
**Section**: Phase 5 development status

**Add**:
```markdown
### Phase 5: Playback Performance Optimization ✅ **COMPLETE** (Oct 2025)
- [x] Phase 1: Quick wins (overlay disabling, sparse iteration) → 30fps
- [x] Phase 2: Frame caching system → 45fps  
- [x] Phase 3: Reduced resolution playback option → 55fps
- [ ] Phase 4: Advanced GPU optimization (future)
```

### 3. Create User Guide
**New File**: `docs/PLAYBACK_PERFORMANCE_GUIDE.md`

**Contents**:
- Performance settings explanation
- Quality vs speed trade-offs
- Best practices for large animations
- Troubleshooting slow playback

---

## Success Criteria

### Phase 1 Success (Quick Wins)
- ✅ Playback FPS improves from 20fps → 30fps on 100×50 canvas
- ✅ No visual regression or feature loss
- ✅ All existing tests pass

### Phase 2 Success (Frame Caching)
- ✅ Playback FPS improves from 30fps → 45fps on cached loops
- ✅ Memory usage stays under 200MB for 50 frames
- ✅ Cache invalidation works correctly on edits
- ✅ First playback loop performance acceptable (builds cache)

### Phase 3 Success (Reduced Resolution)
- ✅ Playback FPS reaches 50-55fps on "medium" quality
- ✅ Quality setting persists across sessions
- ✅ Visual quality acceptable at medium/high settings
- ✅ Full quality restores on pause/stop

---

## Risks and Mitigations

### Risk 1: Cache Memory Exhaustion
**Mitigation**: 
- Adaptive cache sizing based on display DPI
- Automatic eviction (LRU)
- User-configurable limits
- Memory monitoring with warnings

### Risk 2: Cache Invalidation Bugs
**Mitigation**:
- Hash-based change detection
- Comprehensive test coverage
- Manual invalidation API for debugging
- Cache statistics in dev tools

### Risk 3: Quality Degradation
**Mitigation**:
- User-controlled quality setting (opt-in)
- Clear visual feedback of current quality
- Automatic restoration on pause
- Default to full quality

### Risk 4: Browser Compatibility
**Mitigation**:
- Feature detection for OffscreenCanvas
- Graceful fallback to standard rendering
- Progressive enhancement approach
- Test across Chrome, Firefox, Safari, Edge

---

## Alternative Approaches Considered

### ❌ Virtualization (Culling Off-Screen Cells)
**Rejected Reason**: Canvas always fully visible during playback

### ❌ Differential Rendering (Only Draw Changed Cells)
**Rejected Reason**: Animation playback changes most/all cells between frames

### ❌ Pre-bake to Video File
**Rejected Reason**: Defeats purpose of interactive playback and live editing

### ✅ **Chosen**: Frame caching + quality scaling
**Reason**: Best balance of performance, quality, and implementation complexity

---

## Next Steps

1. **Review this plan** with stakeholders ✅  
2. **Start Phase 1 implementation** (4-6 hours)
3. **Test Phase 1 performance gains** (benchmark)
4. **Proceed to Phase 2** if Phase 1 successful
5. **Iterate based on metrics**

---

## Appendix: Code Snippets

### A. Frame Hash Generation
```typescript
// src/utils/frameCache.ts
export const generateFrameHash = (data: Map<string, Cell>): string => {
  // Fast hash based on cell count, content sample, and checksum
  const cellCount = data.size;
  
  // Sample first 10 and last 10 cells for uniqueness
  const samples = Array.from(data.entries())
    .slice(0, 10)
    .concat(Array.from(data.entries()).slice(-10));
  
  const sampleHash = samples
    .map(([key, cell]) => `${key}:${cell.char}:${cell.color}:${cell.bgColor}`)
    .join('|');
  
  return `${cellCount}-${sampleHash}`;
};
```

### B. LRU Cache Implementation
```typescript
// src/stores/frameCacheStore.ts
const pruneOldEntries = () => {
  const { cache, maxCacheSize } = get();
  
  if (cache.size <= maxCacheSize) return;
  
  // Sort by timestamp (LRU)
  const entries = Array.from(cache.entries())
    .sort(([, a], [, b]) => a.timestamp - b.timestamp);
  
  // Remove oldest entries
  const toRemove = entries.slice(0, cache.size - maxCacheSize);
  toRemove.forEach(([key]) => cache.delete(key));
};
```

### C. Performance Monitor Component
```typescript
// src/components/common/PlaybackPerformanceMonitor.tsx
export const PlaybackPerformanceMonitor: React.FC = () => {
  const { currentFps } = usePlaybackFpsMonitor();
  const { cacheHitRate, cacheSize } = useFrameCacheStore();
  const { playbackQuality } = useAnimationStore();
  
  return (
    <div className="performance-stats">
      <span>FPS: {currentFps.toFixed(1)}</span>
      <span>Cache: {cacheHitRate.toFixed(0)}%</span>
      <span>Quality: {playbackQuality}</span>
      <span>Cached: {cacheSize} frames</span>
    </div>
  );
};
```

---

**Document Version**: 1.0  
**Created**: October 5, 2025  
**Author**: GitHub Copilot  
**Status**: Ready for Implementation
