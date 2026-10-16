/**
 * MCP command handlers for procedural generator layers.
 *
 * Every mutating command records exactly one in-app undo entry and throws a
 * descriptive error on invalid input so the acknowledged command channel can
 * report it back to the MCP server.
 */

import { useCanvasStore } from '../stores/canvasStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useToolStore } from '../stores/toolStore';
import { getAllGenerators, getGenerator, getGeneratorInitialSettings } from '../registry/generatorRegistry';
import type { GeneratorRegistryEntry } from '../registry/generatorRegistry';
import { ANIMATED_TEXT_GENERATOR_TYPE } from '../registry/generators/animatedText';
import type { EffectKeyframe, EffectPropertyDefinition, EffectPropertyTrackId } from '../types/effectBlock';
import type { GeneratorSource } from '../types/generatorLayer';
import { EASING_PRESETS } from '../types/timeline';
import type { EasingCurve, EasingPreset, KeyframeId, Layer, LayerId, PropertyTrackId } from '../types/timeline';
import { applyTypewriterDefaultKeyframes, convertTypewriterUnits } from '../utils/generators/animatedTextActions';
import {
  bakeGeneratorLayerWithHistory,
  setGeneratorValueAtFrame,
  withGeneratorHistory,
} from '../utils/generators/generatorHistory';
import {
  isFrameInGeneratorRange,
  renderGeneratorFrame,
  resolveGeneratorSettings,
} from '../utils/generators/generatorRuntime';
import { serializeGeneratorSource } from '../utils/generators/generatorSerialization';
import { serializeSnapshotLayer } from './snapshotSerialization';
import type {
  GeneratorCatalogEntry,
  GeneratorRenderedFrame,
  MCPCommand,
  MCPCommandApplied,
  MCPGeneratorCommand,
} from './types';

export const MAX_RENDER_GENERATOR_FRAMES = 60;

const GENERATOR_COMMAND_TYPES = new Set<string>([
  'get_generator_catalog',
  'add_generator_layer',
  'update_generator_layer',
  'set_generator_property',
  'set_generator_keyframes',
  'remove_generator_keyframes',
  'reset_generator',
  'randomize_generator_seed',
  'get_generator_state',
  'render_generator_frames',
  'bake_generator_layer',
]);

export function isGeneratorCommand(command: MCPCommand): command is MCPGeneratorCommand {
  return GENERATOR_COMMAND_TYPES.has(command.type);
}

// ============================================================================
// Lookup & validation helpers
// ============================================================================

