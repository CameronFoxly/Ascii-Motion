import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimelineStore } from '../stores/timelineStore';
import { useToolStore } from '../stores/toolStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import { registerAllGenerators } from '../registry/generators';
import { useTimelineHistory } from '../hooks/useTimelineHistory';
import { processHistoryAction } from '../hooks/useKeyboardShortcuts';
import { CanvasActionButtons } from '../components/features/CanvasActionButtons';
import { GeneratorPropertiesPanel } from '../components/features/timeline/GeneratorPropertiesPanel';
import { GeneratorBlock } from '../components/features/timeline/GeneratorBlock';
import { KeyframeEditorPanel } from '../components/features/timeline/KeyframeEditorPanel';
import { KeyframeDiamond } from '../components/features/timeline/KeyframeDiamond';
import { TimelineContextMenu } from '../components/features/timeline/TimelineContextMenu';
import {
  addGeneratorLayerWithHistory,
  bakeGeneratorLayerWithHistory,
  withGeneratorHistory,
} from '../utils/generators/generatorHistory';
import type { LayerId, PropertyTrackId } from '../types/timeline';

vi.mock('../hooks/useKeyboardShortcuts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../hooks/useKeyboardShortcuts')>();
  return {
    ...original,
    useKeyboardShortcuts: () => ({ copySelection: vi.fn(), pasteSelection: vi.fn() }),
  };
});
vi.mock('../hooks/useProjectFileActions', () => ({ useProjectFileActions: vi.fn() }));

let layerId: LayerId;
const source = () => useTimelineStore.getState().getLayer(layerId)!.generator!;

function replay(redo = false) {
  act(() => {
    const action = redo ? useToolStore.getState().redo() : useToolStore.getState().undo();
    expect(action).toBeDefined();
    processHistoryAction(action!, redo, useCanvasStore.getState(), useAnimationStore.getState());
  });
}

function addTrack() {
  const tl = useTimelineStore.getState();
  const trackId = tl.addGeneratorPropertyTrack(layerId, 'baseFrequency')!;
  const keyframeId = tl.addGeneratorKeyframe(layerId, trackId, 0, 0.1)!;
  return { trackId, keyframeId };
}

