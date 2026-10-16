/** Native document reads, scoped projections, catalogs and capabilities. */
import { importSettingsCatalog } from './media';
import {
  BRIDGE_CONTRACT_VERSION,
  BRIDGE_PROTOCOL,
  BRIDGE_PROTOCOL_VERSION,
  BRIDGE_OPERATIONS,
} from '../../contract/operations';
import { BRIDGE_CONTRACT_HASH } from '../../contract/contractHash.generated';
import { ExportDataCollector } from '../../../utils/exportDataCollector';
import { buildSessionDocument } from '../../../utils/sessionDocument';
import { compositeLayersAtFrame, getContentFrameAtTime, getLayerSourceCellsAtFrame } from '../../../utils/layerCompositing';
import { useCanvasStore } from '../../../stores/canvasStore';
import { useProjectMetadataStore } from '../../../stores/projectMetadataStore';
import { useSelectionStore } from '../../../stores/selectionStore';
import { useToolStore } from '../../../stores/toolStore';
import { usePaletteStore } from '../../../stores/paletteStore';
import { useCharacterPaletteStore } from '../../../stores/characterPaletteStore';
import { DEFAULT_EXPORT_SETTINGS } from '../../../stores/exportStore';
import { getAllEffects } from '../../../registry/effectRegistry';
import { getAllPostEffects } from '../../../registry/postEffectRegistry';
import { executeGeneratorCommand } from '../../generatorCommands';
import { MONOSPACE_FONTS } from '../../../constants/fonts';
import { FIGLET_FONTS_BY_CATEGORY } from '../../../constants/figletFonts';
import { BOX_DRAWING_STYLES } from '../../../constants/boxDrawingStyles';
import type { Cell } from '../../../types';
import type { Layer } from '../../../types/timeline';
import { BridgeError, invalid } from '../errors';
import { getDocumentIdentity, getRegisteredOperationNames, type OperationHandler } from '../runtime';
import { getTypographyState } from '../state';
import { getCloudBridgeStatus } from '../cloudBridge';
import { canvas, requireContentFrame, requireLayer, tl } from './common';

const SELECTION_CELL_LIMIT = 2000;

export const TOOL_NAMES = [
  'pencil', 'eraser', 'paintbucket', 'select', 'lasso', 'magicwand', 'rectangle', 'ellipse', 'eyedropper', 'line',
  'text', 'asciitype', 'asciibox', 'brush', 'beziershape', 'gradientfill', 'fliphorizontal', 'flipvertical', 'layertransform',
] as const;

// ── Document ────────────────────────────────────────────────────────────────

export function readNativeDocument(): Record<string, unknown> {
  return buildSessionDocument(ExportDataCollector.collect({ compositeFrames: false }), { includeMetadata: true });
}

const getDocument: OperationHandler = () => {
  const { documentId, revision } = getDocumentIdentity();
  return { document: readNativeDocument(), documentId, revision };
};

function animatedPaths(tracks: Array<{ propertyPath: string; keyframes: unknown[] }> | undefined): string[] | undefined {
  const paths = (tracks ?? []).filter((t) => t.keyframes.length > 0).map((t) => t.propertyPath);
  return paths.length ? paths : undefined;
}

function compact<T extends Record<string, unknown>>(value: T): T {
  for (const key of Object.keys(value)) if (value[key] === undefined) delete value[key];
  return value;
}

export function selectionBounds(): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const sel = useSelectionStore.getState();
  if (!sel.isActive || sel.selectedCells.size === 0) return null;
  const b = sel.getBounds();
  return b ? { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY } : null;
}

