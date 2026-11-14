# Layer Timeline Performance Optimizations

> **Created:** February 12, 2026  
> **Status:** In Progress  
> **Branch:** `phase-5/export-migration`  
> **Baseline:** Production `main` branch handles 90+ frames at 60fps  
> **Goal:** Match production performance with the new layer timeline system

## Problem Statement

The layer timeline refactor (Phases 1–6) introduced a new `timelineStore`, an `animationStore` adapter for backward compatibility, and a full timeline UI. While playback performance is excellent (pre-computed, bypasses React), all other UI interactions (drawing, hovering, tool switching, timeline navigation) degrade severely with 90+ content frames.

### Root Cause Summary

The performance regression is caused by **cascading React re-renders**. A single user interaction (e.g., drawing one cell) triggers store updates that propagate through 50+ Zustand subscribers and React context consumers, causing the entire component tree to re-render unnecessarily.

---

## Diagnostic Process

### Git Bisection (Manual Testing)

Tested 8 commits between `main` and `62f52a4` (latest) with 90-frame generator content:

| Commit | Description | Performance |
|--------|-------------|-------------|
| `main` | Production baseline | **Perfect** |
| `2aed0ad` | Phase 1 — stores + adapter | Slightly slower, usable |
| `9f82d64` | Phase 3 — basic timeline UI | Not slow |
| `28eaa3b` | Offset selection on transforms | OK-ish |
| `fa39dcc` | Added layer transform panel | OK |
| `7f8761f` | Fixed UI focus + anchor visibility | OK |
| **`0a72fbd`** | **Added layer transform tool** | **Very slow — first bad commit** |
| `741eb18` | Phase 4 mid — playback + frame rate | Slow |
| `62f52a4` | Latest — all phases | Slow |

**Verdict:** Commit `0a72fbd` ("Added layer transform tool") introduced `useLayerTransformTool.ts` (470 lines) which is called unconditionally from `useCanvasMouseHandlers` in the CanvasGrid render tree. It creates 7 `useKeyframeableProperty` instances, each with multiple store subscriptions and hooks — adding ~49 React hook evaluations to every single CanvasGrid render regardless of active tool.

### Paint Flashing Analysis

Chrome DevTools paint flashing revealed:
- Timeline scrub caused toolbar, canvas, AND tool palette to re-render
- Tool switching caused the entire canvas to re-render
- Hovering the canvas caused CanvasProvider to re-render → all context consumers cascaded

---

## Optimizations Applied

### 1. Adapter Subscribe Split (Tier 1 / Tier 2)

**File:** `src/stores/animationStore.ts`  
**Problem:** The `useTimelineStore.subscribe()` callback in the adapter called `deriveLegacyFrames()` on every `currentFrame` change. This function clones ALL content frame Map data (`new Map(cf.data)` per frame), then sets the adapter state — triggering 32+ consumer re-renders.  
**Fix:** Split into Tier 1 (cheap scalars: currentFrame, isPlaying, looping — no Map cloning) and Tier 2 (structural: only calls `deriveLegacyFrames()` on layer/frame add/remove/reorder).  
**Impact:** Frame navigation no longer clones all cell data.

### 2. Broad Subscription → Targeted Selectors (22 files)

**Files:** 8 hooks, 3 components, `useAnimationHistory`, `useAnimationPlayback`, `useOptimizedPlayback`, `useEffectsHistory`, `useTimeEffectsHistory`, `useCropToSelection`, `useCanvasResize`, `OnionSkinControls`  
**Problem:** `const { x } = useAnimationStore()` (no selector) re-renders the component on ANY store change.  
**Fix:** Converted to `useAnimationStore((s) => s.currentFrameIndex)` — components only re-render when their specific property changes.  
**Impact:** Tool switching, brush changes, playback state changes no longer cascade through unrelated components.

### 3. JSON.stringify Removed from Auto-Save

**File:** `src/hooks/useFrameSynchronization.ts`  
**Problem:** Auto-save dirty check did `JSON.stringify(Array.from(cells.entries()).sort())` on EVERY `cells` change — O(N) serialization with N = up to 1920 cells (80×24 grid).  
**Fix:** Replaced with cheap reference + size check (`cells === lastCellsRef.current`). Zustand creates new Map references on every `setCell`, so reference inequality is sufficient.  
**Impact:** Eliminated main-thread blocking serialization on every keystroke/mouse-move.

### 4. In-Place Content Frame Data Mutation

**File:** `src/stores/timelineStore.ts` (`updateContentFrameData`)  
**Problem:** Every auto-save (every 150ms during drawing) created new `layers` → `contentFrames` → content frame objects via Zustand's immutable `set()`. This triggered re-renders in ALL `s.layers` subscribers.  
**Fix:** `updateContentFrameData` now mutates `cf.data` in-place without calling `set()`. No component renders cell data from timelineStore directly (they use canvasStore or useCompositedCanvas).  
**Impact:** Auto-save no longer cascades through timeline subscribers.

### 5. `useTimelineHistory` — getState() in Callbacks

**File:** `src/hooks/useTimelineHistory.ts`  
**Problem:** Used `useTimelineStore()` (broad subscription) — called 8× in the CanvasGrid tree (1× from `useLayerTransformTool`, 7× from `useKeyframeableProperty`). Every timelineStore change triggered re-renders.  
**Fix:** All action functions now use `useTimelineStore.getState()` inside callbacks instead of reactive subscriptions. Only `pushToHistory` (from toolStore) is subscribed reactively.  
**Impact:** 8 broad timelineStore subscriptions eliminated from CanvasGrid tree.

