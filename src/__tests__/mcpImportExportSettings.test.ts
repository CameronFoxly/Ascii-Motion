import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAllOperationHandlers } from '../mcp/operations/handlers';
import { __resetRuntimeForTests, runOperation } from '../mcp/operations/runtime';
import { registerAllEffects } from '../registry/effects';
import { registerAllPostEffects } from '../registry/postEffects';
import { registerAllGenerators } from '../registry/generators';
import { useCanvasStore } from '../stores/canvasStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useProjectMetadataStore } from '../stores/projectMetadataStore';
import { ExportDataCollector } from '../utils/exportDataCollector';
import { ExportRenderer } from '../utils/exportRenderer';
import * as exportRendererModule from '../utils/exportRenderer';
import type { ExportDataBundle } from '../types/export';
import type { PostEffectTrack } from '../types/postEffect';

const convertMediaToCells = vi.hoisted(() => vi.fn());
vi.mock('../utils/mediaImportPipeline', () => ({ convertMediaToCells }));

type Outcome = { ok: boolean; result?: Record<string, unknown>; error?: { code: string; message: string } };
const run = (op: string, input: Record<string, unknown>) => runOperation(op, input, {}) as Promise<Outcome>;

async function ok(op: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const outcome = await run(op, input);
  if (!outcome.ok) throw new Error(`${op} failed: ${outcome.error?.code} ${outcome.error?.message}`);
  return outcome.result!;
}

const PNG = btoa('not-really-a-png');

beforeAll(() => {
  registerAllEffects();
  registerAllPostEffects();
  registerAllGenerators();
  registerAllOperationHandlers();
});

beforeEach(() => {
  useTimelineStore.getState().createNewProject();
  useCanvasStore.setState({ width: 20, height: 10, cells: new Map(), isDirty: false });
  useProjectMetadataStore.getState().resetProject();
  __resetRuntimeForTests();
  convertMediaToCells.mockReset();
});

afterEach(() => vi.restoreAllMocks());

