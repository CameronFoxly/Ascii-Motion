/**
 * Export coverage for procedural generator layers: every generator must reach
 * each export format, and live (unbaked) and baked layers must export the same
 * output.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

import { saveAs } from 'file-saver';
import { registerAllGenerators } from '../registry/generators';
import { getAllGenerators } from '../registry/generatorRegistry';
import { useTimelineStore } from '../stores/timelineStore';
import { useCanvasStore } from '../stores/canvasStore';
import { ExportDataCollector } from '../utils/exportDataCollector';
import { ExportRenderer } from '../utils/exportRenderer';
import { SessionImporter } from '../utils/sessionImporter';
import { renderGeneratorFrame } from '../utils/generators/generatorRuntime';
import { applyTypewriterDefaultKeyframes } from '../utils/generators/animatedTextActions';
import type { ExportDataBundle } from '../types/export';
import type { Cell, Frame } from '../types';
import type { LayerId } from '../types/timeline';

const W = 32;
const H = 12;
const FRAMES = 12;

// Registered at load so describe.each can enumerate generator types
registerAllGenerators();

function snapshot(cells: Map<string, Cell>): string {
  return [...cells.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, c]) => `${k}:${c.char}:${c.color}:${c.bgColor}`)
    .join('|');
}

const frameSnapshots = (frames: Frame[]) => frames.map((f) => snapshot(f.data));

function resetProject() {
  useTimelineStore.getState().createNewProject();
  useCanvasStore.getState().setCanvasSize(W, H);
  useTimelineStore.setState((s) => ({
    config: { ...s.config, frameRate: 12, durationFrames: FRAMES, durationMs: (FRAMES / 12) * 1000 },
  }));
}

function addGenerator(type: string): LayerId {
  const tl = useTimelineStore.getState();
  const id = tl.addGeneratorLayer(type, { startFrame: 0, durationFrames: FRAMES })!;
  expect(id).not.toBeNull();
  const source = useTimelineStore.getState().getLayer(id)!.generator!;
  if ('seed' in source.settings) useTimelineStore.getState().updateGeneratorSettings(id, { seed: 1234 });
  if (type === 'animated-text') {
    useTimelineStore.getState().updateGeneratorSettings(id, {
      text: 'Hello\nworld!',
      effect: 'typewriter',
      'typewriter.cursor': true,
      fillBox: true,
      backgroundColor: '#203040',
      textColor: '#ffcc00',
    });
    applyTypewriterDefaultKeyframes(id);
  }
  return id;
}

/** Offset the layer so the transformed compositing path is exercised too */
function moveLayer(id: LayerId) {
  useTimelineStore.getState().setStaticProperty(id, 'transform.position.x', 2);
  useTimelineStore.getState().setStaticProperty(id, 'transform.position.y', 1);
}

const savedText = async (index = -1): Promise<string> => {
  const blob = vi.mocked(saveAs).mock.calls.at(index)?.[0] as Blob;
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
};

/** Run every non-raster export and return its text output, keyed by format */
async function runTextExports(data: ExportDataBundle): Promise<Record<string, string>> {
  const r = new ExportRenderer();
  const out: Record<string, string> = {};
  const capture = async (name: string, run: () => Promise<void>) => {
    vi.mocked(saveAs).mockClear();
    await run();
    expect(vi.mocked(saveAs).mock.calls.length, `${name} saved a file`).toBeGreaterThan(0);
    out[name] = (await savedText()).replace(/\d{4}-\d\d-\d\dT[\d:.]+Z/g, '<date>');
  };
  await capture('text', () => r.exportText(data, {
    removeLeadingSpaces: false, removeTrailingSpaces: false, removeLeadingLines: false,
    removeTrailingLines: false, includeMetadata: false,
  }, 'out'));
  await capture('json', () => r.exportJson(data, { includeMetadata: false, humanReadable: false, includeEmptyCells: false }, 'out'));
  await capture('ansi-frame', () => r.exportAnsi(data, {
    fileName: 'out', colorMode: 'truecolor', outputMode: 'single-frame', includeMetadata: false, loopAnimation: false, clearScreen: false,
  }, 'out'));
  await capture('ansi-animation', () => r.exportAnsi(data, {
    fileName: 'out', colorMode: 'truecolor', outputMode: 'animation', includeMetadata: false, loopAnimation: true, clearScreen: true,
  }, 'out'));
  await capture('html', () => r.exportHtml(data, {
    includeMetadata: false, animationSpeed: 1, backgroundColor: '#000000', fontFamily: 'monospace', fontSize: 12, loops: 'infinite', includePostEffects: false,
  }, 'out'));
  await capture('react', () => r.exportReactComponent(data, {
    typescript: true, includeControls: true, includeBackground: true, fileName: 'Out', includePostEffects: false,
  }));
  await capture('ink', () => r.exportInkComponent(data, { fileName: 'Out', includePlaybackControls: true, loopAnimation: true, colorMode: 'hex' }));
  await capture('opentui', () => r.exportOpenTuiComponent(data, { fileName: 'Out', includePlaybackControls: true, loopAnimation: true, colorMode: 'hex' }));
  await capture('bubbletea', () => r.exportBubbleteaComponent(data, {
    fileName: 'out', packageName: 'out', colorMode: 'hex', playbackStyle: 'autoplay', loopAnimation: true,
  }));
  return out;
}