### 6. `useKeyframeableProperty` — Zero-Cost Inactive Path

**File:** `src/hooks/useKeyframeableProperty.ts`  
**Problem:** Each instance called `useTimelineHistory()` (which created 20+ `useCallback` hooks). With 7 instances in `useLayerTransformTool`, that's 140+ useCallback allocations per CanvasGrid render.  
**Fix:** Removed `useTimelineHistory` import entirely. Actions use `useTimelineStore.getState()` and `useToolStore.getState().pushToHistory()` directly. Callbacks use `useRef` pattern for zero-dependency stability. When `layerId` is null (tool inactive), selectors return constants and action functions return stable NOOPs.  
**Impact:** ~140 useCallback evaluations eliminated from every CanvasGrid render when transform tool is not active.

### 7. `useLayerTransformTool` — Extracted from CanvasGrid Render Path

**Files:** `src/hooks/useCanvasMouseHandlers.ts`, `src/hooks/useLayerTransformTool.ts`, `src/components/features/LayerTransformOverlay.tsx`  
**Problem:** `useCanvasMouseHandlers` unconditionally called `useLayerTransformTool()`, adding ~49 React hooks to every CanvasGrid render even when the transform tool wasn't active. This was the EXACT commit (`0a72fbd`) identified by git bisection.  
**Fix:** Introduced a shared module-level ref (`layerTransformHandlersRef`). `LayerTransformOverlay` (conditionally mounted only when tool is active) writes handlers to the ref. `useCanvasMouseHandlers` reads from the ref — no React hooks involved.  
**Impact:** ~49 hook evaluations eliminated from every CanvasGrid render for all non-transform tools.

### 8. `hoveredCell` — Ref-Based (Bypasses React State)

**Files:** `src/contexts/CanvasContext/CanvasProvider.tsx`, `src/contexts/CanvasContext/context.ts`, `src/components/features/CanvasOverlay.tsx`, `src/hooks/useHoverPreview.ts`, `src/hooks/useAsciiTypePlacement.ts`, `src/components/common/MouseCoordinates.tsx`  
**Problem:** `hoveredCell` was React state in CanvasContext. Every mouse move updated it → CanvasProvider re-rendered → new context value → ALL context consumers re-rendered.  
**Fix:** Converted to ref-based pattern (matching existing `hoverPreviewRef`). A `hoveredCellRef` stores the value, `registerHoveredCellRender` allows consumers to register direct callbacks. Only `MouseCoordinates.tsx` drives a local `useState` from the callback.  
**Impact:** Mouse hover no longer cascades through CanvasProvider → entire app.

### 9. Non-Reactive Cells Subscription in `useFrameSynchronization`

**File:** `src/hooks/useFrameSynchronization.ts`  
**Problem:** `const cells = useCanvasStore((s) => s.cells)` was a reactive subscription in this hook, which runs inside CanvasProvider. Every cell change → CanvasProvider re-renders → new context value → ALL consumers re-render.  
**Fix:** Replaced with `useCanvasStore.subscribe()` (vanilla JS callback) that tracks `cells` via `cellsRef`. Auto-save fires via the subscription's debounced callback without triggering React re-renders.  
**Impact:** Cell changes no longer cascade through CanvasProvider → context → entire component tree.

### 10. CanvasProvider Context Value Memoized

**File:** `src/contexts/CanvasContext/CanvasProvider.tsx`  
**Problem:** Context value was a new object literal every render. Even if no values changed, React saw a new reference and re-rendered all consumers.  
**Fix:** Wrapped in `useMemo` with explicit dependency array.  
**Impact:** CanvasProvider re-renders from remaining reactive subscriptions no longer force consumer re-renders unless actual values change.

### 11. `useCompositedCanvas` Fast-Path Fixed

**File:** `src/hooks/useCompositedCanvas.ts`  
**Problem:** Default layers have `staticProperties` with anchor point values. The fast-path check treated ANY non-zero static property as "has transforms", so it always fell through to expensive `compositeLayersAtFrame()`.  
**Fix:** Excluded `transform.anchorPoint.x/y` from the fast-path check — anchor points have no visual effect without rotation/scale.  
**Impact:** Single-layer editing skips compositing entirely.

### 12. `AnchorPointOverlay` Conditional Subscriptions

**File:** `src/components/features/AnchorPointOverlay.tsx`  
**Problem:** Subscribed to `s.layers` (entire array) even when the overlay was hidden. Every layers change triggered a re-render.  
**Fix:** Gate expensive subscriptions behind `mightShow` — when not showing, return `EMPTY_LAYERS`/`null`/`0` so Zustand doesn't trigger re-renders.  
**Impact:** No unnecessary re-renders from hidden overlay.

### 13. Legacy Frame System Removed

**Deleted files:** `AnimationTimeline.tsx` (733 lines), `FrameThumbnail.tsx` (379 lines), `FrameControls.tsx` (84 lines), `useAnimationPlayback.ts` (160 lines), `TimelineZoomControl.tsx` (31 lines)  
**Modified:** `TimelinePanel.tsx` — removed Tabs wrapper, renders timeline content directly  
**Modified:** `EditorPage.tsx` — removed AnimationTimeline import  
**Impact:** -1,576 lines. No Tabs/TabsContent overhead. 11 adapter subscriptions eliminated by switching to `useTimelineStore` directly.

