import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import { useCanvasContext } from '../contexts/CanvasContext';

/**
 * Custom hook for handling keyboard shortcuts
 */
export const useKeyboardShortcuts = () => {
  const { cells, setCanvasData } = useCanvasStore();
  const { startPasteMode, commitPaste, pasteMode } = useCanvasContext();
  const { 
    selection, 
    lassoSelection,
    magicWandSelection,
    copySelection, 
    copyLassoSelection,
    copyMagicWandSelection,
    pasteSelection,
    pasteMagicWandSelection,
    clearSelection,
    clearLassoSelection,
    clearMagicWandSelection,
    undo,
    redo,
    canUndo,
    canRedo,
    pushToHistory,
    addToRedoStack,
    addToUndoStack,
    activeTool,
    hasClipboard,
    hasLassoClipboard,
    hasMagicWandClipboard,
    textToolState
  } = useToolStore();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // If text tool is actively typing, only allow Escape and modifier-based shortcuts
    // This prevents conflicts with single-key tool hotkeys and the space bar
    if (textToolState.isTyping && !event.metaKey && !event.ctrlKey && event.key !== 'Escape') {
      return; // Let the text tool handle all other keys
    }

    // Handle Escape key (without modifier)
    if (event.key === 'Escape') {
      // Let CanvasGrid handle Escape when selection tool is active (for move commits)
      if (selection.active && activeTool !== 'select') {
        event.preventDefault();
        clearSelection();
      }
      if (lassoSelection.active && activeTool !== 'lasso') {
        event.preventDefault();
        clearLassoSelection();
      }
      if (magicWandSelection.active && activeTool !== 'magicwand') {
        event.preventDefault();
        clearMagicWandSelection();
      }
      return;
    }

    // Check for modifier keys (Cmd on Mac, Ctrl on Windows/Linux)
    const isModifierPressed = event.metaKey || event.ctrlKey;
    
    if (!isModifierPressed) return;

    switch (event.key.toLowerCase()) {
      case 'c':
        // Copy selection (prioritize magic wand, then lasso, then rectangular)
        if (magicWandSelection.active) {
          event.preventDefault();
          console.log('Keyboard shortcut: Copying magic wand selection');
          copyMagicWandSelection(cells);
        } else if (lassoSelection.active) {
          event.preventDefault();
          console.log('Keyboard shortcut: Copying lasso selection');
          copyLassoSelection(cells);
        } else if (selection.active) {
          event.preventDefault();
          console.log('Keyboard shortcut: Copying rectangular selection');
          copySelection(cells);
        }
        break;
        
      case 'v':
        // Enhanced paste with preview mode
        event.preventDefault();
        
        // If already in paste mode, commit the paste
        if (pasteMode.isActive) {
          const pastedData = commitPaste();
          if (pastedData) {
            // Save current state for undo
            pushToHistory(new Map(cells));
            
            // Merge pasted data with current canvas
            const newCells = new Map(cells);
            pastedData.forEach((cell, key) => {
              newCells.set(key, cell);
            });
            
            setCanvasData(newCells);
          }
        } else {
          // Start paste mode if any clipboard has data (prioritize magic wand, then lasso, then rectangular)
          if (hasMagicWandClipboard()) {
            // For magic wand selection, use the center of the selected cells as paste position
            if (magicWandSelection.active && magicWandSelection.selectedCells.size > 0) {
              const cellCoords = Array.from(magicWandSelection.selectedCells).map(key => {
                const [x, y] = key.split(',').map(Number);
                return { x, y };
              });
              const avgX = Math.floor(cellCoords.reduce((sum, c) => sum + c.x, 0) / cellCoords.length);
              const avgY = Math.floor(cellCoords.reduce((sum, c) => sum + c.y, 0) / cellCoords.length);
              startPasteMode({ x: avgX, y: avgY });
            } else {
              startPasteMode({ x: 0, y: 0 });
            }
          } else if (hasLassoClipboard()) {
            // For lasso selection, use the center of the selected cells as paste position
            if (lassoSelection.active && lassoSelection.selectedCells.size > 0) {
              const cellCoords = Array.from(lassoSelection.selectedCells).map(key => {
                const [x, y] = key.split(',').map(Number);
                return { x, y };
              });
              const avgX = Math.floor(cellCoords.reduce((sum, c) => sum + c.x, 0) / cellCoords.length);
              const avgY = Math.floor(cellCoords.reduce((sum, c) => sum + c.y, 0) / cellCoords.length);
              startPasteMode({ x: avgX, y: avgY });
            } else {
              startPasteMode({ x: 0, y: 0 });
            }
          } else if (hasClipboard()) {
            let pasteX = 0;
            let pasteY = 0;
            
            if (lassoSelection.active && lassoSelection.selectedCells.size > 0) {
              // For lasso selection, use the bounds of selected cells
              const cellCoords = Array.from(lassoSelection.selectedCells).map(key => {
                const [x, y] = key.split(',').map(Number);
                return { x, y };
              });
              pasteX = Math.min(...cellCoords.map(c => c.x));
              pasteY = Math.min(...cellCoords.map(c => c.y));
            } else if (selection.active) {
              pasteX = selection.start.x;
              pasteY = selection.start.y;
            }
            
            startPasteMode({ x: pasteX, y: pasteY });
          }
        }
        break;
        
      case 'z':
        // Undo/Redo
        if (event.shiftKey) {
          // Shift+Cmd+Z = Redo
          if (canRedo()) {
            event.preventDefault();
            // Capture current state for undo stack before applying redo
            const currentCells = new Map(cells);
            const redoData = redo();
            if (redoData) {
              // Add current state to undo stack
              addToUndoStack(currentCells);
              setCanvasData(redoData);
            }
          }
        } else {
          // Cmd+Z = Undo
          if (canUndo()) {
            event.preventDefault();
            // Capture current state for redo stack before applying undo
            const currentCells = new Map(cells);
            const undoData = undo();
            if (undoData) {
              // Add current state to redo stack
              addToRedoStack(currentCells);
              setCanvasData(undoData);
            }
          }
        }
        break;
    }
  }, [
    cells, 
    selection, 
    lassoSelection,
    magicWandSelection,
    copySelection, 
    copyLassoSelection,
    copyMagicWandSelection,
    pasteSelection, 
    clearSelection,
    clearLassoSelection,
    clearMagicWandSelection,
    pushToHistory, 
    setCanvasData,
    undo,
    redo,
    canUndo,
    canRedo,
    addToRedoStack,
    addToUndoStack,
    startPasteMode,
    commitPaste,
    pasteMode,
    hasClipboard,
    hasLassoClipboard,
    hasMagicWandClipboard,
    textToolState
  ]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    // Expose functions for UI buttons
    copySelection: () => {
      if (magicWandSelection.active) {
        copyMagicWandSelection(cells);
      } else if (lassoSelection.active) {
        copyLassoSelection(cells);
      } else if (selection.active) {
        copySelection(cells);
      }
    },
    pasteSelection: () => {
      // If already in paste mode, commit the paste
      if (pasteMode.isActive) {
        const pastedData = commitPaste();
        if (pastedData) {
          pushToHistory(new Map(cells));
          const newCells = new Map(cells);
          pastedData.forEach((cell, key) => {
            newCells.set(key, cell);
          });
          setCanvasData(newCells);
        }
      } else {
        // Start paste mode if clipboard has data
        if (hasClipboard()) {
          let pasteX = 0;
          let pasteY = 0;
          
          if (lassoSelection.active && lassoSelection.selectedCells.size > 0) {
            // For lasso selection, use the bounds of selected cells
            const cellCoords = Array.from(lassoSelection.selectedCells).map(key => {
              const [x, y] = key.split(',').map(Number);
              return { x, y };
            });
            pasteX = Math.min(...cellCoords.map(c => c.x));
            pasteY = Math.min(...cellCoords.map(c => c.y));
          } else if (selection.active) {
            pasteX = selection.start.x;
            pasteY = selection.start.y;
          }
          
          startPasteMode({ x: pasteX, y: pasteY });
        }
      }
    }
  };
};