describe('export settings', () => {
  const shaderTrack = (): PostEffectTrack => ({
    id: 'track-1',
    collapsed: false,
    effectBlock: {
      id: 'block-1',
      postEffectType: 'crt',
      startFrame: 3,
      durationFrames: 2,
      enabled: true,
      settings: {},
      propertyTracks: [{ id: 'pt-1', propertyPath: 'intensity', loopKeyframes: false, keyframes: [{ id: 'kf-1', frame: 4, value: 1, easing: 'linear' }] }],
    },
  } as unknown as PostEffectTrack);

  function stubFrames(count: number, tracks?: PostEffectTrack[]): void {
    const collect = ExportDataCollector.collect.bind(ExportDataCollector);
    vi.spyOn(ExportDataCollector, 'collect').mockImplementation(() => {
      const data = collect();
      data.frames = Array.from({ length: count }, (_, i) => ({ ...data.frames[0], id: `f${i}` as never, name: `f${i}` }));
      data.currentFrameIndex = 2;
      data.postEffectTracks = tracks;
      return data;
    });
  }

  it('slices frames and moves shader blocks/keyframes onto the exported range', async () => {
    const tracks = [shaderTrack()];
    stubFrames(5, tracks);
    const spy = vi.spyOn(ExportRenderer.prototype, 'exportJson');
    const result = await ok('export', { format: 'json', settings: { frameRange: { start: 1, end: 3 } } });
    const data = spy.mock.calls[0][0] as ExportDataBundle;
    expect(data.frames.map((f) => f.name)).toEqual(['f1', 'f2', 'f3']);
    expect(data.currentFrameIndex).toBe(1);
    expect(data.postEffectTracks![0].effectBlock.startFrame).toBe(2);
    expect(data.postEffectTracks![0].effectBlock.propertyTracks[0].keyframes[0].frame).toBe(3);
    expect(tracks[0].effectBlock.startFrame).toBe(3);
    const inner = result.result as Record<string, unknown>;
    expect(inner.frameRange).toEqual({ start: 1, end: 3 });
    expect(inner.frameCount).toBe(3);
    expect(inner.sourceFrameCount).toBe(5);
  });

  it.each(['png', 'jpg', 'svg'])('reports one emitted frame and the source count for %s', async (format) => {
    stubFrames(8);
    vi.spyOn(ExportRenderer.prototype, 'exportImage').mockResolvedValue(undefined);
    vi.spyOn(ExportRenderer.prototype, 'exportSvg').mockResolvedValue(undefined);
    vi.spyOn(exportRendererModule, 'withExportFileSink').mockImplementation(async (sink, render) => {
      const result = await render();
      sink(new Blob(['stand-in image bytes']), `image.${format}`);
      return result;
    });
    const result = await ok('export', { format });
    expect(result.result).toMatchObject({ frameCount: 1, sourceFrameCount: 8, currentFrameIndex: 2 });
  });

  it('treats end -1 as the last frame and rejects out-of-range or malformed ranges', async () => {
    stubFrames(4);
    const result = await ok('export', { format: 'text', settings: { frameRange: { start: 2, end: -1 } } });
    expect((result.result as Record<string, unknown>).frameRange).toEqual({ start: 2, end: 3 });
    expect((await run('export', { format: 'text', settings: { frameRange: { start: 2, end: 9 } } })).error?.code).toBe('OUT_OF_RANGE');
    expect((await run('export', { format: 'text', settings: { frameRange: [0, 1] } })).error?.code).toBe('INVALID_INPUT');
  });

  it('rejects settings the exporters do not read', async () => {
    for (const [format, settings] of [
      ['json', { includeEmptyCells: true }],
      ['html', { loops: 3 }],
      ['svg', { outlineFont: 'jetbrains-mono' }],
      ['png', { quality: 50 }],
      ['mp4', { quality: 'high' }],
      ['webm', { crf: 20 }],
      ['html', { includeControls: false }],
    ] as const) {
      const outcome = await run('export', { format, settings });
      expect(outcome.error?.code, `${format} ${Object.keys(settings)}`).toBe('INVALID_INPUT');
    }
  });

  it('passes nested SVG settings to the SVG exporter', async () => {
    const spy = vi.spyOn(ExportRenderer.prototype, 'exportSvg').mockResolvedValue(undefined);
    await run('export', { format: 'svg', settings: { includeBackground: false, prettify: false } });
    const settings = spy.mock.calls[0][1];
    expect(settings.svgSettings).toEqual({ includeGrid: false, textAsOutlines: false, includeBackground: false, prettify: false });
  });

  it('accepts includePostEffects on formats that render shaders', async () => {
    const spy = vi.spyOn(ExportRenderer.prototype, 'exportHtml');
    await ok('export', { format: 'html', settings: { includePostEffects: false } });
    expect(spy.mock.calls[0][1].includePostEffects).toBe(false);
  });

  it('reports the component and package names the exporters derive', async () => {
    const react = await ok('export', { format: 'react', settings: { fileName: 'my-widget' } });
    expect((react.result as Record<string, unknown>).componentName).toBe('MyWidget');
    expect((react.artifact as { data: string }).data).toContain('MyWidget');
    const ink = await ok('export', { format: 'ink', filename: 'cli_banner.tsx' });
    expect((ink.result as Record<string, unknown>).componentName).toBe('CliBanner');
    const tea = await ok('export', { format: 'bubbletea', settings: { packageName: 'Ascii-Motion!' } });
    expect(tea.result).toMatchObject({ packageName: 'asciimotion', modelName: 'Model' });
    expect((tea.artifact as { data: string }).data).toContain('package asciimotion');
  });
});

