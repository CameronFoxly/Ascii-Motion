/**
 * useTimelineHistory Hook
 * 
 * Wraps all layer/timeline mutation operations with undo/redo history recording.
 * This is the layer-timeline equivalent of useAnimationHistory.ts.
 * 
 * All component code should use this hook instead of calling timelineStore
 * actions directly, to ensure operations are recorded for undo/redo.
 * 
 * Part of the Layer Timeline Refactor (v2.0.0)
 * See: docs/LAYER_TIMELINE_REFACTOR_PLAN.md §1.6a
 */

import { useCallback } from 'react';
import { useTimelineStore } from '../stores/timelineStore';
import { useToolStore } from '../stores/toolStore';
import { withGeneratorHistory } from '../utils/generators/generatorHistory';
import type { Cell } from '../types';
import type {
  LayerAddHistoryAction,
  LayerRemoveHistoryAction,
  LayerReorderHistoryAction,
  LayerRenameHistoryAction,
  LayerVisibilityHistoryAction,
  LayerOpacityHistoryAction,
  ContentFrameAddHistoryAction,
  ContentFrameRemoveHistoryAction,
  ContentFrameTimingHistoryAction,
  ContentFrameDataHistoryAction,
  ContentFrameRenameHistoryAction,
  KeyframeAddHistoryAction,
  KeyframeRemoveHistoryAction,
  KeyframeUpdateHistoryAction,
  PropertyTrackAddHistoryAction,
  PropertyTrackRemoveHistoryAction,
  FrameRateChangeHistoryAction,
  StaticPropertyChangeHistoryAction,
} from '../types';
import type {
  LayerId,
  ContentFrameId,
  PropertyTrackId,
  KeyframeId,
  PropertyPath,
  Keyframe,
} from '../types/timeline';

