/**
 * animationStore Compatibility Adapter
 *
 * Provides the legacy `useAnimationStore` API backed by the new `timelineStore`.
 * This allows incremental migration of the ~47 files that import useAnimationStore.
 *
 * Existing consumers import `useAnimationStore` from `animationStore`.
 * New code should import from `timelineStore` directly.
 *
 * Part of the Layer Timeline Refactor (v2.0.0)
 * See: docs/LAYER_TIMELINE_REFACTOR_PLAN.md §1.6b
 */

import { create } from 'zustand';
import { useTimelineStore } from './timelineStore';
import type { Cell, Frame, FrameId } from '../types';
import type { ContentFrame } from '../types/timeline';
import { getContentFrameAtTime } from '../utils/layerCompositing';

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

/** Get the currently active layer, falling back to the first layer. */
function getActiveLayer() {
  const tl = useTimelineStore.getState();
  const activeId = tl.view.activeLayerId;
  const layer = activeId
    ? tl.layers.find((l) => l.id === activeId)
    : tl.layers[0];
  return layer ?? tl.layers[0];
}

/** Convert a ContentFrame to the legacy Frame shape. */
function contentFrameToLegacyFrame(cf: ContentFrame): Frame {
  return {
    id: cf.id as unknown as FrameId,
    name: cf.name,
    duration: cf.durationFrames * (1000 / useTimelineStore.getState().config.frameRate),
    data: new Map(cf.data),
    thumbnail: undefined,
  };
}

/** Derive the legacy frames array from the active layer's content frames. */
function deriveLegacyFrames(): Frame[] {
  const layer = getActiveLayer();
  if (!layer) return [];
  return layer.contentFrames.map(contentFrameToLegacyFrame);
}

/** Map a legacy frame-array index to the content frame at that position. */
function _getContentFrameByIndex(index: number): ContentFrame | undefined {
  const layer = getActiveLayer();
  if (!layer) return undefined;
  return layer.contentFrames[index];
}
void _getContentFrameByIndex; // referenced to avoid TS6133

// ─────────────────────────────────────────────
// Adapter State Interface
// (mirrors AnimationState from animationStore.ts)
// ─────────────────────────────────────────────

interface LegacyAnimationState {
  /** Marker so we can detect adapter usage at runtime. */
  __isAdapter: true;

  // ── Derived state ──
  frames: Frame[];
  currentFrameIndex: number;
  isPlaying: boolean;
  frameRate: number;
  totalDuration: number;
  looping: boolean;

  // ── UI state (stored locally) ──
  isDraggingFrame: boolean;
  isDeletingFrame: boolean;
  isImportingSession: boolean;
  timelineZoom: number;
  selectedFrameIndices: Set<number>;
  onionSkin: {
    enabled: boolean;
    previousFrames: number;
    nextFrames: number;
    allLayers: boolean;
    wasEnabledBeforePlayback: boolean;
  };

  // ── Frame CRUD ──
  addFrame: (atIndex?: number, canvasData?: Map<string, Cell>, duration?: number) => void;
  removeFrame: (index: number) => void;
  duplicateFrame: (index: number) => void;
  duplicateFrameRange: (frameIndices: number[]) => void;
  setCurrentFrame: (index: number) => void;
  setCurrentFrameOnly: (index: number) => void;
  updateFrameDuration: (index: number, duration: number) => void;
  updateFrameName: (index: number, name: string) => void;
  reorderFrames: (fromIndex: number, toIndex: number) => void;
  replaceFrames: (frames: Frame[], currentIndex: number, selectedIndices?: number[]) => void;

  // ── Batch operations ──
  removeFrameRange: (frameIndices: number[]) => void;
  clearAllFrames: () => void;
  reorderFrameRange: (frameIndices: number[], targetIndex: number) => void;

  // ── Bulk import ──
  importFramesOverwrite: (frames: Array<{ data: Map<string, Cell>; duration: number }>, startIndex: number) => void;
  importFramesAppend: (frames: Array<{ data: Map<string, Cell>; duration: number }>) => void;
  importSessionFrames: (frames: Array<{ id: string; name: string; duration: number; data: Map<string, Cell>; thumbnail?: string }>) => void;

