/** Media import (image/video → ASCII) and the image-trace overlay. */
import { DEFAULT_IMPORT_SETTINGS, type ImportSettings } from '../../../stores/importStore';
import { usePaletteStore } from '../../../stores/paletteStore';
import { useCharacterPaletteStore } from '../../../stores/characterPaletteStore';
import { useToolStore } from '../../../stores/toolStore';
import { useImageTraceStore } from '../../../stores/imageTraceStore';
// Loaded lazily: the media pipeline allocates a canvas context at module load.
const loadMediaPipeline = () => import('../../../utils/mediaImportPipeline');
const loadTraceProcessor = () => import('../../../utils/imageTraceProcessor');
import { BridgeError, invalid } from '../errors';
import type { OperationHandler } from '../runtime';
import { getTypographyState } from '../state';
import { canvas, isEmptyCell, putCell, resolveTarget, targetResult, tl, writeContentFrame, type TargetInput } from './common';

export function base64ToFile(data: string, mimeType: string, filename: string): File {
  let binary: string;
  try {
    binary = atob(data.replace(/^data:[^,]*,/, ''));
  } catch {
    throw invalid('data must be base64-encoded file bytes');
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mimeType });
}

/**
 * Import settings keys the conversion pipeline actually reads. Other ImportSettings
 * keys (characterMappingMode, customCharacterMapping, maintainAspectRatio,
 * colorMappingMode, frameExtraction, frameInterval, maxFrames) have no effect
 * in the app, so the bridge rejects them instead of ignoring them.
 */
const IMPORT_SETTING_KEYS = [
  'characterWidth', 'characterHeight', 'cropMode', 'nudgeX', 'nudgeY',
  'characterSet', 'enableCharacterMapping', 'characterMappingStyle',
  'autoModeCharacterSet', 'autoModeSamplingQuality', 'autoModeGlobalContrast', 'autoModeDirectionalContrast',
  'lineArtBlurRadius', 'lineArtEdgeThreshold', 'lineArtDilateRadius', 'lineArtErodeRadius', 'lineArtSdfBlurRadius', 'lineArtInverseMatchWeight',
  'enableTextColorMapping', 'textColorPaletteId', 'textColorMappingMode', 'textColorDitherStrength',
  'enableBackgroundColorMapping', 'backgroundColorPaletteId', 'backgroundColorMappingMode', 'backgroundColorDitherStrength',
  'useOriginalColors', 'colorQuantization', 'paletteSize',
  'brightness', 'contrast', 'highlights', 'shadows', 'midtones', 'blur', 'sharpen', 'saturation',
  'enableColorAsAlpha', 'colorAsAlphaKey', 'colorAsAlphaTolerance',
] as const satisfies ReadonlyArray<keyof ImportSettings>;

