import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useTextTool } from '../hooks/useTextTool';
import { useFrameNavigation } from '../hooks/useFrameNavigation';
import { useFrameSynchronization } from '../hooks/useFrameSynchronization';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useAnimationStore } from '../stores/animationStore';
import { processHistoryAction } from '../hooks/useKeyboardShortcuts';
import { layoutTextBox, textBoxCaret, textBoxOffsetAt, textBoxToolbarPosition } from '../utils/textBoxLayout';
import type { Cell } from '../types';

const BOX = { left: 1, top: 1, right: 3, bottom: 2 };
const cell = (char: string): Cell => ({ char, color: '#ffffff', bgColor: 'transparent' });
const keyEvent = (key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key, ...init });
  Object.defineProperty(event, 'target', { value: document.body });
  return event;
};
const pressKey = (result: { current: ReturnType<typeof useTextTool> }, key: string, init?: KeyboardEventInit) =>
  act(() => result.current.handleTextToolKeyDown(keyEvent(key, init)));
const typeInto = (result: { current: ReturnType<typeof useTextTool> }, text: string) => {
  for (const char of text) pressKey(result, char);
};
const charAt = (x: number, y: number) => useCanvasStore.getState().getCell(x, y)?.char ?? ' ';
const edit = () => useToolStore.getState().textToolState.boxEdit!;

beforeEach(() => {
  useTimelineStore.getState().createNewProject();
  const layer = useTimelineStore.getState().layers[0];
  useCanvasStore.setState({ width: 10, height: 10, cells: new Map(), activeLayerId: layer.id, activeFrameIndex: 0, isDirty: false });
  useToolStore.setState({ activeTool: 'text', historyStack: [], historyPosition: -1, isPlaybackMode: false });
  useToolStore.getState().stopTyping();
});