  // ── Controls ──
  resetAnimation: () => void;
  setDraggingFrame: (isDragging: boolean) => void;
  setDeletingFrame: (isDeleting: boolean) => void;
  setImportingSession: (isImporting: boolean) => void;
  setTimelineZoom: (zoom: number) => void;

  // ── Onion skin ──
  toggleOnionSkin: () => void;
  setPreviousFrames: (count: number) => void;
  setNextFrames: (count: number) => void;
  setOnionSkinEnabled: (enabled: boolean) => void;
  toggleOnionSkinAllLayers: () => void;

  // ── Selection ──
  selectFrameRange: (startIndex: number, endIndex: number) => void;
  clearSelection: () => void;
  isFrameSelected: (index: number) => boolean;
  getSelectedFrameIndices: () => number[];
  getSelectionRange: () => { start: number; end: number } | null;

  // ── Frame data ──
  setFrameData: (frameIndex: number, data: Map<string, Cell>) => void;
  getFrameData: (frameIndex: number) => Map<string, Cell> | undefined;

  // ── Playback ──
  play: () => void;
  pause: () => void;
  stop: () => void;
  togglePlayback: () => void;
  setLooping: (looping: boolean) => void;
  setFrameRate: (fps: number) => void;

  // ── FPS monitoring ──
  fpsMonitorCallback?: (timestamp: number) => void;
  setFpsMonitorCallback: (callback: ((timestamp: number) => void) | undefined) => void;

  // ── Navigation ──
  nextFrame: () => void;
  previousFrame: () => void;
  goToFrame: (index: number) => void;

  // ── Computed ──
  getCurrentFrame: () => Frame | undefined;
  getTotalFrames: () => number;
  calculateTotalDuration: () => number;
  getFrameAtTime: (time: number) => number;
}

// ─────────────────────────────────────────────
// The adapter store
// ─────────────────────────────────────────────