export function buildDocumentSummary(): Record<string, unknown> {
  const t = tl();
  const c = useCanvasStore.getState();
  const meta = useProjectMetadataStore.getState();
  const tools = useToolStore.getState();
  const sel = useSelectionStore.getState();
  const { documentId, revision } = getDocumentIdentity();
  const effectSummary = (track: Layer['effectTracks'][number], owner: Record<string, unknown>) => compact({
    blockId: track.effectBlock.id as string,
    effectType: track.effectBlock.effectType,
    owner,
    startFrame: track.effectBlock.startFrame,
    durationFrames: track.effectBlock.durationFrames,
    enabled: track.effectBlock.enabled,
    animatedProperties: animatedPaths(track.effectBlock.propertyTracks),
  });
  return compact({
    documentId,
    revision,
    name: meta.projectName,
    description: meta.projectDescription || undefined,
    cloudProjectId: meta.currentProjectId ?? undefined,
    canvas: { width: c.width, height: c.height, backgroundColor: c.canvasBackgroundColor },
    typography: getTypographyState(),
    timeline: {
      frameRate: t.config.frameRate,
      durationFrames: t.config.durationFrames,
      currentFrame: t.view.currentFrame,
      workArea: { enabled: t.view.workAreaEnabled, start: t.view.workAreaStart, end: t.view.workAreaEnd },
      isPlaying: t.view.isPlaying,
      looping: t.view.looping,
    },
    activeLayerId: (t.view.activeLayerId as string | null) ?? null,
    layers: t.layers.map((layer, index) => compact({
      id: layer.id as string,
      name: layer.name,
      kind: layer.kind === 'generator' ? 'generator' : 'content',
      index,
      visible: layer.visible,
      locked: layer.locked,
      solo: layer.solo,
      opacity: layer.opacity,
      parentGroupId: (layer.parentGroupId as string | undefined) ?? null,
      generatorType: layer.generator?.generatorType,
      contentFrames: layer.contentFrames.map((cf) => compact({
        id: cf.id as string,
        name: cf.name || undefined,
        startFrame: cf.startFrame,
        durationFrames: cf.durationFrames,
        cellCount: cf.data.size,
        hidden: cf.hidden || undefined,
      })),
      effectBlockIds: layer.effectTracks.map((et) => et.effectBlock.id as string),
      animatedProperties: animatedPaths([...layer.propertyTracks, ...(layer.generator?.propertyTracks ?? [])]),
    })),
    groups: t.layerGroups.map((g) => ({
      id: g.id as string,
      name: g.name,
      childLayerIds: g.childLayerIds.map(String),
      effectBlockIds: (g.effectTracks ?? []).map((et) => et.effectBlock.id as string),
      visible: g.visible,
      locked: g.locked,
      collapsed: g.collapsed,
    })),
    effects: [
      ...t.layers.flatMap((l) => l.effectTracks.map((et) => effectSummary(et, { layerId: l.id as string }))),
      ...t.layerGroups.flatMap((g) => (g.effectTracks ?? []).map((et) => effectSummary(et, { groupId: g.id as string }))),
      ...t.globalEffects.map((et) => effectSummary(et, { global: true })),
    ],
    shaders: t.postEffectTracks.map((pt, index) => compact({
      blockId: pt.effectBlock.id as string,
      shaderType: pt.effectBlock.postEffectType,
      index,
      startFrame: pt.effectBlock.startFrame,
      durationFrames: pt.effectBlock.durationFrames,
      enabled: pt.effectBlock.enabled,
      animatedProperties: animatedPaths(pt.effectBlock.propertyTracks),
    })),
    selection: { active: sel.isActive && sel.selectedCells.size > 0, count: sel.selectedCells.size, bounds: selectionBounds() },
    history: { canUndo: tools.canUndo(), canRedo: tools.canRedo() },
  });
}

// ── read_cells ──────────────────────────────────────────────────────────────

function stripEffects(layers: Layer[]): Layer[] {
  return layers.map((l) => ({ ...l, effectTracks: [] }));
}

