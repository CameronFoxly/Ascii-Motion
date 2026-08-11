import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFrameSynchronization } from '../hooks/useFrameSynchronization';
import { MCPClient } from '../mcp/client';
import { MCPCommandDispatcher } from '../mcp/commandDispatcher';
import { useMCPStore } from '../mcp/store';
import type {
  MCPCommandRequest,
  MCPCommandResult,
} from '../mcp/types';
import { useAnimationStore } from '../stores/animationStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useProjectMetadataStore } from '../stores/projectMetadataStore';
import { useTimelineStore } from '../stores/timelineStore';
import type { Cell } from '../types';
import type { SessionDataV2 } from '../types/timeline';

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
    this.onmessage?.(new MessageEvent('message', {
      data: JSON.stringify(message),
    }));
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
  }
}

function cell(char: string): Cell {
  return {
    char,
    color: '#ffffff',
    bgColor: '#000000',
  };
}

function resetStores(): void {
  useTimelineStore.getState().createNewProject();
  useCanvasStore.setState({
    width: 80,
    height: 24,
    cells: new Map(),
    canvasBackgroundColor: '#000000',
    showGrid: true,
    activeLayerId: null,
    isDirty: false,
  });
  useAnimationStore.setState({
    isImportingSession: false,
    selectedFrameIndices: new Set([0]),
  });
  useProjectMetadataStore.getState().resetProject();
  useMCPStore.getState().reset();
}

function sentCommandResults(socket: MockWebSocket): MCPCommandResult[] {
  return socket.sent
    .map((message) => JSON.parse(message) as unknown)
    .filter((message): message is MCPCommandResult => (
      typeof message === 'object'
      && message !== null
      && 'type' in message
      && message.type === 'command_result'
    ));
}

async function connectClient(): Promise<{
  client: MCPClient;
  socket: MockWebSocket;
}> {
  const client = new MCPClient();
  const connection = client.connect('test-token');
  const socket = MockWebSocket.instances.at(-1);
  if (!socket) {
    throw new Error('MCPClient did not create a WebSocket');
  }

  socket.open();
  await connection;
  socket.sent.length = 0;
  return { client, socket };
}

async function sendCommand(
  socket: MockWebSocket,
  request: MCPCommandRequest,
): Promise<MCPCommandResult> {
  socket.receive(request);

  await vi.waitFor(() => {
    expect(
      sentCommandResults(socket).filter((result) => result.requestId === request.requestId),
    ).toHaveLength(1);
  });

  return sentCommandResults(socket).find(
    (result) => result.requestId === request.requestId,
  )!;
}

function makeV1Session(): Record<string, unknown> {
  return {
    version: '1.0.0',
    name: 'Loaded V1',
    canvas: {
      width: 40,
      height: 20,
      canvasBackgroundColor: '#101010',
      showGrid: false,
    },
    animation: {
      currentFrameIndex: 0,
      frameRate: 10,
      looping: true,
      frames: [
        {
          id: 'v1-frame-1',
          name: 'First',
          duration: 100,
          data: { '1,1': cell('V') },
        },
        {
          id: 'v1-frame-2',
          name: 'Second',
          duration: 200,
          data: { '2,2': cell('1') },
        },
      ],
    },
    tools: {
      activeTool: 'pencil',
      selectedColor: '#ffffff',
    },
  };
}

function makeV2Session(): SessionDataV2 {
  return {
    version: '2.0.0',
    name: 'Loaded V2',
    canvas: {
      width: 60,
      height: 30,
      canvasBackgroundColor: '#202020',
      showGrid: true,
    },
    timeline: {
      frameRate: 24,
      durationFrames: 4,
      looping: false,
    },
    layers: [
      {
        id: 'loaded-layer',
        name: 'Loaded Layer',
        visible: true,
        solo: false,
        locked: false,
        opacity: 100,
        contentFrames: [
          {
            id: 'loaded-frame',
            name: 'Loaded Frame',
            startFrame: 0,
            durationFrames: 4,
            data: { '3,2': cell('2') },
          },
        ],
        propertyTracks: [],
      },
    ],
  };
}