### 14. ToolPalette Split into ToolPalette + ToolOptionsPanel

**File:** `src/components/features/ToolPalette.tsx`  
**Problem:** Single 840-line component with `useToolStore()` (broad, ~30 properties), `useGradientStore()`, `useBezierStore()`, `useCropToSelection()`, `useFlipUtilities()`. ANY store change re-rendered everything.  
**Fix:**  
- Split into `ToolPalette` (~150 lines, subscribes only to `activeTool`/`setActiveTool`) and `ToolOptionsPanel` (React.memo, ~700 lines, subscribes to tool-specific stores).
- Removed `useFlipUtilities()` hook call — flip actions dispatch keyboard events instead.
- Removed `useCanvasContext()` subscription for altKeyDown/ctrlKeyDown visual overrides.
- Removed reactive `currentFrameIndex` subscription (only used in callbacks).  
**Impact:** Timeline scrub, cell drawing, and other non-tool actions no longer re-render the toolbar.

### 15. React.memo on CanvasGrid Children

**Files:** `CanvasOverlay.tsx`, `ToolManager.tsx`, `ToolStatusManager.tsx`  
**Fix:** Wrapped in `React.memo` — prevents cascading re-renders from CanvasGrid parent.

---

## Current Status

### What works well:
- Drawing tools feel fast on short timelines
- Timeline scrub no longer flashes the toolbar
- Playback is excellent (pre-computed, bypasses React)
- Tool switching is responsive

### Remaining issue:
- Performance still degrades with 90+ frames of content
- Need to investigate what scales with frame count during interactions
- Likely candidates: adapter `deriveLegacyFrames()` on structural changes, timeline UI components doing O(durationFrames) work, or remaining broad store subscriptions

### Test results:
- TypeScript: clean compilation
- Tests: 343/343 passing
- No functional regressions identified

---

## Architecture Notes

### Store Subscription Patterns

**DO:**
```typescript
// Targeted selector — only re-renders when this specific value changes
const activeTool = useToolStore((s) => s.activeTool);

// getState() for callbacks — no subscription, no re-render
const handleClick = () => {
  const { cells } = useCanvasStore.getState();
  // ... use cells
};
```

**DON'T:**
```typescript
// Broad subscription — re-renders on ANY store change
const { activeTool, isPlaying, brushSize } = useToolStore();

// Reactive subscription for callback-only values
const currentFrame = useTimelineStore((s) => s.view.currentFrame);
// ... only used inside onClick handler
```

### Context Value Patterns

**DO:**
```typescript
// Memoize context value
const value = useMemo(() => ({ x, y, z }), [x, y, z]);
return <Context.Provider value={value}>{children}</Context.Provider>;
```

**DON'T:**
```typescript
// New object every render — all consumers re-render
return <Context.Provider value={{ x, y, z }}>{children}</Context.Provider>;
```

### Frequently-Changing Values

For values that change on every mouse move, keystroke, or frame (like `hoveredCell`, `cells`, `currentFrame`):
- Use **ref-based patterns** with callback registration instead of React state
- Use **non-reactive Zustand subscriptions** (`store.subscribe()`) instead of hook selectors
- Use **`getState()`** in event handlers instead of reactive dependencies

---

## Session 2 Optimizations (February 13, 2026)

### Problem Analyzed

Deep architectural audit identified why performance degrades specifically with long timelines (90+ frames) even though playback is fast. The root cause is a **render cascade that scales with frame count**: every user interaction (draw, hover, navigate, tool switch) triggers store updates that flow through React and cause O(frames) component renders in the timeline tree, plus O(W×H) grid iterations in the canvas tree.

Key discoveries:
- **TimelinePanel** subscribed to `currentFrame` → re-rendered entire timeline tree (Ruler + TrackArea + LayerList) on every frame navigation
- **TimelineTrackArea** rendered ALL `ContentFrameBlock` components regardless of viewport visibility
- **TimelineRuler** iterated ALL `durationFrames` ticks with a hardcoded 2000px cutoff
- **12 broad `useToolStore()` calls** in the CanvasGrid render tree caused re-renders on any tool state change
- **10 broad `useCanvasStore()` calls** in the CanvasGrid render tree caused re-renders on every cell edit
- **No timeline components** used `React.memo` — parent re-renders cascaded unconditionally
- **`useCompositedCanvas`** layers selector invalidated on layer rename/reorder (irrelevant to compositing)
- **`getContentFrameAtTime()`** used O(F) linear scan instead of O(log F) binary search

### 16. React.memo on ContentFrameBlock + LayerListItem

**Files:** `ContentFrameBlock.tsx`, `LayerListItem.tsx`  
**Problem:** Neither component was wrapped in `React.memo`. Every parent re-render (e.g., TimelineTrackArea) cascaded through all instances unconditionally. With 90 content frames, that's 90 `ContentFrameBlock` component renders per frame navigation tick.  
**Fix:** Wrapped both in `React.memo` with named function components for DevTools clarity:
```tsx
export const ContentFrameBlock: React.FC<ContentFrameBlockProps> = React.memo(function ContentFrameBlock({...}) {
```
**Impact:** With 90 frames, navigation now only re-renders the ~2-3 blocks whose props actually changed (selection state, position), not all 90.

