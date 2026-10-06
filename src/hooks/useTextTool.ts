import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useToolStore } from '../stores/toolStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useTimelineStore } from '../stores/timelineStore';
import { screenToLocal } from '../utils/layerTransformUtils';
import type { TextBoxRegion } from '../types';

/**
 * Text Tool Hook - Handles text input functionality
 * 
 * Features:
 * - Click to place cursor and start typing
 * - Click and drag to define a text box that constrains and wraps typing
 * - Arrow key navigation with boundary constraints
 * - Enter key for new lines (moves to line start)
 * - Backspace with line boundary stopping
 * - Word-based undo batching
 * - Purple blinking cursor animation
 * - Clipboard paste support with overwrite behavior
 */
export const useTextTool = () => {
  // PERF FIX: Targeted selectors instead of broad useToolStore()/useCanvasStore().
  const textToolState = useToolStore((s) => s.textToolState);
  const startTyping = useToolStore((s) => s.startTyping);
  const stopTyping = useToolStore((s) => s.stopTyping);
  const setCursorPosition = useToolStore((s) => s.setCursorPosition);
  const setCursorVisible = useToolStore((s) => s.setCursorVisible);
  const setTextBuffer = useToolStore((s) => s.setTextBuffer);
  const commitWord = useToolStore((s) => s.commitWord);
  const startTextBoxDraft = useToolStore((s) => s.startTextBoxDraft);
  const updateTextBoxDraft = useToolStore((s) => s.updateTextBoxDraft);
  const clearTextBoxDraft = useToolStore((s) => s.clearTextBoxDraft);
  const pushCanvasHistory = useToolStore((s) => s.pushCanvasHistory);
  const finalizeCanvasHistory = useToolStore((s) => s.finalizeCanvasHistory);
  const width = useCanvasStore((s) => s.width);
  const height = useCanvasStore((s) => s.height);
  const setCell = useCanvasStore((s) => s.setCell);
  const getCell = useCanvasStore((s) => s.getCell);
  const cells = useCanvasStore((s) => s.cells);
  const currentFrameIndex = useTimelineStore((s) => s.view.currentFrame);
  const selectedColor = useToolStore((s) => s.selectedColor);
  const selectedBgColor = useToolStore((s) => s.selectedBgColor);
  
  const blinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const wordBoundaryChars = useRef(new Set([' ', '\t', '\n', '.', ',', ';', ':', '!', '?', '"', "'", '(', ')', '[', ']', '{', '}', '<', '>', '/', '\\', '|', '@', '#', '$', '%', '^', '&', '*', '+', '=', '-', '_', '~', '`']));

  const textBox = textToolState.textBox;

  // Typing bounds: the active text box when present, otherwise the full canvas
  const bounds = useMemo(() => ({
    minX: textBox ? textBox.left : 0,
    maxX: textBox ? textBox.right : width - 1,
    minY: textBox ? textBox.top : 0,
    maxY: textBox ? textBox.bottom : height - 1
  }), [textBox, width, height]);

  // Helper function to create a cell with all attributes for text tool
  const createTextCellWithAllAttributes = useCallback((newChar: string): { char: string, color: string, bgColor: string } => {
    // Only apply color data if the character is not just a space
    const shouldApplyColors = newChar !== ' ';
    
    return {
      char: newChar,
      color: shouldApplyColors ? selectedColor : '#FFFFFF',
      bgColor: shouldApplyColors ? selectedBgColor : 'transparent'
    };
  }, [selectedColor, selectedBgColor]);

  // Cursor blink animation
  useEffect(() => {
    if (textToolState.isTyping && textToolState.cursorPosition) {
      // Clear any existing timer
      if (blinkTimerRef.current) {
        clearInterval(blinkTimerRef.current);
      }
      
      // Start blinking animation (500ms interval)
      blinkTimerRef.current = setInterval(() => {
        setCursorVisible(!textToolState.cursorVisible);
      }, 500);
      
      return () => {
        if (blinkTimerRef.current) {
          clearInterval(blinkTimerRef.current);
        }
      };
    }
  }, [textToolState.isTyping, textToolState.cursorPosition, setCursorVisible, textToolState.cursorVisible]);

  // Reset cursor to visible when moving
  const resetCursorBlink = useCallback(() => {
    setCursorVisible(true);
    if (blinkTimerRef.current) {
      clearInterval(blinkTimerRef.current);
      blinkTimerRef.current = setInterval(() => {
        setCursorVisible(!textToolState.cursorVisible);
      }, 500);
    }
  }, [setCursorVisible, textToolState.cursorVisible]);

  // Check if character is a word boundary
  const isWordBoundary = useCallback((char: string) => {
    return wordBoundaryChars.current.has(char);
  }, []);

  // Commit current word to undo stack
  const commitCurrentWord = useCallback(() => {
    if (textToolState.textBuffer.length > 0) {
      // Push previous snapshot
      pushCanvasHistory(cells, currentFrameIndex, 'Text input');
      // Commit word (mutates cells)
      commitWord();
      // Capture forward snapshot
      finalizeCanvasHistory(new Map(useCanvasStore.getState().cells));
    }
  }, [textToolState.textBuffer.length, pushCanvasHistory, commitWord, cells, currentFrameIndex, finalizeCanvasHistory]);

  // Move cursor with boundary constraints
  const moveCursor = useCallback((deltaX: number, deltaY: number) => {
    if (!textToolState.cursorPosition) return;

    const { x, y } = textToolState.cursorPosition;
    const { minX, maxX, minY, maxY } = bounds;
    let newX = x + deltaX;
    let newY = y + deltaY;

    // Boundary constraints - stop at edges
    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));

    // Don't move if we're at the boundary
    if (newX !== x + deltaX || newY !== y + deltaY) {
      return; // Hit boundary, don't move
    }

    setCursorPosition(newX, newY);
    resetCursorBlink();
  }, [textToolState.cursorPosition, bounds, setCursorPosition, resetCursorBlink]);

  // Read the character currently rendered at a screen-space grid position
  const getCharAt = useCallback((x: number, y: number): string => {
    const local = screenToLocal(x, y);
    const cell = getCell(local.x, local.y);
    return cell?.char ?? ' ';
  }, [getCell]);

  // Insert character at cursor position
  const insertCharacter = useCallback((char: string) => {
    if (!textToolState.cursorPosition) return;

    const { x, y } = textToolState.cursorPosition;
    const { minX, maxX, maxY } = bounds;
    const local = screenToLocal(x, y);
    
    // Check if character causes word boundary - commit current word if so
    if (isWordBoundary(char)) {
      commitCurrentWord();
    }

    // Insert character using selected colors
    const newCell = createTextCellWithAllAttributes(char);
    setCell(local.x, local.y, newCell);

    // Add to text buffer for undo batching
    setTextBuffer(textToolState.textBuffer + char);

    const nextX = x + 1;
    if (nextX <= maxX) {
      setCursorPosition(nextX, y);
      resetCursorBlink();
      return;
    }

    // Reached the right edge
    if (!textBox) {
      // Free typing: keep cursor at the edge (content extends beyond canvas)
      return;
    }

    // Text box: wrap to the next line when there's room
    if (y + 1 > maxY) {
      return; // Box is full - stop advancing
    }

    // Word wrap: find the trailing word on this line so it can move down intact
    let wordStart = maxX + 1;
    if (char !== ' ') {
      let scanX = maxX;
      while (scanX >= minX && getCharAt(scanX, y).trim() !== '') {
        scanX--;
      }
      wordStart = scanX + 1;
    }

    if (char !== ' ' && wordStart > minX) {
      const blankCell = createTextCellWithAllAttributes(' ');
      const movedCells = [];
      for (let scanX = wordStart; scanX <= maxX; scanX++) {
        const from = screenToLocal(scanX, y);
        movedCells.push(getCell(from.x, from.y) ?? blankCell);
        setCell(from.x, from.y, blankCell);
      }
      movedCells.forEach((cell, index) => {
        const to = screenToLocal(minX + index, y + 1);
        setCell(to.x, to.y, cell);
      });
      setCursorPosition(minX + movedCells.length, y + 1);
    } else {
      setCursorPosition(minX, y + 1);
    }
    resetCursorBlink();
  }, [textToolState.cursorPosition, textToolState.textBuffer, bounds, textBox, isWordBoundary, commitCurrentWord, setCell, getCell, getCharAt, setTextBuffer, setCursorPosition, resetCursorBlink, createTextCellWithAllAttributes]);

  // Handle Enter key - move to next line at line start
  const handleEnter = useCallback(() => {
    if (!textToolState.cursorPosition) return;

    const { y } = textToolState.cursorPosition;
    const newY = y + 1;

    // Commit current word
    commitCurrentWord();

    // Move to next line at the line start, respecting boundaries
    if (newY <= bounds.maxY) {
      setCursorPosition(textBox ? bounds.minX : textToolState.lineStartX, newY);
      resetCursorBlink();
    }
    // If at the bottom edge, don't move cursor
  }, [textToolState.cursorPosition, textToolState.lineStartX, bounds, textBox, commitCurrentWord, setCursorPosition, resetCursorBlink]);

  // Handle Backspace - delete previous character with line boundary stopping
  const handleBackspace = useCallback(() => {
    if (!textToolState.cursorPosition) return;

    const { x, y } = textToolState.cursorPosition;
    const { minX, maxX, minY } = bounds;

    let targetX: number;
    let targetY: number;

    if (x > minX) {
      targetX = x - 1;
      targetY = y;
    } else if (textBox && y > minY) {
      // Inside a text box, wrap back to the end of the previous line
      targetX = maxX;
      targetY = y - 1;
    } else {
      // At the start of the line (or canvas) - stop
      return;
    }

    // Get the character we're about to delete
    const localDel = screenToLocal(targetX, targetY);
    const cellToDelete = getCell(localDel.x, localDel.y);
    
    // If deleting a word boundary character, commit current word
    if (cellToDelete && isWordBoundary(cellToDelete.char)) {
      commitCurrentWord();
    }

    // Clear the cell
    const newCell = createTextCellWithAllAttributes(' ');
    setCell(localDel.x, localDel.y, newCell);

    // Move cursor to deleted position
    setCursorPosition(targetX, targetY);
    resetCursorBlink();

    // Update text buffer (remove last character)
    const newBuffer = textToolState.textBuffer.slice(0, -1);
    setTextBuffer(newBuffer);
  }, [textToolState.cursorPosition, textToolState.textBuffer, bounds, textBox, getCell, isWordBoundary, commitCurrentWord, setCell, setCursorPosition, resetCursorBlink, setTextBuffer, createTextCellWithAllAttributes]);

  // Handle clipboard paste
  const handlePaste = useCallback(async () => {
    if (!textToolState.cursorPosition) return;

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) return;

      const { x: startX, y: startY } = textToolState.cursorPosition;
      const { minX, maxX, maxY } = bounds;
      let currentX = startX;
      let currentY = startY;

      // Commit current word before pasting
      commitCurrentWord();

      // Process each character in clipboard
      for (const char of clipboardText) {
        if (char === '\n' || char === '\r') {
          // Handle line breaks - move to next line at the line start
          currentY++;
          currentX = textBox ? minX : textToolState.lineStartX;
          
          // Stop if we reach bottom boundary
          if (currentY > maxY) break;
        } else {
          if (currentX > maxX) {
            if (textBox) {
              // Wrap inside the text box
              currentY++;
              currentX = minX;
              if (currentY > maxY) break;
            } else {
              // Free typing: content extends beyond canvas, skip rendering it
              currentX++;
              continue;
            }
          }

          if (currentY <= maxY) {
            const localPaste = screenToLocal(currentX, currentY);
            const newCell = createTextCellWithAllAttributes(char);
            setCell(localPaste.x, localPaste.y, newCell);
            currentX++;
          }
        }
      }

      // Position cursor at end of pasted content
      if (currentY <= maxY) {
        const finalX = Math.min(currentX, maxX);
        setCursorPosition(finalX, currentY);
        resetCursorBlink();
      }

      // Commit paste as single undo operation
  pushCanvasHistory(cells, currentFrameIndex, 'Paste text');
  finalizeCanvasHistory(new Map(useCanvasStore.getState().cells));

    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  }, [textToolState.cursorPosition, textToolState.lineStartX, bounds, textBox, commitCurrentWord, setCell, setCursorPosition, resetCursorBlink, pushCanvasHistory, cells, currentFrameIndex, createTextCellWithAllAttributes, finalizeCanvasHistory]);

  // Mouse down - begin a potential text box drag
  const handleTextToolMouseDown = useCallback((x: number, y: number) => {
    dragStartRef.current = { x, y };
    startTextBoxDraft(x, y);
  }, [startTextBoxDraft]);

  // Mouse move - update the text box drag preview
  const handleTextToolMouseMove = useCallback((x: number, y: number) => {
    if (!dragStartRef.current) return;
    updateTextBoxDraft(x, y);
  }, [updateTextBoxDraft]);

  // Mouse up - either create a text box (drag) or place the cursor (click)
  const handleTextToolMouseUp = useCallback((position?: { x: number; y: number } | null) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    clearTextBoxDraft();
    if (!start) return;

    const end = position ?? start;
    const left = Math.max(0, Math.min(start.x, end.x));
    const right = Math.min(width - 1, Math.max(start.x, end.x));
    const top = Math.max(0, Math.min(start.y, end.y));
    const bottom = Math.min(height - 1, Math.max(start.y, end.y));

    // Commit current word if switching positions
    if (textToolState.isTyping) {
      commitCurrentWord();
    }

    // A drag spanning more than one column creates a text box
    if (right > left) {
      const region: TextBoxRegion = { left, top, right, bottom };
      startTyping(region.left, region.top, region);
    } else if (
      textBox &&
      end.x >= textBox.left && end.x <= textBox.right &&
      end.y >= textBox.top && end.y <= textBox.bottom
    ) {
      // Click inside the active text box repositions the cursor and keeps the box
      setCursorPosition(end.x, end.y);
    } else {
      startTyping(end.x, end.y, null);
    }

    resetCursorBlink();
  }, [clearTextBoxDraft, width, height, textToolState.isTyping, textBox, commitCurrentWord, startTyping, setCursorPosition, resetCursorBlink]);

  // Cancel an in-progress text box drag (e.g. pointer left the canvas)
  const cancelTextBoxDrag = useCallback(() => {
    dragStartRef.current = null;
    clearTextBoxDraft();
  }, [clearTextBoxDraft]);

  // Handle keyboard input
  const handleTextToolKeyDown = useCallback((event: KeyboardEvent) => {
    if (!textToolState.isTyping) return;

    // If focus is on a UI input element (dialog text field, color picker hex input, etc.),
    // let that element handle the keystrokes instead of the text tool.
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true' ||
      target.getAttribute('role') === 'textbox' ||
      target.closest('[role="dialog"], [data-radix-popper-content-wrapper]')
    ) {
      return;
    }

    // Prevent default for keys we handle
    const handledKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Backspace', 'Escape'];
    if (handledKeys.includes(event.key)) {
      event.preventDefault();
    }

    switch (event.key) {
      case 'ArrowLeft':
        moveCursor(-1, 0);
        break;
      case 'ArrowRight':
        moveCursor(1, 0);
        break;
      case 'ArrowUp':
        moveCursor(0, -1);
        break;
      case 'ArrowDown':
        moveCursor(0, 1);
        break;
      case 'Enter':
        handleEnter();
        break;
      case 'Backspace':
        handleBackspace();
        break;
      case 'Escape':
  commitCurrentWord();
        stopTyping();
        break;
      default:
        // Handle regular character input
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          insertCharacter(event.key);
        }
        // Handle Ctrl/Cmd+V for paste
        else if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
          event.preventDefault();
          handlePaste();
        }
        break;
    }
  }, [textToolState.isTyping, moveCursor, handleEnter, handleBackspace, commitCurrentWord, stopTyping, insertCharacter, handlePaste]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blinkTimerRef.current) {
        clearInterval(blinkTimerRef.current);
      }
    };
  }, []);

  return {
    // State
    isTyping: textToolState.isTyping,
    cursorPosition: textToolState.cursorPosition,
    cursorVisible: textToolState.cursorVisible,
    textBuffer: textToolState.textBuffer,
    textBox: textToolState.textBox,
    
    // Actions
    handleTextToolMouseDown,
    handleTextToolMouseMove,
    handleTextToolMouseUp,
    cancelTextBoxDrag,
    handleTextToolKeyDown,
    commitCurrentWord,
    
    // Utilities
    isWordBoundary
  };
};
