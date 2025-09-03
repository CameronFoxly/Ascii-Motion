import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';

/**
 * Custom hook for handling keyboard shortcuts
 */
export const useKeyboardShortcuts = () => {
  const { cells, setCanvasData } = useCanvasStore();
  const { 
    selection, 
    copySelection, 
    pasteSelection,
    clearSelection,
    undo,
    redo,
    canUndo,
    canRedo,
    pushToHistory
  } = useToolStore();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Handle Escape key (without modifier)
    if (event.key === 'Escape') {
      if (selection.active) {
        event.preventDefault();
        clearSelection();
      }
      return;
    }

    // Check for modifier keys (Cmd on Mac, Ctrl on Windows/Linux)
    const isModifierPressed = event.metaKey || event.ctrlKey;
    
    if (!isModifierPressed) return;

    switch (event.key.toLowerCase()) {
      case 'c':
        // Copy selection
        if (selection.active) {
          event.preventDefault();
          copySelection(cells);
        }
        break;
        
      case 'v':
        // Paste at selection start or (0,0)
        event.preventDefault();
        const pasteX = selection.active ? selection.start.x : 0;
        const pasteY = selection.active ? selection.start.y : 0;
        const pastedData = pasteSelection(pasteX, pasteY);
        
        if (pastedData) {
          // Save current state for undo
          pushToHistory(new Map(cells));
          
          // Merge pasted data with current canvas
          const newCells = new Map(cells);
          pastedData.forEach((cell, key) => {
            // Paste the cell data at the specified location
            newCells.set(key, cell);
          });
          
          setCanvasData(newCells);
        }
        break;
        
      case 'z':
        // Undo/Redo
        if (event.shiftKey) {
          // Shift+Cmd+Z = Redo
          if (canRedo()) {
            event.preventDefault();
            const redoData = redo();
            if (redoData) {
              setCanvasData(redoData);
            }
          }
        } else {
          // Cmd+Z = Undo
          if (canUndo()) {
            event.preventDefault();
            const undoData = undo();
            if (undoData) {
              setCanvasData(undoData);
            }
          }
        }
        break;
    }
  }, [
    cells, 
    selection, 
    copySelection, 
    pasteSelection, 
    clearSelection,
    pushToHistory, 
    setCanvasData,
    undo,
    redo,
    canUndo,
    canRedo
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
      if (selection.active) {
        copySelection(cells);
      }
    },
    pasteSelection: () => {
      const pasteX = selection.active ? selection.start.x : 0;
      const pasteY = selection.active ? selection.start.y : 0;
      const pastedData = pasteSelection(pasteX, pasteY);
      
      if (pastedData) {
        pushToHistory(new Map(cells));
        const newCells = new Map(cells);
        pastedData.forEach((cell, key) => {
          newCells.set(key, cell);
        });
        setCanvasData(newCells);
      }
    }
  };
};