### 17. Timeline Track Area Viewport Virtualization

**File:** `TimelineTrackArea.tsx`  
**Problem:** `layer.contentFrames.map(cf => <ContentFrameBlock>)` rendered ALL content frame blocks regardless of viewport visibility. With 90 frames at typical zoom, most blocks were off-screen but still created DOM elements and ran React reconciliation.  
**Fix:** Added viewport-based filtering before the `.map()`:
```tsx
layer.contentFrames.filter((cf) => {
  const blockLeft = cf.startFrame * pxPerFrame;
  const blockRight = (cf.startFrame + cf.durationFrames) * pxPerFrame;
  return blockRight >= visibleLeft && blockLeft <= visibleRight;
}).map(cf => <ContentFrameBlock>)
```
Computed `visibleLeft`/`visibleRight` from `scrollX` and container width, with a 100px margin for smooth scrolling.  
**Impact:** At typical zoom levels, reduces rendered ContentFrameBlocks from 90 to ~10-15 (only those visible in the viewport).

### 18. TimelineRuler Computed Tick Range

**File:** `TimelineRuler.tsx`  
**Problem:** Tick generation loop iterated `for (let i = 0; i < durationFrames; i++)` — all frames — then skipped ticks outside a hardcoded `[-50, 2000]` pixel window. The loop itself was O(durationFrames) even though it only created elements for visible ticks. The 2000px constant also didn't adapt to different screen sizes.  
**Fix:** Computed exact visible tick range upfront using `scrollX` and measured container width:
```tsx
const startTick = Math.max(0, Math.floor((scrollX - TICK_MARGIN) / pxPerFrame));
const endTick = Math.min(durationFrames, Math.ceil((scrollX + rulerWidth + TICK_MARGIN) / pxPerFrame));
for (let i = startTick; i < endTick; i++) { ... }
```
**Impact:** Loop iterations drop from `durationFrames` to visible count (~20-40 at typical zoom). Removes previous 2000px hardcoded limit.

### 19. Targeted Store Selectors in CanvasGrid Render Tree (10 files)

**Files:** `CanvasGrid.tsx`, `useCanvasMouseHandlers.ts`, `useCanvasRenderer.ts`, `useMemoizedGrid.ts`, `CanvasOverlay.tsx`, `useCropToSelection.ts`  
**Problem:** The CanvasGrid render tree had massive broad store subscriptions:
- `CanvasGrid.tsx`: **TWO** broad `useToolStore()` calls (~30 properties each)
- `useCanvasRenderer.ts`: broad `useToolStore()` + broad `useCanvasStore()`
- `useMemoizedGrid.ts`: broad `useToolStore()` + broad `useCanvasStore()`
- `useCanvasMouseHandlers.ts`: broad `useToolStore()` + broad `useCanvasStore()`
- `CanvasOverlay.tsx`: broad `useToolStore()` + `useGradientStore()` + `useAsciiBoxStore()` (bypassing React.memo)
- `useCropToSelection.ts`: broad `useCanvasStore()` + `useToolStore()` (cascading through ToolOptionsPanel)

Any brush size change, fill mode toggle, or unrelated tool state change caused the ENTIRE canvas render tree to re-render, including an O(W×H) grid iteration in `useMemoizedGrid`.  
**Fix:** Converted all broad subscriptions to targeted selectors:
```tsx
// Before (broad — re-renders on ANY store change):
const { activeTool, clearSelection, clearLassoSelection, isPlaybackMode } = useToolStore();
const { width, height, cells, setCanvasData } = useCanvasStore();

// After (targeted — only re-renders when this specific value changes):
const activeTool = useToolStore((s) => s.activeTool);
const clearSelection = useToolStore((s) => s.clearSelection);
const width = useCanvasStore((s) => s.width);
const cells = useCanvasStore((s) => s.cells);
```
Also converted `CanvasOverlay.tsx`'s broad `useGradientStore()` and `useAsciiBoxStore()` to per-property selectors.  
**Impact:** Brush size changes, fill mode toggles, color picker interactions, and gradient parameter tweaks no longer cascade through the entire canvas render tree. Eliminates dozens of unnecessary O(W×H) grid iterations per interaction.

### 20. TimelinePanel Playhead Decoupling (TimelineFooter extraction)

**File:** `TimelinePanel.tsx`  
**Problem:** `TimelinePanel` subscribed to `currentFrame` and `durationFrames` for a footer display (`"frame N / total"`). These subscriptions caused the ENTIRE timeline tree (Ruler + TrackArea + LayerList + all children) to re-render on every frame navigation. With 90 frames and no memo on children, that's hundreds of component renders per navigation tick.  
**Fix:** Extracted the footer into a separate `TimelineFooter` React.memo component that owns `currentFrame`/`durationFrames` subscriptions independently. TimelinePanel no longer subscribes to these values.
```tsx
const TimelineFooter = React.memo(function TimelineFooter({ zoom, setZoom, ... }) {
  const currentFrame = useTimelineStore((s) => s.view.currentFrame);
  const durationFrames = useTimelineStore((s) => s.config.durationFrames);
  // ... renders footer with frame counter, work area buttons, zoom slider
});
```
**Impact:** Frame navigation only re-renders the small footer, not the entire timeline tree. Combined with Fix 16 (memo on children), the TimelineRuler and TimelineTrackArea only re-render for their OWN subscriptions (scrollX, zoom, etc.), not for every frame change propagated through the parent.