describe('import settings', () => {
  const converted = { type: 'image', metadata: {}, frames: [{ data: new Map([['0,0', { char: '#', color: '#ffffff', bgColor: 'transparent' }]]), durationMs: 100 }] };

  it('overlays non-empty image cells on the explicit target with one revision and undo entry', async () => {
    const target = await ok('set_cells', { cells: [
      { x: 0, y: 0, char: 'A' },
      { x: 1, y: 0, char: 'B' },
      { x: 9, y: 5, char: 'Z' },
    ] });
    const editTarget = { layerId: target.layerId, contentFrameId: target.contentFrameId };
    await ok('add_layer', { name: 'Other active layer' });
    const read = () => ok('read_cells', { scope: 'layer', format: 'cells', ...editTarget });
    const original = await read();
    const before = await runOperation('get_history', {});
    const history = await ok('get_history', {});
    const layerCount = useTimelineStore.getState().layers.length;
    const data = new Map(converted.frames[0].data);
    data.set('1,0', { char: ' ', color: '#ffffff', bgColor: 'transparent' });
    data.set('2,0', { char: ' ', color: '#ffffff', bgColor: '#ff0000' });
    convertMediaToCells.mockResolvedValue({ ...converted, frames: [{ data, durationMs: 100 }] });

    const imported = await runOperation('import_media', { data: PNG, mimeType: 'image/png', mode: 'overlay', target: editTarget });
    expect(imported.ok, JSON.stringify(imported.error)).toBe(true);
    expect(imported.revision).toBe(before.revision + 1);
    expect(imported.result).toMatchObject({ mode: 'overlay', ...editTarget, frameCount: 1, cellCount: 4 });
    expect((await ok('get_history', {})).length).toBe((history.length as number) + 1);
    expect(useTimelineStore.getState().layers).toHaveLength(layerCount);
    const updated = await read();
    expect(updated.cells).toEqual(expect.arrayContaining([
      expect.objectContaining({ x: 0, y: 0, char: '#' }),
      expect.objectContaining({ x: 1, y: 0, char: 'B' }),
      expect.objectContaining({ x: 2, y: 0, char: ' ', bgColor: '#ff0000' }),
      expect.objectContaining({ x: 9, y: 5, char: 'Z' }),
    ]));
    await ok('undo', {});
    expect(await read()).toEqual(original);
    await ok('redo', {});
    expect(await read()).toEqual(updated);
  });

  it('rejects video and multi-frame overlays without changing the document or history', async () => {
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-10-16T00:00:00.000Z');
    await ok('set_cells', { cells: [{ x: 0, y: 0, char: 'A' }] });
    const before = await ok('get_document', {});
    const history = await ok('get_history', {});
    expect((await run('import_media', { data: PNG, mimeType: 'video/mp4', mode: 'overlay' })).error?.code).toBe('INVALID_INPUT');
    expect(convertMediaToCells).not.toHaveBeenCalled();
    for (const output of [
      { ...converted, type: 'video' },
      { ...converted, frames: [converted.frames[0], converted.frames[0]] },
    ]) {
      convertMediaToCells.mockResolvedValue(output);
      expect((await run('import_media', { data: PNG, mimeType: 'image/png', mode: 'overlay' })).error?.code).toBe('INVALID_INPUT');
    }
    expect(await ok('get_document', {})).toEqual(before);
    expect(await ok('get_history', {})).toEqual(history);
  });

  it.each([undefined, 'replace'])('preserves existing import semantics for mode %s', async (mode) => {
    const { layerId } = await ok('set_cells', { cells: [{ x: 9, y: 5, char: 'Z' }] });
    const layerCount = useTimelineStore.getState().layers.length;
    convertMediaToCells.mockResolvedValue(converted);
    const result = await ok('import_media', { data: PNG, mimeType: 'image/png', ...(mode && { mode }), settings: { enableColorAsAlpha: false } });
    expect(result.mode).toBe(mode ?? 'new_layer');
    expect(useTimelineStore.getState().layers).toHaveLength(layerCount + (mode ? 0 : 1));
    const cells = await ok('read_cells', { scope: 'layer', layerId, format: 'cells' });
    expect(cells.cells).toEqual([expect.objectContaining(mode ? { x: 0, y: 0, char: '#' } : { x: 9, y: 5, char: 'Z' })]);
  });

  it('rejects settings the import pipeline does not read and invalid enums', async () => {
    for (const settings of [{ maxFrames: 3 }, { frameExtraction: 'interval' }, { maintainAspectRatio: false }, { textColorMappingMode: 'floyd-steinberg' }]) {
      const outcome = await run('import_media', { data: PNG, mimeType: 'image/png', settings });
      expect(outcome.error?.code, JSON.stringify(settings)).toBe('INVALID_INPUT');
    }
    expect((await run('import_media', { data: PNG, mimeType: 'image/png', settings: { textColorPaletteId: 'nope' } })).error?.code).toBe('NOT_FOUND');
    expect(convertMediaToCells).not.toHaveBeenCalled();
  });

  it('uses an explicit characterSet as the conversion palette', async () => {
    convertMediaToCells.mockResolvedValue(converted);
    await ok('import_media', { data: PNG, mimeType: 'image/png', settings: { characterSet: [' ', '.', '#'], nudgeX: 2 } });
    const [, settings, ctx] = convertMediaToCells.mock.calls[0];
    expect(ctx.characterPalette.characters).toEqual([' ', '.', '#']);
    expect(settings.nudgeX).toBe(2);
    const bad = await run('import_media', { data: PNG, mimeType: 'image/png', settings: { characterSet: ['ab'] } });
    expect(bad.error?.code).toBe('INVALID_INPUT');
  });

  it('forwards the video sampling window and rejects it for images', async () => {
    convertMediaToCells.mockResolvedValue({ ...converted, type: 'video', metadata: { frameRate: 12, duration: 4 } });
    const video = { startTime: 1, duration: 2, frameRate: 12, maxFrames: 10 };
    const result = await ok('import_media', { data: PNG, mimeType: 'video/mp4', video });
    expect(convertMediaToCells.mock.calls[0][4]).toEqual(video);
    expect(result).toMatchObject({ sampleFrameRate: 12, sourceDuration: 4 });
    expect((await run('import_media', { data: PNG, mimeType: 'image/png', video })).error?.code).toBe('INVALID_INPUT');
  });

  it('lists import settings defaults and enums in the tools catalog', async () => {
    const catalog = await ok('get_catalog', { family: 'tools' });
    const importSettings = catalog.importSettings as { defaults: Record<string, unknown>; enums: Record<string, string[]>; notes: Record<string, string> };
    expect(importSettings.notes.characterSet).toContain('index 0 = darkest; last index = brightest');
    expect(importSettings.notes.characterSet).toContain('invertDensity reverses the order');
    expect(importSettings.defaults).toHaveProperty('nudgeX');
    expect(importSettings.defaults).not.toHaveProperty('maxFrames');
    expect(Array.isArray(importSettings.defaults.characterSet)).toBe(true);
    expect(importSettings.enums.textColorMappingMode).toContain('bayer4x4');
  });
});

