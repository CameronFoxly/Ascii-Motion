/**
 * Timeline Store Tests
 * 
 * Tests for src/stores/timelineStore.ts
 * Covers: §1.8 Testing Checkpoint items
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTimelineStore } from '../stores/timelineStore';
import { getContentFrameAtTime } from '../utils/layerCompositing';
import type { LayerId, PropertyTrackId } from '../types/timeline';

// ============================================
// Helper: reset store before each test
// ============================================

function resetStore() {
  useTimelineStore.getState().createNewProject();
}

describe('timelineStore', () => {
  beforeEach(() => {
    resetStore();
  });

  // ── §1.8: Timeline store creates with initial state (1 layer, 1 frame, 12 FPS) ──

  describe('initial state', () => {
    it('createNewProject produces 1 layer', () => {
      const state = useTimelineStore.getState();
      expect(state.layers).toHaveLength(1);
    });

    it('initial layer has 1 content frame', () => {
      const state = useTimelineStore.getState();
      expect(state.layers[0].contentFrames).toHaveLength(1);
    });

    it('initial frame rate is 12 FPS', () => {
      const state = useTimelineStore.getState();
      expect(state.config.frameRate).toBe(12);
    });

    it('initial duration is 1 frame', () => {
      const state = useTimelineStore.getState();
      expect(state.config.durationFrames).toBe(1);
    });

    it('active layer is set to the default layer', () => {
      const state = useTimelineStore.getState();
      expect(state.view.activeLayerId).toBe(state.layers[0].id);
    });

    it('default layer has correct structure', () => {
      const layer = useTimelineStore.getState().layers[0];
      expect(layer).toMatchObject({
        name: 'Layer 1',
        visible: true,
        solo: false,
        locked: false,
        opacity: 100,
      });
      expect(layer.contentFrames[0]).toMatchObject({
        name: 'Frame 1',
        startFrame: 0,
        durationFrames: 1,
      });
      expect(layer.propertyTracks).toEqual([]);
    });

    it('looping defaults to true', () => {
      expect(useTimelineStore.getState().view.looping).toBe(true);
    });
  });

  // ── §1.8: Basic layer add/remove works ──

  describe('layer CRUD', () => {
    it('addLayer adds a new layer', () => {
      const store = useTimelineStore.getState();
      const id = store.addLayer('Test Layer');
      const state = useTimelineStore.getState();
      expect(state.layers).toHaveLength(2);
      expect(state.getLayer(id)?.name).toBe('Test Layer');
    });

    it('addLayer inserts above active layer', () => {
      const store = useTimelineStore.getState();
      const firstId = store.layers[0].id;
      const newId = store.addLayer('Layer 2');

      const state = useTimelineStore.getState();
      // Active was firstId, so new layer inserts at index 1 (above it)
      expect(state.layers[0].id).toBe(firstId);
      expect(state.layers[1].id).toBe(newId);
    });

    it('addLayer sets new layer as active', () => {
      const store = useTimelineStore.getState();
      const newId = store.addLayer();
      expect(useTimelineStore.getState().view.activeLayerId).toBe(newId);
    });

    it('addLayer auto-names layers sequentially', () => {
      const store = useTimelineStore.getState();
      store.addLayer();
      store.addLayer();
      const state = useTimelineStore.getState();
      expect(state.layers[1].name).toBe('Layer 2');
      expect(state.layers[2].name).toBe('Layer 3');
    });

    it('removeLayer removes a layer', () => {
      const store = useTimelineStore.getState();
      const id = store.addLayer();
      useTimelineStore.getState().removeLayer(id);
      expect(useTimelineStore.getState().layers).toHaveLength(1);
    });

    it('removeLayer enforces minimum 1 layer', () => {
      const state = useTimelineStore.getState();
      const onlyLayerId = state.layers[0].id;
      state.removeLayer(onlyLayerId);

      const after = useTimelineStore.getState();
      expect(after.layers).toHaveLength(1);
      // createDefaultLayer() uses deterministic 'layer-1' ID, so we verify structure
      expect(after.layers[0].name).toBe('Layer 1');
      expect(after.layers[0].contentFrames).toHaveLength(1);
    });

    it('removeLayer selects adjacent layer', () => {
      const store = useTimelineStore.getState();
      const _firstId = store.layers[0].id;
      const secondId = store.addLayer();
      const _thirdId = useTimelineStore.getState().addLayer();

      // Remove middle layer (secondId)
      useTimelineStore.getState().removeLayer(secondId);
      const after = useTimelineStore.getState();
      expect(after.layers).toHaveLength(2);
    });

    it('duplicateLayer creates a copy', () => {
      const store = useTimelineStore.getState();
      const originalId = store.layers[0].id;
      store.duplicateLayer(originalId);

      const state = useTimelineStore.getState();
      expect(state.layers).toHaveLength(2);
      expect(state.layers[1].name).toBe('Layer 1 Copy');
    });

    it('duplicateLayer copies content frames with new IDs', () => {
      const store = useTimelineStore.getState();
      const originalId = store.layers[0].id;
      const newId = store.duplicateLayer(originalId);

      const state = useTimelineStore.getState();
      const original = state.getLayer(originalId)!;
      const duplicate = state.getLayer(newId)!;

      expect(duplicate.contentFrames).toHaveLength(original.contentFrames.length);
      expect(duplicate.contentFrames[0].id).not.toBe(original.contentFrames[0].id);
    });

    it('reorderLayers swaps layer positions', () => {
      const store = useTimelineStore.getState();
      const firstId = store.layers[0].id;
      const secondId = store.addLayer();

      useTimelineStore.getState().reorderLayers(0, 1);
      const state = useTimelineStore.getState();
      expect(state.layers[0].id).toBe(secondId);
      expect(state.layers[1].id).toBe(firstId);
    });

    it('renameLayer updates the name', () => {
      const store = useTimelineStore.getState();
      const id = store.layers[0].id;
      store.renameLayer(id, 'Renamed');
      expect(useTimelineStore.getState().getLayer(id)?.name).toBe('Renamed');
    });
  });

  // ── Layer property setters ──

  describe('layer properties', () => {
    it('setLayerVisible toggles visibility', () => {
      const store = useTimelineStore.getState();
      const id = store.layers[0].id;
      store.setLayerVisible(id, false);
      expect(useTimelineStore.getState().getLayer(id)?.visible).toBe(false);
    });

    it('setLayerSolo toggles solo', () => {
      const store = useTimelineStore.getState();
      const id = store.layers[0].id;
      store.setLayerSolo(id, true);
      expect(useTimelineStore.getState().getLayer(id)?.solo).toBe(true);
    });

    it('setLayerLocked toggles lock', () => {
      const store = useTimelineStore.getState();
      const id = store.layers[0].id;
      store.setLayerLocked(id, true);
      expect(useTimelineStore.getState().getLayer(id)?.locked).toBe(true);
    });

    it('setLayerOpacity clamps 0-100', () => {
      const store = useTimelineStore.getState();
      const id = store.layers[0].id;
      store.setLayerOpacity(id, 150);
      expect(useTimelineStore.getState().getLayer(id)?.opacity).toBe(100);
      store.setLayerOpacity(id, -10);
      expect(useTimelineStore.getState().getLayer(id)?.opacity).toBe(0);
      store.setLayerOpacity(id, 50);
      expect(useTimelineStore.getState().getLayer(id)?.opacity).toBe(50);
    });
  });

  // ── Content Frame CRUD ──

  describe('content frames', () => {
    let layerId: LayerId;

    beforeEach(() => {
      layerId = useTimelineStore.getState().layers[0].id;
    });

    it('addContentFrame adds a frame', () => {
      const store = useTimelineStore.getState();
      const frameId = store.addContentFrame(layerId, 5, 3);
      expect(frameId).not.toBeNull();

      const layer = useTimelineStore.getState().getLayer(layerId)!;
      expect(layer.contentFrames).toHaveLength(2);
    });

    it('addContentFrame rejects overlapping frames', () => {
      const store = useTimelineStore.getState();
      // Default frame is at startFrame=0, duration=1
      // Adding at startFrame=0 should overlap
      const result = store.addContentFrame(layerId, 0, 1);
      expect(result).toBeNull();
    });

    it('addContentFrame allows adjacent (non-overlapping) frames', () => {
      const store = useTimelineStore.getState();
      // Default frame is startFrame=0, duration=1, so frame 1 is free
      const result = store.addContentFrame(layerId, 1, 2);
      expect(result).not.toBeNull();
    });

    it('removeContentFrame removes a frame', () => {
      const store = useTimelineStore.getState();
      const frameId = store.addContentFrame(layerId, 5, 3)!;
      useTimelineStore.getState().removeContentFrame(layerId, frameId);

      const layer = useTimelineStore.getState().getLayer(layerId)!;
      expect(layer.contentFrames).toHaveLength(1);
    });

    it('updateContentFrameTiming updates start and duration', () => {
      const store = useTimelineStore.getState();
      const frameId = store.addContentFrame(layerId, 5, 3)!;
      const success = useTimelineStore.getState().updateContentFrameTiming(
        layerId, frameId, 10, 5,
      );
      expect(success).toBe(true);

      const layer = useTimelineStore.getState().getLayer(layerId)!;
      const frame = layer.contentFrames.find((cf) => cf.id === frameId)!;
      expect(frame.startFrame).toBe(10);
      expect(frame.durationFrames).toBe(5);
    });

    it('updateContentFrameTiming rejects overlapping result', () => {
      const store = useTimelineStore.getState();
      // First frame at 0-1, second at 5-8
      const frameId = store.addContentFrame(layerId, 5, 3)!;

      // Try to move frame to overlap with first
      const success = useTimelineStore.getState().updateContentFrameTiming(
        layerId, frameId, 0, 3,
      );
      expect(success).toBe(false);
    });

    it('updateContentFrameData updates cell data', () => {
      const store = useTimelineStore.getState();
      const layer = store.getLayer(layerId)!;
      const frameId = layer.contentFrames[0].id;
      const newData = new Map([['0,0', { char: 'X', color: '#fff', bgColor: '#000' }]]);

      store.updateContentFrameData(layerId, frameId, newData);

      const updated = useTimelineStore.getState().getLayer(layerId)!;
      const frame = updated.contentFrames.find((cf) => cf.id === frameId)!;
      expect(frame.data.get('0,0')?.char).toBe('X');
    });

    it('getContentFrameAt returns frame at position', () => {
      const store = useTimelineStore.getState();
      store.addContentFrame(layerId, 5, 3);

      const atFrame5 = useTimelineStore.getState().getContentFrameAt(layerId, 5);
      expect(atFrame5).not.toBeNull();
      expect(atFrame5?.startFrame).toBe(5);

      const atFrame7 = useTimelineStore.getState().getContentFrameAt(layerId, 7);
      expect(atFrame7).not.toBeNull();
      expect(atFrame7?.startFrame).toBe(5);
    });

    it('getContentFrameAt returns null in gap', () => {
      const store = useTimelineStore.getState();
      store.addContentFrame(layerId, 5, 3);

      // Frame 2 is in the gap between [0,1) and [5,8)
      const atFrame2 = useTimelineStore.getState().getContentFrameAt(layerId, 2);
      expect(atFrame2).toBeNull();
    });

    // Regression: splitting a frame that has a later frame on the same layer used
    // to append the new (split) frame out of startFrame order. That broke the
    // binary search in getContentFrameAtTime(), so the new frame couldn't be found
    // and rendered blank / uneditable on the canvas.
    it('splitContentFrame keeps frames sorted and findable when a later frame exists', () => {
      const store = useTimelineStore.getState();
      // Frame to split spans [5,15); a later frame [20,25) must exist to trigger the bug.
      const splitFrameId = store.addContentFrame(layerId, 5, 10)!;
      store.addContentFrame(layerId, 20, 5);

      const newFrameId = useTimelineStore.getState().splitContentFrame(layerId, splitFrameId, 10);
      expect(newFrameId).not.toBeNull();

      const layer = useTimelineStore.getState().getLayer(layerId)!;

      // contentFrames must stay sorted by startFrame (binary-search invariant).
      const starts = layer.contentFrames.map((cf) => cf.startFrame);
      expect(starts).toEqual([...starts].sort((a, b) => a - b));

      // The new (split) frame must be locatable via the binary-search path that the
      // canvas/frame-sync uses — not just the store's linear getContentFrameAt.
      const found = getContentFrameAtTime(layer, 12);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(newFrameId);
    });
  });

  // ── §1.8: Timeline auto-expands when content added past duration ──

  describe('timeline auto-expand', () => {
    it('ensureTimelineContains expands duration', () => {
      const store = useTimelineStore.getState();
      expect(store.config.durationFrames).toBe(1);

      store.ensureTimelineContains(10);
      expect(useTimelineStore.getState().config.durationFrames).toBe(11);
    });

    it('ensureTimelineContains does not shrink', () => {
      const store = useTimelineStore.getState();
      store.ensureTimelineContains(10);
      store.ensureTimelineContains(5);
      expect(useTimelineStore.getState().config.durationFrames).toBe(11);
    });

    it('addContentFrame auto-expands timeline', () => {
      const store = useTimelineStore.getState();
      const layerId = store.layers[0].id;
      store.addContentFrame(layerId, 20, 5);

      // Should expand to at least 20+5 = 25 frames
      expect(useTimelineStore.getState().config.durationFrames).toBeGreaterThanOrEqual(25);
    });

    it('addKeyframe auto-expands timeline', () => {
      const store = useTimelineStore.getState();
      const layerId = store.layers[0].id;
      const trackId = store.addPropertyTrack(layerId, 'transform.rotation');
      useTimelineStore.getState().addKeyframe(layerId, trackId, 50, 100);

      expect(useTimelineStore.getState().config.durationFrames).toBeGreaterThanOrEqual(51);
    });
  });

  // ── §1.8: Frame rate change converts content to maintain duration in seconds ──

  describe('frame rate conversion', () => {
    it('setFrameRate converts content frame timings (maintainDuration=true)', () => {
      const store = useTimelineStore.getState();
      const layerId = store.layers[0].id;

      // Add a content frame at frame 12 (= 1 second at 12fps)
      store.addContentFrame(layerId, 12, 12);

      // Change to 24fps
      useTimelineStore.getState().setFrameRate(24, true);

      const state = useTimelineStore.getState();
      expect(state.config.frameRate).toBe(24);

      // Frame 12 at 12fps = 1s → should be frame 24 at 24fps
      const layer = state.getLayer(layerId)!;
      const secondFrame = layer.contentFrames.find((cf) => cf.startFrame > 0);
      expect(secondFrame?.startFrame).toBe(24);
      expect(secondFrame?.durationFrames).toBe(24);
    });

    it('setFrameRate converts keyframe positions', () => {
      const store = useTimelineStore.getState();
      const layerId = store.layers[0].id;
      const trackId = store.addPropertyTrack(layerId, 'transform.rotation');
      useTimelineStore.getState().addKeyframe(layerId, trackId, 12, 50);
      useTimelineStore.getState().addKeyframe(layerId, trackId, 24, 100);

      useTimelineStore.getState().setFrameRate(24, true);

      const layer = useTimelineStore.getState().getLayer(layerId)!;
      const track = layer.propertyTracks[0];
      expect(track.keyframes[0].frame).toBe(24);
      expect(track.keyframes[1].frame).toBe(48);
    });

    it('setFrameRate scales duration', () => {
      const store = useTimelineStore.getState();
      store.ensureTimelineContains(23); // 24 frames = 2 seconds at 12fps

      useTimelineStore.getState().setFrameRate(24, true);

      const state = useTimelineStore.getState();
      // 24 frames at 12fps = 2s → 48 frames at 24fps
      expect(state.config.durationFrames).toBe(48);
    });

    it('setFrameRate without maintainDuration keeps frame counts', () => {
      const store = useTimelineStore.getState();
      store.ensureTimelineContains(23); // 24 frames

      useTimelineStore.getState().setFrameRate(24, false);

      const state = useTimelineStore.getState();
      expect(state.config.durationFrames).toBe(24); // Unchanged
      expect(state.config.frameRate).toBe(24);
    });

    it('setFrameRate rejects zero or negative FPS', () => {
      useTimelineStore.getState().setFrameRate(0);
      expect(useTimelineStore.getState().config.frameRate).toBe(12); // Unchanged

      useTimelineStore.getState().setFrameRate(-5);
      expect(useTimelineStore.getState().config.frameRate).toBe(12);
    });
  });

  // ── Keyframe CRUD ──

  describe('keyframe CRUD', () => {
    let layerId: LayerId;
    let trackId: PropertyTrackId;

    beforeEach(() => {
      layerId = useTimelineStore.getState().layers[0].id;
      trackId = useTimelineStore.getState().addPropertyTrack(layerId, 'transform.rotation');
    });

    it('addPropertyTrack creates a track', () => {
      const layer = useTimelineStore.getState().getLayer(layerId)!;
      expect(layer.propertyTracks).toHaveLength(1);
      expect(layer.propertyTracks[0].propertyPath).toBe('transform.rotation');
    });

    it('removePropertyTrack removes a track', () => {
      useTimelineStore.getState().removePropertyTrack(layerId, trackId);
      const layer = useTimelineStore.getState().getLayer(layerId)!;
      expect(layer.propertyTracks).toHaveLength(0);
    });

    it('addKeyframe adds a sorted keyframe', () => {
      const store = useTimelineStore.getState();
      store.addKeyframe(layerId, trackId, 10, 50);
      store.addKeyframe(layerId, trackId, 5, 25);

      const layer = useTimelineStore.getState().getLayer(layerId)!;
      const kfs = layer.propertyTracks[0].keyframes;
      expect(kfs).toHaveLength(2);
      // Should be sorted by frame
      expect(kfs[0].frame).toBe(5);
      expect(kfs[1].frame).toBe(10);
    });

    it('addKeyframe replaces keyframe at same frame', () => {
      const store = useTimelineStore.getState();
      store.addKeyframe(layerId, trackId, 10, 50);
      store.addKeyframe(layerId, trackId, 10, 80);

      const layer = useTimelineStore.getState().getLayer(layerId)!;
      const kfs = layer.propertyTracks[0].keyframes;
      expect(kfs).toHaveLength(1);
      expect(kfs[0].value).toBe(80);
    });

    it('removeKeyframe removes a keyframe', () => {
      const store = useTimelineStore.getState();
      const kfId = store.addKeyframe(layerId, trackId, 10, 50);
      useTimelineStore.getState().removeKeyframe(layerId, trackId, kfId);

      const layer = useTimelineStore.getState().getLayer(layerId)!;
      expect(layer.propertyTracks[0].keyframes).toHaveLength(0);
    });

    it('updateKeyframe updates value', () => {
      const store = useTimelineStore.getState();
      const kfId = store.addKeyframe(layerId, trackId, 10, 50);
      useTimelineStore.getState().updateKeyframe(layerId, trackId, kfId, { value: 75 });

      const layer = useTimelineStore.getState().getLayer(layerId)!;
      expect(layer.propertyTracks[0].keyframes[0].value).toBe(75);
    });

    it('updateKeyframe re-sorts when frame changes', () => {
      const store = useTimelineStore.getState();
      const kf1 = store.addKeyframe(layerId, trackId, 5, 10);
      useTimelineStore.getState().addKeyframe(layerId, trackId, 10, 20);

      // Move first keyframe to frame 15
      useTimelineStore.getState().updateKeyframe(layerId, trackId, kf1, { frame: 15 });

      const layer = useTimelineStore.getState().getLayer(layerId)!;
      const kfs = layer.propertyTracks[0].keyframes;
      expect(kfs[0].frame).toBe(10);
      expect(kfs[1].frame).toBe(15);
    });

    it('moveKeyframe auto-expands and updates', () => {
      const store = useTimelineStore.getState();
      const kfId = store.addKeyframe(layerId, trackId, 5, 50);
      useTimelineStore.getState().moveKeyframe(layerId, trackId, kfId, 100);

      expect(useTimelineStore.getState().config.durationFrames).toBeGreaterThanOrEqual(101);
      const layer = useTimelineStore.getState().getLayer(layerId)!;
      expect(layer.propertyTracks[0].keyframes[0].frame).toBe(100);
    });
  });

  // ── Playback navigation ──

  describe('playback navigation', () => {
    beforeEach(() => {
      useTimelineStore.getState().ensureTimelineContains(9); // 10 frames
    });

    it('goToFrame sets current frame', () => {
      useTimelineStore.getState().goToFrame(5);
      expect(useTimelineStore.getState().view.currentFrame).toBe(5);
    });

    it('goToFrame clamps to valid range', () => {
      useTimelineStore.getState().goToFrame(-1);
      expect(useTimelineStore.getState().view.currentFrame).toBe(0);

      useTimelineStore.getState().goToFrame(100);
      expect(useTimelineStore.getState().view.currentFrame).toBe(9);
    });

    it('nextFrame advances by 1', () => {
      useTimelineStore.getState().goToFrame(3);
      useTimelineStore.getState().nextFrame();
      expect(useTimelineStore.getState().view.currentFrame).toBe(4);
    });

    it('nextFrame wraps when looping', () => {
      useTimelineStore.getState().goToFrame(9);
      useTimelineStore.getState().setLooping(true);
      useTimelineStore.getState().nextFrame();
      expect(useTimelineStore.getState().view.currentFrame).toBe(0);
    });

    it('nextFrame stays at end when not looping', () => {
      useTimelineStore.getState().goToFrame(9);
      useTimelineStore.getState().setLooping(false);
      useTimelineStore.getState().nextFrame();
      expect(useTimelineStore.getState().view.currentFrame).toBe(9);
    });

    it('previousFrame wraps when looping', () => {
      useTimelineStore.getState().goToFrame(0);
      useTimelineStore.getState().setLooping(true);
      useTimelineStore.getState().previousFrame();
      expect(useTimelineStore.getState().view.currentFrame).toBe(9);
    });

    it('previousFrame stays at 0 when not looping', () => {
      useTimelineStore.getState().goToFrame(0);
      useTimelineStore.getState().setLooping(false);
      useTimelineStore.getState().previousFrame();
      expect(useTimelineStore.getState().view.currentFrame).toBe(0);
    });
  });

  // ── Project lifecycle ──

  describe('project lifecycle', () => {
    it('loadFromSessionData loads layers and config', () => {
      const store = useTimelineStore.getState();
      const layers = [
        {
          id: 'test-layer' as LayerId,
          name: 'Test',
          visible: true,
          solo: false,
          locked: false,
          opacity: 100,
          contentFrames: [],
          propertyTracks: [],
        },
      ];

      store.loadFromSessionData(layers, { frameRate: 24, durationFrames: 48 });

      const state = useTimelineStore.getState();
      expect(state.layers).toHaveLength(1);
      expect(state.layers[0].name).toBe('Test');
      expect(state.config.frameRate).toBe(24);
      expect(state.config.durationFrames).toBe(48);
      expect(state.view.activeLayerId).toBe('test-layer');
    });
  });

  // ── View actions ──

  describe('view actions', () => {
    it('setZoom clamps between 0.1 and 10', () => {
      useTimelineStore.getState().setZoom(0.01);
      expect(useTimelineStore.getState().view.zoom).toBe(0.1);
      useTimelineStore.getState().setZoom(100);
      expect(useTimelineStore.getState().view.zoom).toBe(10);
    });

    it('setPanelHeight clamps between 100 and 600', () => {
      useTimelineStore.getState().setPanelHeight(50);
      expect(useTimelineStore.getState().view.panelHeight).toBe(100);
      useTimelineStore.getState().setPanelHeight(1000);
      expect(useTimelineStore.getState().view.panelHeight).toBe(600);
    });
  });
});