describe('MCPCommandDispatcher', () => {
  it('executes and emits command results strictly FIFO', async () => {
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const started: string[] = [];
    const emitted: MCPCommandResult[] = [];
    const dispatcher = new MCPCommandDispatcher(
      async (command) => {
        started.push(command.type);
        if (command.type === 'load_project') {
          await firstGate;
        }
        return command.type === 'set_frame_rate'
          ? { frameRate: command.fps }
          : undefined;
      },
      (result) => emitted.push(result),
    );

    const first = dispatcher.dispatch({
      type: 'command_request',
      requestId: 'first',
      command: { type: 'load_project', sessionData: {} },
    });
    const second = dispatcher.dispatch({
      type: 'command_request',
      requestId: 'second',
      command: { type: 'set_frame_rate', fps: 24 },
    });
    const malformed = dispatcher.reject('malformed', 'invalid command');

    await Promise.resolve();
    expect(started).toEqual(['load_project']);
    expect(emitted).toEqual([]);

    releaseFirst?.();
    await Promise.all([first, second, malformed]);

    expect(started).toEqual(['load_project', 'set_frame_rate']);
    expect(emitted.map((result) => result.requestId)).toEqual([
      'first',
      'second',
      'malformed',
    ]);
    expect(emitted[2]).toEqual({
      type: 'command_result',
      requestId: 'malformed',
      success: false,
      error: 'invalid command',
    });
  });

  it('emits one correlated failure result when a handler throws', async () => {
    const emitted: MCPCommandResult[] = [];
    const dispatcher = new MCPCommandDispatcher(
      () => {
        throw new Error('invalid command payload');
      },
      (result) => emitted.push(result),
    );

    const result = await dispatcher.dispatch({
      type: 'command_request',
      requestId: 'failure-id',
      command: { type: 'set_frame_rate', fps: 0 },
    });

    expect(result).toEqual({
      type: 'command_result',
      requestId: 'failure-id',
      success: false,
      error: 'invalid command payload',
    });
    expect(emitted).toEqual([result]);
  });
});