type GeneratorValue = EffectKeyframe['value'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function currentFrame(): number {
  return useTimelineStore.getState().view.currentFrame;
}

function requireGeneratorEntry(generatorType: unknown): GeneratorRegistryEntry {
  if (typeof generatorType !== 'string' || !generatorType) {
    throw new Error('generatorType must be a non-empty string');
  }
  const entry = getGenerator(generatorType);
  if (!entry) {
    const known = getAllGenerators().map((g) => g.type).join(', ');
    throw new Error(`Unknown generator type "${generatorType}". Known types: ${known}`);
  }
  return entry;
}

function requireGeneratorLayer(layerId: unknown, commandType: string): {
  layer: Layer;
  source: GeneratorSource;
  entry: GeneratorRegistryEntry;
} {
  if (typeof layerId !== 'string' || !layerId) {
    throw new Error(`${commandType} requires a layerId`);
  }
  const layer = useTimelineStore.getState().layers.find((l) => l.id === layerId);
  if (!layer) {
    throw new Error(`${commandType}: layer "${layerId}" not found`);
  }
  if (layer.kind !== 'generator' || !layer.generator) {
    throw new Error(`${commandType}: layer "${layerId}" is not a generator layer`);
  }
  const entry = getGenerator(layer.generator.generatorType);
  if (!entry) {
    throw new Error(`${commandType}: layer "${layerId}" uses unknown generator type "${layer.generator.generatorType}"`);
  }
  return { layer, source: layer.generator, entry };
}

function getSource(layerId: LayerId): GeneratorSource {
  const source = useTimelineStore.getState().layers.find((l) => l.id === layerId)?.generator;
  if (!source) throw new Error(`Generator layer "${layerId}" no longer exists`);
  return source;
}

function getDefinition(entry: GeneratorRegistryEntry, path: string): EffectPropertyDefinition | undefined {
  return entry.propertyDefinitions.find((d) => d.path === path);
}

/** Paths accepted as static settings: animatable definitions plus any default/initial setting keys */
function settingPaths(entry: GeneratorRegistryEntry): Set<string> {
  const { width, height } = useCanvasStore.getState();
  return new Set([
    ...entry.propertyDefinitions.map((d) => d.path),
    ...Object.keys(entry.defaultSettings),
    ...Object.keys(getGeneratorInitialSettings(entry.type, width, height) ?? {}),
  ]);
}

function unknownPathError(entry: GeneratorRegistryEntry, path: string, keyframeable: boolean): Error {
  const paths = keyframeable
    ? entry.propertyDefinitions.map((d) => d.path)
    : [...settingPaths(entry)];
  return new Error(
    `Unknown ${keyframeable ? 'keyframeable property' : 'property'} "${path}" for generator "${entry.type}". `
    + `Valid paths: ${paths.join(', ')}`,
  );
}

function validateValue(entry: GeneratorRegistryEntry, path: string, value: unknown): void {
  const def = getDefinition(entry, path);
  if (value === undefined) {
    throw new Error(`Value for "${path}" is required`);
  }
  if (!def) return;
  switch (def.valueType) {
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`"${path}" expects a finite number`);
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new Error(`"${path}" expects a boolean`);
      }
      break;
    case 'select':
      if (typeof value !== 'string') {
        throw new Error(`"${path}" expects a string option`);
      }
      if (def.options && !def.options.some((o) => o.value === value)) {
        throw new Error(`"${path}" must be one of: ${def.options.map((o) => o.value).join(', ')}`);
      }
      break;
    case 'string':
    case 'color':
    case 'palette':
      if (typeof value !== 'string') {
        throw new Error(`"${path}" expects a string`);
      }
      break;
    case 'mapping':
      if (!isRecord(value)) {
        throw new Error(`"${path}" expects an object`);
      }
      break;
    default:
      break;
  }
}

function validateSettings(entry: GeneratorRegistryEntry, settings: unknown): Record<string, unknown> {
  if (!isRecord(settings)) {
    throw new Error('settings must be an object');
  }
  const allowed = settingPaths(entry);
  for (const [path, value] of Object.entries(settings)) {
    if (!allowed.has(path)) throw unknownPathError(entry, path, false);
    validateValue(entry, path, value);
  }
  return settings;
}