const COLOR_MAPPING_MODES = ['closest', 'noise-dither', 'bayer2x2', 'bayer4x4', 'by-index'];
const IMPORT_SETTING_ENUMS: Record<string, readonly string[]> = {
  cropMode: ['center', 'top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
  characterMappingStyle: ['character-palette', 'auto-mode', 'line-art'],
  autoModeCharacterSet: ['basic-ascii', 'block-characters', 'braille'],
  autoModeSamplingQuality: ['low', 'medium', 'high'],
  textColorMappingMode: COLOR_MAPPING_MODES,
  backgroundColorMappingMode: COLOR_MAPPING_MODES,
  colorQuantization: ['none', 'basic', 'advanced'],
};

/** Catalog entry for get_catalog tools.importSettings. */
export function importSettingsCatalog(): Record<string, unknown> {
  const activePaletteId = usePaletteStore.getState().activePaletteId ?? null;
  const defaults: Record<string, unknown> = {};
  for (const key of IMPORT_SETTING_KEYS) defaults[key] = DEFAULT_IMPORT_SETTINGS[key];
  Object.assign(defaults, {
    textColorPaletteId: activePaletteId,
    backgroundColorPaletteId: activePaletteId,
    characterSet: [...useCharacterPaletteStore.getState().activePalette.characters],
  });
  return {
    defaults,
    enums: IMPORT_SETTING_ENUMS,
    notes: {
      characterSet: 'Characters ordered light to dark (index 0 = lightest). Defaults to the active character palette.',
      textColorPaletteId: 'null with useOriginalColors and colorQuantization "none" keeps exact source colors; a palette id maps to that palette.',
      backgroundColorPaletteId: 'Backgrounds are palette-mapped only; with enableBackgroundColorMapping false cells have no background.',
      nudgeX: 'Placement offset in cells from the cropMode anchor (nudgeY likewise).',
    },
  };
}

function resolveImportSettings(input: Record<string, unknown>): { settings: ImportSettings; characterSet?: string[] } {
  const overrides = (input.settings as Record<string, unknown> | undefined) ?? {};
  const allowed = new Set<string>(IMPORT_SETTING_KEYS);
  const unknownKeys = Object.keys(overrides).filter((k) => !allowed.has(k));
  if (unknownKeys.length) throw invalid(`Unsupported import settings: ${unknownKeys.join(', ')}`, { allowed: [...IMPORT_SETTING_KEYS] });
  for (const [key, values] of Object.entries(IMPORT_SETTING_ENUMS)) {
    if (key in overrides && !values.includes(overrides[key] as string)) throw invalid(`${key} must be one of: ${values.join(', ')}`);
  }
  let characterSet: string[] | undefined;
  if ('characterSet' in overrides) {
    const raw = overrides.characterSet;
    if (!Array.isArray(raw) || raw.length === 0 || raw.some((c) => typeof c !== 'string' || [...c].length !== 1)) {
      throw invalid('characterSet must be a non-empty array of single characters ordered light to dark');
    }
    characterSet = raw as string[];
  }
  for (const key of ['textColorPaletteId', 'backgroundColorPaletteId'] as const) {
    const id = overrides[key];
    if (typeof id === 'string' && !usePaletteStore.getState().getAllPalettes().some((p) => p.id === id)) {
      throw new BridgeError('NOT_FOUND', `Unknown color palette: ${id}`);
    }
  }
  const { width, height } = canvas();
  const activePaletteId = usePaletteStore.getState().activePaletteId;
  const settings = {
    ...DEFAULT_IMPORT_SETTINGS,
    textColorPaletteId: activePaletteId,
    backgroundColorPaletteId: activePaletteId,
    characterWidth: (input.width as number | undefined) ?? width,
    characterHeight: (input.height as number | undefined) ?? height,
    ...overrides,
  } as ImportSettings;
  return { settings, characterSet };
}

function mediaError(error: unknown): BridgeError {
  if (error instanceof BridgeError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (/unsupported|invalid|too large/i.test(message)) return invalid(message);
  return new BridgeError('UI_NOT_READY', `Media decoding failed in the browser: ${message}`);
}

export const mediaHandlers: Record<string, OperationHandler> = {
  import_media: async (input) => {
    const filename = (input.filename as string | undefined) ?? 'import';
    if (!/^(image|video)\//i.test(input.mimeType as string)) throw invalid(`Unsupported media type: ${String(input.mimeType)} (expected image/* or video/*)`);
    const mode = (input.mode as string | undefined) ?? 'new_layer';
    if (mode === 'overlay' && !/^image\//i.test(input.mimeType as string)) throw invalid('overlay mode imports a single image; use mode "new_layer" for video');
    const file = base64ToFile(input.data as string, input.mimeType as string, filename);
    const { settings, characterSet } = resolveImportSettings(input);
    const video = input.video as { startTime?: number; duration?: number; frameRate?: number; maxFrames?: number } | undefined;
    if (video && !/^video\//i.test(input.mimeType as string)) throw invalid('video options only apply to video/* media');
    const palettes = usePaletteStore.getState();
    const chars = useCharacterPaletteStore.getState();
    const characterPalette = characterSet
      ? { id: 'mcp-import-charset', name: 'Import character set', characters: characterSet, isPreset: false, isCustom: true, category: 'custom' as const }
      : chars.activePalette;
    const { convertMediaToCells } = await loadMediaPipeline().catch((error: unknown) => { throw mediaError(error); });
    let converted: Awaited<ReturnType<typeof convertMediaToCells>>;
    try {
      converted = await convertMediaToCells(file, settings, {
        palettes: palettes.getAllPalettes(),
        characterPalette,
        mappingMethod: chars.mappingMethod,
        mappingMode: chars.mappingMode,
        invertDensity: chars.invertDensity,
        ditherStrength: chars.ditherStrength,
        defaultTextColor: useToolStore.getState().selectedColor,
      }, { width: canvas().width, height: canvas().height }, video);
    } catch (error) {
      throw mediaError(error);
    }
    if (converted.frames.length === 0) throw invalid('Media produced no frames');

    if (mode === 'overlay' && converted.type !== 'image') throw invalid('overlay mode imports a single image; use mode "new_layer" for video');
    if (mode === 'replace' || mode === 'overlay') {
      if (converted.frames.length > 1) throw invalid(`${mode} mode imports a single image; use mode "new_layer" for video/animated media`);
      const target = resolveTarget(input.target as TargetInput);
      const next = mode === 'overlay' || settings.enableColorAsAlpha ? new Map(target.contentFrame.data) : new Map();
      converted.frames[0].data.forEach((cell, key) => {
        if (mode === 'overlay' && isEmptyCell(cell)) return;
        const [x, y] = key.split(',').map(Number);
        putCell(next, x, y, cell);
      });
      writeContentFrame(target, next);
      return targetResult(target, { mode, frameCount: 1, cellCount: next.size, mediaType: converted.type });
    }

    if (input.target) throw invalid('target only applies to mode "replace" or "overlay"');
    const timeline = tl();
    const fps = converted.metadata?.frameRate;
    if (input.matchFrameRate && converted.type === 'video' && fps && Math.round(fps) !== timeline.config.frameRate) {
      timeline.setFrameRate(Math.round(fps), false);
    }
    const layerName = filename.replace(/\.[^.]+$/, '') || 'Imported Media';
    const layerId = tl().addLayer(layerName);
    if (!layerId) throw new BridgeError('LIMIT_REACHED', 'Cannot add layer — layer limit reached');
    const created = tl().layers.find((l) => l.id === layerId);
    created?.contentFrames.forEach((cf) => tl().removeContentFrame(layerId, cf.id));
    const projectFps = tl().config.frameRate;
    let start = 0;
    const contentFrameIds: string[] = [];
    converted.frames.forEach((frame) => {
      const duration = Math.max(1, Math.round(frame.durationMs / (1000 / projectFps)));
      const id = tl().addContentFrame(layerId, start, duration, frame.data);
      if (id) contentFrameIds.push(id as string);
      start += duration;
    });
    if (start > tl().config.durationFrames) tl().setDuration(start);
    tl().setActiveLayer(layerId);
    tl().goToFrame(0);
    return {
      mode,
      layerId: layerId as string,
      contentFrameIds,
      frameCount: converted.frames.length,
      durationFrames: start,
      frameRate: tl().config.frameRate,
      mediaType: converted.type,
      ...(converted.type === 'video' && { sampleFrameRate: fps, sourceDuration: converted.metadata?.duration }),
    };
  },

  set_image_trace: async (input) => {
    const store = useImageTraceStore.getState();
    if (input.clear) {
      if (input.data !== undefined) throw invalid('Pass either clear or data, not both');
      store.clearSource();
    }
    if (input.data !== undefined) {
      const file = base64ToFile(input.data as string, (input.mimeType as string | undefined) ?? '', (input.filename as string | undefined) ?? 'trace');
      const { classifyTraceFile, processTraceImage, processTraceVideo } = await loadTraceProcessor().catch((error: unknown) => { throw mediaError(error); });
      const type = classifyTraceFile(file);
      if (!type) throw invalid('Unsupported trace file format');
      useImageTraceStore.setState({ source: null, enabled: false, isLoading: true, loadError: null, frameOffset: 0, position: { x: 0, y: 0 }, scale: 1 });
      try {
        const source = type === 'image' ? await processTraceImage(file) : await processTraceVideo(file);
        useImageTraceStore.getState().setSource(source);
      } catch (error) {
        useImageTraceStore.getState().setLoadError(error instanceof Error ? error.message : String(error));
        throw mediaError(error);
      }
      if (input.fitToCanvas !== false) input = { ...input, fitToCanvas: true };
    }
    const s = useImageTraceStore.getState();
    if (input.enabled !== undefined) {
      if (input.enabled && !s.source) throw new BridgeError('NOT_FOUND', 'No trace source loaded; pass data first');
      s.setEnabled(input.enabled as boolean);
    }
    if (input.opacity !== undefined) s.setOpacity(input.opacity as number);
    if (input.renderOrder !== undefined) s.setRenderOrder(input.renderOrder as 'behind' | 'inFront');
    if (input.frameOffset !== undefined) s.setFrameOffset(input.frameOffset as number);
    if (input.scale !== undefined) s.setScale(input.scale as number);
    if (input.fitToCanvas) {
      if (!s.source) throw new BridgeError('NOT_FOUND', 'No trace source loaded');
      const t = getTypographyState();
      const { width, height } = canvas();
      s.fitToCanvas(width * t.fontSize * 0.6 * t.characterSpacing, height * t.fontSize * t.lineSpacing);
    }
    if (input.position !== undefined) {
      const p = input.position as { x: number; y: number };
      s.setPosition(p.x, p.y);
    }
    const out = useImageTraceStore.getState();
    return {
      loaded: !!out.source,
      sourceType: out.source?.type ?? null,
      name: out.source?.name ?? null,
      enabled: out.enabled,
      opacity: out.opacity,
      renderOrder: out.renderOrder,
      frameOffset: out.frameOffset,
      position: out.position,
      scale: out.scale,
    };
  },
};