### 21. useCompositedCanvas Stable Layers Reference

**File:** `useCompositedCanvas.ts`  
**Problem:** `useTimelineStore((s) => s.layers)` returns a new array reference on ANY layer mutation — rename, selection change, reorder, etc. This invalidated the `compositedCells` useMemo even when the visual composite wouldn't change (e.g., renaming a layer doesn't change its rendered content).  
**Fix:** Added a compositing-relevant fingerprint that tracks only properties that affect rendering (visibility, solo, blend mode, opacity, property track count, content frame count, static property count). The actual `layers` reference is only updated when the fingerprint changes:
```tsx
function getLayerCompositeFingerprint(layers: Layer[]): string {
  return layers.map(l => 
    `${l.id}:${l.visible}:${l.solo}:${l.opacity}:${l.blendMode}:${l.propertyTracks.length}:` +
    `${l.contentFrames.length}:${Object.keys(l.staticProperties).length}`
  ).join('|');
}
```
**Impact:** Layer renames, selection changes, and expand/collapse no longer trigger compositing recalculation. Only visibility toggle, adding/removing layers or content frames, or modifying transforms invalidates the composite.

### 22. Binary Search for getContentFrameAtTime

**File:** `src/utils/layerCompositing.ts`  
**Problem:** `getContentFrameAtTime()` used a linear scan through `layer.contentFrames` — O(F) per call. Called once per visible layer per compositing evaluation, and 7 times per layer for property value lookups. With 5 layers × 90 frames, that's ~450 iterations per compositing call.  
**Fix:** Replaced with O(log F) binary search. Content frames are sorted by `startFrame` (maintained by the timeline store), so binary search is valid:
```tsx
export function getContentFrameAtTime(layer: Layer, frame: number): ContentFrame | null {
  const cfs = layer.contentFrames;
  let lo = 0, hi = cfs.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const cf = cfs[mid];
    if (frame < cf.startFrame) hi = mid - 1;
    else if (frame >= cf.startFrame + cf.durationFrames) lo = mid + 1;
    else { if (cf.hidden) return null; return cf; }
  }
  return null;
}
```
**Impact:** For 90 frames, lookup drops from 90 comparisons (worst case) to ~7. Matters during playback compositing and multi-layer rendering.

---

## Remaining Work

### Adapter Removal (35 files — deferred)

The `animationStore` adapter exists for backward compatibility with 35 files. It adds:
- A global `useTimelineStore.subscribe()` callback on every state change
- Tier 2 `deriveLegacyFrames()` that clones all Maps on structural changes
- An indirect path (timelineStore → adapter sync → animationStore → consumer)
- 8 remaining broad `useAnimationStore()` subscriptions

**Files to migrate (35):**
- Components: `AsciiTypePanel`, `CanvasActionButtons`, `EffectsIntegrationTest`, `InteractiveBezierOverlay`, `MediaImportPanel`, `NewProjectDialog`, `OnionSkinControls`, `PlaybackOverlay`, `PlaybackStatusBar`, `AddFramesDialog`, `SetFrameDurationDialog`, `WaveWarpDialog`, `WiggleDialog`, `TimelineToolbar`
- Hooks: `useAnimationHistory`, `useCanvasMouseHandlers`, `useCanvasResize`, `useCropToSelection`, `useEffectsHistory`, `useFrameNavigation`, `useFrameSynchronization`, `useKeyboardShortcuts`, `useOnionSkinRenderer`, `useOptimizedPlayback`, `useTimeEffectsHistory`
- Stores: `toolStore`, `effectsStore`, `generatorsStore`, `timeEffectsStore`, `animationStore` (compatibility adapter)
- Utils: `exportDataCollector`, `jsonImporter`, `sessionImporter`
- Other: `mcp/client.ts`

**Migration approach:** Replace `useAnimationStore` calls with equivalent `useTimelineStore` selectors. Most consumers only need `currentFrame`, `isPlaying`, `frames`, or action methods. Plan as a dedicated migration sprint after current performance work.

---

## Session 2 Corrections + Session 3 Fixes (February 13, 2026)

### Fix 21 Reverted: Stable Layers Fingerprint (Caused Rendering Bug)

**File:** `useCompositedCanvas.ts`  
**Problem with original fix:** The fingerprint tracked `contentFrames.length` but NOT individual frame timings (`startFrame`, `durationFrames`). When a content frame handle was dragged to extend its duration, the count stayed the same, so `stableLayers` kept a stale reference with old timing. `getContentFrameAtTime(staleLayer, newFrame)` returned null for frames beyond the old duration → blank canvas.  
**Resolution:** Reverted entirely. The `layers` reference must always be current for correct compositing. The performance savings from skipping layer renames are not worth the correctness risk — content frame timings, keyframe changes, and property track mutations all need fresh data.

### 23. useCanvasState Broad Subscriptions → Targeted Selectors