const readCells: OperationHandler = (input) => {
  const t = tl();
  const { width, height } = canvas();
  const scope = (input.scope as string) ?? 'composite';
  const format = (input.format as string) ?? 'text';
  const includeEffects = input.includeEffects !== false;
  let frame = (input.frame as number | undefined) ?? t.view.currentFrame;
  let data: Map<string, Cell>;
  let layerId: string | undefined;
  let contentFrameId: string | undefined;

  if (scope === 'composite') {
    if (input.layerId || input.contentFrameId) throw invalid('layerId/contentFrameId require scope "layer"');
    if (frame >= t.config.durationFrames) throw new BridgeError('OUT_OF_RANGE', `frame ${frame} is outside the timeline (0-${t.config.durationFrames - 1})`);
    const layers = includeEffects ? t.layers : stripEffects(t.layers);
    const groups = includeEffects ? t.layerGroups : t.layerGroups.map((g) => ({ ...g, effectTracks: [] }));
    data = compositeLayersAtFrame(layers, frame, width, height, undefined, true, groups, includeEffects ? t.globalEffects : undefined);
  } else {
    const layer = requireLayer(input.layerId as string | undefined);
    layerId = layer.id as string;
    if (input.contentFrameId) {
      const cf = requireContentFrame(layer, input.contentFrameId as string);
      contentFrameId = cf.id as string;
      frame = cf.startFrame;
      data = cf.data;
    } else if (layer.kind === 'generator') {
      data = getLayerSourceCellsAtFrame(layer, frame, width, height) ?? new Map();
    } else {
      const cf = getContentFrameAtTime(layer, frame);
      if (!cf) throw new BridgeError('NOT_FOUND', `Layer ${layerId} has no content frame at frame ${frame}`, { layerId, frame });
      contentFrameId = cf.id as string;
      data = cf.data;
    }
  }

  const region = (input.region as { x: number; y: number; width: number; height: number } | undefined)
    ?? { x: 0, y: 0, width, height };
  if (region.width * region.height > 40000) throw new BridgeError('LIMIT_REACHED', 'region too large (max 40000 cells)');
  const cells: Array<{ x: number; y: number; char: string; color: string; bgColor: string }> = [];
  const text: string[] = [];
  for (let y = region.y; y < region.y + region.height; y += 1) {
    let row = '';
    for (let x = region.x; x < region.x + region.width; x += 1) {
      const cell = data.get(`${x},${y}`);
      const visible = cell && cell.char && cell.char !== ' ';
      const painted = cell && (visible || (cell.bgColor && cell.bgColor !== 'transparent'));
      row += visible ? cell.char : ' ';
      if (painted && format === 'cells') {
        cells.push({ x, y, char: cell.char, color: cell.color, bgColor: cell.bgColor ?? 'transparent' });
      }
    }
    text.push(row);
  }
  let cellCount = 0;
  data.forEach((cell, key) => {
    const [x, y] = key.split(',').map(Number);
    if (x >= region.x && x < region.x + region.width && y >= region.y && y < region.y + region.height
      && ((cell.char && cell.char !== ' ') || (cell.bgColor && cell.bgColor !== 'transparent'))) cellCount += 1;
  });
  return compact({
    scope,
    frame,
    region,
    format,
    cellCount,
    layerId,
    contentFrameId,
    ...(format === 'text' ? { text } : { cells }),
  });
};

// ── selection/history reads ─────────────────────────────────────────────────

export function readSelection(): Record<string, unknown> {
  const sel = useSelectionStore.getState();
  const active = sel.isActive && sel.selectedCells.size > 0;
  const count = active ? sel.selectedCells.size : 0;
  const clipboard = sel.getClipboard();
  const clipboardBounds = clipboard?.bounds;
  return compact({
    active,
    count,
    bounds: active ? selectionBounds() : null,
    cells: active && count <= SELECTION_CELL_LIMIT
      ? [...sel.selectedCells].map((k) => { const [x, y] = k.split(',').map(Number); return { x, y }; })
      : undefined,
    truncated: count > SELECTION_CELL_LIMIT,
    moving: sel.hasActiveMove(),
    clipboard: {
      available: !!clipboard && clipboard.data.size > 0,
      cellCount: clipboard?.data.size ?? 0,
      bounds: clipboardBounds ? { minX: clipboardBounds.minX, minY: clipboardBounds.minY, maxX: clipboardBounds.maxX, maxY: clipboardBounds.maxY } : null,
    },
  });
}

export function readHistory(): Record<string, unknown> {
  const { historyStack, historyPosition } = useToolStore.getState();
  const start = Math.max(0, historyStack.length - 50);
  return {
    position: historyPosition,
    length: historyStack.length,
    canUndo: historyPosition >= 0,
    canRedo: historyPosition < historyStack.length - 1,
    undoDescription: historyPosition >= 0 ? historyStack[historyPosition].description : null,
    redoDescription: historyPosition < historyStack.length - 1 ? historyStack[historyPosition + 1].description : null,
    entries: historyStack.slice(start).map((entry, i) => ({
      index: start + i,
      type: entry.type,
      description: entry.description,
      timestamp: entry.timestamp,
      applied: start + i <= historyPosition,
    })),
  };
}

