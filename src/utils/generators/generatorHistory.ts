/**
 * Undo/redo helpers for generator layers.
 *
 * Generator sources are immutable, so a before/after snapshot of the source
 * is a cheap and complete history record.
 */

import { useTimelineStore } from '../../stores/timelineStore';
import { useToolStore } from '../../stores/toolStore';
import type { LayerId } from '../../types/timeline';
import type { EffectKeyframe } from '../../types/effectBlock';
import type { GeneratorSource } from '../../types/generatorLayer';

function getSource(layerId: LayerId): GeneratorSource | undefined {
  return useTimelineStore.getState().layers.find((l) => l.id === layerId)?.generator;
}

/**
 * Run `mutate` and record a single `generator_update` history entry if the
 * layer's generator source changed.
 */
export function withGeneratorHistory<T>(layerId: LayerId, description: string, mutate: () => T): T {
  const previousSource = getSource(layerId);
  const result = mutate();
  const newSource = getSource(layerId);
  if (previousSource && newSource && previousSource !== newSource &&
      JSON.stringify(previousSource) !== JSON.stringify(newSource)) {
    useToolStore.getState().pushToHistory({
      type: 'generator_update',
      timestamp: Date.now(),
      description,
      data: {
        layerId: layerId as string,
        previousSource: structuredClone(previousSource),
        newSource: structuredClone(newSource),
      },
    });
  }
  return result;
}

/**
 * Set a generator property at `frame` without recording history. Updates the
 * keyframe at the playhead, auto-keys tracked properties, or edits the static
 * setting when the property is not animated.
 */
export function setGeneratorValueAtFrame(
  layerId: LayerId,
  propertyPath: string,
  value: EffectKeyframe['value'],
  frame: number,
): void {
  const tl = useTimelineStore.getState();
  const current = getSource(layerId);
  if (!current) return;
  const track = current.propertyTracks.find((pt) => pt.propertyPath === propertyPath);
  const kfAtFrame = track?.keyframes.find((kf) => kf.frame === frame);
  if (track && kfAtFrame) {
    tl.updateGeneratorKeyframe(layerId, track.id, kfAtFrame.id, { value });
  } else if (track && track.keyframes.length > 0) {
    tl.addGeneratorKeyframe(layerId, track.id, frame, value);
  } else {
    tl.updateGeneratorSettings(layerId, { [propertyPath]: value });
  }
}

/** Record a `generator_update` entry for a change that already happened (e.g. after a drag) */
export function recordGeneratorChange(
  layerId: LayerId,
  description: string,
  previousSource: GeneratorSource,
): void {
  const newSource = getSource(layerId);
  if (!newSource || newSource === previousSource ||
      JSON.stringify(previousSource) === JSON.stringify(newSource)) return;
  useToolStore.getState().pushToHistory({
    type: 'generator_update',
    timestamp: Date.now(),
    description,
    data: {
      layerId: layerId as string,
      previousSource: structuredClone(previousSource),
      newSource: structuredClone(newSource),
    },
  });
}

/** Add a generator layer and record it as a `layer_add` history entry */
export function addGeneratorLayerWithHistory(generatorType: string): LayerId | null {
  const store = useTimelineStore.getState();
  const layerId = store.addGeneratorLayer(generatorType);
  if (!layerId) return null;
  const state = useTimelineStore.getState();
  const insertIndex = state.layers.findIndex((l) => l.id === layerId);
  const layer = state.layers[insertIndex];
  useToolStore.getState().pushToHistory({
    type: 'layer_add',
    timestamp: Date.now(),
    description: `Add ${layer.name} generator`,
    data: { layerId: layerId as string, layerData: structuredClone(layer), insertIndex },
  });
  return layerId;
}

/** Bake a generator layer into content frames and record undo */
export function bakeGeneratorLayerWithHistory(layerId: LayerId): void {
  const before = useTimelineStore.getState().layers.find((l) => l.id === layerId);
  if (!before?.generator) return;
  const previousLayer = structuredClone(before);
  useTimelineStore.getState().bakeGeneratorLayer(layerId);
  const after = useTimelineStore.getState().layers.find((l) => l.id === layerId);
  if (!after) return;
  useToolStore.getState().pushToHistory({
    type: 'generator_bake',
    timestamp: Date.now(),
    description: `Bake ${before.name}`,
    data: { layerId: layerId as string, previousLayer, newLayer: structuredClone(after) },
  });
}