describe('MCPClient acknowledged commands', () => {
  const clients: MCPClient[] = [];

  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    resetStores();
  });

  afterEach(() => {
    for (const client of clients.splice(0)) {
      client.disconnect();
    }
    vi.unstubAllGlobals();
  });

  async function connected(): Promise<MockWebSocket> {
    const { client, socket } = await connectClient();
    clients.push(client);
    return socket;
  }

  it('writes targeted inactive and active content-frame batches', async () => {
    const timeline = useTimelineStore.getState();
    const layer = timeline.layers[0];
    timeline.updateContentFrameData(layer.id, layer.contentFrames[0].id, new Map([
      ['0,0', cell('A')],
    ]));
    timeline.addContentFrame(layer.id, 1, 1, new Map([
      ['0,0', cell('B')],
    ]));
    timeline.goToFrame(0);
    useCanvasStore.getState().setActiveLayerId(layer.id);
    useCanvasStore.getState().setCanvasData(new Map([['0,0', cell('A')]]));

    const socket = await connected();
    const inactiveResult = await sendCommand(socket, {
      type: 'command_request',
      requestId: 'inactive-batch',
      command: {
        type: 'set_cells_batch',
        frameIndex: 1,
        cells: [{ x: 1, y: 0, cell: cell('I') }],
      },
    });

    const afterInactive = useTimelineStore.getState().layers[0];
    expect(inactiveResult).toMatchObject({
      success: true,
      applied: { currentFrameIndex: 0, cellsChanged: 1 },
    });
    expect(afterInactive.contentFrames[1].data.get('1,0')).toEqual(cell('I'));
    expect(useCanvasStore.getState().cells.get('1,0')).toBeUndefined();

    const activeResult = await sendCommand(socket, {
      type: 'command_request',
      requestId: 'active-batch',
      command: {
        type: 'set_cells_batch',
        frameIndex: 0,
        cells: [{ x: 2, y: 0, cell: cell('C') }],
      },
    });

    expect(activeResult).toMatchObject({
      success: true,
      applied: { currentFrameIndex: 0, cellsChanged: 1 },
    });
    expect(useTimelineStore.getState().layers[0].contentFrames[0].data.get('2,0')).toEqual(cell('C'));
    expect(useCanvasStore.getState().cells.get('2,0')).toEqual(cell('C'));
  });

  it('reports the timeline playhead for a targetless batch', async () => {
    const timeline = useTimelineStore.getState();
    const layer = timeline.layers[0];
    const firstFrame = layer.contentFrames[0];
    timeline.setDuration(6);
    expect(timeline.updateContentFrameTiming(layer.id, firstFrame.id, 0, 5)).toBe(true);
    timeline.addContentFrame(layer.id, 5, 1, new Map([
      ['0,0', cell('B')],
    ]));
    timeline.goToFrame(5);
    useCanvasStore.getState().setActiveLayerId(layer.id);
    useCanvasStore.getState().setCanvasData(new Map([['0,0', cell('B')]]));

    const socket = await connected();
    const result = await sendCommand(socket, {
      type: 'command_request',
      requestId: 'targetless-batch',
      command: {
        type: 'set_cells_batch',
        cells: [{ x: 1, y: 0, cell: cell('T') }],
      },
    });

    expect(result).toMatchObject({
      success: true,
      applied: { currentFrameIndex: 5, cellsChanged: 1 },
    });
    expect(useTimelineStore.getState().layers[0].contentFrames[1].data.get('1,0')).toEqual(cell('T'));
    expect(useCanvasStore.getState().cells.get('1,0')).toEqual(cell('T'));
  });

  it('returns one correlated failure without partially applying an invalid batch', async () => {
    const socket = await connected();
    const result = await sendCommand(socket, {
      type: 'command_request',
      requestId: 'invalid-batch',
      command: {
        type: 'set_cells_batch',
        frameIndex: 99,
        cells: [{ x: 0, y: 0, cell: cell('X') }],
      },
    });

    expect(result).toMatchObject({
      requestId: 'invalid-batch',
      success: false,
    });
    expect(sentCommandResults(socket).filter(
      (entry) => entry.requestId === 'invalid-batch',
    )).toHaveLength(1);
    expect(useCanvasStore.getState().cells.size).toBe(0);
  });

  it('serializes variable-duration navigation before an immediate current-frame batch', async () => {
    const timeline = useTimelineStore.getState();
    const layer = timeline.layers[0];
    timeline.updateContentFrameData(layer.id, layer.contentFrames[0].id, new Map([
      ['0,0', cell('stored-old')],
    ]));
    timeline.setDuration(6);
    expect(timeline.updateContentFrameTiming(
      layer.id,
      layer.contentFrames[0].id,
      0,
      5,
    )).toBe(true);
    timeline.addContentFrame(layer.id, 5, 1, new Map([
      ['0,0', cell('target')],
    ]));
    timeline.goToFrame(0);
    useCanvasStore.setState({
      cells: new Map([['0,0', cell('canvas-old')]]),
      activeLayerId: layer.id,
      isDirty: true,
    });

    const { unmount } = renderHook(() => useFrameSynchronization());
    const socket = await connected();
    const resultCanvasSnapshots = new Map<string, Map<string, Cell>>();
    vi.spyOn(socket, 'send').mockImplementation((data) => {
      socket.sent.push(data);
      const message = JSON.parse(data) as Partial<MCPCommandResult>;
      if (message.type === 'command_result' && message.requestId) {
        resultCanvasSnapshots.set(
          message.requestId,
          new Map(useCanvasStore.getState().cells),
        );
      }
    });

    act(() => {
      socket.receive({
        type: 'command_request',
        requestId: 'navigate',
        command: { type: 'go_to_frame', index: 5 },
      });
      socket.receive({
        type: 'command_request',
        requestId: 'mutate-target',
        command: {
          type: 'set_cells_batch',
          cells: [{ x: 1, y: 0, cell: cell('pasted') }],
        },
      });
    });

    await vi.waitFor(() => {
      expect(sentCommandResults(socket)).toHaveLength(2);
    });

    const results = sentCommandResults(socket);
    expect(results.map((result) => result.requestId)).toEqual([
      'navigate',
      'mutate-target',
    ]);
    expect(results[0]).toEqual({
      type: 'command_result',
      requestId: 'navigate',
      success: true,
      applied: { currentFrameIndex: 5 },
    });
    expect(results[1]).toEqual({
      type: 'command_result',
      requestId: 'mutate-target',
      success: true,
      applied: { currentFrameIndex: 5, cellsChanged: 1 },
    });
    expect(resultCanvasSnapshots.get('navigate')).toEqual(new Map([
      ['0,0', cell('target')],
    ]));
    expect(resultCanvasSnapshots.get('mutate-target')).toEqual(new Map([
      ['0,0', cell('target')],
      ['1,0', cell('pasted')],
    ]));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    const appliedLayer = useTimelineStore.getState().layers[0];
    expect(useTimelineStore.getState().view.currentFrame).toBe(5);
    expect(appliedLayer.contentFrames[0].data).toEqual(new Map([
      ['0,0', cell('canvas-old')],
    ]));
    expect(appliedLayer.contentFrames[1].data).toEqual(new Map([
      ['0,0', cell('target')],
      ['1,0', cell('pasted')],
    ]));
    expect(useCanvasStore.getState().cells).toEqual(appliedLayer.contentFrames[1].data);
    unmount();
  });

  it('preserves the first immediate mutation after navigating to an empty target frame', async () => {
    const timeline = useTimelineStore.getState();
    const layer = timeline.layers[0];
    timeline.updateContentFrameData(layer.id, layer.contentFrames[0].id, new Map([
      ['0,0', cell('stored-old')],
    ]));
    timeline.addContentFrame(layer.id, 1, 1, new Map());
    timeline.setDuration(2);
    timeline.goToFrame(0);
    useCanvasStore.setState({
      cells: new Map([['0,0', cell('canvas-old')]]),
      activeLayerId: layer.id,
      isDirty: true,
    });

    const { unmount } = renderHook(() => useFrameSynchronization());
    const socket = await connected();

    act(() => {
      socket.receive({
        type: 'command_request',
        requestId: 'navigate-empty',
        command: { type: 'go_to_frame', index: 1 },
      });
      socket.receive({
        type: 'command_request',
        requestId: 'mutate-empty',
        command: {
          type: 'set_cells_batch',
          cells: [{ x: 1, y: 0, cell: cell('first') }],
        },
      });
    });

    await vi.waitFor(() => {
      expect(sentCommandResults(socket)).toHaveLength(2);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    expect(sentCommandResults(socket).map((result) => result.requestId)).toEqual([
      'navigate-empty',
      'mutate-empty',
    ]);
    const appliedLayer = useTimelineStore.getState().layers[0];
    expect(appliedLayer.contentFrames[0].data).toEqual(new Map([
      ['0,0', cell('canvas-old')],
    ]));
    expect(appliedLayer.contentFrames[1].data).toEqual(new Map([
      ['1,0', cell('first')],
    ]));
    expect(useCanvasStore.getState().cells).toEqual(appliedLayer.contentFrames[1].data);
    unmount();
  });

  it('returns a correlated failure when atomic frame synchronization is unavailable', async () => {
    const timeline = useTimelineStore.getState();
    timeline.setDuration(2);
    const socket = await connected();

    const result = await sendCommand(socket, {
      type: 'command_request',
      requestId: 'navigation-unavailable',
      command: { type: 'go_to_frame', index: 1 },
    });

    expect(result).toEqual({
      type: 'command_result',
      requestId: 'navigation-unavailable',
      success: false,
      error: 'Frame synchronization is unavailable',
    });
    expect(useTimelineStore.getState().view.currentFrame).toBe(0);
  });

  it('rejects an out-of-range navigation without changing installed state', async () => {
    const timeline = useTimelineStore.getState();
    timeline.setDuration(2);
    const beforeCanvas = new Map([['0,0', cell('current')]]);
    useCanvasStore.setState({
      cells: beforeCanvas,
      activeLayerId: timeline.layers[0].id,
      isDirty: true,
    });
    const { unmount } = renderHook(() => useFrameSynchronization());
    const socket = await connected();

    const result = await sendCommand(socket, {
      type: 'command_request',
      requestId: 'invalid-navigation',
      command: { type: 'go_to_frame', index: 2 },
    });

    expect(result).toEqual({
      type: 'command_result',
      requestId: 'invalid-navigation',
      success: false,
      error: 'go_to_frame index 2 is out of range for 2 timeline frames',
    });
    expect(useTimelineStore.getState().view.currentFrame).toBe(0);
    expect(useCanvasStore.getState().cells).toEqual(beforeCanvas);
    unmount();
  });

  it('changes playback speed while preserving frame counts and timings', async () => {
    const timeline = useTimelineStore.getState();
    timeline.setDuration(12);
    const beforeFrames = timeline.layers[0].contentFrames.map((frame) => ({
      startFrame: frame.startFrame,
      durationFrames: frame.durationFrames,
    }));
    const socket = await connected();

    const result = await sendCommand(socket, {
      type: 'command_request',
      requestId: 'set-fps',
      command: { type: 'set_frame_rate', fps: 24 },
    });

    const applied = useTimelineStore.getState();
    expect(applied.config).toMatchObject({
      frameRate: 24,
      durationFrames: 12,
      durationMs: 500,
    });
    expect(applied.layers[0].contentFrames.map((frame) => ({
      startFrame: frame.startFrame,
      durationFrames: frame.durationFrames,
    }))).toEqual(beforeFrames);
    expect(result).toMatchObject({
      success: true,
      applied: { frameRate: 24, durationMs: 500 },
    });
  });

  it('reflows later frames and the playhead while preserving visible content', async () => {
    const timeline = useTimelineStore.getState();
    timeline.setFrameRate(10, false);
    const layer = timeline.layers[0];
    timeline.updateContentFrameTiming(layer.id, layer.contentFrames[0].id, 0, 2);
    timeline.addContentFrame(layer.id, 2, 2, new Map([['0,0', cell('B')]]));
    timeline.addContentFrame(layer.id, 4, 2, new Map([['0,0', cell('C')]]));
    timeline.setDuration(6);
    timeline.goToFrame(4);
    useCanvasStore.getState().setActiveLayerId(layer.id);
    useCanvasStore.getState().setCanvasData(new Map([['0,0', cell('C')]]));
    const socket = await connected();

    const result = await sendCommand(socket, {
      type: 'command_request',
      requestId: 'set-duration',
      command: {
        type: 'set_frame_duration',
        index: 0,
        duration: 300,
      },
    });

    const applied = useTimelineStore.getState();
    expect(applied.layers[0].contentFrames.map((frame) => ({
      startFrame: frame.startFrame,
      durationFrames: frame.durationFrames,
    }))).toEqual([
      { startFrame: 0, durationFrames: 3 },
      { startFrame: 3, durationFrames: 2 },
      { startFrame: 5, durationFrames: 2 },
    ]);
    expect(applied.config).toMatchObject({
      durationFrames: 7,
      durationMs: 700,
    });
    expect(applied.view.currentFrame).toBe(5);
    expect(useCanvasStore.getState().cells.get('0,0')).toEqual(cell('C'));
    expect(result).toMatchObject({
      success: true,
      applied: { currentFrameIndex: 5, durationMs: 300 },
    });
  });

  it('clamps a playhead that falls beyond a shortened content frame', async () => {
    const timeline = useTimelineStore.getState();
    timeline.setFrameRate(10, false);
    const layer = timeline.layers[0];
    timeline.updateContentFrameTiming(layer.id, layer.contentFrames[0].id, 0, 3);
    timeline.setDuration(3);
    timeline.goToFrame(2);
    useCanvasStore.getState().setActiveLayerId(layer.id);
    useCanvasStore.getState().setCanvasData(new Map([['0,0', cell('A')]]));
    const socket = await connected();

    const result = await sendCommand(socket, {
      type: 'command_request',
      requestId: 'shorten-duration',
      command: {
        type: 'set_frame_duration',
        index: 0,
        duration: 100,
      },
    });

    expect(useTimelineStore.getState().view.currentFrame).toBe(0);
    expect(useTimelineStore.getState().config.durationFrames).toBe(1);
    expect(useCanvasStore.getState().cells.get('0,0')).toEqual(cell('A'));
    expect(result).toMatchObject({
      success: true,
      applied: { currentFrameIndex: 0, durationMs: 100 },
    });
  });

  it('rejects invalid frame durations without changing the sequence', async () => {
    const before = useTimelineStore.getState().layers[0].contentFrames.map((frame) => ({
      startFrame: frame.startFrame,
      durationFrames: frame.durationFrames,
    }));
    const socket = await connected();

    const result = await sendCommand(socket, {
      type: 'command_request',
      requestId: 'invalid-duration',
      command: {
        type: 'set_frame_duration',
        index: 0,
        duration: 0,
      },
    });

    expect(result).toMatchObject({ success: false });
    expect(useTimelineStore.getState().layers[0].contentFrames.map((frame) => ({
      startFrame: frame.startFrame,
      durationFrames: frame.durationFrames,
    }))).toEqual(before);
  });

  it('acknowledges a v1 project only after migrated stores and active canvas are installed', async () => {
    const socket = await connected();
    const result = await sendCommand(socket, {
      type: 'command_request',
      requestId: 'load-v1',
      command: {
        type: 'load_project',
        sessionData: makeV1Session(),
      },
    });

    const timeline = useTimelineStore.getState();
    expect(result).toMatchObject({
      success: true,
      applied: { currentFrameIndex: 0, frameRate: 10, durationMs: 300 },
    });
    expect(timeline.layers[0].contentFrames).toHaveLength(2);
    expect(useProjectMetadataStore.getState().projectName).toBe('Loaded V1');
    expect(useCanvasStore.getState().cells.get('1,1')).toEqual(cell('V'));
    expect(useAnimationStore.getState().isImportingSession).toBe(false);
  });

  it('acknowledges a v2 project only after stores and active canvas are installed', async () => {
    const socket = await connected();
    const result = await sendCommand(socket, {
      type: 'command_request',
      requestId: 'load-v2',
      command: {
        type: 'load_project',
        sessionData: makeV2Session(),
      },
    });

    const timeline = useTimelineStore.getState();
    expect(result).toMatchObject({
      success: true,
      applied: {
        currentFrameIndex: 0,
        frameRate: 24,
        durationMs: 1000 / 6,
      },
    });
    expect(timeline.layers[0].id).toBe('loaded-layer');
    expect(useProjectMetadataStore.getState().projectName).toBe('Loaded V2');
    expect(useCanvasStore.getState().cells.get('3,2')).toEqual(cell('2'));
    expect(useCanvasStore.getState().activeLayerId).toBe('loaded-layer');
    expect(useAnimationStore.getState().isImportingSession).toBe(false);
  });

  it('returns a correlated load failure for unsupported project data', async () => {
    const socket = await connected();
    const result = await sendCommand(socket, {
      type: 'command_request',
      requestId: 'load-invalid',
      command: {
        type: 'load_project',
        sessionData: {},
      },
    });

    expect(result).toEqual({
      type: 'command_result',
      requestId: 'load-invalid',
      success: false,
      error: 'Failed to import session: Unknown session file format',
    });
  });

  it('rejects malformed v2 data before mutating any project store', async () => {
    const timeline = useTimelineStore.getState();
    const layer = timeline.layers[0];
    timeline.updateContentFrameData(layer.id, layer.contentFrames[0].id, new Map([
      ['4,4', cell('O')],
    ]));
    useCanvasStore.setState({
      width: 50,
      height: 20,
      cells: new Map([['4,4', cell('O')]]),
      canvasBackgroundColor: '#303030',
      showGrid: false,
      activeLayerId: layer.id,
      isDirty: false,
    });
    useProjectMetadataStore.setState({
      projectName: 'Original Project',
      projectDescription: 'Must survive a rejected load',
      currentProjectId: 'original-project-id',
    });

    const before = {
      metadata: {
        projectName: useProjectMetadataStore.getState().projectName,
        projectDescription: useProjectMetadataStore.getState().projectDescription,
        currentProjectId: useProjectMetadataStore.getState().currentProjectId,
      },
      canvas: {
        width: useCanvasStore.getState().width,
        height: useCanvasStore.getState().height,
        cells: Array.from(useCanvasStore.getState().cells.entries()),
        canvasBackgroundColor: useCanvasStore.getState().canvasBackgroundColor,
        showGrid: useCanvasStore.getState().showGrid,
        activeLayerId: useCanvasStore.getState().activeLayerId,
        isDirty: useCanvasStore.getState().isDirty,
      },
      timeline: useTimelineStore.getState().getSessionData(),
      isImportingSession: useAnimationStore.getState().isImportingSession,
    };

    const mutation = vi.fn();
    const unsubscribe = [
      useProjectMetadataStore.subscribe(mutation),
      useCanvasStore.subscribe(mutation),
      useTimelineStore.subscribe(mutation),
      useAnimationStore.subscribe(mutation),
    ];

    const malformed = makeV2Session();
    (malformed.layers[0] as unknown as Record<string, unknown>).propertyTracks = undefined;

    const socket = await connected();
    const result = await sendCommand(socket, {
      type: 'command_request',
      requestId: 'load-malformed-v2',
      command: {
        type: 'load_project',
        sessionData: malformed,
      },
    });

    unsubscribe.forEach((unsubscribeStore) => unsubscribeStore());

    expect(result).toEqual({
      type: 'command_result',
      requestId: 'load-malformed-v2',
      success: false,
      error: 'Failed to import session: Invalid v2 session: session.layers[0].propertyTracks must be an array',
    });
    expect(mutation).not.toHaveBeenCalled();
    expect({
      metadata: {
        projectName: useProjectMetadataStore.getState().projectName,
        projectDescription: useProjectMetadataStore.getState().projectDescription,
        currentProjectId: useProjectMetadataStore.getState().currentProjectId,
      },
      canvas: {
        width: useCanvasStore.getState().width,
        height: useCanvasStore.getState().height,
        cells: Array.from(useCanvasStore.getState().cells.entries()),
        canvasBackgroundColor: useCanvasStore.getState().canvasBackgroundColor,
        showGrid: useCanvasStore.getState().showGrid,
        activeLayerId: useCanvasStore.getState().activeLayerId,
        isDirty: useCanvasStore.getState().isDirty,
      },
      timeline: useTimelineStore.getState().getSessionData(),
      isImportingSession: useAnimationStore.getState().isImportingSession,
    }).toEqual(before);
  });
});
