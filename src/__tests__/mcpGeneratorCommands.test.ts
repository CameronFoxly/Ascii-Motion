import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MCPClient } from '../mcp/client';
import { useMCPStore } from '../mcp/store';
import type { MCPCommand, MCPCommandApplied, MCPCommandResult } from '../mcp/types';
import { registerAllGenerators } from '../registry/generators';
import { processHistoryAction } from '../hooks/useKeyboardShortcuts';
import { useAnimationStore } from '../stores/animationStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useToolStore } from '../stores/toolStore';
import type { LayerId } from '../types/timeline';

vi.mock('../hooks/useProjectFileActions', () => ({ useProjectFileActions: vi.fn() }));

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readonly sent: string[] = [];
  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  receive(message: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }));
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
  }
}

function results(socket: MockWebSocket): MCPCommandResult[] {
  return socket.sent
    .map((m) => JSON.parse(m) as { type?: string })
    .filter((m): m is MCPCommandResult => m.type === 'command_result');
}

let requestCounter = 0;
let socket: MockWebSocket;
let client: MCPClient;

async function send(command: MCPCommand | Record<string, unknown>): Promise<MCPCommandResult> {
  const requestId = `req-${++requestCounter}`;
  socket.receive({ type: 'command_request', requestId, command });
  await vi.waitFor(() => {
    expect(results(socket).some((r) => r.requestId === requestId)).toBe(true);
  });
  return results(socket).find((r) => r.requestId === requestId)!;
}

async function ok(command: MCPCommand): Promise<MCPCommandApplied> {
  const result = await send(command);
  if (!result.success) throw new Error(`Expected success, got: ${result.error}`);
  return result.applied!;
}

async function fails(command: MCPCommand | Record<string, unknown>, message: RegExp): Promise<void> {
  const result = await send(command);
  expect(result.success).toBe(false);
  if (!result.success) expect(result.error).toMatch(message);
}

function historyLength(): number {
  return useToolStore.getState().historyStack.length;
}

function replayUndo(): void {
  const action = useToolStore.getState().undo();
  expect(action).toBeDefined();
  processHistoryAction(action!, false, useCanvasStore.getState(), useAnimationStore.getState());
}

function source(layerId: string) {
  return useTimelineStore.getState().layers.find((l) => l.id === layerId)!.generator!;
}

async function addNoise(extra: Record<string, unknown> = {}): Promise<string> {
  const applied = await ok({ type: 'add_generator_layer', generatorType: 'turbulent-noise', durationFrames: 12, ...extra });
  return applied.layerId!;
}

beforeEach(async () => {
  registerAllGenerators();
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
  useTimelineStore.getState().createNewProject();
  useCanvasStore.getState().setCanvasSize(20, 6);
  useMCPStore.getState().reset();
  useToolStore.getState().clearHistory();

  client = new MCPClient();
  const connection = client.connect('test-token');
  socket = MockWebSocket.instances.at(-1)!;
  socket.open();
  await connection;
  socket.sent.length = 0;
});

afterEach(() => {
  client.disconnect();
  vi.unstubAllGlobals();
});

