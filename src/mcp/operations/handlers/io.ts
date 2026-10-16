/** Exports rendered by the app's ExportRenderer and returned as artifacts (no download). */
import { ExportRenderer, withExportFileSink } from '../../../utils/exportRenderer';
import { ExportDataCollector } from '../../../utils/exportDataCollector';
import type { ExportDataBundle } from '../../../types/export';
import type { OperationHandler } from '../runtime';
import { BridgeError, invalid } from '../errors';
import { EXPORT_FORMATS } from './document';
import type { exportFormatNames } from '../../contract/operations';

type ExportFormat = (typeof exportFormatNames)[number];

export interface ExportArtifact {
  filename: string;
  mimeType: string;
  encoding: 'base64' | 'utf8';
  bytes: number;
  data: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

// Some DOM implementations (e.g. jsdom 28.0) lack Blob.arrayBuffer; FileReader is universally available.
async function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') return new Uint8Array(await blob.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

async function blobToArtifact(blob: Blob, filename: string, format: ExportFormat): Promise<ExportArtifact> {
  const info = EXPORT_FORMATS[format];
  const bytes = await readBlobBytes(blob);
  const mimeType = info.mimeType;
  if (info.binary) return { filename, mimeType, encoding: 'base64', bytes: bytes.length, data: bytesToBase64(bytes) };
  return { filename, mimeType, encoding: 'utf8', bytes: bytes.length, data: new TextDecoder().decode(bytes) };
}

function mergeSettings(format: ExportFormat, overrides: Record<string, unknown>): Record<string, unknown> {
  const defaults = EXPORT_FORMATS[format].options as Record<string, unknown>;
  const unknownKeys = Object.keys(overrides).filter((k) => !(k in defaults));
  if (unknownKeys.length) {
    throw invalid(`Unsupported ${format} export settings: ${unknownKeys.join(', ')}`, { allowed: Object.keys(defaults) });
  }
  const merged = { ...defaults, ...overrides };
  // Nested SVG options merge per key so partial overrides keep the other defaults.
  if (isRecord(defaults.svgSettings) && isRecord(overrides.svgSettings)) {
    const extra = Object.keys(overrides.svgSettings).filter((k) => !(k in (defaults.svgSettings as object)));
    if (extra.length) throw invalid(`Unsupported svgSettings: ${extra.join(', ')}`, { allowed: Object.keys(defaults.svgSettings) });
    merged.svgSettings = { ...defaults.svgSettings, ...overrides.svgSettings };
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (key === 'svgSettings' && isRecord(value)) {
      for (const [sub, subValue] of Object.entries(value)) checkSetting(format, sub, subValue, `svgSettings.${sub}`);
    } else {
      checkSetting(format, key, value, key);
    }
  }
  return merged;
}

type SettingRule = (value: unknown) => boolean;
const isInt = (min: number, max: number): SettingRule => (v) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const isNum = (min: number, max: number): SettingRule => (v) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const oneOf = (...values: unknown[]): SettingRule => (v) => values.includes(v);
const isBool: SettingRule = (v) => typeof v === 'boolean';
const isText: SettingRule = (v) => typeof v === 'string' && v.trim().length > 0;
const isVideo = (format: ExportFormat) => format === 'webm' || format === 'mp4';

/** Allowed values per export setting, mirroring the app's export setting types. */
function settingRule(format: ExportFormat, key: string): { rule: SettingRule; expected: string } | undefined {
  switch (key) {
    case 'frame': case 'frameRange': case 'sequenceRange': return undefined; // validated when applied
    case 'svgSettings': return { rule: isRecord, expected: 'an object' };
    case 'sizeMultiplier': return isVideo(format) ? { rule: oneOf(1, 2, 4), expected: '1, 2, or 4' } : { rule: oneOf(1, 2, 3, 4), expected: '1, 2, 3, or 4' };
    case 'quality': return format === 'webm' ? { rule: oneOf('high', 'medium', 'low'), expected: '"high", "medium", or "low"' } : { rule: isInt(1, 100), expected: 'an integer 1-100' };
    case 'frameRate': return { rule: (v) => v === 'auto' || isInt(1, 60)(v), expected: '"auto" or an integer 1-60' };
    case 'crf': return { rule: isInt(0, 51), expected: 'an integer 0-51' };
    case 'loops': return { rule: oneOf('none', '2x', '4x', '8x'), expected: '"none", "2x", "4x", or "8x"' };
    case 'format': return { rule: oneOf('png', 'jpg', 'svg'), expected: '"png", "jpg", or "svg"' };
    case 'colorMode': {
      const modes = format === 'ansi' ? ['ansi', '256', 'truecolor'] : format === 'bubbletea' ? ['hex', '256', 'semantic'] : ['ansi', '256', 'hex'];
      return { rule: oneOf(...modes), expected: modes.map((m) => `"${m}"`).join(', ') };
    }
    case 'outputMode': return { rule: oneOf('single-frame', 'animation'), expected: '"single-frame" or "animation"' };
    case 'playbackStyle': return { rule: oneOf('autoplay', 'keyboard', 'api'), expected: '"autoplay", "keyboard", or "api"' };
    case 'fontFamily': return { rule: oneOf('project', 'monospace', 'courier', 'consolas'), expected: '"project", "monospace", "courier", or "consolas"' };
    case 'fontSize': return { rule: isNum(8, 24), expected: 'a number 8-24' };
    case 'animationSpeed': return { rule: isNum(0.1, 5), expected: 'a number 0.1-5' };
    case 'backgroundColor': return { rule: (v) => typeof v === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v), expected: 'a hex color like "#000000"' };
    // Exporters sanitize names into valid identifiers, so any non-empty text is usable.
    case 'fileName': case 'packageName': return { rule: isText, expected: 'a non-empty string' };
    default: return { rule: isBool, expected: 'a boolean' };
  }
}