// ── catalogs ────────────────────────────────────────────────────────────────

type PropertyLike = Record<string, unknown> & { path?: string; propertyPath?: string; valueType?: string };

function propertyDefs(defs: PropertyLike[] | undefined): Record<string, unknown>[] {
  return (defs ?? []).map((d) => {
    const { path, propertyPath, ...rest } = d;
    const out: Record<string, unknown> = { path: path ?? propertyPath, valueType: d.valueType ?? typeof d.defaultValue };
    for (const key of ['displayName', 'category', 'defaultValue', 'min', 'max', 'step', 'unit', 'interpolation', 'control', 'options', 'animatable']) {
      if (rest[key] !== undefined && typeof rest[key] !== 'function') out[key] = rest[key];
    }
    if (Array.isArray(out.options)) {
      out.options = (out.options as Array<Record<string, unknown> | string | number>).map((o) => (typeof o === 'object' ? compact({ value: o.value, label: o.label as string | undefined }) : { value: o }));
    }
    return out;
  });
}

type ExportFormat = (typeof import('../../contract/operations').exportFormatNames)[number];
interface FormatInfo { label: string; mimeType: string; extension: string; category: 'image' | 'video' | 'text' | 'code' | 'session'; binary: boolean; animated: boolean; browserOnly: boolean; options: Record<string, unknown> }

const ALL_FRAMES = 'all' as const;
// Options no exporter reads are left out so the bridge rejects them: svg outlineFont, json includeEmptyCells, html loops.
const { outlineFont: _outlineFont, ...svgDefaults } = DEFAULT_EXPORT_SETTINGS.svg;
const { sizeMultiplier, includeGrid, quality: jpgQuality } = DEFAULT_EXPORT_SETTINGS.image;
const { sizeMultiplier: videoSize, frameRate: videoRate, includeGrid: videoGrid, loops: videoLoops, quality: webmQuality, crf } = DEFAULT_EXPORT_SETTINGS.video;
const { includeEmptyCells: _emptyCells, ...jsonDefaults } = DEFAULT_EXPORT_SETTINGS.json;
const { loops: _htmlLoops, ...htmlDefaults } = DEFAULT_EXPORT_SETTINGS.html;

/**
 * Accepted options per bridge export format: only settings the app's exporters read.
 * `frame` (single-frame formats) and `frameRange` (animated formats) are applied by the
 * bridge before rendering; `frameRange` is `"all"` or inclusive `{ start, end }` with end -1 = last frame.
 */
