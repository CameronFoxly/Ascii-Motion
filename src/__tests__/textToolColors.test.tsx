import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTextTool } from '../hooks/useTextTool';
import { TextTool } from '../components/tools/TextTool';
import { ActiveStyleSection } from '../components/features/ActiveStyleSection';
import { useToolStore } from '../stores/toolStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useCanvasStore } from '../stores/canvasStore';
import { layoutTextBox } from '../utils/textBoxLayout';

vi.mock('../components/features/ColorPickerOverlay', () => ({
  ColorPickerOverlay: ({ isOpen, onColorChange, onCancel, onColorSelect }: {
    isOpen: boolean;
    onColorChange: (color: string) => void;
    onCancel: () => void;
    onColorSelect: (color: string) => void;
  }) => isOpen ? <div>
    <button onClick={() => onColorChange('#00ff00')}>Preview green</button>
    <button onClick={onCancel}>Cancel picker</button>
    <button onClick={() => onColorSelect('#00ff00')}>Accept green</button>
  </div> : null,
}));

beforeEach(() => {
  useTimelineStore.getState().createNewProject();
  const layer = useTimelineStore.getState().layers[0];
  useCanvasStore.setState({ cells: new Map(), activeLayerId: layer.id, activeFrameIndex: 0, isDirty: false });
  useToolStore.getState().stopTyping();
  useToolStore.setState({ activeTool: 'text', selectedColor: '#ff0000', selectedBgColor: 'transparent', historyStack: [], historyPosition: -1 });
  useToolStore.getState().startTyping(1, 1, { left: 1, top: 1, right: 4, bottom: 2 });
});

afterEach(() => {
  cleanup();
  useToolStore.getState().stopTyping();
  vi.unstubAllGlobals();
});

function key(result: { current: ReturnType<typeof useTextTool> }, value: string) {
  const event = new KeyboardEvent('keydown', { key: value });
  Object.defineProperty(event, 'target', { value: document.body });
  act(() => result.current.handleTextToolKeyDown(event));
}

const edit = () => useToolStore.getState().textToolState.boxEdit!;