**File:** `useCanvasState.ts`  
**Problem:** This hook had `const { width, height, cells, setCanvasData } = useCanvasStore()` and `const { selection, lassoSelection, magicWandSelection, activeTool, ... } = useToolStore()` — both broad. It's consumed by **9 call sites** in the CanvasGrid tree (CanvasGrid, CanvasOverlay, useCanvasRenderer, useCanvasMouseHandlers, useCanvasSelection, useCanvasLassoSelection, useCanvasMagicWandSelection, useCanvasDragAndDrop, useOnionSkinRenderer). Every cell edit cascaded through ALL 9 consumers.  
**Fix:** Converted both to targeted selectors:
```tsx
const width = useCanvasStore((s) => s.width);
const height = useCanvasStore((s) => s.height);
const cells = useCanvasStore((s) => s.cells);
const setCanvasData = useCanvasStore((s) => s.setCanvasData);
const selection = useToolStore((s) => s.selection);
// ... etc
```
**Impact:** Tool state changes (brush size, fill mode, color) no longer cascade through all 9 consumers. Each consumer only re-renders when its specific subscribed values change.

### 24. ContentFrameBlock Stable onContextMenu (Fixes O(F) Re-render on Drag)

**File:** `TimelineTrackArea.tsx`, `ContentFrameBlock.tsx`  
**Problem:** Every `ContentFrameBlock` received an inline arrow function `onContextMenu={(e) => { ... }}` as a prop. Since this creates a new function reference on every render, `React.memo` on ContentFrameBlock was defeated — ALL visible blocks re-rendered on every parent re-render. During handle drag, this meant O(F) component re-renders × 12 internal selectors = O(12F) evaluations per mouse move at 60Hz.  
**Fix:** 
- Changed `ContentFrameBlock`'s `onContextMenu` prop type from `(e: MouseEvent) => void` to `(e: MouseEvent, cfId: ContentFrameId, layerId: LayerId) => void`
- Created a stable `handleContentFrameContextMenu` callback in `TimelineTrackArea` via `useCallback`
- `ContentFrameBlock` calls back with its own IDs when the event fires
**Impact:** React.memo on ContentFrameBlock now works correctly — only blocks whose actual props change (position, selection state) re-render during drag. Eliminates O(F) re-renders per mouse move.

### 25. Remaining 10 Broad Subscriptions in CanvasGrid Hook Tree

**Files:** `useCanvasSelection.ts`, `useCanvasLassoSelection.ts`, `useCanvasMagicWandSelection.ts`, `useCanvasDragAndDrop.ts`, `useDrawingTool.ts`, `useTextTool.ts`, `useGradientFillTool.ts`, `useAsciiBoxTool.ts`, `useHoverPreview.ts`  
**Problem:** All had broad `useCanvasStore()` and/or `useToolStore()` subscriptions. These hooks are called inside `useCanvasMouseHandlers` which runs in CanvasGrid — every cell edit or tool change caused all hook bodies to re-execute, creating new closures and triggering downstream effects.  
**Fix:** Converted all to targeted selectors. Example from `useDrawingTool`:
```tsx
// Before (broad — 18 properties, re-renders on ANY toolStore change):
const { activeTool, selectedChar, selectedColor, brushSettings, ... } = useToolStore();

// After (targeted — only re-render when this specific value changes):
const activeTool = useToolStore((s) => s.activeTool);
const selectedChar = useToolStore((s) => s.selectedChar);
// ... etc
```
**Impact:** Drawing operations, hover effects, and tool-specific logic no longer trigger cross-tool re-renders. Changing brush size doesn't re-execute selection logic; changing selection doesn't re-execute gradient logic.

---

## Current Status (Session 3)

### What works well:
- Drawing tools perform correctly on all timeline lengths
- Canvas rendering works on all frames (Fix 21 revert fixed the blank canvas bug)
- Timeline navigation only re-renders directly affected components
- Timeline UI virtualized — only visible content frames rendered
- Playback is excellent (pre-computed, bypasses React)
- ContentFrameBlock React.memo fully effective (stable handler props)
- All 11 canvas hooks use targeted selectors

### Test results:
- TypeScript: clean compilation
- Tests: 343/343 passing
- No functional regressions identified

### Files modified this session:
| File | Change |
|------|--------|
| `useCompositedCanvas.ts` | Reverted Fix 21 (stale layers fingerprint caused blank canvas) |
| `useCanvasState.ts` | Broad `useCanvasStore()` + `useToolStore()` → targeted selectors |
| `useCanvasSelection.ts` | Broad `useCanvasStore()` + `useToolStore()` → targeted selectors |
| `useCanvasLassoSelection.ts` | Broad `useCanvasStore()` + `useToolStore()` → targeted selectors |
| `useCanvasMagicWandSelection.ts` | Broad `useCanvasStore()` + `useToolStore()` → targeted selectors |
| `useCanvasDragAndDrop.ts` | Broad `useCanvasStore()` + `useToolStore()` → targeted selectors |
| `useDrawingTool.ts` | Broad `useCanvasStore()` + `useToolStore()` → targeted selectors |
| `useTextTool.ts` | Broad `useToolStore()` + `useCanvasStore()` → targeted selectors |
| `useGradientFillTool.ts` | Broad `useCanvasStore()` + `useToolStore()` → targeted selectors |
| `useAsciiBoxTool.ts` | Broad `useToolStore()` + `useCanvasStore()` → targeted selectors |
| `useHoverPreview.ts` | Broad `useToolStore()` → targeted selectors |
| `TimelineTrackArea.tsx` | Stable `onContextMenu` callback (fixes React.memo bypass) |
| `ContentFrameBlock.tsx` | Updated `onContextMenu` prop signature for stable handler |