describe('create_group', () => {
  it('requires at least two layers', async () => {
    const outcome = await run('create_group', { layerIds: [] });
    expect(outcome.error?.code).toBe('INVALID_INPUT');
  });
});

describe('video sampling window', () => {
  async function sample(duration: number, window?: Record<string, number>): Promise<number[]> {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never);
    const { MediaProcessor } = await vi.importActual<typeof import('../utils/mediaProcessor')>('../utils/mediaProcessor');
    const processor = new MediaProcessor() as unknown as Record<string, (...args: unknown[]) => unknown>;
    const times: number[] = [];
    processor.estimateVideoFrameRate = async () => 10;
    processor.processVideoFrameToCanvas = (_v: unknown, _o: unknown, t: number, i: number, frameDuration: number) => {
      times.push(Math.round(t * 1000) / 1000);
      return { index: i, frameDuration };
    };
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 0));
    const video = { duration, currentTime: 0, addEventListener: (_: string, cb: () => void) => setTimeout(cb, 0), removeEventListener: () => {} };
    const out = await processor.extractVideoFrames(video, { videoWindow: window }, new File([], 'v.mp4')) as { frames: Array<{ frameDuration: number }>; detectedFrameRate: number };
    vi.unstubAllGlobals();
    if (window?.frameRate) expect(out.frames[0].frameDuration).toBe(Math.round(1000 / window.frameRate));
    return times;
  }

  it('samples every frame of the whole clip by default', async () => {
    expect(await sample(0.5)).toEqual([0.05, 0.15, 0.25, 0.35, 0.45]);
  });

  it('honours startTime, duration, frameRate and maxFrames', async () => {
    expect(await sample(10, { startTime: 2, duration: 1, frameRate: 4 })).toEqual([2.125, 2.375, 2.625, 2.875]);
    expect(await sample(10, { startTime: 1, maxFrames: 3 })).toEqual([1.05, 1.15, 1.25]);
    await expect(sample(1, { startTime: 1 })).rejects.toThrow(/startTime/);
  });
});