afterEach(() => {
  cleanup();
  useToolStore.getState().stopTyping();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('text box layout', () => {
  it('wraps words and hard-wraps long words without losing text', () => {
    const box = { ...BOX, right: 7 };
    const lines = layoutTextBox('hello world ABCDEFGHI', box, 'left');
    expect(lines.map((line) => line.text)).toEqual(['hello', 'world', 'ABCDEFG', 'HI']);
    expect(lines.map((line) => line.start)).toEqual([0, 6, 12, 19]);
  });

  it('retains explicit blank lines and trailing newlines', () => {
    const lines = layoutTextBox('A\n\nB\n', BOX, 'left');
    expect(lines.map((line) => line.text)).toEqual(['A', '', 'B', '']);
    expect(textBoxCaret(lines, 5)).toEqual({ x: 1, y: 4 });
  });

  it('aligns each visual line and maps caret positions and clicks', () => {
    const box = { ...BOX, right: 7 };
    expect(layoutTextBox('ABC', box, 'left')[0].x).toBe(1);
    expect(layoutTextBox('ABC', box, 'center')[0].x).toBe(3);
    const lines = layoutTextBox('ABC\nD', box, 'right');
    expect(lines[0].x).toBe(5);
    expect(lines[1].x).toBe(7);
    expect(textBoxCaret(lines, 2)).toEqual({ x: 7, y: 1 });
    expect(textBoxOffsetAt(lines, 0, 2)).toBe(4);
    expect(textBoxOffsetAt(lines, 99, 99)).toBe(5);
  });

  it('maps soft-wrap boundaries to the next row', () => {
    const lines = layoutTextBox('ABCDE', BOX, 'left');
    expect(textBoxCaret(lines, 3)).toEqual({ x: 1, y: 2 });
    expect(textBoxOffsetAt(lines, 2, 2)).toBe(4);
  });

  it('handles empty and one-column boxes', () => {
    expect(layoutTextBox('', BOX, 'center')).toHaveLength(1);
    expect(layoutTextBox('AB C', { ...BOX, right: 1 }, 'left').map((line) => line.text)).toEqual(['A', 'B', 'C']);
  });

  it('keeps non-BMP characters intact and maps visual columns to textarea offsets', () => {
    const lines = layoutTextBox('A😀BC', { ...BOX, right: 2 }, 'left');
    expect(lines.map((line) => line.text)).toEqual(['A😀', 'BC']);
    expect(lines[0].characters.map((character) => character.text)).toEqual(['A', '😀']);
    expect(lines[1].start).toBe(3);
    expect(textBoxOffsetAt(lines, 1, 2)).toBe(3);
    expect(textBoxCaret(lines, 3)).toEqual({ x: 1, y: 2 });
  });

  it('places alignment controls below the corner, flips above, and clamps offscreen boxes', () => {
    expect(textBoxToolbarPosition(300, 100, 600, 400)).toEqual({ left: 192, top: 108 });
    expect(textBoxToolbarPosition(300, 390, 600, 400)).toEqual({ left: 192, top: 346 });
    expect(textBoxToolbarPosition(900, 1000, 600, 400)).toEqual({ left: 488, top: 360 });
    expect(textBoxToolbarPosition(20, 20, 600, 400)).toEqual({ left: 4, top: 28 });
  });
});

describe('dragged text box editing', () => {
  beforeEach(() => useToolStore.getState().startTyping(BOX.left, BOX.top, BOX));

  it('keeps typing in a draft, without dirtying canvas, history, or timeline', () => {
    const { result } = renderHook(() => useTextTool());
    typeInto(result, 'ABCD');
    expect(edit().text).toBe('ABCD');
    expect(charAt(1, 1)).toBe(' ');
    expect(useCanvasStore.getState().isDirty).toBe(false);
    expect(useToolStore.getState().historyStack).toHaveLength(0);
    expect(useTimelineStore.getState().layers[0].contentFrames[0].data.size).toBe(0);
    expect(useToolStore.getState().textToolState.cursorPosition).toEqual({ x: 2, y: 2 });
  });

  it('grows the height and retains off-canvas text', () => {
    const { result } = renderHook(() => useTextTool());
    typeInto(result, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
    expect(edit().text).toHaveLength(36);
    expect(useToolStore.getState().textToolState.textBox?.bottom).toBe(12);
    pressKey(result, 'Enter', { metaKey: true });
    expect(charAt(3, 12)).toBe('9');
    expect(useCanvasStore.getState().height).toBe(10);
  });

  it('inserts and deletes at a logical caret instead of overwriting cells', () => {
    const { result } = renderHook(() => useTextTool());
    typeInto(result, 'ABCD');
    pressKey(result, 'ArrowLeft');
    typeInto(result, 'X');
    expect(edit().text).toBe('ABCXD');
    pressKey(result, 'Backspace');
    pressKey(result, 'Delete');
    expect(edit().text).toBe('ABC');
    expect(edit().caret).toBe(3);
  });

  it('moves left/right across wrapped lines and preserves a preferred column vertically', () => {
    const { result } = renderHook(() => useTextTool());
    typeInto(result, 'ABCDEFG');
    pressKey(result, 'ArrowUp');
    expect(edit().caret).toBe(4);
    pressKey(result, 'ArrowUp');
    expect(edit().caret).toBe(1);
    pressKey(result, 'ArrowDown');
    expect(edit().caret).toBe(4);
    pressKey(result, 'ArrowLeft');
    expect(edit().caret).toBe(3);
    expect(useToolStore.getState().textToolState.cursorPosition).toEqual({ x: 1, y: 2 });
    pressKey(result, 'ArrowLeft');
    expect(useToolStore.getState().textToolState.cursorPosition).toEqual({ x: 3, y: 1 });
  });

  it('supports Enter line breaks, Home/End, selections, and select-all replacement', () => {
    const { result } = renderHook(() => useTextTool());
    typeInto(result, 'AB');
    pressKey(result, 'Enter');
    typeInto(result, 'CD');
    expect(edit().text).toBe('AB\nCD');
    pressKey(result, 'Home');
    expect(edit().caret).toBe(3);
    pressKey(result, 'ArrowRight', { shiftKey: true });
    typeInto(result, 'X');
    expect(edit().text).toBe('AB\nXD');
    pressKey(result, 'a', { metaKey: true });
    typeInto(result, 'Z');
    expect(edit().text).toBe('Z');
  });

  it('pastes multiline text into the draft and grows it', async () => {
    vi.stubGlobal('navigator', { clipboard: { readText: vi.fn().mockResolvedValue('ABCD\r\nEF') } });
    const { result } = renderHook(() => useTextTool());
    await act(async () => result.current.handleTextToolKeyDown(keyEvent('v', { metaKey: true })));
    expect(edit().text).toBe('ABCD\nEF');
    expect(useToolStore.getState().textToolState.textBox?.bottom).toBe(3);
    expect(useCanvasStore.getState().cells.size).toBe(0);
    vi.unstubAllGlobals();
  });

  it('reflows and realigns without changing draft text or selection', () => {
    const store = useToolStore.getState();
    store.updateTextBoxEdit({ text: 'ABCDEF', caret: 4, anchor: 2 }, { ...BOX, right: 6 });
    store.updateTextBoxEdit({ alignment: 'right' }, { ...BOX, right: 4 });
    expect(edit()).toMatchObject({ text: 'ABCDEF', caret: 4, anchor: 2, alignment: 'right' });
    expect(useToolStore.getState().textToolState.cursorPosition).toEqual({ x: 3, y: 2 });
  });

  it('ignores outside clicks and positions the caret on inside clicks', () => {
    const { result } = renderHook(() => useTextTool());
    typeInto(result, 'ABCDE');
    act(() => {
      result.current.handleTextToolMouseDown(9, 9);
      result.current.handleTextToolMouseUp({ x: 9, y: 9 });
    });
    expect(edit().text).toBe('ABCDE');
    expect(edit().caret).toBe(5);
    act(() => result.current.handleTextToolMouseDown(2, 1));
    expect(edit().caret).toBe(1);
    expect(edit().anchor).toBe(1);
  });

  it('Escape discards without applying or recording history', () => {
    const { result } = renderHook(() => useTextTool());
    typeInto(result, 'ABC');
    pressKey(result, 'Escape');
    expect(useToolStore.getState().textToolState.isTyping).toBe(false);
    expect(useCanvasStore.getState().cells.size).toBe(0);
    expect(useToolStore.getState().historyStack).toHaveLength(0);
  });

  it('commits on Cmd+Enter, merges existing data, and records one addressed history action', () => {
    const timeline = useTimelineStore.getState();
    const layer = timeline.layers[0];
    timeline.updateContentFrameData(layer.id, layer.contentFrames[0].id, new Map([['8,8', cell('existing')]]));
    const { result } = renderHook(() => useTextTool());
    typeInto(result, 'ABCD');
    pressKey(result, 'Enter', { metaKey: true });
    expect(charAt(1, 1)).toBe('A');
    expect(charAt(1, 2)).toBe('D');
    expect(charAt(8, 8)).toBe('existing');
    expect(useToolStore.getState().textToolState.boxEdit).toBeNull();
    expect(useToolStore.getState().historyStack).toHaveLength(1);
    const action = useToolStore.getState().historyStack[0];
    expect(action.type).toBe('content_frame_data');
    processHistoryAction(action, false, useCanvasStore.getState(), useAnimationStore.getState());
    expect(useTimelineStore.getState().layers[0].contentFrames[0].data.has('1,1')).toBe(false);
    processHistoryAction(action, true, useCanvasStore.getState(), useAnimationStore.getState());
    expect(useTimelineStore.getState().layers[0].contentFrames[0].data.get('1,1')?.char).toBe('A');
  });

  it('commits before switching tools', () => {
    const { result } = renderHook(() => useTextTool());
    typeInto(result, 'ABC');
    act(() => useToolStore.getState().setActiveTool('pencil'));
    expect(charAt(1, 1)).toBe('A');
    expect(useToolStore.getState().activeTool).toBe('pencil');
    expect(useToolStore.getState().textToolState.isTyping).toBe(false);
  });

  it('allows frame navigation and commits only to the current layer/playhead, creating a gap block', () => {
    useTimelineStore.getState().setDuration(10);
    const source = useTimelineStore.getState().layers[0];
    const targetId = useTimelineStore.getState().addLayer('Target');
    const target = useTimelineStore.getState().getLayer(targetId)!;
    for (const frame of target.contentFrames) useTimelineStore.getState().removeContentFrame(targetId, frame.id);
    useTimelineStore.getState().setActiveLayer(source.id);
    const { result } = renderHook(() => useTextTool());
    const navigation = renderHook(() => useFrameNavigation());
    typeInto(result, 'ABC');
    expect(navigation.result.current.canNavigate).toBe(true);
    act(() => {
      navigation.result.current.navigateToFrame(5);
      useTimelineStore.getState().setActiveLayer(targetId);
    });
    expect(edit().text).toBe('ABC');
    expect(useTimelineStore.getState().getLayer(source.id)!.contentFrames[0].data.size).toBe(0);
    expect(useTimelineStore.getState().getLayer(targetId)!.contentFrames).toHaveLength(0);
    pressKey(result, 'Enter', { ctrlKey: true });
    const frame = useTimelineStore.getState().getLayer(targetId)!.contentFrames[0];
    expect(frame.startFrame).toBe(5);
    expect(frame.durationFrames).toBe(1);
    expect(frame.data.get('1,1')?.char).toBe('A');
    expect(useToolStore.getState().historyStack).toHaveLength(1);
    const action = useToolStore.getState().historyStack[0];
    act(() => useTimelineStore.getState().setActiveLayer(source.id));
    for (let index = 0; index < 2; index++) {
      processHistoryAction(action, false, useCanvasStore.getState(), useAnimationStore.getState());
      expect(useTimelineStore.getState().getLayer(targetId)!.contentFrames).toHaveLength(0);
      processHistoryAction(action, true, useCanvasStore.getState(), useAnimationStore.getState());
      expect(useTimelineStore.getState().getLayer(targetId)!.contentFrames[0].id).toBe(frame.id);
    }
  });

  it('converts committed text to the selected layer local coordinates', () => {
    const timeline = useTimelineStore.getState();
    const layer = timeline.layers[0];
    useTimelineStore.setState({ layers: [{ ...layer, staticProperties: { 'transform.position.x': 2, 'transform.position.y': 3 } }] });
    useToolStore.getState().updateTextBoxEdit({ text: 'A', caret: 1, anchor: 1 });
    useToolStore.getState().commitTextBox();
    expect(useTimelineStore.getState().layers[0].contentFrames[0].data.get('-1,-2')?.char).toBe('A');
  });

  it('does not merge a stale dirty working buffer after navigating to another populated frame', () => {
    const timeline = useTimelineStore.getState();
    const layer = timeline.layers[0];
    const targetId = timeline.addContentFrame(layer.id, 5, 1, new Map([['8,8', cell('target')]]))!;
    useCanvasStore.setState({ cells: new Map([['9,9', cell('source')]]), isDirty: true });
    timeline.goToFrame(5);
    useToolStore.getState().updateTextBoxEdit({ text: 'A' });
    useToolStore.getState().commitTextBox();
    const data = useTimelineStore.getState().getLayer(layer.id)!.contentFrames.find((frame) => frame.id === targetId)!.data;
    expect(data.get('8,8')?.char).toBe('target');
    expect(data.has('9,9')).toBe(false);
    expect(data.get('1,1')?.char).toBe('A');
  });

  it('preserves current-frame unsaved edits, including erased cells', () => {
    const timeline = useTimelineStore.getState();
    const layer = timeline.layers[0];
    timeline.updateContentFrameData(layer.id, layer.contentFrames[0].id, new Map([['8,8', cell('erased')]]));
    useCanvasStore.setState({ cells: new Map([['9,9', cell('unsaved')]]), isDirty: true });
    useToolStore.getState().updateTextBoxEdit({ text: 'A' });
    useToolStore.getState().commitTextBox();
    const data = useTimelineStore.getState().layers[0].contentFrames[0].data;
    expect(data.has('8,8')).toBe(false);
    expect(data.get('9,9')?.char).toBe('unsaved');
  });

  it('preserves a matching dirty working buffer when committing into a timeline gap', () => {
    const timeline = useTimelineStore.getState();
    const layer = timeline.layers[0];
    timeline.setDuration(10);
    for (const frame of layer.contentFrames) timeline.removeContentFrame(layer.id, frame.id);
    timeline.goToFrame(5);
    useCanvasStore.setState({
      cells: new Map([['9,9', cell('unsaved')]]),
      activeLayerId: layer.id,
      activeFrameIndex: 5,
      isDirty: true,
    });
    useToolStore.getState().updateTextBoxEdit({ text: 'A' });
    expect(useToolStore.getState().commitTextBox()).toBe(true);
    const frame = useTimelineStore.getState().getLayer(layer.id)!.contentFrames[0];
    expect(frame.startFrame).toBe(5);
    expect(frame.data.get('9,9')?.char).toBe('unsaved');
    expect(frame.data.get('1,1')?.char).toBe('A');
  });

  it('moves and commits non-BMP characters as single text cells', () => {
    const store = useToolStore.getState();
    store.updateTextBoxEdit({ text: 'A😀B', caret: 3, anchor: 3 }, { ...BOX, right: 2 });
    const { result } = renderHook(() => useTextTool());
    pressKey(result, 'ArrowLeft');
    expect(edit().caret).toBe(1);
    store.commitTextBox();
    const data = useTimelineStore.getState().layers[0].contentFrames[0].data;
    expect(data.get('1,1')?.char).toBe('A');
    expect(data.get('2,1')?.char).toBe('😀');
    expect(data.get('1,2')?.char).toBe('B');
  });

  it('keeps frame synchronization and autosave free of draft text across visited frames', () => {
    vi.useFakeTimers();
    const timeline = useTimelineStore.getState();
    const layer = timeline.layers[0];
    const first = layer.contentFrames[0];
    const firstData = new Map([['8,8', cell('first')]]);
    const secondData = new Map([['9,9', cell('second')]]);
    timeline.updateContentFrameData(layer.id, first.id, firstData);
    const secondId = timeline.addContentFrame(layer.id, 1, 1, secondData)!;
    timeline.setDuration(10);
    useCanvasStore.getState().setCanvasData(firstData);
    const synchronization = renderHook(() => useFrameSynchronization());
    const { result } = renderHook(() => useTextTool());
    typeInto(result, 'draft');
    act(() => timeline.goToFrame(1));
    act(() => vi.advanceTimersByTime(200));
    expect(useCanvasStore.getState().cells).toEqual(secondData);
    act(() => timeline.goToFrame(5));
    act(() => vi.advanceTimersByTime(200));
    expect(edit().text).toBe('draft');
    const visited = useTimelineStore.getState().getLayer(layer.id)!.contentFrames;
    expect(visited.find((frame) => frame.id === first.id)!.data).toEqual(firstData);
    expect(visited.find((frame) => frame.id === secondId)!.data).toEqual(secondData);
    pressKey(result, 'Enter', { metaKey: true });
    act(() => vi.advanceTimersByTime(200));
    const committed = useTimelineStore.getState().getLayer(layer.id)!.contentFrames.find((frame) => frame.startFrame === 5)!;
    expect(committed.data.get('1,1')?.char).toBe('d');
    expect(committed.data.has('8,8')).toBe(false);
    expect(committed.data.has('9,9')).toBe(false);
    synchronization.unmount();
    cleanup();
    vi.useRealTimers();
  });

  it('uses group transforms and rejects locked groups without discarding text', () => {
    const timeline = useTimelineStore.getState();
    const layer = timeline.layers[0];
    const siblingId = timeline.addLayer('Sibling');
    const groupId = timeline.createGroup('Group', [layer.id, siblingId])!;
    timeline.setActiveLayer(layer.id);
    useTimelineStore.setState((state) => ({
      layerGroups: state.layerGroups.map((group) => group.id === groupId
        ? { ...group, locked: true, staticProperties: { 'transform.position.x': 2 } }
        : group),
    }));
    useToolStore.getState().updateTextBoxEdit({ text: 'A' });
    expect(useToolStore.getState().commitTextBox()).toBe(false);
    expect(edit().text).toBe('A');
    useTimelineStore.setState((state) => ({
      layerGroups: state.layerGroups.map((group) => ({ ...group, locked: false })),
    }));
    expect(useToolStore.getState().commitTextBox()).toBe(true);
    expect(useTimelineStore.getState().getLayer(layer.id)!.contentFrames[0].data.get('-1,1')?.char).toBe('A');
  });

  it('keeps drafts and the text tool active when a locked destination rejects a tool-switch commit', () => {
    const timeline = useTimelineStore.getState();
    timeline.setLayerLocked(timeline.layers[0].id, true);
    useToolStore.getState().updateTextBoxEdit({ text: 'A' });
    useToolStore.getState().setActiveTool('pencil');
    expect(useToolStore.getState().activeTool).toBe('text');
    expect(edit().text).toBe('A');
    expect(useToolStore.getState().historyStack).toHaveLength(0);
  });

  it('finishes an empty draft without creating a block', () => {
    const timeline = useTimelineStore.getState();
    timeline.goToFrame(5);
    useToolStore.getState().commitTextBox();
    expect(useTimelineStore.getState().layers[0].contentFrames).toHaveLength(1);
    expect(useToolStore.getState().historyStack).toHaveLength(0);
    expect(useToolStore.getState().textToolState.boxEdit).toBeNull();
  });
});

describe('text-tool activation and free typing', () => {
  it('creates a dragged box in either axis but not for a single cell', () => {
    const { result } = renderHook(() => useTextTool());
    act(() => {
      result.current.handleTextToolMouseDown(2, 2);
      result.current.handleTextToolMouseUp({ x: 2, y: 5 });
    });
    expect(useToolStore.getState().textToolState.textBox).toEqual({ left: 2, right: 2, top: 2, bottom: 5 });
    expect(edit().text).toBe('');
    act(() => useToolStore.getState().stopTyping());
    act(() => {
      result.current.handleTextToolMouseDown(2, 2);
      result.current.handleTextToolMouseUp({ x: 2, y: 2 });
    });
    expect(useToolStore.getState().textToolState.boxEdit).toBeNull();
  });

  it('keeps click typing immediate, Enter as a newline, and Escape as finish without discard', () => {
    const { result } = renderHook(() => useTextTool());
    act(() => {
      result.current.handleTextToolMouseDown(2, 2);
      result.current.handleTextToolMouseUp({ x: 2, y: 2 });
    });
    typeInto(result, 'AB');
    pressKey(result, 'Enter');
    typeInto(result, 'C');
    pressKey(result, 'Escape');
    expect(charAt(2, 2)).toBe('A');
    expect(charAt(3, 2)).toBe('B');
    expect(charAt(2, 3)).toBe('C');
    expect(useToolStore.getState().textToolState.isTyping).toBe(false);
  });
});