### Remaining candidates for future optimization:
- **Adapter removal** (35 files) — eliminates deriveLegacyFrames() Map cloning on structural changes
- **Throttling `updateContentFrameTiming` during drag** — coalesce rapid mouse moves into at most 1 update per frame via `requestAnimationFrame`
- **ToolOptionsPanel broad subscriptions** — `useToolStore()`, `useGradientStore()`, `useBezierStore()` still broad inside the memo'd panel

---

## Session 3 Continued: Canvas Repaint on Timeline Endpoint Drag

### Problem

Dragging the timeline's end bracket (duration handle) caused a visible canvas repaint flash even though the canvas content hadn't changed. The duration change doesn't affect what's drawn — it only adjusts where the project ends.

### Root Cause

`useOnionSkinRenderer` subscribed to `layers` (entire array), `durationFrames`, and used `layers` directly in `useCallback` dependencies:

```
Timeline endpoint drag
  → setDuration() → config.durationFrames changes
  → useOnionSkinRenderer re-renders (subscribed to durationFrames)
  → effectiveTotal changes → renderOnionSkins gets new function reference
  → renderCanvas useCallback dependency changed → new renderCanvas reference
  → triggerRender → useEffect fires → FULL CANVAS REPAINT
```

Same cascade happened when dragging content frame handles:
```
Content frame handle drag
  → updateContentFrameTiming() → layers array gets new reference
  → useOnionSkinRenderer re-renders (subscribed to layers)
  → getOnionFrameData gets new reference (depends on layers)
  → renderOnionSkins gets new reference → renderCanvas → useEffect → REPAINT
```

### 26. useOnionSkinRenderer Ref-Based Layers/Duration

