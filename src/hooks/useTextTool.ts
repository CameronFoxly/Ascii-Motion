import { useCallback, useEffect, useRef } from 'react';
import { useToolStore } from '../stores/toolStore';
import { useCanvasStore } from '../stores/canvasStore';

/**
 * Text Tool Hook - Handles text input functionality
 * 
 * Features:
 * - Click to place cursor and start typing
 * - Arrow key navigation with boundary constraints
 * - Enter key for new lines (moves to line start)
 * - Backspace with line boundary stopping
 * - Word-based undo batching
 * - Purple blinking cursor animation
 * - Clipboard paste support with overwrite behavior
 */
export const useTextTool = () => {
  const { textToolState, startTyping, stopTyping, setCursorPosition, setCursorVisible, setTextBuffer, commitWord, pushToHistory } = useToolStore();
  const { width, height, setCell, getCell, cells } = useCanvasStore();
  const { selectedColor, selectedBgColor } = useToolStore();
  
  const blinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wordBoundaryChars = useRef(new Set([' ', '\t', '\n', '.', ',', ';', ':', '!', '?', '"', "'", '(', ')', '[', ']', '{', '}', '<', '>', '/', '\\', '|', '@', '#', '$', '%', '^', '&', '*', '+', '=', '-', '_', '~', '`']));

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
      pushToHistory(cells);
      commitWord();
    }
  }, [textToolState.textBuffer.length, pushToHistory, commitWord, cells]);

  // Move cursor with boundary constraints
  const moveCursor = useCallback((deltaX: number, deltaY: number) => {
    if (!textToolState.cursorPosition) return;

    const { x, y } = textToolState.cursorPosition;
    let newX = x + deltaX;
    let newY = y + deltaY;

    // Boundary constraints - stop at edges
    newX = Math.max(0, Math.min(width - 1, newX));
    newY = Math.max(0, Math.min(height - 1, newY));

    // Don't move if we're at the boundary
    if (newX !== x + deltaX || newY !== y + deltaY) {
      return; // Hit boundary, don't move
    }

    setCursorPosition(newX, newY);
    resetCursorBlink();
  }, [textToolState.cursorPosition, width, height, setCursorPosition, resetCursorBlink]);

  // Insert character at cursor position
  const insertCharacter = useCallback((char: string) => {
    if (!textToolState.cursorPosition) return;

    const { x, y } = textToolState.cursorPosition;
    
    // Check if character causes word boundary - commit current word if so
    if (isWordBoundary(char)) {
      commitCurrentWord();
    }

    // Insert character using selected colors
    setCell(x, y, {
      char,
      color: selectedColor,
      bgColor: selectedBgColor
    });

    // Add to text buffer for undo batching
    setTextBuffer(textToolState.textBuffer + char);

    // Move cursor right, respecting canvas boundaries
    const newX = x + 1;
    if (newX < width) {
      setCursorPosition(newX, y);
      resetCursorBlink();
    }
    // If at right edge, don't move cursor (content extends beyond canvas)
  }, [textToolState.cursorPosition, textToolState.textBuffer, isWordBoundary, commitCurrentWord, setCell, selectedColor, selectedBgColor, setTextBuffer, width, setCursorPosition, resetCursorBlink]);

  // Handle Enter key - move to next line at line start
  const handleEnter = useCallback(() => {
    if (!textToolState.cursorPosition) return;

    const { y } = textToolState.cursorPosition;
    const newY = y + 1;

    // Commit current word
    commitCurrentWord();

    // Move to next line at lineStartX, respecting boundaries
    if (newY < height) {
      setCursorPosition(textToolState.lineStartX, newY);
      resetCursorBlink();
    }
    // If at bottom edge, don't move cursor
  }, [textToolState.cursorPosition, textToolState.lineStartX, height, commitCurrentWord, setCursorPosition, resetCursorBlink]);

  // Handle Backspace - delete previous character with line boundary stopping
  const handleBackspace = useCallback(() => {
    if (!textToolState.cursorPosition) return;

    const { x, y } = textToolState.cursorPosition;
    
    // Can't backspace at position (0, 0)
    if (x === 0 && y === 0) return;

    let targetX = x - 1;
    let targetY = y;

    // If at beginning of line, stop (don't wrap to previous line)
    if (x === 0) {
      return;
    }

    // Get the character we're about to delete
    const cellToDelete = getCell(targetX, targetY);
    
    // If deleting a word boundary character, commit current word
    if (cellToDelete && isWordBoundary(cellToDelete.char)) {
      commitCurrentWord();
    }

    // Clear the cell
    setCell(targetX, targetY, {
      char: ' ',
      color: selectedColor,
      bgColor: selectedBgColor
    });

    // Move cursor to deleted position
    setCursorPosition(targetX, targetY);
    resetCursorBlink();

    // Update text buffer (remove last character)
    const newBuffer = textToolState.textBuffer.slice(0, -1);
    setTextBuffer(newBuffer);
  }, [textToolState.cursorPosition, textToolState.textBuffer, getCell, isWordBoundary, commitCurrentWord, setCell, selectedColor, selectedBgColor, setCursorPosition, resetCursorBlink, setTextBuffer]);

  // Handle clipboard paste
  const handlePaste = useCallback(async () => {
    if (!textToolState.cursorPosition) return;

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) return;

      const { x: startX, y: startY } = textToolState.cursorPosition;
      let currentX = startX;
      let currentY = startY;

      // Commit current word before pasting
      commitCurrentWord();

      // Process each character in clipboard
      for (const char of clipboardText) {
        if (char === '\n' || char === '\r') {
          // Handle line breaks - move to next line at lineStartX
          currentY++;
          currentX = textToolState.lineStartX;
          
          // Stop if we reach bottom boundary
          if (currentY >= height) break;
        } else {
          // Insert character if within bounds
          if (currentX < width && currentY < height) {
            setCell(currentX, currentY, {
              char,
              color: selectedColor,
              bgColor: selectedBgColor
            });
            currentX++;
          }
          // Continue processing even if beyond width (content extends beyond canvas)
        }
      }

      // Position cursor at end of pasted content
      if (currentY < height) {
        const finalX = Math.min(currentX, width - 1);
        setCursorPosition(finalX, currentY);
        resetCursorBlink();
      }

      // Commit paste as single undo operation
      pushToHistory(cells);

    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  }, [textToolState.cursorPosition, textToolState.lineStartX, width, height, commitCurrentWord, setCell, selectedColor, selectedBgColor, setCursorPosition, resetCursorBlink, pushToHistory, cells]);

  // Click to place cursor
  const handleTextToolClick = useCallback((x: number, y: number) => {
    // Commit current word if switching positions
    if (textToolState.isTyping) {
      commitCurrentWord();
    }

    startTyping(x, y);
    resetCursorBlink();
  }, [textToolState.isTyping, commitCurrentWord, startTyping, resetCursorBlink]);

  // Handle keyboard input
  const handleTextToolKeyDown = useCallback((event: KeyboardEvent) => {
    if (!textToolState.isTyping) return;

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
    
    // Actions
    handleTextToolClick,
    handleTextToolKeyDown,
    commitCurrentWord,
    
    // Utilities
    isWordBoundary
  };
};