beforeEach(() => {
  registerAllGenerators();
  useTimelineStore.getState().createNewProject();
  useCanvasStore.getState().setCanvasSize(20, 10);
  layerId = useTimelineStore.getState().addGeneratorLayer('turbulent-noise', { durationFrames: 12 })!;
  useToolStore.getState().clearHistory();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('generator history replay', () => {
  it.each([
    ['settings', () => useTimelineStore.getState().updateGeneratorSettings(layerId, { baseFrequency: 0.5 })],
    ['timing', () => useTimelineStore.getState().updateGeneratorTiming(layerId, 3, 8, true)],
    ['enable', () => useTimelineStore.getState().toggleGeneratorEnabled(layerId)],
    ['seed', () => useTimelineStore.getState().randomizeGeneratorSeed(layerId, 0)],
    ['reset', () => useTimelineStore.getState().resetGeneratorSettings(layerId)],
    ['remove track', () => useTimelineStore.getState().removeGeneratorPropertyTrack(layerId, source().propertyTracks[0].id, 0)],
  ] as const)('undoes and redoes %s, preserving keyframe IDs and easing', (_name, mutate) => {
    const { trackId, keyframeId } = addTrack();
    useTimelineStore.getState().updateGeneratorKeyframe(layerId, trackId, keyframeId, {
      easing: { type: 'custom', x1: 0.2, y1: 0.3, x2: 0.8, y2: 0.9 },
    });
    const before = structuredClone(source());
    withGeneratorHistory(layerId, 'Generator edit', mutate);
    const after = structuredClone(source());
    expect(after).not.toEqual(before);
    expect(useToolStore.getState().historyStack).toHaveLength(1);
    for (let i = 0; i < 2; i++) {
      replay();
      expect(source()).toEqual(before);
      replay(true);
      expect(source()).toEqual(after);
    }
    expect(useToolStore.getState().historyStack).toHaveLength(1);
  });

  it('does not record unchanged values or selection', () => {
    withGeneratorHistory(layerId, 'No change', () =>
      useTimelineStore.getState().updateGeneratorSettings(layerId, { baseFrequency: source().settings.baseFrequency }));
    useTimelineStore.getState().selectGeneratorLayer(null);
    expect(useToolStore.getState().historyStack).toHaveLength(0);
  });

  it('restores creation and baking through the canvas Undo/Redo buttons', () => {
    render(<CanvasActionButtons />);
    let addedId: LayerId;
    act(() => { addedId = addGeneratorLayerWithHistory('radio-waves')!; });
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(useTimelineStore.getState().getLayer(addedId!)).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(useTimelineStore.getState().getLayer(addedId!)?.kind).toBe('generator');

    const before = structuredClone(useTimelineStore.getState().getLayer(layerId)!);
    act(() => bakeGeneratorLayerWithHistory(layerId));
    const baked = structuredClone(useTimelineStore.getState().getLayer(layerId)!);
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
      expect(useTimelineStore.getState().getLayer(layerId)).toEqual(before);
      fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
      expect(useTimelineStore.getState().getLayer(layerId)).toEqual(baked);
    }
  });

  it('clears the redo branch when another generator edit is committed', () => {
    withGeneratorHistory(layerId, 'Disable', () => useTimelineStore.getState().toggleGeneratorEnabled(layerId));
    replay();
    withGeneratorHistory(layerId, 'Settings', () => useTimelineStore.getState().updateGeneratorSettings(layerId, { baseFrequency: 0.7 }));
    expect(useToolStore.getState().canRedo()).toBe(false);
    expect(useToolStore.getState().historyStack).toHaveLength(1);
  });
});

describe('generator property controls', () => {
  it('commits a typed value once and restores it using canvas buttons', () => {
    render(<><GeneratorPropertiesPanel /><CanvasActionButtons /></>);
    const input = screen.getByTitle('Base Frequency').parentElement!.querySelector('input')!;
    const previous = source().settings.baseFrequency;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '0.5' } });
    fireEvent.blur(input);
    expect(source().settings.baseFrequency).toBe(0.5);
    expect(useToolStore.getState().historyStack).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(source().settings.baseFrequency).toBe(previous);
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(source().settings.baseFrequency).toBe(0.5);
  });

  it('records a numeric scrub as one undo step', () => {
    render(<GeneratorPropertiesPanel />);
    const previous = structuredClone(source());
    fireEvent.mouseDown(screen.getByTitle('Base Frequency'), { button: 0, clientX: 10 });
    fireEvent.mouseMove(document, { clientX: 110 });
    fireEvent.mouseMove(document, { clientX: 210 });
    expect(useToolStore.getState().historyStack).toHaveLength(0);
    fireEvent.mouseUp(document);
    const after = structuredClone(source());
    expect(after).not.toEqual(previous);
    expect(useToolStore.getState().historyStack).toHaveLength(1);
    replay();
    expect(source()).toEqual(previous);
    replay(true);
    expect(source()).toEqual(after);
  });

  it('records select, boolean, and numeric mapping edits', () => {
    render(<GeneratorPropertiesPanel />);
    const before = structuredClone(source());
    const select = screen.getByTitle('Noise Type').parentElement!.querySelector('select')!;
    const nextOption = [...select.options].find((option) => option.value !== select.value)!;
    fireEvent.change(select, { target: { value: nextOption.value } });
    const booleanRow = screen.getByTitle('Map Background Color').parentElement!;
    fireEvent.click(booleanRow.querySelector('button:last-child')!);
    const numericInput = screen.getByTitle('Brightness').parentElement!.querySelector('input')!;
    fireEvent.focus(numericInput);
    fireEvent.change(numericInput, { target: { value: '0.5' } });
    fireEvent.blur(numericInput);
    expect(useToolStore.getState().historyStack).toHaveLength(3);
    replay(); replay(); replay();
    expect(source()).toEqual(before);
  });

  it('undoes auto-keying while preserving the original track', () => {
    addTrack();
    useTimelineStore.getState().goToFrame(5);
    render(<GeneratorPropertiesPanel />);
    const before = structuredClone(source());
    const input = screen.getByTitle('Base Frequency').parentElement!.querySelector('input')!;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '0.5' } });
    fireEvent.blur(input);
    expect(source().propertyTracks[0].keyframes).toHaveLength(2);
    replay();
    expect(source()).toEqual(before);
    replay(true);
    expect(source().propertyTracks[0].keyframes).toHaveLength(2);
  });
});