export const EXPORT_FORMATS: Record<ExportFormat, FormatInfo> = {
  png: { label: 'PNG image', mimeType: 'image/png', extension: 'png', category: 'image', binary: true, animated: false, browserOnly: true, options: { sizeMultiplier, includeGrid, includePostEffects: true, frame: 'current' } },
  jpg: { label: 'JPEG image', mimeType: 'image/jpeg', extension: 'jpg', category: 'image', binary: true, animated: false, browserOnly: true, options: { sizeMultiplier, includeGrid, quality: jpgQuality, includePostEffects: true, frame: 'current' } },
  svg: { label: 'SVG image', mimeType: 'image/svg+xml', extension: 'svg', category: 'image', binary: false, animated: false, browserOnly: true, options: { ...svgDefaults, frame: 'current' } },
  webm: { label: 'WebM video', mimeType: 'video/webm', extension: 'webm', category: 'video', binary: true, animated: true, browserOnly: true, options: { sizeMultiplier: videoSize, frameRate: videoRate, quality: webmQuality, includeGrid: videoGrid, loops: videoLoops, includePostEffects: true, frameRange: ALL_FRAMES } },
  mp4: { label: 'MP4 video (H.264)', mimeType: 'video/mp4', extension: 'mp4', category: 'video', binary: true, animated: true, browserOnly: true, options: { sizeMultiplier: videoSize, frameRate: videoRate, crf, includeGrid: videoGrid, loops: videoLoops, includePostEffects: true, frameRange: ALL_FRAMES } },
  image_sequence: { label: 'PNG/JPG/SVG image sequence (zip)', mimeType: 'application/zip', extension: 'zip', category: 'image', binary: true, animated: true, browserOnly: true, options: { format: 'png', sizeMultiplier, includeGrid, quality: jpgQuality, svgSettings: svgDefaults, includePostEffects: true, sequenceRange: ALL_FRAMES } },
  session: { label: 'Ascii Motion project (.asciimtn)', mimeType: 'application/json', extension: 'asciimtn', category: 'session', binary: false, animated: true, browserOnly: false, options: { ...DEFAULT_EXPORT_SETTINGS.session } },
  text: { label: 'Plain text', mimeType: 'text/plain', extension: 'txt', category: 'text', binary: false, animated: true, browserOnly: false, options: { ...DEFAULT_EXPORT_SETTINGS.text, frameRange: ALL_FRAMES } },
  json: { label: 'JSON frames', mimeType: 'application/json', extension: 'json', category: 'text', binary: false, animated: true, browserOnly: false, options: { ...jsonDefaults, frameRange: ALL_FRAMES } },
  ansi: { label: 'ANSI terminal', mimeType: 'text/plain', extension: 'ans', category: 'text', binary: false, animated: true, browserOnly: false, options: { ...DEFAULT_EXPORT_SETTINGS.ansi, frameRange: ALL_FRAMES } },
  html: { label: 'Animated HTML', mimeType: 'text/html', extension: 'html', category: 'code', binary: false, animated: true, browserOnly: false, options: { ...htmlDefaults, includePostEffects: true, frameRange: ALL_FRAMES } },
  react: { label: 'React component', mimeType: 'text/plain', extension: 'tsx', category: 'code', binary: false, animated: true, browserOnly: false, options: { ...DEFAULT_EXPORT_SETTINGS.react, includePostEffects: true, frameRange: ALL_FRAMES } },
  ink: { label: 'Ink (React CLI) component', mimeType: 'text/plain', extension: 'tsx', category: 'code', binary: false, animated: true, browserOnly: false, options: { ...DEFAULT_EXPORT_SETTINGS.ink, frameRange: ALL_FRAMES } },
  opentui: { label: 'OpenTUI component', mimeType: 'text/plain', extension: 'tsx', category: 'code', binary: false, animated: true, browserOnly: false, options: { ...DEFAULT_EXPORT_SETTINGS.opentui, frameRange: ALL_FRAMES } },
  bubbletea: { label: 'Bubble Tea (Go) program', mimeType: 'text/plain', extension: 'go', category: 'code', binary: false, animated: true, browserOnly: false, options: { ...DEFAULT_EXPORT_SETTINGS.bubbletea, frameRange: ALL_FRAMES } },
};

function paletteCatalog(): Record<string, unknown> {
  const color = usePaletteStore.getState();
  const chars = useCharacterPaletteStore.getState();
  return {
    family: 'palettes',
    activeColorPaletteId: color.activePaletteId ?? null,
    activeCharacterPaletteId: chars.activePalette?.id ?? null,
    colorPalettes: color.getAllPalettes().map((p) => ({ id: p.id, name: p.name, colors: p.colors.map((c) => c.value), isPreset: p.isPreset, isCustom: p.isCustom })),
    characterPalettes: chars.getAllPalettes().map((p) => ({ id: p.id, name: p.name, characters: [...p.characters], category: p.category, isPreset: p.isPreset, isCustom: p.isCustom })),
  };
}