export const useAnimationStore = create<LegacyAnimationState>((set, get) => ({
  __isAdapter: true as const,

  // ── Derived state (synced from timelineStore via subscription below) ──
  frames: deriveLegacyFrames(),
  currentFrameIndex: useTimelineStore.getState().view.currentFrame,
  isPlaying: useTimelineStore.getState().view.isPlaying,
  frameRate: useTimelineStore.getState().config.frameRate,
  totalDuration: 0,
  looping: useTimelineStore.getState().view.looping,

  // ── Local UI state (not backed by timelineStore) ──
  isDraggingFrame: false,
  isDeletingFrame: false,
  isImportingSession: false,
  timelineZoom: 1.0,
  selectedFrameIndices: new Set([0]),
  onionSkin: {
    enabled: false,
    previousFrames: 1,
    nextFrames: 1,
    allLayers: false,
    wasEnabledBeforePlayback: false,
  },

  // ─────────────────────────────────────────
  // Frame CRUD (delegates to timelineStore)
  // ─────────────────────────────────────────

  addFrame: (atIndex?: number, canvasData?: Map<string, Cell>, duration?: number) => {
    const tl = useTimelineStore.getState();
    const layer = getActiveLayer();
    if (!layer) return;

    const fps = tl.config.frameRate;
    const durationFrames = duration
      ? Math.max(1, Math.round(duration / (1000 / fps)))
      : 1;

    // Calculate start frame based on insert position
    const contentFrames = layer.contentFrames;
    let startFrame: number;
    if (atIndex !== undefined && atIndex < contentFrames.length) {
      startFrame = contentFrames[atIndex].startFrame;
    } else {
      // Append after last
      const lastCf = contentFrames[contentFrames.length - 1];
      startFrame = lastCf ? lastCf.startFrame + lastCf.durationFrames : 0;
    }

    tl.addContentFrame(layer.id, startFrame, durationFrames, canvasData);
  },

  removeFrame: (index: number) => {
    const layer = getActiveLayer();
    if (!layer) return;
    const cf = layer.contentFrames[index];
    if (!cf) return;

    set({ isDeletingFrame: true });
    useTimelineStore.getState().removeContentFrame(layer.id, cf.id);

    setTimeout(() => {
      set({ isDeletingFrame: false });
    }, 100);
  },

  duplicateFrame: (index: number) => {
    const layer = getActiveLayer();
    const tl = useTimelineStore.getState();
    if (!layer) return;
    const cf = layer.contentFrames[index];
    if (!cf) return;

    const startFrame = cf.startFrame + cf.durationFrames;
    tl.addContentFrame(layer.id, startFrame, cf.durationFrames, new Map(cf.data));
  },

  duplicateFrameRange: (frameIndices: number[]) => {
    const layer = getActiveLayer();
    const tl = useTimelineStore.getState();
    if (!layer) return;

    const sorted = [...frameIndices].sort((a, b) => a - b);
    let offset = 0;
    for (const idx of sorted) {
      const cf = layer.contentFrames[idx];
      if (!cf) continue;
      const startFrame = cf.startFrame + cf.durationFrames + offset;
      tl.addContentFrame(layer.id, startFrame, cf.durationFrames, new Map(cf.data));
      offset += cf.durationFrames;
    }
  },

  setCurrentFrame: (index: number) => {
    useTimelineStore.getState().goToFrame(index);
    set({ selectedFrameIndices: new Set([index]) });
  },

  setCurrentFrameOnly: (index: number) => {
    useTimelineStore.getState().goToFrame(index);
  },

  updateFrameDuration: (index: number, duration: number) => {
    const layer = getActiveLayer();
    const tl = useTimelineStore.getState();
    if (!layer) return;
    const cf = layer.contentFrames[index];
    if (!cf) return;

    const fps = tl.config.frameRate;
    const durationFrames = Math.max(1, Math.round(duration / (1000 / fps)));
    tl.updateContentFrameTiming(layer.id, cf.id, cf.startFrame, durationFrames);
  },

  updateFrameName: (index: number, _name: string) => {
    const layer = getActiveLayer();
    const tl = useTimelineStore.getState();
    if (!layer) return;
    const cf = layer.contentFrames[index];
    if (!cf) return;

    // Content frame naming not directly on timeline store yet.
    // For now, update the content frame data via a direct state mutation.
    tl.updateContentFrameData(layer.id, cf.id, cf.data);
  },

  reorderFrames: (fromIndex: number, toIndex: number) => {
    // In the new model, content frames are positional on a timeline.
    // Reordering means swapping their start-frame positions.
    const layer = getActiveLayer();
    const tl = useTimelineStore.getState();
    if (!layer) return;

    const cfs = [...layer.contentFrames];
    const fromCf = cfs[fromIndex];
    const toCf = cfs[toIndex];
    if (!fromCf || !toCf) return;

    // Swap start frames
    tl.updateContentFrameTiming(layer.id, fromCf.id, toCf.startFrame, fromCf.durationFrames);
    tl.updateContentFrameTiming(layer.id, toCf.id, fromCf.startFrame, toCf.durationFrames);
  },

  replaceFrames: (frames: Frame[], currentIndex: number, selectedIndices?: number[]) => {
    // This is used by undo/redo to restore entire frame state.
    // In the adapter, we rebuild content frames from the legacy frame array.
    const layer = getActiveLayer();
    const tl = useTimelineStore.getState();
    if (!layer) return;

    // Remove all existing content frames
    for (const cf of [...layer.contentFrames]) {
      tl.removeContentFrame(layer.id, cf.id);
    }

    // Add new content frames
    let startFrame = 0;
    const fps = tl.config.frameRate;
    for (const frame of frames) {
      const durationFrames = Math.max(1, Math.round(frame.duration / (1000 / fps)));
      tl.addContentFrame(layer.id, startFrame, durationFrames, new Map(frame.data));
      startFrame += durationFrames;
    }

    tl.goToFrame(currentIndex);
    set({
      selectedFrameIndices: new Set(selectedIndices ?? [currentIndex]),
    });
  },

  // ─────────────────────────────────────────
  // Batch operations
  // ─────────────────────────────────────────

  removeFrameRange: (frameIndices: number[]) => {
    const layer = getActiveLayer();
    const tl = useTimelineStore.getState();
    if (!layer) return;

    set({ isDeletingFrame: true });

    // Remove in reverse order to keep indices stable
    const sorted = [...frameIndices].sort((a, b) => b - a);
    for (const idx of sorted) {
      const cf = layer.contentFrames[idx];
      if (cf && layer.contentFrames.length > 1) {
        tl.removeContentFrame(layer.id, cf.id);
      }
    }

    setTimeout(() => set({ isDeletingFrame: false }), 100);
  },

  clearAllFrames: () => {
    const tl = useTimelineStore.getState();
    tl.createNewProject();
  },

  reorderFrameRange: (frameIndices: number[], targetIndex: number) => {
    // Complex multi-frame reorder. For now, do a sequential swap approach.
    const layer = getActiveLayer();
    if (!layer) return;

    // TODO: implement proper multi-frame reorder in timelineStore
    // For now, this is a placeholder that handles the common single-frame case
    if (frameIndices.length === 1) {
      get().reorderFrames(frameIndices[0], targetIndex);
    }
  },

  // ─────────────────────────────────────────
  // Bulk import
  // ─────────────────────────────────────────

  importFramesOverwrite: (frames, _startIndex) => {
    const layer = getActiveLayer();
    const tl = useTimelineStore.getState();
    if (!layer) return;

    set({ isImportingSession: true });

    // Clear ALL existing content frames on the active layer
    for (const cf of [...layer.contentFrames]) {
      tl.removeContentFrame(layer.id, cf.id);
    }

    // Create new content frames from the imported data
    const fps = tl.config.frameRate;
    let startFrame = 0;
    for (const frame of frames) {
      const durationFrames = Math.max(1, Math.round(frame.duration / (1000 / fps)));
      tl.addContentFrame(layer.id, startFrame, durationFrames, frame.data);
      startFrame += durationFrames;
    }

    // Auto-extend timeline if needed
    if (startFrame > tl.config.durationFrames) {
      tl.setDuration(startFrame);
    }

    set({ isImportingSession: false });
  },

  importFramesAppend: (frames) => {
    const layer = getActiveLayer();
    const tl = useTimelineStore.getState();
    if (!layer) return;

    set({ isImportingSession: true });

    const fps = tl.config.frameRate;
    const lastCf = layer.contentFrames[layer.contentFrames.length - 1];
    let startFrame = lastCf ? lastCf.startFrame + lastCf.durationFrames : 0;

    for (const frame of frames) {
      const durationFrames = Math.max(1, Math.round(frame.duration / (1000 / fps)));
      tl.addContentFrame(layer.id, startFrame, durationFrames, frame.data);
      startFrame += durationFrames;
    }

    set({ isImportingSession: false });
  },

  importSessionFrames: (frames) => {
    const layer = getActiveLayer();
    const tl = useTimelineStore.getState();
    if (!layer) return;

    set({ isImportingSession: true });

    // Remove existing and rebuild
    for (const cf of [...layer.contentFrames]) {
      tl.removeContentFrame(layer.id, cf.id);
    }

    const fps = tl.config.frameRate;
    let startFrame = 0;
    for (const frame of frames) {
      const durationFrames = Math.max(1, Math.round(frame.duration / (1000 / fps)));
      tl.addContentFrame(layer.id, startFrame, durationFrames, frame.data);
      startFrame += durationFrames;
    }

    set({ isImportingSession: false });
  },

  // ─────────────────────────────────────────
  // Controls
  // ─────────────────────────────────────────

  resetAnimation: () => {
    useTimelineStore.getState().createNewProject();
    set({
      selectedFrameIndices: new Set([0]),
      timelineZoom: 1.0,
      onionSkin: {
        enabled: false,
        previousFrames: 1,
        nextFrames: 1,
        allLayers: false,
        wasEnabledBeforePlayback: false,
      },
    });
  },

  setDraggingFrame: (isDragging: boolean) => set({ isDraggingFrame: isDragging }),
  setDeletingFrame: (isDeleting: boolean) => set({ isDeletingFrame: isDeleting }),
  setImportingSession: (isImporting: boolean) => set({ isImportingSession: isImporting }),
  setTimelineZoom: (zoom: number) => set({ timelineZoom: Math.max(0.5, Math.min(1.0, zoom)) }),

  // ─────────────────────────────────────────
  // Onion skin (local state)
  // ─────────────────────────────────────────

  toggleOnionSkin: () =>
    set((state) => ({
      onionSkin: { ...state.onionSkin, enabled: !state.onionSkin.enabled },
    })),

  setPreviousFrames: (count: number) =>
    set((state) => ({
      onionSkin: { ...state.onionSkin, previousFrames: Math.max(0, Math.min(10, count)) },
    })),

  setNextFrames: (count: number) =>
    set((state) => ({
      onionSkin: { ...state.onionSkin, nextFrames: Math.max(0, Math.min(10, count)) },
    })),

  setOnionSkinEnabled: (enabled: boolean) =>
    set((state) => ({
      onionSkin: { ...state.onionSkin, enabled },
    })),

  toggleOnionSkinAllLayers: () =>
    set((state) => ({
      onionSkin: { ...state.onionSkin, allLayers: !state.onionSkin.allLayers },
    })),

  // ─────────────────────────────────────────
  // Selection (local state)
  // ─────────────────────────────────────────

  selectFrameRange: (startIndex: number, endIndex: number) => {
    const indices = new Set<number>();
    const lo = Math.min(startIndex, endIndex);
    const hi = Math.max(startIndex, endIndex);
    for (let i = lo; i <= hi; i++) {
      indices.add(i);
    }
    set({ selectedFrameIndices: indices });
  },

  clearSelection: () => {
    const current = useTimelineStore.getState().view.currentFrame;
    set({ selectedFrameIndices: new Set([current]) });
  },

  isFrameSelected: (index: number) => get().selectedFrameIndices.has(index),

  getSelectedFrameIndices: () => Array.from(get().selectedFrameIndices).sort((a, b) => a - b),

  getSelectionRange: () => {
    const indices = get().getSelectedFrameIndices();
    if (indices.length === 0) return null;
    return { start: indices[0], end: indices[indices.length - 1] };
  },

  // ─────────────────────────────────────────
  // Frame data access
  // ─────────────────────────────────────────

  setFrameData: (frameIndex: number, data: Map<string, Cell>) => {
    const layer = getActiveLayer();
    const tl = useTimelineStore.getState();
    if (!layer) return;
    // frameIndex is a timeline frame — map to content frame via startFrame/duration
    const cf = getContentFrameAtTime(layer, frameIndex);
    if (!cf) return;
    tl.updateContentFrameData(layer.id, cf.id, data);
  },

  getFrameData: (frameIndex: number): Map<string, Cell> | undefined => {
    const layer = getActiveLayer();
    if (!layer) return undefined;
    // frameIndex is a timeline frame — map to content frame via startFrame/duration
    const cf = getContentFrameAtTime(layer, frameIndex);
    return cf ? new Map(cf.data) : undefined;
  },

  // ─────────────────────────────────────────
  // Playback (delegates to timelineStore)
  // ─────────────────────────────────────────

  play: () => {
    const tl = useTimelineStore.getState();
    tl.setPlaying(true);
    tl.goToFrame(tl.view.currentFrame); // ensure position
  },

  pause: () => {
    useTimelineStore.getState().setPlaying(false);
  },

  stop: () => {
    const tl = useTimelineStore.getState();
    tl.setPlaying(false);
    tl.goToFrame(0);
  },

  togglePlayback: () => {
    const tl = useTimelineStore.getState();
    if (tl.view.isPlaying) {
      get().pause();
    } else {
      get().play();
    }
  },

  setLooping: (looping: boolean) => {
    useTimelineStore.getState().setLooping(looping);
  },

  setFrameRate: (fps: number) => {
    useTimelineStore.getState().setFrameRate(fps, true);
  },

  // ── FPS monitoring ──
  fpsMonitorCallback: undefined,
  setFpsMonitorCallback: (callback) => set({ fpsMonitorCallback: callback }),

  // ─────────────────────────────────────────
  // Navigation (delegates to timelineStore)
  // ─────────────────────────────────────────

  nextFrame: () => useTimelineStore.getState().nextFrame(),
  previousFrame: () => useTimelineStore.getState().previousFrame(),
  goToFrame: (index: number) => useTimelineStore.getState().goToFrame(index),

  // ─────────────────────────────────────────
  // Computed values
  // ─────────────────────────────────────────

  getCurrentFrame: (): Frame | undefined => {
    const frames = deriveLegacyFrames();
    const current = useTimelineStore.getState().view.currentFrame;
    return frames[current];
  },

  getTotalFrames: (): number => {
    const layer = getActiveLayer();
    return layer?.contentFrames.length ?? 0;
  },

  calculateTotalDuration: (): number => {
    const layer = getActiveLayer();
    if (!layer) return 0;
    const fps = useTimelineStore.getState().config.frameRate;
    return layer.contentFrames.reduce(
      (sum, cf) => sum + cf.durationFrames * (1000 / fps),
      0,
    );
  },

  getFrameAtTime: (time: number): number => {
    const layer = getActiveLayer();
    if (!layer) return 0;
    const fps = useTimelineStore.getState().config.frameRate;
    let accumulatedTime = 0;
    for (let i = 0; i < layer.contentFrames.length; i++) {
      accumulatedTime += layer.contentFrames[i].durationFrames * (1000 / fps);
      if (accumulatedTime >= time) return i;
    }
    return layer.contentFrames.length - 1;
  },
}));