describe('generator timeline keyframes', () => {
  it('records generic timeline add, update and remove operations', () => {
    const { trackId, keyframeId } = addTrack();
    const { result } = renderHook(() => useTimelineHistory());
    const before = structuredClone(source());
    act(() => {
      result.current.addKeyframe(layerId, trackId as PropertyTrackId, 5, 0.4);
      result.current.updateKeyframe(layerId, trackId as PropertyTrackId, keyframeId, { easing: { type: 'ease-in' } });
      result.current.removeKeyframe(layerId, trackId as PropertyTrackId, keyframeId);
    });
    const after = structuredClone(source());
    expect(useToolStore.getState().historyStack).toHaveLength(3);
    for (let i = 0; i < 2; i++) {
      replay(); replay(); replay();
      expect(source()).toEqual(before);
      replay(true); replay(true); replay(true);
      expect(source()).toEqual(after);
    }
  });

  it('restores a keyframe replaced at the same frame', () => {
    const { trackId } = addTrack();
    const { result } = renderHook(() => useTimelineHistory());
    const before = structuredClone(source());
    act(() => { result.current.addKeyframe(layerId, trackId as PropertyTrackId, 0, 0.9); });
    const after = structuredClone(source());
    replay();
    expect(source()).toEqual(before);
    replay(true);
    expect(source()).toEqual(after);
  });

  it('records keyframe editor value, frame, easing, loop, and delete changes', () => {
    const { keyframeId } = addTrack();
    useTimelineStore.getState().setEditingKeyframe(keyframeId);
    useTimelineStore.getState().selectKeyframes([keyframeId]);
    render(<KeyframeEditorPanel />);
    const before = structuredClone(source());
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '3' } });
    fireEvent.change(inputs[1], { target: { value: '0.6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ease In' }));
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(useToolStore.getState().historyStack).toHaveLength(5);
    const after = structuredClone(source());
    replay(); replay(); replay(); replay(); replay();
    expect(source()).toEqual(before);
    replay(true); replay(true); replay(true); replay(true); replay(true);
    expect(source()).toEqual(after);
  });

  it('allows partial numeric keyframe input before validating on blur', () => {
    const { keyframeId } = addTrack();
    useTimelineStore.getState().setEditingKeyframe(keyframeId);
    render(<KeyframeEditorPanel />);
    const value = screen.getAllByRole('spinbutton')[1];
    fireEvent.change(value, { target: { value: '0' } });
    expect(source().propertyTracks[0].keyframes[0].value).toBe(0);
    fireEvent.change(value, { target: { value: '0.5' } });
    expect(source().propertyTracks[0].keyframes[0].value).toBe(0.5);
    fireEvent.change(value, { target: { value: '0' } });
    fireEvent.blur(value);
    expect(source().propertyTracks[0].keyframes[0].value).toBe(0.1);
  });

  it('copies and pastes generator keyframes with easing and restores replaced keys', () => {
    const { trackId, keyframeId } = addTrack();
    const tl = useTimelineStore.getState();
    tl.updateGeneratorKeyframe(layerId, trackId, keyframeId, { easing: { type: 'ease-in' } });
    tl.addGeneratorKeyframe(layerId, trackId, 5, 0.9);
    tl.copyKeyframes([keyframeId]);
    expect(useTimelineStore.getState().copiedKeyframes).toHaveLength(1);
    const before = structuredClone(source());
    render(<TimelineContextMenu menu={{
      x: 0, y: 0,
      context: { kind: 'property-track', layerId, trackId: trackId as PropertyTrackId, clickFrame: 5 },
    }} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Paste keyframe here'));
    const after = structuredClone(source());
    expect(after.propertyTracks[0].keyframes[1]).toMatchObject({ frame: 5, value: 0.1, easing: { type: 'ease-in' } });
    expect(useToolStore.getState().historyStack).toHaveLength(1);
    for (let i = 0; i < 2; i++) {
      replay();
      expect(source()).toEqual(before);
      replay(true);
      expect(source()).toEqual(after);
    }
  });

  it('records a keyframe value scrub as one undo step', () => {
    const { keyframeId } = addTrack();
    useTimelineStore.getState().setEditingKeyframe(keyframeId);
    render(<KeyframeEditorPanel />);
    const before = structuredClone(source());
    fireEvent.mouseDown(screen.getByText('Value'), { button: 0, clientX: 10 });
    fireEvent.mouseMove(document, { clientX: 110 });
    fireEvent.mouseMove(document, { clientX: 210 });
    expect(useToolStore.getState().historyStack).toHaveLength(0);
    fireEvent.mouseUp(document);
    const after = structuredClone(source());
    expect(after).not.toEqual(before);
    expect(useToolStore.getState().historyStack).toHaveLength(1);
    replay();
    expect(source()).toEqual(before);
    replay(true);
    expect(source()).toEqual(after);
  });

  it.each([false, true])('records keyframe drag (duplicate=%s) with stable IDs on redo', (duplicate) => {
    const { trackId } = addTrack();
    const before = structuredClone(source());
    const keyframe = source().propertyTracks[0].keyframes[0];
    const { container } = render(<KeyframeDiamond
      layerId={layerId} trackId={trackId as PropertyTrackId}
      keyframe={keyframe as import('../types/timeline').Keyframe}
      pxPerFrame={10} scrollX={0} isSelected={false}
    />);
    const diamond = container.querySelector('[data-keyframe-diamond]') ?? container.querySelector('[title]')!;
    fireEvent.mouseDown(diamond, { button: 0, clientX: 10, altKey: duplicate });
    fireEvent.mouseMove(document, { clientX: 60 });
    fireEvent.mouseUp(document);
    const after = structuredClone(source());
    expect(after.propertyTracks[0].keyframes).toHaveLength(duplicate ? 2 : 1);
    expect(useToolStore.getState().historyStack).toHaveLength(1);
    for (let i = 0; i < 2; i++) {
      replay();
      expect(source()).toEqual(before);
      replay(true);
      expect(source()).toEqual(after);
    }
  });

  it.each(['move', 'left', 'right'])('records generator block %s as one undo step', (mode) => {
    addTrack();
    const before = structuredClone(source());
    const layer = useTimelineStore.getState().getLayer(layerId)!;
    const { container } = render(<GeneratorBlock layer={layer} pxPerFrame={10} />);
    const block = container.querySelector('[data-generator-block]')!;
    const target = mode === 'move' ? block : block.querySelector(mode === 'left' ? '.cursor-ew-resize' : '.right-0')!;
    fireEvent.mouseDown(target, { button: 0, clientX: 10 });
    fireEvent.mouseMove(document, { clientX: 30 });
    fireEvent.mouseMove(document, { clientX: 40 });
    fireEvent.mouseUp(document);
    const after = structuredClone(source());
    expect(after).not.toEqual(before);
    expect(useToolStore.getState().historyStack).toHaveLength(1);
    replay();
    expect(source()).toEqual(before);
    replay(true);
    expect(source()).toEqual(after);
  });
});