**File:** `useOnionSkinRenderer.ts`  
**Fix:** Converted `layers` and `durationFrames` from reactive Zustand subscriptions to ref-based reads. The ref is kept current via a `useTimelineStore.subscribe()` callback (non-reactive — doesn't trigger React re-renders).

```tsx
// Before (reactive — triggers re-render + cascade):
const layers = useTimelineStore((s) => s.layers);
const durationFrames = useTimelineStore((s) => s.config.durationFrames);
const effectiveTotal = isLayerMode ? durationFrames : frames.length;

// After (ref-based — reads current value without triggering renders):
const layersRef = useRef(useTimelineStore.getState().layers);
useEffect(() => {
  const unsub = useTimelineStore.subscribe(
    (state) => state.layers,
    (newLayers) => { layersRef.current = newLayers; }
  );
  return unsub;
}, []);
const effectiveTotalRef = useRef(0);
effectiveTotalRef.current = isLayerMode
  ? useTimelineStore.getState().config.durationFrames
  : frames.length;
```

Updated all useCallback dependencies to remove `layers`, `layers.length`, and `effectiveTotal` — replaced with ref reads (`layersRef.current`, `effectiveTotalRef.current`) inside the callback bodies.

**Impact:** Timeline endpoint drag and content frame handle drag no longer cause canvas repaints. The `renderOnionSkins` function reference stays stable across these changes, so the `renderCanvas` → `triggerRender` → `useEffect` chain doesn't fire.

### Files modified:
| File | Change |
|------|--------|
| `useOnionSkinRenderer.ts` | `layers`, `durationFrames` → ref-based reads; removed from useCallback deps |

---

## Session 4: The Real Bottleneck — SilentSaveHandler / exportDataCollector (February 13, 2026)

### Problem

Chrome Performance profiler revealed the actual bottleneck — **`compositeLayersAtFrame` taking 71ms (51.6% self time)** per mouse move, called from `exportDataCollector.ts`, not from the canvas render path at all.

### Root Cause

`SilentSaveHandler` (always mounted in `App.tsx`) called `useExportDataCollector()` — a React hook with **broad `useCanvasStore()` and `useAnimationStore()` subscriptions**. On every cell change:

1. `canvasStore.cells` changes → `useCanvasStore()` broad subscription fires
2. `SilentSaveHandler` re-renders
3. `useExportDataCollector()` re-runs
4. `computeCompositedFrames()` loops `for (let f = 0; f < durationFrames; f++)` — calling `compositeLayersAtFrame()` for EACH frame
5. With 90 frames: **90 × compositing = 71ms+ per mouse move**

This is why the slowdown scaled with `durationFrames` (timeline duration/content frame block width), not with the number of content frame blocks. Playback was unaffected because it bypasses React entirely.

### 27. SilentSaveHandler Lazy Export Data Collection

**File:** `SilentSaveHandler.tsx`  
**Problem:** Called `useExportDataCollector()` on every render. The hook eagerly composited ALL timeline frames via `computeCompositedFrames()`, even though export data was only needed when `triggerSilentSave` fired (a rare user-initiated action). This cost O(durationFrames × layers × cells) on every mouse move.  
**Fix:** Replaced `useExportDataCollector()` (reactive hook) with `ExportDataCollector.collect()` (imperative, non-reactive) called only inside the `useEffect` when `triggerSilentSave` is `true`.

### 28. All Export Dialogs — Lazy useExportDataCollector (THE Primary Fix)

**Files:** `exportDataCollector.ts`, `BubbleteaExportDialog.tsx`, `InkExportDialog.tsx`, `OpenTuiExportDialog.tsx`, `ReactExportDialog.tsx`, `JsonExportDialog.tsx`, `VideoExportDialog.tsx`, `TextExportDialog.tsx`, `ImageExportDialog.tsx`, `SaveToCloudDialog.tsx`, `PublishToGalleryDialogWrapper.tsx`  
**Problem:** Chrome Performance profiler Bottom-Up showed `compositeLayersAtFrame` at **742ms self time (59.1%)** per interaction. The call originated from `computeCompositedFrames` in `exportDataCollector.ts`, called by `useExportDataCollector()`. **All 10 export dialog components** were always mounted in `EditorPage.tsx`/`App.tsx` and each called `useExportDataCollector()` unconditionally — with broad `useCanvasStore()`, `useAnimationStore()`, and `useToolStore()` subscriptions. Every cell change triggered all 10 dialogs to re-render, each re-running `computeCompositedFrames()` which loops through ALL `durationFrames` calling `compositeLayersAtFrame()`. With 90 frames: **up to 900 compositing calls per mouse move**.  
**Fix:** Added an `enabled` parameter to `useExportDataCollector(enabled)`. When `enabled=false`, the hook returns `null` immediately after running its store subscriptions (React requires hooks to always run), skipping the expensive `computeCompositedFrames()` call entirely. Each dialog now passes its `isOpen` state:

```tsx
// useExportDataCollector — gated expensive work:
export const useExportDataCollector = (enabled: boolean = true): ExportDataBundle | null => {
  // Hooks always run (React rule) — just read store values
  const { width, height, cells, ... } = useCanvasStore();
  // ...all other hooks...
  
  // PERF FIX: Return null before expensive computation
  if (!enabled) return null;
  
  // Only compute composited frames when dialog is actually open
  exportFrames = computeCompositedFrames(width, height); // O(durationFrames × layers × cells)
  // ...
};

// Each dialog computes isOpen FIRST, passes it to the hook:
const isOpen = showExportModal && activeFormat === 'bubbletea';
const exportData = useExportDataCollector(isOpen);  // null when closed
```

**Impact:** Eliminates 742ms+ of compositing work per mouse move. Drawing on a 90-frame-duration timeline is now as fast as drawing on a single frame. This was THE primary performance bottleneck — 59.1% of total CPU self-time per interaction.

**Verification:** Chrome Performance profiler confirmed `compositeLayersAtFrame` no longer appears in the flame chart during drawing when no export dialog is open.

---

## Current Status (Session 4)

### What was fixed:
- **THE primary bottleneck found and fixed** — `useExportDataCollector()` called by 10+ always-mounted export dialogs was eagerly compositing ALL timeline frames on every mouse move
- Timeline endpoint drag and content frame handle drag no longer cause canvas repaints (Fix 26)
- `SilentSaveHandler` uses imperative `ExportDataCollector.collect()` instead of reactive hook (Fix 27)

### Performance profile (before → after):
| Metric | Before Fix | After Fix |
|--------|-----------|-----------|
| `compositeLayersAtFrame` self time | 742ms (59.1%) | 0ms (not called) |
| `computeCompositedFrames` total time | 896ms (71.3%) | 0ms (not called) |
| Long task per mouse move | 1.26s | ~15ms |
| Drawing on 90-frame timeline | Unusable (1+ second lag) | Smooth (matching single-frame) |

### Test results:
- TypeScript: clean compilation
- Tests: 343/343 passing
- No functional regressions — export dialogs still work when opened

### Files modified this session:
| File | Change |
|------|--------|
| `exportDataCollector.ts` | Added `enabled` parameter to `useExportDataCollector`, returns null when disabled |
| `SilentSaveHandler.tsx` | Switched to imperative `ExportDataCollector.collect()` |
| `BubbleteaExportDialog.tsx` | Pass `isOpen` to `useExportDataCollector(isOpen)` |
| `InkExportDialog.tsx` | Pass `isOpen` to `useExportDataCollector(isOpen)` |
| `OpenTuiExportDialog.tsx` | Pass `isOpen` to `useExportDataCollector(isOpen)` |
| `ReactExportDialog.tsx` | Pass `isOpen` to `useExportDataCollector(isOpen)` |
| `JsonExportDialog.tsx` | Pass `isOpen` to `useExportDataCollector(isOpen)` |
| `VideoExportDialog.tsx` | Pass `isOpen` to `useExportDataCollector(isOpen)` |
| `TextExportDialog.tsx` | Pass `isOpen` to `useExportDataCollector(isOpen)` |
| `ImageExportDialog.tsx` | Pass `isOpen` to `useExportDataCollector(isOpen)` |
| `SaveToCloudDialog.tsx` | Pass `open` prop to `useExportDataCollector(open)` |
| `PublishToGalleryDialogWrapper.tsx` | Pass `isOpen` prop to `useExportDataCollector(isOpen)` |
| `HtmlExportDialog.tsx` | Pass `isOpen` to `useExportDataCollector(isOpen)` |
| `SessionExportDialog.tsx` | Pass `isOpen` to `useExportDataCollector(isOpen)` |
| `useOnionSkinRenderer.ts` | `layers`, `durationFrames` → ref-based reads (Fix 26) |

### Remaining to investigate:
- **Large project slowdown** (90 separate content frames with full content) — remaining bottleneck after export dialogs fixed, likely related to total data size and GC pressure. Flame graph shows `new Map(state.cells)` in `setCell` and Minor/Major GC as significant contributors.