const getCatalog: OperationHandler = (input) => {
  const family = input.family as string;
  switch (family) {
    case 'effects':
      return {
        family,
        entries: getAllEffects().map((e) => compact({
          type: e.type, name: e.name, description: e.description, category: e.category,
          properties: propertyDefs(e.propertyDefinitions as unknown as PropertyLike[]),
          defaultSettings: { ...(e.defaultSettings as Record<string, unknown>) },
        })),
      };
    case 'shaders':
      return {
        family,
        entries: getAllPostEffects().map((e) => compact({
          type: e.type, name: e.name, description: e.description, category: e.category,
          properties: propertyDefs(e.propertyDefinitions as unknown as PropertyLike[]),
          defaultSettings: { ...(e.defaultSettings as Record<string, unknown>) },
        })),
      };
    case 'generators': {
      const catalog = executeGeneratorCommand({ type: 'get_generator_catalog' } as never) as unknown as { generatorCatalog: Array<Record<string, unknown>> };
      return {
        family,
        entries: catalog.generatorCatalog.map((g) => compact({
          type: g.type as string, name: g.name as string, description: g.description as string | undefined, mode: g.mode as string | undefined,
          properties: propertyDefs(g.properties as PropertyLike[]),
          defaultSettings: g.defaultSettings as Record<string, unknown>,
          initialSettings: g.initialSettings as Record<string, unknown>,
        })),
      };
    }
    case 'palettes':
      return paletteCatalog();
    case 'export_formats':
      return { family, formats: (Object.entries(EXPORT_FORMATS) as Array<[ExportFormat, FormatInfo]>).map(([format, info]) => ({ format, ...info })) };
    case 'tools': {
      const tools = useToolStore.getState();
      return {
        family,
        tools: [...TOOL_NAMES],
        activeTool: tools.activeTool,
        current: { character: tools.selectedChar, foregroundColor: tools.selectedColor, backgroundColor: tools.selectedBgColor },
        brushShapes: ['circle', 'square', 'horizontal', 'vertical'],
        shapeKinds: ['rectangle', 'ellipse', 'line'],
        boxStyles: BOX_DRAWING_STYLES.map((s) => ({ id: s.id, name: s.name })),
        gradientTypes: ['linear', 'radial'],
        importSettings: importSettingsCatalog(),
      };
    }
    case 'fonts':
      return {
        family,
        canvasFonts: MONOSPACE_FONTS.map((f) => ({ id: f.id, name: f.name, category: f.category })),
        figletFonts: FIGLET_FONTS_BY_CATEGORY.map((c) => ({ category: c.label, fonts: [...c.fonts] })),
      };
    default:
      throw invalid(`Unknown catalog family: ${family}`);
  }
};

// ── capabilities ────────────────────────────────────────────────────────────

function hasCanvas2d(): boolean {
  try {
    if (typeof document === 'undefined') return false;
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return false;
    return !!document.createElement('canvas').getContext('2d');
  } catch {
    return false;
  }
}

export function buildCapabilities(): Record<string, unknown> {
  const registered = new Set(getRegisteredOperationNames());
  const cloud = getCloudBridgeStatus();
  const canvas2d = hasCanvas2d();
  const webcodecs = typeof (globalThis as { VideoEncoder?: unknown }).VideoEncoder === 'function';
  const mediaRecorder = typeof (globalThis as { MediaRecorder?: unknown }).MediaRecorder === 'function';
  const unavailable: Array<{ op: string; code: string; reason: string }> = [];
  for (const op of BRIDGE_OPERATIONS) {
    if (!registered.has(op.name)) unavailable.push({ op: op.name, code: 'UNSUPPORTED', reason: 'No handler registered in this app build' });
    else if (op.domain === 'cloud') {
      const status = cloud.unavailable(op.name);
      if (status) unavailable.push({ op: op.name, ...status });
    }
  }
  const { documentId, revision } = getDocumentIdentity();
  return {
    protocol: BRIDGE_PROTOCOL,
    protocolVersion: BRIDGE_PROTOCOL_VERSION,
    contractVersion: BRIDGE_CONTRACT_VERSION,
    contractHash: BRIDGE_CONTRACT_HASH,
    documentId,
    revision,
    operations: [...registered].sort(),
    unavailable,
    features: {
      canvas2d,
      webcodecs,
      mediaRecorder,
      videoExport: canvas2d && (webcodecs || mediaRecorder),
      imageExport: canvas2d,
      mediaImport: canvas2d,
      shaders: true,
      cloud: cloud.features,
    },
    limits: { selectionCells: SELECTION_CELL_LIMIT, readCellsRegion: 40000, batchOperations: 100 },
  };
}

export const documentHandlers: Record<string, OperationHandler> = {
  get_capabilities: () => ({ capabilities: buildCapabilities() }),
  get_document: getDocument,
  get_document_summary: () => buildDocumentSummary(),
  read_cells: readCells,
  get_catalog: getCatalog,
  get_selection: () => readSelection(),
  get_history: () => readHistory(),
};
