import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFrameSynchronization } from '../hooks/useFrameSynchronization';
import { navigateToFrameAtomically } from '../mcp/frameNavigation';
import { useAnimationStore } from '../stores/animationStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useTimelineStore } from '../stores/timelineStore';
import type { Cell } from '../types';

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
}

function setUpTwoFrames(targetData: Map<string, Cell>): void {
  const timeline = useTimelineStore.getState();
  const layer = timeline.layers[0];
  timeline.updateContentFrameData(
    layer.id,
    layer.contentFrames[0].id,
    new Map([['0,0', cell('stored-old')]]),
  );
  timeline.addContentFrame(layer.id, 1, 1, targetData);
  timeline.setDuration(2);
  timeline.goToFrame(0);

  useCanvasStore.setState({
    cells: new Map([['0,0', cell('canvas-old')]]),
    activeLayerId: layer.id,
    isDirty: true,
  });
}

describe('atomic MCP frame navigation', () => {
  beforeEach(resetStores);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('flushes the old canvas, sets the playhead, and loads populated target data before resolving', async () => {
    setUpTwoFrames(new Map([['1,0', cell('target')]]));
    const timelineEvents: string[] = [];
    let previousCanvasCells = useCanvasStore.getState().cells;

    const unsubscribeTimeline = useTimelineStore.subscribe((state) => {
      if (state.view.currentFrame !== 1) return;
      expect(state.layers[0].contentFrames[0].data.get('0,0')).toEqual(cell('canvas-old'));
      timelineEvents.push('playhead');
    });
    const unsubscribeCanvas = useCanvasStore.subscribe((state) => {
      if (state.cells === previousCanvasCells) return;
      previousCanvasCells = state.cells;
      expect(useTimelineStore.getState().view.currentFrame).toBe(1);
      timelineEvents.push('canvas');
    });
    const { unmount } = renderHook(() => useFrameSynchronization());

    let applied = -1;
    await act(async () => {
      applied = await navigateToFrameAtomically(1);
    });

    expect(applied).toBe(1);
    expect(timelineEvents.slice(0, 2)).toEqual(['playhead', 'canvas']);
    expect(useTimelineStore.getState().layers[0].contentFrames[0].data.get('0,0')).toEqual(
      cell('canvas-old'),
    );
    expect(useCanvasStore.getState().cells).toEqual(new Map([['1,0', cell('target')]]));
    expect(useCanvasStore.getState().cells).not.toBe(
      useTimelineStore.getState().layers[0].contentFrames[1].data,
    );

    unsubscribeTimeline();
    unsubscribeCanvas();
    unmount();
  });

  it('installs an empty canvas for an empty target frame', async () => {
    setUpTwoFrames(new Map());
    const { unmount } = renderHook(() => useFrameSynchronization());

    await act(async () => {
      await navigateToFrameAtomically(1);
    });

    expect(useTimelineStore.getState().view.currentFrame).toBe(1);
    expect(useTimelineStore.getState().layers[0].contentFrames[0].data.get('0,0')).toEqual(
      cell('canvas-old'),
    );
    expect(useCanvasStore.getState().cells.size).toBe(0);
    unmount();
  });

  it('flushes the layer installed on canvas when a timeline layer switch is still pending', async () => {
    setUpTwoFrames(new Map([['1,0', cell('layer-one-target')]]));
    const timeline = useTimelineStore.getState();
    const firstLayer = timeline.layers[0];
    const secondLayerId = timeline.addLayer('Layer 2');
    if (!secondLayerId) {
      throw new Error('Failed to add second layer');
    }
    timeline.updateContentFrameData(
      secondLayerId,
      useTimelineStore.getState().getLayer(secondLayerId)!.contentFrames[0].id,
      new Map([['2,0', cell('layer-two')]]),
    );
    timeline.setActiveLayer(firstLayer.id);
    useCanvasStore.setState({
      cells: new Map([['0,0', cell('unsaved-layer-one')]]),
      activeLayerId: firstLayer.id,
      isDirty: true,
    });
    const { unmount } = renderHook(() => useFrameSynchronization());

    useTimelineStore.getState().setActiveLayer(secondLayerId);
    await navigateToFrameAtomically(0);

    expect(
      useTimelineStore.getState().getLayer(firstLayer.id)!.contentFrames[0].data.get('0,0'),
    ).toEqual(cell('unsaved-layer-one'));
    expect(
      useTimelineStore.getState().getLayer(secondLayerId)!.contentFrames[0].data,
    ).toEqual(new Map([['2,0', cell('layer-two')]]));
    expect(useCanvasStore.getState().cells).toEqual(new Map([['2,0', cell('layer-two')]]));
    expect(useCanvasStore.getState().activeLayerId).toBe(secondLayerId);
    unmount();
  });

  it.each([-1, 2, 0.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid index %s without changing frame or canvas state',
    async (index) => {
      setUpTwoFrames(new Map([['1,0', cell('target')]]));
      const beforeTimelineData = new Map(
        useTimelineStore.getState().layers[0].contentFrames[0].data,
      );
      const beforeCanvasData = new Map(useCanvasStore.getState().cells);
      const { unmount } = renderHook(() => useFrameSynchronization());

      await expect(navigateToFrameAtomically(index)).rejects.toThrow(/go_to_frame index/);

      expect(useTimelineStore.getState().view.currentFrame).toBe(0);
      expect(useTimelineStore.getState().layers[0].contentFrames[0].data).toEqual(
        beforeTimelineData,
      );
      expect(useCanvasStore.getState().cells).toEqual(beforeCanvasData);
      unmount();
    },
  );

  it('propagates a transition failure and releases the loading guard', async () => {
    setUpTwoFrames(new Map([['1,0', cell('target')]]));
    let shouldThrow = true;
    const moveState = {
      originalData: new Map<string, Cell>(),
      originalPositions: new Set<string>(),
      startPos: { x: 0, y: 0 },
      baseOffset: { x: 0, y: 0 },
      currentOffset: { x: 0, y: 0 },
    };
    const setMoveState = (() => {
      if (shouldThrow) {
        throw new Error('move commit failed');
      }
    }) as NonNullable<Parameters<typeof useFrameSynchronization>[1]>;
    const { unmount } = renderHook(() => useFrameSynchronization(moveState, setMoveState));

    await expect(navigateToFrameAtomically(1)).rejects.toThrow('move commit failed');
    shouldThrow = false;

    await act(async () => {
      await expect(navigateToFrameAtomically(1)).resolves.toBe(1);
    });

    expect(useCanvasStore.getState().cells.get('1,0')).toEqual(cell('target'));
    unmount();
  });
});