// ─────────────────────────────────────────────
// Sync: timelineStore → adapter
// PERF FIX: Split into two tiers to avoid expensive re-derives on every frame navigation.
//
// Tier 1 (CHEAP): currentFrame, isPlaying, looping — scalar setState only, no Map cloning.
//   Fires on every frame navigation but only updates scalar values.
//   With targeted selectors in consumers, only components that display frame index re-render.
//
// Tier 2 (EXPENSIVE): frames derivation — only when layer/frame STRUCTURE actually changes.
//   Calls deriveLegacyFrames() which clones Map data. Only fires on add/remove/reorder,
//   NOT on frame navigation or cell data edits.
// ─────────────────────────────────────────────

let prevLayerCount = -1;
let prevActiveLayerId: unknown = null;
let prevContentFrameCount = -1;
let prevCurrentFrame = -1;
let prevPlaying = false;
let prevFrameRate = -1;
let prevLooping = true;

useTimelineStore.subscribe((state) => {
  const { layers, view, config } = state;

  const activeLayer = layers.find((l) => l.id === view.activeLayerId);
  const cfCount = activeLayer?.contentFrames.length ?? 0;

  // Tier 1: Cheap scalar sync — only scalars, no deriveLegacyFrames()
  const frameChanged = view.currentFrame !== prevCurrentFrame;
  const playingChanged = view.isPlaying !== prevPlaying;
  const loopingChanged = view.looping !== prevLooping;

  if (frameChanged || playingChanged || loopingChanged) {
    prevCurrentFrame = view.currentFrame;
    prevPlaying = view.isPlaying;
    prevLooping = view.looping;

    useAnimationStore.setState({
      currentFrameIndex: view.currentFrame,
      isPlaying: view.isPlaying,
      looping: view.looping,
    });
  }

  // Tier 2: Expensive structural sync — full frame re-derivation
  const structuralChange =
    layers.length !== prevLayerCount ||
    view.activeLayerId !== prevActiveLayerId ||
    cfCount !== prevContentFrameCount ||
    config.frameRate !== prevFrameRate;

  if (structuralChange) {
    prevLayerCount = layers.length;
    prevActiveLayerId = view.activeLayerId;
    prevContentFrameCount = cfCount;
    prevFrameRate = config.frameRate;

    useAnimationStore.setState({
      frames: deriveLegacyFrames(),
      frameRate: config.frameRate,
      totalDuration: useAnimationStore.getState().calculateTotalDuration(),
    });
  }
});