describe('MCP generator commands', () => {
  it('returns the generator catalog with full property definitions', async () => {
    const applied = await ok({ type: 'get_generator_catalog' });
    const types = applied.generatorCatalog!.map((g) => g.type);
    expect(types).toEqual(expect.arrayContaining(['turbulent-noise', 'animated-text', 'particle-physics']));
    const text = applied.generatorCatalog!.find((g) => g.type === 'animated-text')!;
    expect(text.mode).toBe('cells');
    const effect = text.properties.find((p) => p.path === 'effect')!;
    expect(effect).toMatchObject({ valueType: 'select', interpolation: expect.any(String), category: expect.any(String) });
    expect(effect.options!.map((o) => o.value)).toContain('typewriter');
    expect(text.properties.some((p) => p.visibleWhenAll)).toBe(true);
    expect(text.initialSettings['position.x']).toBeTypeOf('number');
    expect(historyLength()).toBe(0);
  });

  it('adds a generator layer with settings as a single undoable entry', async () => {
    const applied = await ok({
      type: 'add_generator_layer',
      generatorType: 'turbulent-noise',
      name: 'Clouds',
      startFrame: 2,
      durationFrames: 8,
      settings: { baseFrequency: 0.3 },
    });
    expect(applied.layer).toMatchObject({ id: applied.layerId, name: 'Clouds', kind: 'generator' });
    expect(applied.generator).toMatchObject({ generatorType: 'turbulent-noise', startFrame: 2, durationFrames: 8 });
    expect(applied.generator!.settings.baseFrequency).toBe(0.3);
    expect(historyLength()).toBe(1);
    expect(useToolStore.getState().historyStack[0].type).toBe('layer_add');

    replayUndo();
    expect(useTimelineStore.getState().layers.some((l) => l.id === applied.layerId)).toBe(false);
  });

  it('rejects invalid input with descriptive errors and no history', async () => {
    await fails({ type: 'add_generator_layer', generatorType: 'nope' }, /Unknown generator type "nope"/);
    await fails({ type: 'add_generator_layer', generatorType: 'turbulent-noise', settings: { bogus: 1 } }, /Unknown property "bogus"/);
    await fails({ type: 'add_generator_layer', generatorType: 'turbulent-noise', settings: { baseFrequency: 'x' } }, /finite number/);
    const contentLayerId = useTimelineStore.getState().layers[0].id;
    await fails({ type: 'reset_generator', layerId: contentLayerId }, /not a generator layer/);
    await fails({ type: 'reset_generator', layerId: 'missing' }, /not found/);
    const layerId = await addNoise();
    const before = historyLength();
    await fails({ type: 'set_generator_keyframes', layerId, propertyPath: 'nope', keyframes: [{ frame: 0, value: 1 }] }, /Unknown keyframeable property "nope"/);
    await fails({ type: 'set_generator_keyframes', layerId, propertyPath: 'baseFrequency', keyframes: [{ frame: 0, value: 1, easing: 'wobble' }] }, /Unknown easing preset/);
    await fails({ type: 'render_generator_frames', layerId, frames: Array.from({ length: 61 }, (_, i) => i) }, /at most 60/);
    expect(historyLength()).toBe(before);
  });

  it('keeps unknown commands unsupported', async () => {
    await fails({ type: 'definitely_not_a_command' }, /Unsupported browser command/);
  });

  it('updates settings, timing, enabled and name in one undo entry', async () => {
    const layerId = await addNoise();
    const original = structuredClone(source(layerId));
    const before = historyLength();
    const applied = await ok({
      type: 'update_generator_layer',
      layerId,
      settings: { baseFrequency: 0.42 },
      startFrame: 3,
      durationFrames: 5,
      enabled: false,
      name: 'Renamed',
    });
    expect(applied.generator).toMatchObject({ startFrame: 3, durationFrames: 5, enabled: false });
    expect(applied.generator!.settings.baseFrequency).toBe(0.42);
    expect(useTimelineStore.getState().getLayer(layerId as LayerId)!.name).toBe('Renamed');
    expect(historyLength()).toBe(before + 1);

    replayUndo();
    expect(source(layerId)).toEqual(original);
    expect(useTimelineStore.getState().getLayer(layerId as LayerId)!.name).not.toBe('Renamed');
  });

  it('sets properties statically or at the keyframe at a frame', async () => {
    const layerId = await addNoise();
    let applied = await ok({ type: 'set_generator_property', layerId, propertyPath: 'baseFrequency', value: 0.2 });
    expect(applied.generator!.settings.baseFrequency).toBe(0.2);

    await ok({ type: 'set_generator_keyframes', layerId, propertyPath: 'baseFrequency', keyframes: [{ frame: 0, value: 0.1 }, { frame: 10, value: 0.5 }] });
    applied = await ok({ type: 'set_generator_property', layerId, propertyPath: 'baseFrequency', value: 0.3, frame: 5 });
    const track = applied.generator!.propertyTracks.find((t) => t.propertyPath === 'baseFrequency')!;
    expect(track.keyframes.map((k) => [k.frame, k.value])).toEqual([[0, 0.1], [5, 0.3], [10, 0.5]]);

    const before = historyLength();
    replayUndo();
    expect(source(layerId).propertyTracks[0].keyframes).toHaveLength(2);
    expect(historyLength()).toBe(before);
  });

  it('sets keyframes with easing, replace and looping', async () => {
    const layerId = await addNoise();
    const before = historyLength();
    const applied = await ok({
      type: 'set_generator_keyframes',
      layerId,
      propertyPath: 'baseFrequency',
      keyframes: [
        { frame: 0, value: 0.1, easing: 'ease-in' },
        { frame: 6, value: 0.4, easing: { type: 'custom', x1: 0.2, y1: 0, x2: 0.8, y2: 1 } },
      ],
      loop: true,
    });
    expect(historyLength()).toBe(before + 1);
    const track = applied.generator!.propertyTracks.find((t) => t.id === applied.trackId)!;
    expect(track.loopKeyframes).toBe(true);
    expect(applied.keyframeIds).toEqual(track.keyframes.map((k) => k.id));
    expect(track.keyframes[0].easing).toEqual({ type: 'ease-in' });
    expect(track.keyframes[1].easing).toEqual({ type: 'custom', x1: 0.2, y1: 0, x2: 0.8, y2: 1 });

    const replaced = await ok({
      type: 'set_generator_keyframes',
      layerId,
      propertyPath: 'baseFrequency',
      keyframes: [{ frame: 3, value: 0.2 }],
      replace: true,
    });
    expect(replaced.trackId).toBe(applied.trackId);
    const replacedTrack = replaced.generator!.propertyTracks.find((t) => t.id === applied.trackId)!;
    expect(replacedTrack.keyframes.map((k) => k.frame)).toEqual([3]);
  });

  it('removes keyframes and bakes the value when the track empties', async () => {
    const layerId = await addNoise();
    await ok({ type: 'set_generator_keyframes', layerId, propertyPath: 'baseFrequency', keyframes: [{ frame: 0, value: 0.1 }, { frame: 4, value: 0.5 }, { frame: 8, value: 0.9 }] });
    let applied = await ok({ type: 'remove_generator_keyframes', layerId, propertyPath: 'baseFrequency', frames: [4] });
    expect(applied.generator!.propertyTracks[0].keyframes.map((k) => k.frame)).toEqual([0, 8]);

    const before = historyLength();
    applied = await ok({ type: 'remove_generator_keyframes', layerId, propertyPath: 'baseFrequency', clearTrack: true, frame: 8 });
    expect(applied.generator!.propertyTracks).toHaveLength(0);
    expect(applied.generator!.settings.baseFrequency).toBeCloseTo(0.9);
    expect(historyLength()).toBe(before + 1);

    await fails({ type: 'remove_generator_keyframes', layerId, propertyPath: 'baseFrequency', frames: [0] }, /no keyframe track/);
  });

  it('resets settings and randomizes the seed with undo', async () => {
    const layerId = await addNoise();
    await ok({ type: 'set_generator_keyframes', layerId, propertyPath: 'baseFrequency', keyframes: [{ frame: 0, value: 0.1 }] });
    const seed = source(layerId).settings.seed;
    let applied = await ok({ type: 'reset_generator', layerId });
    expect(applied.generator!.propertyTracks).toHaveLength(0);
    expect(applied.generator!.settings.seed).toBe(seed);

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    applied = await ok({ type: 'randomize_generator_seed', layerId });
    randomSpy.mockRestore();
    expect(applied.generator!.settings.seed).toBe(50000);
    replayUndo();
    expect(source(layerId).settings.seed).toBe(seed);
  });

  it('reads resolved settings and renders frames without mutating', async () => {
    const layerId = await addNoise({ startFrame: 2, durationFrames: 4 });
    await ok({ type: 'set_generator_keyframes', layerId, propertyPath: 'baseFrequency', keyframes: [{ frame: 2, value: 0.1 }, { frame: 4, value: 0.5 }] });
    const before = historyLength();
    const state = await ok({ type: 'get_generator_state', layerId, frame: 3 });
    expect(state.resolvedSettings!.baseFrequency).toBeCloseTo(0.3);

    const rendered = await ok({ type: 'render_generator_frames', layerId, frames: [0, 3], includeCells: true });
    const [outside, inside] = rendered.generatorFrames!;
    expect(outside).toMatchObject({ frame: 0, inRange: false, cellCount: 0 });
    expect(outside.text).toEqual(Array(6).fill(' '.repeat(20)));
    expect(inside.inRange).toBe(true);
    expect(inside.text).toHaveLength(6);
    expect(inside.text.every((row) => row.length === 20)).toBe(true);
    expect(inside.cells).toHaveLength(inside.cellCount);
    expect(historyLength()).toBe(before);
  });

  it('applies animated-text typewriter defaults and unit conversion', async () => {
    const { layerId } = await ok({ type: 'add_generator_layer', generatorType: 'animated-text', durationFrames: 10, settings: { text: 'Hello' } });
    const before = historyLength();
    let applied = await ok({ type: 'set_generator_property', layerId: layerId!, propertyPath: 'effect', value: 'typewriter' });
    expect(historyLength()).toBe(before + 1);
    const endTrack = applied.generator!.propertyTracks.find((t) => t.propertyPath === 'typewriter.end')!;
    expect(endTrack.keyframes.map((k) => [k.frame, k.value])).toEqual([[0, 0], [9, 100]]);

    applied = await ok({ type: 'set_generator_property', layerId: layerId!, propertyPath: 'typewriter.units', value: 'index', frame: 0 });
    expect(applied.generator!.settings['typewriter.units']).toBe('index');
    const converted = applied.generator!.propertyTracks.find((t) => t.propertyPath === 'typewriter.end')!;
    expect(converted.keyframes.at(-1)!.value).toBe(5);

    const other = await ok({ type: 'add_generator_layer', generatorType: 'animated-text' });
    applied = await ok({ type: 'set_generator_property', layerId: other.layerId!, propertyPath: 'effect', value: 'typewriter', applyEffectDefaults: false });
    expect(applied.generator!.propertyTracks).toHaveLength(0);
  });

  it('bakes a generator layer into content frames with undo', async () => {
    const layerId = await addNoise({ durationFrames: 3 });
    const applied = await ok({ type: 'bake_generator_layer', layerId });
    expect(applied.generator).toBeUndefined();
    expect(applied.layer).toMatchObject({ id: layerId });
    expect(applied.layer).not.toHaveProperty('kind');
    expect((applied.layer!.contentFrames as unknown[]).length).toBeGreaterThan(0);
    expect(useToolStore.getState().historyStack.at(-1)!.type).toBe('generator_bake');

    replayUndo();
    expect(source(layerId)).toBeDefined();
  });
});