function validateFrame(frame: unknown, label: string): number {
  if (!Number.isInteger(frame) || (frame as number) < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return frame as number;
}

function validateOptionalFrame(frame: unknown, label: string): number {
  return frame === undefined ? currentFrame() : validateFrame(frame, label);
}

function validateDuration(duration: unknown, label: string): number {
  if (!Number.isInteger(duration) || (duration as number) < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return duration as number;
}

export function normalizeEasing(easing: unknown): EasingCurve {
  if (typeof easing === 'string') {
    if (easing in EASING_PRESETS) return { type: easing as EasingPreset };
    throw new Error(`Unknown easing preset "${easing}". Valid presets: ${Object.keys(EASING_PRESETS).join(', ')}, or a custom curve object`);
  }
  if (isRecord(easing) && typeof easing.type === 'string') {
    if (easing.type === 'custom') {
      const curve: EasingCurve = { type: 'custom' };
      for (const key of ['x1', 'y1', 'x2', 'y2'] as const) {
        const v = easing[key];
        if (v === undefined) continue;
        if (typeof v !== 'number' || !Number.isFinite(v)) {
          throw new Error(`Custom easing ${key} must be a finite number`);
        }
        curve[key] = v;
      }
      return curve;
    }
    if (easing.type in EASING_PRESETS) return { type: easing.type as EasingPreset };
  }
  throw new Error('easing must be a preset name (e.g. "ease-in") or an object { type, x1?, y1?, x2?, y2? }');
}

function sourceChanged(a: GeneratorSource | undefined, b: GeneratorSource | undefined): boolean {
  return a !== b && JSON.stringify(a) !== JSON.stringify(b);
}

function generatorResult(layerId: LayerId, extra: MCPCommandApplied = {}): MCPCommandApplied {
  return {
    currentFrameIndex: currentFrame(),
    layerId,
    generator: serializeGeneratorSource(getSource(layerId)),
    ...extra,
  };
}

// ============================================================================
// Command implementations
// ============================================================================

function getGeneratorCatalog(): MCPCommandApplied {
  const { width, height } = useCanvasStore.getState();
  const generatorCatalog: GeneratorCatalogEntry[] = getAllGenerators().map((entry) => ({
    type: entry.type,
    name: entry.name,
    description: entry.description,
    mode: entry.mode,
    properties: entry.propertyDefinitions.map((d) => ({
      path: d.path,
      displayName: d.displayName,
      category: d.category,
      valueType: d.valueType,
      defaultValue: d.defaultValue,
      interpolation: d.interpolation,
      min: d.min,
      max: d.max,
      step: d.step,
      unit: d.unit,
      control: d.control,
      options: d.options,
      visibleWhen: d.visibleWhen,
      visibleWhenAll: d.visibleWhenAll,
    })),
    defaultSettings: { ...entry.defaultSettings },
    initialSettings: getGeneratorInitialSettings(entry.type, width, height) ?? {},
  }));
  return { currentFrameIndex: currentFrame(), generatorCatalog };
}

function addGeneratorLayer(cmd: Extract<MCPGeneratorCommand, { type: 'add_generator_layer' }>): MCPCommandApplied {
  const entry = requireGeneratorEntry(cmd.generatorType);
  if (cmd.name !== undefined && (typeof cmd.name !== 'string' || !cmd.name.trim())) {
    throw new Error('name must be a non-empty string');
  }
  const startFrame = cmd.startFrame === undefined ? undefined : validateFrame(cmd.startFrame, 'startFrame');
  const durationFrames = cmd.durationFrames === undefined
    ? undefined
    : validateDuration(cmd.durationFrames, 'durationFrames');
  const settings = cmd.settings === undefined ? undefined : validateSettings(entry, cmd.settings);

  const tl = useTimelineStore.getState();
  const layerId = tl.addGeneratorLayer(entry.type, { startFrame, durationFrames, name: cmd.name });
  if (!layerId) {
    throw new Error(`Could not add a "${entry.type}" generator layer (layer limit reached?)`);
  }
  if (settings && Object.keys(settings).length > 0) {
    useTimelineStore.getState().updateGeneratorSettings(layerId, settings);
  }

  const state = useTimelineStore.getState();
  const insertIndex = state.layers.findIndex((l) => l.id === layerId);
  const layer = state.layers[insertIndex];
  useToolStore.getState().pushToHistory({
    type: 'layer_add',
    timestamp: Date.now(),
    description: `Add ${layer.name} generator`,
    data: { layerId: layerId as string, layerData: structuredClone(layer), insertIndex },
  });

  return generatorResult(layerId, { layer: serializeSnapshotLayer(layer) });
}

function updateGeneratorLayer(cmd: Extract<MCPGeneratorCommand, { type: 'update_generator_layer' }>): MCPCommandApplied {
  const { layer, source, entry } = requireGeneratorLayer(cmd.layerId, cmd.type);
  const layerId = layer.id;
  const settings = cmd.settings === undefined ? undefined : validateSettings(entry, cmd.settings);
  const startFrame = cmd.startFrame === undefined ? undefined : validateFrame(cmd.startFrame, 'startFrame');
  const durationFrames = cmd.durationFrames === undefined
    ? undefined
    : validateDuration(cmd.durationFrames, 'durationFrames');
  if (cmd.enabled !== undefined && typeof cmd.enabled !== 'boolean') {
    throw new Error('enabled must be a boolean');
  }
  if (cmd.shiftKeyframes !== undefined && typeof cmd.shiftKeyframes !== 'boolean') {
    throw new Error('shiftKeyframes must be a boolean');
  }
  if (cmd.name !== undefined && (typeof cmd.name !== 'string' || !cmd.name.trim())) {
    throw new Error('name must be a non-empty string');
  }

  const previousLayer = structuredClone(layer);
  const tl = useTimelineStore.getState();
  if (settings && Object.keys(settings).length > 0) {
    tl.updateGeneratorSettings(layerId, settings);
  }
  if (startFrame !== undefined || durationFrames !== undefined) {
    tl.updateGeneratorTiming(
      layerId,
      startFrame ?? source.startFrame,
      durationFrames ?? source.durationFrames,
      cmd.shiftKeyframes ?? false,
    );
  }
  if (cmd.enabled !== undefined && getSource(layerId).enabled !== cmd.enabled) {
    tl.toggleGeneratorEnabled(layerId);
  }
  const renamed = cmd.name !== undefined && cmd.name !== layer.name;
  if (renamed) {
    tl.renameLayer(layerId, cmd.name!);
  }

  const after = useTimelineStore.getState().layers.find((l) => l.id === layerId)!;
  const changedSource = sourceChanged(previousLayer.generator, after.generator);
  const history = useToolStore.getState();
  if (renamed && changedSource) {
    // A whole-layer swap keeps rename + source edits in a single undo step
    history.pushToHistory({
      type: 'generator_bake',
      timestamp: Date.now(),
      description: `Update ${after.name} generator`,
      data: { layerId: layerId as string, previousLayer, newLayer: structuredClone(after) },
    });
  } else if (renamed) {
    history.pushToHistory({
      type: 'layer_rename',
      timestamp: Date.now(),
      description: `Rename layer to ${after.name}`,
      data: { layerId: layerId as string, oldName: layer.name, newName: after.name },
    });
  } else if (changedSource) {
    history.pushToHistory({
      type: 'generator_update',
      timestamp: Date.now(),
      description: `Update ${after.name} generator`,
      data: {
        layerId: layerId as string,
        previousSource: structuredClone(previousLayer.generator!),
        newSource: structuredClone(after.generator!),
      },
    });
  }

  return generatorResult(layerId);
}

function setGeneratorProperty(cmd: Extract<MCPGeneratorCommand, { type: 'set_generator_property' }>): MCPCommandApplied {
  const { layer, entry } = requireGeneratorLayer(cmd.layerId, cmd.type);
  const layerId = layer.id;
  if (typeof cmd.propertyPath !== 'string' || !settingPaths(entry).has(cmd.propertyPath)) {
    throw unknownPathError(entry, String(cmd.propertyPath), false);
  }
  validateValue(entry, cmd.propertyPath, cmd.value);
  const frame = validateOptionalFrame(cmd.frame, 'frame');
  const isAnimatedText = entry.type === ANIMATED_TEXT_GENERATOR_TYPE;

  withGeneratorHistory(layerId, `Set ${layer.name} ${cmd.propertyPath}`, () => {
    if (isAnimatedText && cmd.propertyPath === 'typewriter.units') {
      convertTypewriterUnits(layerId, cmd.value as 'percent' | 'index', frame);
      return;
    }
    setGeneratorValueAtFrame(layerId, cmd.propertyPath, cmd.value as GeneratorValue, frame);
    if (
      isAnimatedText
      && cmd.propertyPath === 'effect'
      && cmd.value === 'typewriter'
      && cmd.applyEffectDefaults !== false
    ) {
      applyTypewriterDefaultKeyframes(layerId);
    }
  });

  return generatorResult(layerId);
}

function setGeneratorKeyframes(cmd: Extract<MCPGeneratorCommand, { type: 'set_generator_keyframes' }>): MCPCommandApplied {
  const { layer, entry } = requireGeneratorLayer(cmd.layerId, cmd.type);
  const layerId = layer.id;
  if (typeof cmd.propertyPath !== 'string' || !getDefinition(entry, cmd.propertyPath)) {
    throw unknownPathError(entry, String(cmd.propertyPath), true);
  }
  if (!Array.isArray(cmd.keyframes) || cmd.keyframes.length === 0) {
    throw new Error('keyframes must be a non-empty array');
  }
  if (cmd.replace !== undefined && typeof cmd.replace !== 'boolean') {
    throw new Error('replace must be a boolean');
  }
  if (cmd.loop !== undefined && typeof cmd.loop !== 'boolean') {
    throw new Error('loop must be a boolean');
  }
  const keyframes = cmd.keyframes.map((kf, i) => {
    if (!isRecord(kf)) throw new Error(`keyframes[${i}] must be an object`);
    const frame = validateFrame(kf.frame, `keyframes[${i}].frame`);
    validateValue(entry, cmd.propertyPath, kf.value);
    const easing = kf.easing === undefined ? undefined : normalizeEasing(kf.easing);
    return { frame, value: kf.value as GeneratorValue, easing };
  });

  let trackId: EffectPropertyTrackId | null = null;
  const keyframeIdByFrame = new Map<number, KeyframeId>();
  withGeneratorHistory(layerId, `Keyframe ${layer.name} ${cmd.propertyPath}`, () => {
    const tl = useTimelineStore.getState();
    trackId = tl.addGeneratorPropertyTrack(layerId, cmd.propertyPath);
    if (!trackId) throw new Error(`Could not create a track for "${cmd.propertyPath}"`);
    if (cmd.replace) {
      const track = getSource(layerId).propertyTracks.find((pt) => pt.id === trackId);
      for (const kf of track?.keyframes ?? []) {
        tl.removeGeneratorKeyframe(layerId, trackId, kf.id);
      }
    }
    for (const kf of keyframes) {
      const id = tl.addGeneratorKeyframe(layerId, trackId, kf.frame, kf.value);
      if (!id) throw new Error(`Could not add keyframe at frame ${kf.frame}`);
      keyframeIdByFrame.set(kf.frame, id);
      if (kf.easing) {
        tl.updateGeneratorKeyframe(layerId, trackId, id, { easing: kf.easing });
      }
    }
    if (cmd.loop !== undefined) {
      tl.setKeyframeLooping(layerId, trackId as unknown as PropertyTrackId, cmd.loop);
    }
  });

  return generatorResult(layerId, {
    trackId: trackId as unknown as string,
    // Later entries for the same frame replace earlier ones, so report the surviving id
    keyframeIds: keyframes.map((kf) => keyframeIdByFrame.get(kf.frame) as string),
  });
}

function removeGeneratorKeyframes(cmd: Extract<MCPGeneratorCommand, { type: 'remove_generator_keyframes' }>): MCPCommandApplied {
  const { layer, source, entry } = requireGeneratorLayer(cmd.layerId, cmd.type);
  const layerId = layer.id;
  if (typeof cmd.propertyPath !== 'string' || !getDefinition(entry, cmd.propertyPath)) {
    throw unknownPathError(entry, String(cmd.propertyPath), true);
  }
  const track = source.propertyTracks.find((pt) => pt.propertyPath === cmd.propertyPath);
  if (!track) {
    throw new Error(`Generator layer "${layerId}" has no keyframe track for "${cmd.propertyPath}"`);
  }
  const frame = validateOptionalFrame(cmd.frame, 'frame');

  let toRemove = track.keyframes;
  if (!cmd.clearTrack) {
    if (cmd.frames === undefined && cmd.keyframeIds === undefined) {
      throw new Error('remove_generator_keyframes requires frames, keyframeIds, or clearTrack: true');
    }
    if (cmd.frames !== undefined && !Array.isArray(cmd.frames)) throw new Error('frames must be an array');
    if (cmd.keyframeIds !== undefined && !Array.isArray(cmd.keyframeIds)) throw new Error('keyframeIds must be an array');
    const frames = new Set((cmd.frames ?? []).map((f, i) => validateFrame(f, `frames[${i}]`)));
    const ids = new Set(cmd.keyframeIds ?? []);
    toRemove = track.keyframes.filter((kf) => frames.has(kf.frame) || ids.has(kf.id as string));
  }

  withGeneratorHistory(layerId, `Remove ${layer.name} ${cmd.propertyPath} keyframes`, () => {
    const tl = useTimelineStore.getState();
    if (toRemove.length === track.keyframes.length) {
      // Removing the track bakes the value at `frame` into the static setting
      tl.removeGeneratorPropertyTrack(layerId, track.id, frame);
      return;
    }
    for (const kf of toRemove) {
      tl.removeGeneratorKeyframe(layerId, track.id, kf.id);
    }
  });

  return generatorResult(layerId);
}

function resetGenerator(cmd: Extract<MCPGeneratorCommand, { type: 'reset_generator' }>): MCPCommandApplied {
  const { layer } = requireGeneratorLayer(cmd.layerId, cmd.type);
  withGeneratorHistory(layer.id, `Reset ${layer.name}`, () => {
    useTimelineStore.getState().resetGeneratorSettings(layer.id);
  });
  return generatorResult(layer.id);
}

function randomizeGeneratorSeed(cmd: Extract<MCPGeneratorCommand, { type: 'randomize_generator_seed' }>): MCPCommandApplied {
  const { layer, entry } = requireGeneratorLayer(cmd.layerId, cmd.type);
  if (!getDefinition(entry, 'seed') && !('seed' in entry.defaultSettings)) {
    throw new Error(`Generator "${entry.type}" has no seed`);
  }
  const frame = validateOptionalFrame(cmd.frame, 'frame');
  withGeneratorHistory(layer.id, `Randomize ${layer.name} seed`, () => {
    useTimelineStore.getState().randomizeGeneratorSeed(layer.id, frame);
  });
  return generatorResult(layer.id);
}

function getGeneratorState(cmd: Extract<MCPGeneratorCommand, { type: 'get_generator_state' }>): MCPCommandApplied {
  const { layer, source } = requireGeneratorLayer(cmd.layerId, cmd.type);
  const frame = validateOptionalFrame(cmd.frame, 'frame');
  return generatorResult(layer.id, { resolvedSettings: resolveGeneratorSettings(source, frame) });
}

function renderGeneratorFrames(cmd: Extract<MCPGeneratorCommand, { type: 'render_generator_frames' }>): MCPCommandApplied {
  const { layer, source } = requireGeneratorLayer(cmd.layerId, cmd.type);
  if (!Array.isArray(cmd.frames) || cmd.frames.length === 0) {
    throw new Error('frames must be a non-empty array');
  }
  if (cmd.frames.length > MAX_RENDER_GENERATOR_FRAMES) {
    throw new Error(`render_generator_frames accepts at most ${MAX_RENDER_GENERATOR_FRAMES} frames`);
  }
  const frames = cmd.frames.map((f, i) => validateFrame(f, `frames[${i}]`));
  const { width, height } = useCanvasStore.getState();

  const generatorFrames: GeneratorRenderedFrame[] = frames.map((frame) => {
    const cells = renderGeneratorFrame(source, frame, width, height);
    const rows = Array.from({ length: height }, () => Array<string>(width).fill(' '));
    const cellList: NonNullable<GeneratorRenderedFrame['cells']> = [];
    cells.forEach((cell, key) => {
      const [x, y] = key.split(',').map(Number);
      if (x >= 0 && x < width && y >= 0 && y < height) {
        rows[y][x] = cell.char || ' ';
      }
      if (cmd.includeCells) {
        cellList.push({ x, y, char: cell.char, color: cell.color, bgColor: cell.bgColor });
      }
    });
    return {
      frame,
      inRange: isFrameInGeneratorRange(source, frame),
      text: rows.map((row) => row.join('')),
      cellCount: cells.size,
      ...(cmd.includeCells ? { cells: cellList } : {}),
    };
  });

  return generatorResult(layer.id, { generatorFrames });
}

function bakeGeneratorLayer(cmd: Extract<MCPGeneratorCommand, { type: 'bake_generator_layer' }>): MCPCommandApplied {
  const { layer } = requireGeneratorLayer(cmd.layerId, cmd.type);
  bakeGeneratorLayerWithHistory(layer.id);
  const after = useTimelineStore.getState().layers.find((l) => l.id === layer.id);
  if (!after || after.generator) {
    throw new Error(`Failed to bake generator layer "${layer.id}"`);
  }
  return {
    currentFrameIndex: currentFrame(),
    layerId: layer.id,
    layer: serializeSnapshotLayer(after),
  };
}

export function executeGeneratorCommand(command: MCPGeneratorCommand): MCPCommandApplied {
  switch (command.type) {
    case 'get_generator_catalog':
      return getGeneratorCatalog();
    case 'add_generator_layer':
      return addGeneratorLayer(command);
    case 'update_generator_layer':
      return updateGeneratorLayer(command);
    case 'set_generator_property':
      return setGeneratorProperty(command);
    case 'set_generator_keyframes':
      return setGeneratorKeyframes(command);
    case 'remove_generator_keyframes':
      return removeGeneratorKeyframes(command);
    case 'reset_generator':
      return resetGenerator(command);
    case 'randomize_generator_seed':
      return randomizeGeneratorSeed(command);
    case 'get_generator_state':
      return getGeneratorState(command);
    case 'render_generator_frames':
      return renderGeneratorFrames(command);
    case 'bake_generator_layer':
      return bakeGeneratorLayer(command);
  }
}
