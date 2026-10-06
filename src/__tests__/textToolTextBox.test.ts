/**
 * Text Tool - Text Box Tests
 *
 * Covers the click-and-drag text box behaviour added for issue #165:
 * - typing wraps at the right edge of the box
 * - the box stops accepting input once its last cell is filled
 * - backspace on a full box clears the last cell and resumes input
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTextTool } from '../hooks/useTextTool';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';

const BOX = { left: 1, top: 1, right: 3, bottom: 2 }; // 3 wide x 2 tall = 6 cells

const keyEvent = (key: string) =>
  ({
    key,
    target: document.body,
    ctrlKey: false,
    metaKey: false,
    preventDefault: () => {}
  }) as unknown as KeyboardEvent;

const pressKey = (
  result: { current: ReturnType<typeof useTextTool> },
  key: string
) => {
  act(() => {
    result.current.handleTextToolKeyDown(keyEvent(key));
  });
};

const typeInto = (
  result: { current: ReturnType<typeof useTextTool> },
  text: string
) => {
  for (const char of text) {
    pressKey(result, char);
  }
};

const charAt = (x: number, y: number) =>
  useCanvasStore.getState().getCell(x, y)?.char ?? ' ';

describe('text tool text box', () => {
  beforeEach(() => {
    const canvas = useCanvasStore.getState();
    canvas.clearCanvas();
    canvas.setCanvasSize(10, 10);
    canvas.setActiveLayerId(null);
    useToolStore.getState().startTyping(BOX.left, BOX.top, BOX);
  });

  afterEach(() => {
    useToolStore.getState().stopTyping();
  });

  it('wraps typing at the right edge of the box', () => {
    const { result } = renderHook(() => useTextTool());
    typeInto(result, 'ABCD');

    expect(charAt(1, 1)).toBe('A');
    expect(charAt(2, 1)).toBe('B');
    expect(charAt(3, 1)).toBe('C');
    expect(charAt(1, 2)).toBe('D');
    expect(useToolStore.getState().textToolState.cursorPosition).toEqual({ x: 2, y: 2 });
  });

  it('stops accepting input once the last cell is filled', () => {
    const { result } = renderHook(() => useTextTool());
    typeInto(result, 'ABCDEF');

    expect(charAt(3, 2)).toBe('F');
    expect(useToolStore.getState().textToolState.textBoxFull).toBe(true);

    // Extra characters must not overwrite the final cell
    typeInto(result, 'XYZ');

    expect(charAt(3, 2)).toBe('F');
    expect(charAt(1, 1)).toBe('A');
  });

  it('backspace on a full box clears the last cell and re-enables input', () => {
    const { result } = renderHook(() => useTextTool());
    typeInto(result, 'ABCDEF');

    pressKey(result, 'Backspace');

    expect(charAt(3, 2).trim()).toBe('');
    expect(useToolStore.getState().textToolState.textBoxFull).toBe(false);
    expect(useToolStore.getState().textToolState.cursorPosition).toEqual({ x: 3, y: 2 });

    typeInto(result, 'Z');
    expect(charAt(3, 2)).toBe('Z');
    expect(useToolStore.getState().textToolState.textBoxFull).toBe(true);
  });
});