export function useTimelineHistory() {
  // PERF FIX: Use getState() inside callbacks instead of a broad reactive subscription.
  // The previous `useTimelineStore()` (no selector) created a full-store subscription
  // that re-rendered every consumer on ANY timelineStore change. Since this hook is
  // called 8× in the CanvasGrid tree (via useLayerTransformTool → useKeyframeableProperty ×7),
  // it caused massive unnecessary re-renders (~53ms per cell edit).
  //
  // All action functions only need store data at CALL TIME, not at render time,
  // so getState() inside callbacks is correct and avoids reactive subscriptions.

  const pushToHistory = useToolStore((s) => s.pushToHistory);

  // ============================================
  // LAYER OPERATIONS
  // ============================================

  const addLayer = useCallback((name?: string) => {
    const { layers, view, addLayer: addLayerStore } = useTimelineStore.getState();
    const insertIndex = view.activeLayerId
      ? layers.findIndex((l) => l.id === view.activeLayerId) + 1
      : layers.length;

    const layerId = addLayerStore(name);
    if (!layerId) return layerId;
    const layer = useTimelineStore.getState().getLayer(layerId);

    if (layer) {
      const historyAction: LayerAddHistoryAction = {
        type: 'layer_add',
        timestamp: Date.now(),
        description: `Add layer "${layer.name}"`,
        data: {
          layerId: layer.id,
          layerData: structuredClone(layer),
          insertIndex,
        },
      };
      pushToHistory(historyAction);
    }

    return layerId;
  }, [pushToHistory]);

  const removeLayer = useCallback((layerId: LayerId) => {
    const { layers, getLayer, removeLayer: removeLayerStore } = useTimelineStore.getState();
    const layer = getLayer(layerId);
    if (!layer) return;

    const index = layers.findIndex((l) => l.id === layerId);

    const historyAction: LayerRemoveHistoryAction = {
      type: 'layer_remove',
      timestamp: Date.now(),
      description: `Remove layer "${layer.name}"`,
      data: {
        layerId: layer.id,
        layerData: structuredClone(layer),
        index,
      },
    };

    removeLayerStore(layerId);
    pushToHistory(historyAction);
  }, [pushToHistory]);

  const duplicateLayer = useCallback((layerId: LayerId) => {
    const { layers, getLayer, duplicateLayer: duplicateLayerStore } = useTimelineStore.getState();
    const source = getLayer(layerId);
    if (!source) return layerId;

    const newId = duplicateLayerStore(layerId);
    if (!newId) return layerId;
    const duplicated = useTimelineStore.getState().getLayer(newId);
    const insertIndex = layers.findIndex((l) => l.id === layerId) + 1;

    if (duplicated) {
      const historyAction: LayerAddHistoryAction = {
        type: 'layer_add',
        timestamp: Date.now(),
        description: `Duplicate layer "${source.name}"`,
        data: {
          layerId: duplicated.id,
          layerData: structuredClone(duplicated),
          insertIndex,
        },
      };
      pushToHistory(historyAction);
    }

    return newId;
  }, [pushToHistory]);

  const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const historyAction: LayerReorderHistoryAction = {
      type: 'layer_reorder',
      timestamp: Date.now(),
      description: `Reorder layer from position ${fromIndex + 1} to ${toIndex + 1}`,
      data: { fromIndex, toIndex },
    };

    useTimelineStore.getState().reorderLayers(fromIndex, toIndex);
    pushToHistory(historyAction);
  }, [pushToHistory]);

  const renameLayer = useCallback((layerId: LayerId, name: string) => {
    const { getLayer, renameLayer: renameLayerStore } = useTimelineStore.getState();
    const layer = getLayer(layerId);
    if (!layer) return;

    const historyAction: LayerRenameHistoryAction = {
      type: 'layer_rename',
      timestamp: Date.now(),
      description: `Rename layer "${layer.name}" → "${name}"`,
      data: {
        layerId: layer.id,
        oldName: layer.name,
        newName: name,
      },
    };

    renameLayerStore(layerId, name);
    pushToHistory(historyAction);
  }, [pushToHistory]);

  const setLayerVisible = useCallback((layerId: LayerId, visible: boolean) => {
    const { getLayer, setLayerVisible: setLayerVisibleStore } = useTimelineStore.getState();
    const layer = getLayer(layerId);
    if (!layer) return;

    const historyAction: LayerVisibilityHistoryAction = {
      type: 'layer_visibility',
      timestamp: Date.now(),
      description: `${visible ? 'Show' : 'Hide'} layer "${layer.name}"`,
      data: {
        layerId: layer.id,
        oldVisible: layer.visible,
        newVisible: visible,
      },
    };

    setLayerVisibleStore(layerId, visible);
    pushToHistory(historyAction);
  }, [pushToHistory]);

  const setLayerOpacity = useCallback((layerId: LayerId, opacity: number) => {
    const { getLayer, setLayerOpacity: setLayerOpacityStore } = useTimelineStore.getState();
    const layer = getLayer(layerId);
    if (!layer) return;

    const historyAction: LayerOpacityHistoryAction = {
      type: 'layer_opacity',
      timestamp: Date.now(),
      description: `Set layer "${layer.name}" opacity to ${opacity}%`,
      data: {
        layerId: layer.id,
        oldOpacity: layer.opacity,
        newOpacity: opacity,
      },
    };

    setLayerOpacityStore(layerId, opacity);
    pushToHistory(historyAction);
  }, [pushToHistory]);

  // ============================================
  // CONTENT FRAME OPERATIONS
  // ============================================

  const addContentFrame = useCallback((
    layerId: LayerId,
    startFrame: number,
    durationFrames: number,
    data?: Map<string, Cell>,
  ) => {
    const frameId = useTimelineStore.getState().addContentFrame(layerId, startFrame, durationFrames, data);
    if (!frameId) return null; // Overlap rejection

    // Get the frame that was just created
    const layer = useTimelineStore.getState().getLayer(layerId);
    const frame = layer?.contentFrames.find((cf) => cf.id === frameId);

    if (frame) {
      const historyAction: ContentFrameAddHistoryAction = {
        type: 'content_frame_add',
        timestamp: Date.now(),
        description: `Add content frame to layer`,
        data: {
          layerId,
          frameId,
          frameData: structuredClone(frame),
        },
      };
      pushToHistory(historyAction);
    }

    return frameId;
  }, [pushToHistory]);

  /**
   * Split a content frame at the playhead into two frames.
   * Records both the timing change and the new frame as history.
   */
  const splitContentFrame = useCallback((
    layerId: LayerId,
    frameId: ContentFrameId,
    atFrame: number,
  ) => {
    const { getLayer } = useTimelineStore.getState();
    const layer = getLayer(layerId);
    const cf = layer?.contentFrames.find((c) => c.id === frameId);
    if (!cf) return null;

    const oldTiming = { startFrame: cf.startFrame, durationFrames: cf.durationFrames };
    const newTimingForOriginal = { startFrame: cf.startFrame, durationFrames: atFrame - cf.startFrame };

    const splitStore = useTimelineStore.getState().splitContentFrame;
    const newFrameId = splitStore(layerId, frameId, atFrame);
    if (!newFrameId) return null;

    // Record timing change for the original (shrunk) frame
    const timingAction: ContentFrameTimingHistoryAction = {
      type: 'content_frame_timing',
      timestamp: Date.now(),
      description: `Split content frame`,
      data: {
        layerId,
        frameId,
        oldTiming,
        newTiming: newTimingForOriginal,
      },
    };
    pushToHistory(timingAction);

    // Record the new (right) frame addition
    const updatedLayer = useTimelineStore.getState().getLayer(layerId);
    const newFrame = updatedLayer?.contentFrames.find((c) => c.id === newFrameId);
    if (newFrame) {
      const addAction: ContentFrameAddHistoryAction = {
        type: 'content_frame_add',
        timestamp: Date.now(),
        description: `Add split content frame`,
        data: {
          layerId,
          frameId: newFrameId,
          frameData: structuredClone(newFrame),
        },
      };
      pushToHistory(addAction);
    }

    return newFrameId;
  }, [pushToHistory]);

  /**
   * Duplicate a content frame, placing the copy immediately after the original.
   */  
  const duplicateContentFrame = useCallback((
    layerId: LayerId,
    frameId: ContentFrameId,
  ) => {
    const dupStore = useTimelineStore.getState().duplicateContentFrame;
    const newFrameId = dupStore(layerId, frameId);
    if (!newFrameId) return null;

    const layer = useTimelineStore.getState().getLayer(layerId);
    const newFrame = layer?.contentFrames.find((c) => c.id === newFrameId);
    if (newFrame) {
      const historyAction: ContentFrameAddHistoryAction = {
        type: 'content_frame_add',
        timestamp: Date.now(),
        description: `Duplicate content frame`,
        data: {
          layerId,
          frameId: newFrameId,
          frameData: structuredClone(newFrame),
        },
      };
      pushToHistory(historyAction);
    }

    return newFrameId;
  }, [pushToHistory]);

  const removeContentFrame = useCallback((layerId: LayerId, frameId: ContentFrameId) => {
    const { getLayer, removeContentFrame: removeContentFrameStore } = useTimelineStore.getState();
    const layer = getLayer(layerId);
    const frame = layer?.contentFrames.find((cf) => cf.id === frameId);
    if (!frame) return;

    const historyAction: ContentFrameRemoveHistoryAction = {
      type: 'content_frame_remove',
      timestamp: Date.now(),
      description: `Remove content frame "${frame.name}"`,
      data: {
        layerId,
        frameId,
        frameData: structuredClone(frame),
      },
    };

    removeContentFrameStore(layerId, frameId);
    pushToHistory(historyAction);
  }, [pushToHistory]);

  const updateContentFrameTiming = useCallback((
    layerId: LayerId,
    frameId: ContentFrameId,
    startFrame: number,
    durationFrames: number,
  ) => {
    const { getLayer, updateContentFrameTiming: updateContentFrameTimingStore, config } = useTimelineStore.getState();
    const layer = getLayer(layerId);
    const frame = layer?.contentFrames.find((cf) => cf.id === frameId);
    if (!frame) return false;

    const oldTiming = {
      startFrame: frame.startFrame,
      durationFrames: frame.durationFrames,
    };

    // Capture timeline duration before (may change via ensureTimelineContains)
    const previousTimelineDuration = config.durationFrames;

    const success = updateContentFrameTimingStore(layerId, frameId, startFrame, durationFrames);
    if (!success) return false;

    // Auto-extend timeline if the frame now extends past the end
    useTimelineStore.getState().ensureTimelineContains(startFrame + durationFrames - 1);

    const newTimelineDuration = useTimelineStore.getState().config.durationFrames;

    const historyAction: ContentFrameTimingHistoryAction = {
      type: 'content_frame_timing',
      timestamp: Date.now(),
      description: `Update content frame timing`,
      data: {
        layerId,
        frameId,
        oldTiming,
        newTiming: { startFrame, durationFrames },
        previousTimelineDuration,
        newTimelineDuration,
      },
    };
    pushToHistory(historyAction);

    return true;
  }, [pushToHistory]);

  const updateContentFrameData = useCallback((
    layerId: LayerId,
    frameId: ContentFrameId,
    data: Map<string, Cell>,
  ) => {
    const { getLayer, updateContentFrameData: updateContentFrameDataStore } = useTimelineStore.getState();
    const layer = getLayer(layerId);
    const frame = layer?.contentFrames.find((cf) => cf.id === frameId);
    if (!frame) return;

    const historyAction: ContentFrameDataHistoryAction = {
      type: 'content_frame_data',
      timestamp: Date.now(),
      description: `Update content frame data`,
      data: {
        layerId,
        frameId,
        previousData: new Map(frame.data),
        newData: new Map(data),
      },
    };

    updateContentFrameDataStore(layerId, frameId, data);
    pushToHistory(historyAction);
  }, [pushToHistory]);

  const renameContentFrame = useCallback((layerId: LayerId, frameId: ContentFrameId, name: string) => {
    const { getLayer, renameContentFrame: renameContentFrameStore } = useTimelineStore.getState();
    const layer = getLayer(layerId);
    const frame = layer?.contentFrames.find((cf) => cf.id === frameId);
    if (!frame) return;

    const historyAction: ContentFrameRenameHistoryAction = {
      type: 'content_frame_rename',
      timestamp: Date.now(),
      description: `Rename frame "${frame.name}" → "${name}"`,
      data: {
        layerId: layerId as string,
        frameId: frameId as string,
        oldName: frame.name,
        newName: name,
      },
    };

    renameContentFrameStore(layerId, frameId, name);
    pushToHistory(historyAction);
  }, [pushToHistory]);

  // ============================================
  // PROPERTY TRACK & KEYFRAME OPERATIONS
  // ============================================

  const addPropertyTrack = useCallback((layerId: LayerId, propertyPath: PropertyPath) => {
    const trackId = useTimelineStore.getState().addPropertyTrack(layerId, propertyPath);

    const historyAction: PropertyTrackAddHistoryAction = {
      type: 'property_track_add',
      timestamp: Date.now(),
      description: `Add property track "${propertyPath}"`,
      data: {
        layerId,
        trackId,
        propertyPath,
      },
    };
    pushToHistory(historyAction);

    return trackId;
  }, [pushToHistory]);

  const removePropertyTrack = useCallback((layerId: LayerId, trackId: PropertyTrackId) => {
    const { getLayer, removePropertyTrack: removePropertyTrackStore } = useTimelineStore.getState();
    const layer = getLayer(layerId);
    const track = layer?.propertyTracks.find((pt) => pt.id === trackId);
    if (!track) return;

    const historyAction: PropertyTrackRemoveHistoryAction = {
      type: 'property_track_remove',
      timestamp: Date.now(),
      description: `Remove property track "${track.propertyPath}"`,
      data: {
        layerId,
        trackId,
        trackData: structuredClone(track),
      },
    };

    removePropertyTrackStore(layerId, trackId);
    pushToHistory(historyAction);
  }, [pushToHistory]);

  const addKeyframe = useCallback((
    layerId: LayerId,
    trackId: PropertyTrackId,
    frame: number,
    value: number,
  ) => {
    const tl = useTimelineStore.getState();

    const generatorTrack = tl.getLayer(layerId)?.generator?.propertyTracks.find((pt) => pt.id as string === trackId as string);
    if (generatorTrack) {
      return withGeneratorHistory(layerId, `Add keyframe at frame ${frame}`, () =>
        tl.addGeneratorKeyframe(layerId, generatorTrack.id, frame, value));
    }

    // Check if this track belongs to an effect property track
    const allEffectSources = [
      ...tl.layers.flatMap((l) => (l.effectTracks ?? [])),
      ...tl.layerGroups.flatMap((g) => (g.effectTracks ?? [])),
      ...(tl.globalEffects ?? []),
    ];
    let effectMatch: { blockId: string; ptId: string } | null = null;
    for (const et of allEffectSources) {
      const pt = et.effectBlock.propertyTracks.find((t) => (t.id as string) === (trackId as string));
      if (pt) { effectMatch = { blockId: et.effectBlock.id as string, ptId: pt.id as string }; break; }
    }

    if (effectMatch) {
      const kfId = tl.addEffectKeyframe(
        effectMatch.blockId as import('../types/effectBlock').EffectBlockId,
        effectMatch.ptId as import('../types/effectBlock').EffectPropertyTrackId,
        frame,
        value as import('../types/effectBlock').EffectKeyframe['value'],
      );
      return kfId as unknown as KeyframeId;
    }

    const keyframeId = tl.addKeyframe(layerId, trackId, frame, value);

    // Get the keyframe that was just created
    const layer = useTimelineStore.getState().getLayer(layerId);
    const track = layer?.propertyTracks.find((pt) => pt.id === trackId);
    const keyframe = track?.keyframes.find((kf) => kf.id === keyframeId);

    if (keyframe) {
      const historyAction: KeyframeAddHistoryAction = {
        type: 'keyframe_add',
        timestamp: Date.now(),
        description: `Add keyframe at frame ${frame}`,
        data: {
          layerId,
          trackId,
          keyframeId,
          keyframe: structuredClone(keyframe),
        },
      };
      pushToHistory(historyAction);
    }

    return keyframeId;
  }, [pushToHistory]);

  const removeKeyframe = useCallback((
    layerId: LayerId,
    trackId: PropertyTrackId,
    keyframeId: KeyframeId,
  ) => {
    const tl = useTimelineStore.getState();

    const generatorTrack = tl.getLayer(layerId)?.generator?.propertyTracks.find((pt) => pt.id as string === trackId as string);
    if (generatorTrack) {
      withGeneratorHistory(layerId, 'Remove generator keyframe', () =>
        tl.removeGeneratorKeyframe(layerId, generatorTrack.id, keyframeId));
      return;
    }

    // Check if this track belongs to an effect property track
    const allEffectSources = [
      ...tl.layers.flatMap((l) => (l.effectTracks ?? [])),
      ...tl.layerGroups.flatMap((g) => (g.effectTracks ?? [])),
      ...(tl.globalEffects ?? []),
    ];
    for (const et of allEffectSources) {
      const pt = et.effectBlock.propertyTracks.find((t) => (t.id as string) === (trackId as string));
      if (pt) {
        tl.removeEffectKeyframe(et.effectBlock.id, pt.id, keyframeId);
        return;
      }
    }

    const { getLayer, removeKeyframe: removeKeyframeStore } = tl;
    const layer = getLayer(layerId);
    const track = layer?.propertyTracks.find((pt) => pt.id === trackId);
    const keyframe = track?.keyframes.find((kf) => kf.id === keyframeId);
    if (!keyframe) return;

    const historyAction: KeyframeRemoveHistoryAction = {
      type: 'keyframe_remove',
      timestamp: Date.now(),
      description: `Remove keyframe at frame ${keyframe.frame}`,
      data: {
        layerId,
        trackId,
        keyframeId,
        keyframe: structuredClone(keyframe),
      },
    };

    removeKeyframeStore(layerId, trackId, keyframeId);
    pushToHistory(historyAction);
  }, [pushToHistory]);

  const updateKeyframe = useCallback((
    layerId: LayerId,
    trackId: PropertyTrackId,
    keyframeId: KeyframeId,
    updates: Partial<Pick<Keyframe, 'frame' | 'value' | 'easing'>>,
  ) => {
    const { getLayer, updateKeyframe: updateKeyframeStore } = useTimelineStore.getState();
    const layer = getLayer(layerId);
    const generatorTrack = layer?.generator?.propertyTracks.find((pt) => pt.id as string === trackId as string);
    if (generatorTrack) {
      withGeneratorHistory(layerId, 'Update generator keyframe', () =>
        useTimelineStore.getState().updateGeneratorKeyframe(layerId, generatorTrack.id, keyframeId, updates));
      return;
    }
    const track = layer?.propertyTracks.find((pt) => pt.id === trackId);
    const keyframe = track?.keyframes.find((kf) => kf.id === keyframeId);
    if (!keyframe) return;

    const historyAction: KeyframeUpdateHistoryAction = {
      type: 'keyframe_update',
      timestamp: Date.now(),
      description: `Update keyframe at frame ${keyframe.frame}`,
      data: {
        layerId,
        trackId,
        keyframeId,
        oldValue: structuredClone(keyframe),
        newValue: structuredClone({ ...keyframe, ...updates }),
      },
    };

    updateKeyframeStore(layerId, trackId, keyframeId, updates);
    pushToHistory(historyAction);
  }, [pushToHistory]);

  // ============================================
  // FRAME RATE CHANGE
  // ============================================

  const setFrameRate = useCallback((newFps: number, maintainDuration: boolean = true) => {
    const { config, layers, setFrameRate: setFrameRateStore } = useTimelineStore.getState();
    const oldFps = config.frameRate;
    const oldLayers = structuredClone(layers);
    const oldDuration = config.durationFrames;

    setFrameRateStore(newFps, maintainDuration);

    const newState = useTimelineStore.getState();

    const historyAction: FrameRateChangeHistoryAction = {
      type: 'frame_rate_change',
      timestamp: Date.now(),
      description: `Change frame rate from ${oldFps} to ${newFps} FPS`,
      data: {
        oldFps,
        newFps,
        oldLayers,
        newLayers: structuredClone(newState.layers),
        oldDuration,
        newDuration: newState.config.durationFrames,
      },
    };
    pushToHistory(historyAction);
  }, [pushToHistory]);

  // ============================================
  // STATIC PROPERTY CHANGE (with history)
  // ============================================

  const setStaticProperty = useCallback((layerId: LayerId, propertyPath: string, newValue: number) => {
    const { getLayer } = useTimelineStore.getState();
    const layer = getLayer(layerId);
    if (!layer) return;

    const oldValue = layer.staticProperties?.[propertyPath];

    useTimelineStore.getState().setStaticProperty(layerId, propertyPath, newValue);

    const historyAction: StaticPropertyChangeHistoryAction = {
      type: 'static_property_change',
      timestamp: Date.now(),
      description: `Set ${propertyPath} to ${newValue}`,
      data: {
        layerId,
        propertyPath,
        oldValue,
        newValue,
      },
    };
    pushToHistory(historyAction);
  }, [pushToHistory]);

  // ============================================
  // TRIM TO WORK AREA (with history)
  // ============================================

  const trimToWorkArea = useCallback(() => {
    const tl = useTimelineStore.getState();
    const { workAreaStart, workAreaEnd, workAreaEnabled } = tl.view;
    if (!workAreaEnabled || workAreaStart >= workAreaEnd) return;

    const previousLayers = structuredClone(tl.layers);
    const previousDuration = tl.config.durationFrames;

    tl.trimToWorkArea();

    const newState = useTimelineStore.getState();

    const historyAction: import('../types').TrimToWorkAreaHistoryAction = {
      type: 'trim_to_work_area',
      timestamp: Date.now(),
      description: `Trim timeline to work area (frames ${workAreaStart}–${workAreaEnd})`,
      data: {
        previousLayers,
        previousDuration,
        previousWorkAreaStart: workAreaStart,
        previousWorkAreaEnd: workAreaEnd,
        newLayers: structuredClone(newState.layers),
        newDuration: newState.config.durationFrames,
      },
    };
    pushToHistory(historyAction);
  }, [pushToHistory]);

  // ============================================
  // REMOVE BLANK SPACE (with history)
  // ============================================

  const removeBlankSpace = useCallback((layerId: import('../types/timeline').LayerId, clickFrame: number) => {
    const tl = useTimelineStore.getState();
    const layer = tl.layers.find((l) => l.id === layerId);
    if (!layer) return;

    // Snapshot before
    const previousState = [{
      layerId: layerId as string,
      contentFrames: layer.contentFrames.map((cf) => ({
        id: cf.id as string,
        startFrame: cf.startFrame,
        durationFrames: cf.durationFrames,
        name: cf.name,
        data: new Map(cf.data),
      })),
    }];
    const previousKeyframes = layer.propertyTracks.flatMap((track) =>
      track.keyframes.map((kf) => ({
        layerId: layerId as string,
        trackId: track.id as string,
        keyframeId: kf.id as string,
        frame: kf.frame,
      }))
    );
    const previousDuration = tl.config.durationFrames;

    // Execute
    tl.removeBlankSpace(layerId, clickFrame);

    // Snapshot after
    const afterState = useTimelineStore.getState();
    const afterLayer = afterState.layers.find((l) => l.id === layerId);
    if (!afterLayer) return;

    const newState = [{
      layerId: layerId as string,
      contentFrames: afterLayer.contentFrames.map((cf) => ({
        id: cf.id as string,
        startFrame: cf.startFrame,
        durationFrames: cf.durationFrames,
        name: cf.name,
        data: new Map(cf.data),
      })),
    }];
    const newKeyframes = afterLayer.propertyTracks.flatMap((track) =>
      track.keyframes.map((kf) => ({
        layerId: layerId as string,
        trackId: track.id as string,
        keyframeId: kf.id as string,
        frame: kf.frame,
      }))
    );

    const historyAction: import('../types').ContentFrameReorderHistoryAction = {
      type: 'content_frame_reorder',
      timestamp: Date.now(),
      description: `Remove blank space on ${layer.name} at frame ${clickFrame}`,
      data: {
        previousState,
        newState,
        previousKeyframes: previousKeyframes.length > 0 ? previousKeyframes : undefined,
        newKeyframes: newKeyframes.length > 0 ? newKeyframes : undefined,
        previousTimelineDuration: previousDuration,
        newTimelineDuration: afterState.config.durationFrames,
      },
    };
    pushToHistory(historyAction);
  }, [pushToHistory]);

  // ============================================
  // MERGE / GROUP OPERATIONS (with history)
  // ============================================

  const mergeDown = useCallback((layerId: import('../types/timeline').LayerId) => {
    const tl = useTimelineStore.getState();
    const layers = tl.layers;
    const index = layers.findIndex((l) => l.id === layerId);
    if (index <= 0) return null;

    // Snapshot the layers to be removed for undo
    const upperLayer = JSON.parse(JSON.stringify(layers[index], (_k, v) => v instanceof Map ? Object.fromEntries(v) : v));
    const lowerLayer = JSON.parse(JSON.stringify(layers[index - 1], (_k, v) => v instanceof Map ? Object.fromEntries(v) : v));

    const mergedId = tl.mergeDown(layerId);
    if (!mergedId) return null;

    const mergedLayer = useTimelineStore.getState().layers.find(l => l.id === mergedId);
    if (!mergedLayer) return null;

    const historyAction: import('../types').MergeLayersHistoryAction = {
      type: 'merge_layers',
      timestamp: Date.now(),
      description: `Merge ${layers[index].name} into ${layers[index - 1].name}`,
      data: {
        removedLayers: [lowerLayer, upperLayer].map(l => ({
          ...l,
          contentFrames: l.contentFrames.map((cf: Record<string, unknown>) => ({
            ...cf,
            data: cf.data instanceof Map ? cf.data : new Map(Object.entries(cf.data as Record<string, unknown>)),
          })),
        })) as import('../types/timeline').Layer[],
        removedIndices: [index - 1, index],
        mergedLayer: JSON.parse(JSON.stringify(mergedLayer, (_k, v) => v instanceof Map ? Object.fromEntries(v) : v)),
        insertIndex: index - 1,
      },
    };
    pushToHistory(historyAction);
    return mergedId;
  }, [pushToHistory]);

  const mergeVisible = useCallback(() => {
    const tl = useTimelineStore.getState();
    const layers = tl.layers;
    const visibleLayers = layers.filter(l => l.visible);
    if (visibleLayers.length < 2) return null;

    // Snapshot visible layers for undo
    const removedLayers = visibleLayers.map(l =>
      JSON.parse(JSON.stringify(l, (_k, v) => v instanceof Map ? Object.fromEntries(v) : v))
    );
    const removedIndices = visibleLayers.map(l => layers.indexOf(l));

    const mergedId = tl.mergeVisible();
    if (!mergedId) return null;

    const mergedLayer = useTimelineStore.getState().layers.find(l => l.id === mergedId);
    if (!mergedLayer) return null;

    const historyAction: import('../types').MergeLayersHistoryAction = {
      type: 'merge_layers',
      timestamp: Date.now(),
      description: `Merge ${visibleLayers.length} visible layers`,
      data: {
        removedLayers: removedLayers.map((l: Record<string, unknown>) => ({
          ...l,
          contentFrames: (l.contentFrames as Array<Record<string, unknown>>).map((cf) => ({
            ...cf,
            data: cf.data instanceof Map ? cf.data : new Map(Object.entries(cf.data as Record<string, unknown>)),
          })),
        })) as import('../types/timeline').Layer[],
        removedIndices,
        mergedLayer: JSON.parse(JSON.stringify(mergedLayer, (_k, v) => v instanceof Map ? Object.fromEntries(v) : v)),
        insertIndex: 0,
      },
    };
    pushToHistory(historyAction);
    return mergedId;
  }, [pushToHistory]);

  const createGroup = useCallback((name: string, layerIds: import('../types/timeline').LayerId[]) => {
    const tl = useTimelineStore.getState();
    const groupId = tl.createGroup(name, layerIds);
    if (!groupId) return null;

    const historyAction: import('../types').CreateGroupHistoryAction = {
      type: 'create_group',
      timestamp: Date.now(),
      description: `Create group "${name}" with ${layerIds.length} layers`,
      data: {
        groupId: groupId as string,
        groupName: name,
        layerIds: layerIds.map(id => id as string),
      },
    };
    pushToHistory(historyAction);
    return groupId;
  }, [pushToHistory]);

  const ungroupLayers = useCallback((groupId: import('../types/timeline').LayerGroupId) => {
    const tl = useTimelineStore.getState();
    const group = tl.layerGroups.find(g => g.id === groupId);
    if (!group) return;

    tl.ungroupLayers(groupId);

    const historyAction: import('../types').UngroupLayersHistoryAction = {
      type: 'ungroup_layers',
      timestamp: Date.now(),
      description: `Ungroup "${group.name}"`,
      data: {
        group: JSON.parse(JSON.stringify(group)),
      },
    };
    pushToHistory(historyAction);
  }, [pushToHistory]);

  // ============================================
  // PASS-THROUGH (no history needed)
  // ============================================

  // These actions don't need undo/redo recording:
  // - setLayerSolo (visual-only toggle, no data change)
  // - setLayerLocked (UI state)
  // - goToFrame, nextFrame, previousFrame (navigation)
  // - setLooping (playback state)
  // - View actions (zoom, scroll, panel height)

  return {
    // Layer operations (with history)
    addLayer,
    removeLayer,
    duplicateLayer,
    reorderLayers,
    renameLayer,
    setLayerVisible,
    setLayerOpacity,

    // Content frame operations (with history)
    addContentFrame,
    removeContentFrame,
    splitContentFrame,
    duplicateContentFrame,
    updateContentFrameTiming,
    updateContentFrameData,
    renameContentFrame,

    // Property track & keyframe operations (with history)
    addPropertyTrack,
    removePropertyTrack,
    addKeyframe,
    removeKeyframe,
    updateKeyframe,

    // Frame rate (with history)
    setFrameRate,

    // Static property (with history)
    setStaticProperty,

    // Work area (with history)
    trimToWorkArea,

    // Remove blank space (with history)
    removeBlankSpace,

    // Merge / group operations (with history)
    mergeDown,
    mergeVisible,
    createGroup,
    ungroupLayers,

    // Pass-through without history (from store directly)
    setLayerSolo: useTimelineStore.getState().setLayerSolo,
    setLayerLocked: useTimelineStore.getState().setLayerLocked,
  };
}