function checkSetting(format: ExportFormat, key: string, value: unknown, label: string): void {
  const spec = settingRule(format, key);
  if (spec && !spec.rule(value)) {
    throw invalid(`Invalid ${format} export setting ${label}: expected ${spec.expected}`, { setting: label, value });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Resolve "all" | { start, end } (inclusive, end -1 = last) against a frame count. */
export function resolveFrameRange(value: unknown, total: number, key = 'frameRange'): { start: number; end: number } {
  const last = Math.max(0, total - 1);
  if (value === undefined || value === 'all') return { start: 0, end: last };
  if (!isRecord(value) || !Number.isInteger(value.start) || !Number.isInteger(value.end) || Object.keys(value).some((k) => k !== 'start' && k !== 'end')) {
    throw invalid(`${key} must be "all" or { start, end } with integer frame indexes (end -1 = last frame)`);
  }
  const start = value.start as number;
  const end = (value.end as number) === -1 ? last : (value.end as number);
  if (start < 0 || start > last || end < start || end > last) {
    throw new BridgeError('OUT_OF_RANGE', `${key} ${start}..${value.end} is outside frames 0..${last}`);
  }
  return { start, end };
}

/** Keep frames start..end and move shader blocks and keyframes onto the sliced timeline. */
function sliceExportData(data: ExportDataBundle, range: { start: number; end: number }): void {
  const { start, end } = range;
  if (start === 0 && end === data.frames.length - 1) return;
  const current = data.currentFrameIndex;
  data.frames = data.frames.slice(start, end + 1);
  data.currentFrameIndex = current >= start && current <= end ? current - start : 0;
  if (data.postEffectTracks) {
    data.postEffectTracks = data.postEffectTracks.map((track) => ({
      ...track,
      effectBlock: {
        ...track.effectBlock,
        startFrame: track.effectBlock.startFrame - start,
        propertyTracks: track.effectBlock.propertyTracks.map((pt) => ({
          ...pt,
          keyframes: pt.keyframes.map((kf) => ({ ...kf, frame: kf.frame - start })),
        })),
      },
    }));
  }
}

/**
 * Render one export through the same ExportRenderer methods the export dialogs
 * call, capturing the file instead of downloading it.
 */
export async function renderExport(format: ExportFormat, overrides: Record<string, unknown>, filenameInput?: string): Promise<{ artifact: ExportArtifact; result: Record<string, unknown> }> {
  if (!(format in EXPORT_FORMATS)) throw invalid(`Unknown export format: ${format}`);
  const settings = mergeSettings(format, overrides);
  const data = ExportDataCollector.collect();
  const sourceFrameCount = Math.max(1, data.frames.length);
  const frame = settings.frame;
  delete settings.frame;
  if (frame !== undefined && frame !== 'current') {
    if (typeof frame !== 'number' || !Number.isInteger(frame) || frame < 0 || frame >= Math.max(1, data.frames.length)) {
      throw new BridgeError('OUT_OF_RANGE', `frame must be "current" or an integer 0..${Math.max(0, data.frames.length - 1)}`);
    }
    data.currentFrameIndex = frame;
  }
  let exportedRange: { start: number; end: number } | undefined;
  if ('frameRange' in settings) {
    exportedRange = resolveFrameRange(settings.frameRange, data.frames.length);
    delete settings.frameRange;
    sliceExportData(data, exportedRange);
  } else if ('sequenceRange' in settings) {
    exportedRange = resolveFrameRange(settings.sequenceRange, data.frames.length, 'sequenceRange');
    settings.sequenceRange = exportedRange;
  }
  const base = (filenameInput ?? '').replace(/\.[a-z0-9]+$/i, '') || (data.metadata.projectName || 'ascii-motion').replace(/[^a-z0-9-_ ]+/gi, '').trim() || 'ascii-motion';
  const files: Array<{ blob: Blob; filename: string }> = [];
  const renderer = new ExportRenderer();
  try {
    await withExportFileSink((blob, filename) => { files.push({ blob, filename }); }, async () => {
      /* eslint-disable @typescript-eslint/no-explicit-any -- settings were validated against the format's defaults */
      const s = settings as any;
      switch (format) {
        case 'png':
        case 'jpg':
          return renderer.exportImage(data, { ...s, format }, base);
        case 'svg': {
          const { includeGrid, textAsOutlines, includeBackground, prettify } = s;
          return renderer.exportSvg(data, { format: 'svg', sizeMultiplier: 1, includeGrid: false, quality: 100, svgSettings: { includeGrid, textAsOutlines, includeBackground, prettify } }, base);
        }
        case 'image_sequence':
          return renderer.exportImageSequence(data, { ...s, sequenceMode: true }, base);
        case 'webm':
        case 'mp4':
          return renderer.exportVideo(data, { ...s, format, frameRange: { start: 0, end: -1 } }, base);
        case 'session':
          return renderer.exportSession(data, s, base);
        case 'text':
          return renderer.exportText(data, s, base);
        case 'json':
          return renderer.exportJson(data, s, base);
        case 'ansi':
          return renderer.exportAnsi(data, { ...s, fileName: filenameInput ? base : s.fileName }, base);
        case 'html':
          return renderer.exportHtml(data, s, base);
        case 'react':
          return renderer.exportReactComponent(data, { ...s, fileName: filenameInput ? base : s.fileName });
        case 'ink':
          return renderer.exportInkComponent(data, { ...s, fileName: filenameInput ? base : s.fileName });
        case 'opentui':
          return renderer.exportOpenTuiComponent(data, { ...s, fileName: filenameInput ? base : s.fileName });
        case 'bubbletea':
          return renderer.exportBubbleteaComponent(data, { ...s, fileName: filenameInput ? base : s.fileName });
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
    });
  } catch (error) {
    if (error instanceof BridgeError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new BridgeError(EXPORT_FORMATS[format].browserOnly ? 'UI_NOT_READY' : 'INTERNAL', `${format} export failed: ${message}`);
  }
  if (files.length === 0) throw new BridgeError('INTERNAL', `${format} export produced no file`);
  const last = files[files.length - 1];
  const artifact = await blobToArtifact(last.blob, last.filename, format);
  const sequence = format === 'image_sequence' && exportedRange;
  const result: Record<string, unknown> = {
    format,
    frameCount: !EXPORT_FORMATS[format].animated ? 1 : sequence ? exportedRange!.end - exportedRange!.start + 1 : Math.max(1, data.frames.length),
    sourceFrameCount,
    currentFrameIndex: data.currentFrameIndex,
    width: data.canvasDimensions.width,
    height: data.canvasDimensions.height,
    frameRate: data.frameRate,
  };
  if (exportedRange) result.frameRange = exportedRange;
  if (format === 'react' || format === 'ink' || format === 'opentui') {
    const fileName = (filenameInput ? base : settings.fileName) as string | undefined;
    result.componentName = renderer.deriveComponentNames(fileName, EXPORT_FORMATS[format].options.fileName as string).componentName;
  } else if (format === 'bubbletea') {
    const names = renderer.deriveBubbleteaNames({ fileName: (filenameInput ? base : settings.fileName) as string, packageName: settings.packageName as string });
    Object.assign(result, { packageName: names.packageName, modelName: 'Model' });
  }
  return { artifact, result };
}

export const ioHandlers: Record<string, OperationHandler> = {
  export: (input) => renderExport(
    input.format as ExportFormat,
    (input.settings as Record<string, unknown> | undefined) ?? {},
    input.filename as string | undefined,
  ),
};