const generatorTypes = () => getAllGenerators().map((g) => g.type).sort();

describe('generator layers in exports', () => {
  beforeEach(() => {
    resetProject();
    vi.mocked(saveAs).mockReset();
  });

  it('covers every registered generator', () => {
    expect(generatorTypes()).toContain('animated-text');
    expect(generatorTypes().length).toBeGreaterThanOrEqual(6);
  });

  describe.each(generatorTypes())('%s', (type) => {
    it('exports the live procedural output on every frame', () => {
      const id = addGenerator(type);
      const source = useTimelineStore.getState().getLayer(id)!.generator!;
      const data = ExportDataCollector.collect();
      expect(data.frames).toHaveLength(FRAMES);
      const expected = Array.from({ length: FRAMES }, (_, f) => snapshot(renderGeneratorFrame(source, f, W, H)));
      expect(frameSnapshots(data.frames)).toEqual(expected);
      expect(data.frames.some((f) => f.data.size > 0)).toBe(true);
      expect(new Set(expected).size, 'output animates').toBeGreaterThan(1);
    });

    it('exports identical output before and after baking', async () => {
      const id = addGenerator(type);
      moveLayer(id);
      const live = ExportDataCollector.collect();
      const liveOut = await runTextExports(live);

      useTimelineStore.getState().bakeGeneratorLayer(id);
      expect(useTimelineStore.getState().getLayer(id)!.generator).toBeUndefined();
      const baked = ExportDataCollector.collect();

      expect(frameSnapshots(baked.frames)).toEqual(frameSnapshots(live.frames));
      const bakedOut = await runTextExports(baked);
      for (const format of Object.keys(liveOut)) {
        expect(bakedOut[format], format).toBe(liveOut[format]);
      }
    });

    it.each(['live', 'baked'])('round-trips a %s layer through a session export', async (mode) => {
      const id = addGenerator(type);
      moveLayer(id);
      if (mode === 'baked') useTimelineStore.getState().bakeGeneratorLayer(id);
      const before = ExportDataCollector.collect();

      await new ExportRenderer().exportSession(before, { includeMetadata: false }, 'out');
      const session = JSON.parse(await savedText());
      const layer = session.layers.find((l: { id: string }) => l.id === id);
      expect(layer.kind === 'generator').toBe(mode === 'live');

      resetProject();
      await SessionImporter.importSessionData(session);
      const after = ExportDataCollector.collect();
      expect(frameSnapshots(after.frames)).toEqual(frameSnapshots(before.frames));
    });
  });

  it('places animated text output (fill, colors, cursor) in text exports', async () => {
    addGenerator('animated-text');
    const data = ExportDataCollector.collect();
    const last = data.frames[FRAMES - 1].data;
    const cells = [...last.values()];
    expect(cells.some((c) => c.char === 'w' && c.color === '#ffcc00')).toBe(true);
    expect(cells.some((c) => c.char === ' ' && c.bgColor === '#203040')).toBe(true);
    const out = await runTextExports(data);
    expect(out.text).toContain('Hello');
    expect(out.text).toContain('world!');
    expect(out.json).toContain('#203040');
    expect(out['ansi-animation']).toContain('world!');
  });
});