describe('per-character draft colors', () => {
  it('captures typing colors without recoloring existing text', () => {
    const { result } = renderHook(() => useTextTool());
    key(result, 'A');
    key(result, 'B');
    act(() => {
      useToolStore.getState().setSelectedColor('#0000ff');
      useToolStore.getState().setSelectedBgColor('#333333');
    });
    key(result, 'C');
    expect(edit().styles).toEqual([
      { color: '#ff0000', bgColor: 'transparent' },
      { color: '#ff0000', bgColor: 'transparent' },
      { color: '#0000ff', bgColor: '#333333' },
    ]);
    expect(useCanvasStore.getState().cells.size).toBe(0);
  });

  it('recolors only the selected range and preserves the other color channel', () => {
    const store = useToolStore.getState();
    store.updateTextBoxEdit({ text: 'ABCD', anchor: 4, caret: 4 });
    store.updateTextBoxEdit({ anchor: 3, caret: 1 });
    store.setSelectedBgColor('#222222');
    store.setSelectedColor('#00ff00');
    expect(edit().styles).toEqual([
      { color: '#ff0000', bgColor: 'transparent' },
      { color: '#00ff00', bgColor: '#222222' },
      { color: '#00ff00', bgColor: '#222222' },
      { color: '#ff0000', bgColor: 'transparent' },
    ]);
    expect(edit()).toMatchObject({ anchor: 3, caret: 1 });
    store.updateTextBoxEdit({ caret: 4, anchor: 4 });
    store.setSelectedColor('#0000ff');
    expect(edit().styles[1].color).toBe('#00ff00');
  });

  it('preserves colors while inserting and deleting repeated characters', () => {
    const { result } = renderHook(() => useTextTool());
    key(result, 'A');
    key(result, 'A');
    act(() => useToolStore.getState().setSelectedColor('#0000ff'));
    key(result, 'A');
    key(result, 'A');
    act(() => useToolStore.getState().updateTextBoxEdit({ anchor: 2, caret: 2 }));
    key(result, 'Backspace');
    expect(edit().styles.map((style) => style.color)).toEqual(['#ff0000', '#0000ff', '#0000ff']);
    key(result, 'Delete');
    expect(edit().styles.map((style) => style.color)).toEqual(['#ff0000', '#0000ff']);
    key(result, 'X');
    expect(edit().text).toBe('AXA');
    expect(edit().styles.map((style) => style.color)).toEqual(['#ff0000', '#0000ff', '#0000ff']);
  });

  it('preserves styles through wrapping, resizing, alignment, and commit', () => {
    const store = useToolStore.getState();
    store.updateTextBoxEdit({ text: 'AB\nCD', anchor: 5, caret: 5 });
    store.updateTextBoxEdit({ anchor: 3, caret: 5 });
    store.setSelectedColor('#0000ff');
    store.setSelectedBgColor('#333333');
    const styles = edit().styles;
    store.updateTextBoxEdit({ alignment: 'right' }, { left: 1, top: 1, right: 6, bottom: 2 });
    expect(edit().styles).toBe(styles);
    const lines = layoutTextBox(edit().text, useToolStore.getState().textToolState.textBox!, 'right');
    store.commitTextBox();
    const canvas = useCanvasStore.getState();
    expect(canvas.getCell(lines[0].x, lines[0].y)).toMatchObject({ char: 'A', color: '#ff0000', bgColor: 'transparent' });
    expect(canvas.getCell(lines[1].x, lines[1].y)).toMatchObject({ char: 'C', color: '#0000ff', bgColor: '#333333' });
  });

  it('commits background-colored spaces as cells', () => {
    const store = useToolStore.getState();
    store.setSelectedBgColor('#112233');
    store.updateTextBoxEdit({ text: 'A B', caret: 3, anchor: 3 });
    store.commitTextBox();
    expect(useCanvasStore.getState().getCell(2, 1)).toEqual({ char: ' ', color: '#ff0000', bgColor: '#112233' });
  });

  it('uses current colors for pasted characters and retains surrounding styles', async () => {
    const store = useToolStore.getState();
    store.updateTextBoxEdit({ text: 'AB', caret: 1, anchor: 1 });
    store.setSelectedColor('#0000ff');
    vi.stubGlobal('navigator', { clipboard: { readText: vi.fn().mockResolvedValue('X\nY') } });
    const { result } = renderHook(() => useTextTool());
    const event = new KeyboardEvent('keydown', { key: 'v', metaKey: true });
    Object.defineProperty(event, 'target', { value: document.body });
    await act(async () => result.current.handleTextToolKeyDown(event));
    expect(edit().text).toBe('AX\nYB');
    expect(edit().styles.map((style) => style.color)).toEqual(['#ff0000', '#0000ff', '#0000ff', '#0000ff', '#ff0000']);
  });

  it('supports replacing selected text with identical characters using new typing colors', () => {
    render(<TextTool />);
    const input = screen.getByRole('textbox', { name: 'Text box editor' }) as HTMLTextAreaElement;
    fireEvent.input(input, { target: { value: 'A', selectionStart: 1, selectionEnd: 1 } });
    act(() => {
      useToolStore.getState().setSelectedColor('#0000ff');
      useToolStore.getState().updateTextBoxEdit({ anchor: 0, caret: 1 });
    });
    fireEvent.input(input, { target: { value: 'A', selectionStart: 1, selectionEnd: 1 } });
    expect(edit().styles).toEqual([{ color: '#0000ff', bgColor: 'transparent' }]);
  });

  it('preserves native edit colors when deleting from repeated text', () => {
    render(<TextTool />);
    const input = screen.getByRole('textbox', { name: 'Text box editor' }) as HTMLTextAreaElement;
    fireEvent.input(input, { target: { value: 'AA', selectionStart: 2, selectionEnd: 2 } });
    act(() => useToolStore.getState().setSelectedColor('#0000ff'));
    fireEvent.input(input, { target: { value: 'AAAA', selectionStart: 4, selectionEnd: 4 } });
    act(() => useToolStore.getState().updateTextBoxEdit({ anchor: 2, caret: 2 }));
    fireEvent.input(input, { target: { value: 'AAA', selectionStart: 1, selectionEnd: 1 } });
    expect(edit().styles.map((style) => style.color)).toEqual(['#ff0000', '#0000ff', '#0000ff']);
  });
});

describe('main picker selection formatting', () => {
  it('previews selection color and restores individual styles when canceled', () => {
    const store = useToolStore.getState();
    store.updateTextBoxEdit({ text: 'AB', caret: 2, anchor: 2 });
    store.updateTextBoxEdit({ anchor: 1, caret: 2 });
    store.setSelectedColor('#0000ff');
    store.updateTextBoxEdit({ anchor: 0, caret: 2 });
    const originalStyles = edit().styles;
    render(<ActiveStyleSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit foreground color' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview green' }));
    expect(edit().styles.map((style) => style.color)).toEqual(['#00ff00', '#00ff00']);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel picker' }));
    expect(edit().styles).toEqual(originalStyles);
    expect(edit()).toMatchObject({ anchor: 0, caret: 2 });
  });

  it('keeps accepted picker colors on selected characters only', () => {
    const store = useToolStore.getState();
    store.updateTextBoxEdit({ text: 'AB', caret: 2, anchor: 1 });
    render(<ActiveStyleSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit foreground color' }));
    fireEvent.click(screen.getByRole('button', { name: 'Accept green' }));
    expect(edit().styles.map((style) => style.color)).toEqual(['#ff0000', '#00ff00']);
    expect(screen.queryByRole('button', { name: 'Preview green' })).toBeNull();
  });
});
