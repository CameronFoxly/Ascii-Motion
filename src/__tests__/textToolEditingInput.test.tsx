import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TextTool } from '../components/tools/TextTool';
import { CanvasCommitCancelButtons } from '../components/features/BezierActionButtons';
import { useToolStore } from '../stores/toolStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useCanvasStore } from '../stores/canvasStore';

beforeEach(() => {
  useTimelineStore.getState().createNewProject();
  const layer = useTimelineStore.getState().layers[0];
  useCanvasStore.setState({ cells: new Map(), isDirty: false, activeLayerId: layer.id, activeFrameIndex: 0 });
  useToolStore.setState({ activeTool: 'text', historyStack: [], historyPosition: -1 });
  useToolStore.getState().startTyping(1, 1, { left: 1, top: 1, right: 4, bottom: 2 });
});

afterEach(() => {
  cleanup();
  useToolStore.getState().stopTyping();
});

describe('native text box input', () => {
  it('focuses the editor and synchronizes typing, paste-like multiline changes, and selections', () => {
    render(<TextTool />);
    const input = screen.getByRole('textbox', { name: 'Text box editor' }) as HTMLTextAreaElement;
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: 'ABCD\nEF', selectionStart: 7, selectionEnd: 7 } });
    expect(useToolStore.getState().textToolState.boxEdit?.text).toBe('ABCD\nEF');
    expect(useCanvasStore.getState().cells.size).toBe(0);
    act(() => input.setSelectionRange(1, 3, 'backward'));
    fireEvent.select(input);
    expect(useToolStore.getState().textToolState.boxEdit).toMatchObject({ anchor: 3, caret: 1 });
  });

  it('synchronizes visual-line arrow navigation back to the native selection', () => {
    render(<TextTool />);
    const input = screen.getByRole('textbox', { name: 'Text box editor' }) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'ABCDEFG', selectionStart: 7, selectionEnd: 7 } });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.selectionStart).toBe(3);
    expect(useToolStore.getState().textToolState.boxEdit?.caret).toBe(3);
    fireEvent.keyDown(input, { key: 'ArrowLeft', shiftKey: true });
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(3);
    expect(input.selectionDirection).toBe('backward');
  });

  it('does not commit Enter, commits Cmd+Enter, and removes the editing field', () => {
    render(<TextTool />);
    const input = screen.getByRole('textbox', { name: 'Text box editor' }) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'ABC', selectionStart: 3, selectionEnd: 3 } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(useToolStore.getState().textToolState.boxEdit?.text).toBe('ABC');
    fireEvent.change(input, { target: { value: 'ABC\nD', selectionStart: 5, selectionEnd: 5 } });
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    expect(screen.queryByRole('textbox', { name: 'Text box editor' })).toBeNull();
    expect(useCanvasStore.getState().getCell(1, 2)?.char).toBe('D');
  });

  it('discards on Escape without bubbling to other canvas shortcuts', () => {
    render(<TextTool />);
    const input = screen.getByRole('textbox', { name: 'Text box editor' });
    fireEvent.change(input, { target: { value: 'discard' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(useToolStore.getState().textToolState.boxEdit).toBeNull();
    expect(useCanvasStore.getState().cells.size).toBe(0);
  });

  it('does not commit during composition', () => {
    render(<TextTool />);
    const input = screen.getByRole('textbox', { name: 'Text box editor' });
    fireEvent.change(input, { target: { value: 'draft' } });
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true, isComposing: true });
    expect(useToolStore.getState().textToolState.boxEdit?.text).toBe('draft');
  });
});

describe('shared bezier-style action controls', () => {
  it('uses the same circular green/red buttons for text commit/cancel', () => {
    render(<CanvasCommitCancelButtons
      acceptLabel="Commit text box" cancelLabel="Cancel text box" acceptShortcut="Cmd/Ctrl+Enter"
      onAccept={() => useToolStore.getState().commitTextBox()}
      onCancel={() => useToolStore.getState().stopTyping()}
    />);
    const accept = screen.getByRole('button', { name: 'Commit text box' });
    const cancel = screen.getByRole('button', { name: 'Cancel text box' });
    expect(accept.className).toContain('rounded-full bg-green-600');
    expect(cancel.className).toContain('rounded-full bg-red-600');
    expect(accept.className).toContain('h-10 w-10');
    fireEvent.click(cancel);
    expect(useToolStore.getState().textToolState.boxEdit).toBeNull();
  });
});
