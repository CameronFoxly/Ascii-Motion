import { useCallback, useEffect, useState } from 'react';
import { useToolStore } from '../stores/toolStore';
import { useCanvasStore } from '../stores/canvasStore';
import type { Cell } from '@/types';

export interface PastePreview {
  data: Map<string, Cell>;
  position: { x: number; y: number };
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface PasteModeState {
  isActive: boolean;
  preview: PastePreview | null;
  isDragging: boolean;
  dragOffset?: { x: number; y: number };
  isPlaced: boolean; // Tracks if the preview has been "placed" by user interaction
}

/**
 * Hook for managing enhanced paste mode with visual preview and positioning
 */
export const usePasteMode = () => {
  const { 
    hasClipboard, 
    clipboard, 
    lassoClipboard, 
    hasLassoClipboard, 
    magicWandClipboard,
    hasMagicWandClipboard,
    clearSelection, 
    clearLassoSelection,
    clearMagicWandSelection,
    activeClipboardType
  } = useToolStore();
  const { cells, setCanvasData } = useCanvasStore();
  const [pasteMode, setPasteMode] = useState<PasteModeState>({
    isActive: false,
    preview: null,
    isDragging: false,
    isPlaced: false
  });

  // Get the active clipboard data (prioritize magic wand, then lasso, then regular clipboard)
  const getActiveClipboard = useCallback((): Map<string, Cell> | null => {
    const priority: Array<'magicwand' | 'lasso' | 'rectangle'> = [];
    if (activeClipboardType) {
      priority.push(activeClipboardType);
    }
    priority.push('magicwand', 'lasso', 'rectangle');

    const seen = new Set<string>();

    for (const type of priority) {
      if (seen.has(type)) {
        continue;
      }
      seen.add(type);

      switch (type) {
        case 'magicwand':
          if (hasMagicWandClipboard() && magicWandClipboard) {
            return magicWandClipboard;
          }
          break;
        case 'lasso':
          if (hasLassoClipboard() && lassoClipboard) {
            return lassoClipboard;
          }
          break;
        case 'rectangle':
          if (clipboard) {
            return clipboard;
          }
          break;
      }
    }

    return null;
  }, [activeClipboardType, hasMagicWandClipboard, magicWandClipboard, hasLassoClipboard, lassoClipboard, clipboard]);

  /**
   * Calculate bounds of clipboard data
   */
  const calculateClipboardBounds = useCallback((clipboardData: Map<string, Cell>) => {
    if (!clipboardData || clipboardData.size === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    const coords = Array.from(clipboardData.keys()).map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });

    const minX = Math.min(...coords.map(c => c.x));
    const maxX = Math.max(...coords.map(c => c.x));
    const minY = Math.min(...coords.map(c => c.y));
    const maxY = Math.max(...coords.map(c => c.y));

    return { minX, maxX, minY, maxY };
  }, []);

  /**
   * Start paste mode - show preview at specified position
   */
  const startPasteMode = useCallback((initialPosition: { x: number; y: number }) => {
    if (!hasClipboard() && !hasLassoClipboard() && !hasMagicWandClipboard()) {
      return false;
    }

    const activeClipboard = getActiveClipboard();
    if (!activeClipboard) {
      return false;
    }

    // Clear any existing selections when entering paste mode
    clearSelection();
    clearLassoSelection();
    clearMagicWandSelection();

    const bounds = calculateClipboardBounds(activeClipboard);
    
    setPasteMode({
      isActive: true,
      preview: {
        data: new Map(activeClipboard),
        position: initialPosition,
        bounds
      },
      isDragging: false,
      dragOffset: undefined,
      isPlaced: false
    });

    return true;
  }, [hasClipboard, hasLassoClipboard, hasMagicWandClipboard, getActiveClipboard, clearSelection, clearLassoSelection, clearMagicWandSelection, calculateClipboardBounds]);

  /**
   * Update paste preview position
   */
  const updatePastePosition = useCallback((mousePosition: { x: number; y: number }) => {
    setPasteMode(prev => {
      if (!prev.isActive || !prev.preview) return prev;

      // When dragging, apply the drag offset to maintain relative positioning
      if (prev.isDragging && prev.dragOffset) {
        const newPosition = {
          x: mousePosition.x - prev.dragOffset.x,
          y: mousePosition.y - prev.dragOffset.y
        };

        return {
          ...prev,
          preview: {
            ...prev.preview,
            position: newPosition
          }
        };
      }

      // When not dragging, don't update position (preview stays where it was placed)
      return prev;
    });
  }, []);

  /**
   * Start dragging the paste preview
   */
  const startPasteDrag = useCallback((clickPosition: { x: number; y: number }) => {
    setPasteMode(prev => {
      if (!prev.isActive || !prev.preview) return prev;
      
      // Calculate offset between click position and current preview position
      const dragOffset = {
        x: clickPosition.x - prev.preview.position.x,
        y: clickPosition.y - prev.preview.position.y
      };
      
      return {
        ...prev,
        isDragging: true,
        dragOffset
      };
    });
  }, []);

  /**
   * Stop dragging the paste preview
   */
  const stopPasteDrag = useCallback(() => {
    setPasteMode(prev => ({
      ...prev,
      isDragging: false,
      dragOffset: undefined
    }));
  }, []);

  /**
   * Cancel paste mode without committing
   */
  const cancelPasteMode = useCallback(() => {
    setPasteMode({
      isActive: false,
      preview: null,
      isDragging: false,
      dragOffset: undefined,
      isPlaced: false
    });
  }, []);

  /**
   * Commit paste at current preview position
   */
  const commitPaste = useCallback((): Map<string, Cell> | null => {
    if (!pasteMode.isActive || !pasteMode.preview) {
      return null;
    }

    const { data, position } = pasteMode.preview;
    const pastedData = new Map<string, Cell>();

    // Transform clipboard data to absolute positions
    data.forEach((cell, relativeKey) => {
      const [relX, relY] = relativeKey.split(',').map(Number);
      const absoluteKey = `${position.x + relX},${position.y + relY}`;
      pastedData.set(absoluteKey, cell);
    });

    // Clear paste mode
    cancelPasteMode();

    return pastedData;
  }, [pasteMode, cancelPasteMode]);

  /**
   * Commit paste and apply to canvas - used for keyboard shortcuts
   */
  const commitPasteToCanvas = useCallback(() => {
    if (!pasteMode.isActive || !pasteMode.preview) {
      return false;
    }

    const pastedData = commitPaste();
    if (pastedData) {
      // Apply the paste to canvas
      const currentCells = new Map(cells);
      pastedData.forEach((cell, key) => {
        currentCells.set(key, cell);
      });
      setCanvasData(currentCells);
      return true;
    }
    return false;
  }, [pasteMode, commitPaste, cells, setCanvasData]);

  /**
   * Handle keyboard shortcuts for paste mode
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!pasteMode.isActive || !pasteMode.preview) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          cancelPasteMode();
          break;
        case 'Enter':
          event.preventDefault();
          // Commit paste and apply to canvas
          commitPasteToCanvas();
          break;
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight': {
          event.preventDefault();
          event.stopPropagation();
          
          // Calculate arrow direction offset
          let offsetX = 0;
          let offsetY = 0;
          
          switch (event.key) {
            case 'ArrowUp':
              offsetY = -1;
              break;
            case 'ArrowDown':
              offsetY = 1;
              break;
            case 'ArrowLeft':
              offsetX = -1;
              break;
            case 'ArrowRight':
              offsetX = 1;
              break;
          }
          
          // Update paste preview position
          setPasteMode(prev => {
            if (!prev.preview) return prev;
            
            const newPosition = {
              x: prev.preview.position.x + offsetX,
              y: prev.preview.position.y + offsetY
            };
            
            return {
              ...prev,
              preview: {
                ...prev.preview,
                position: newPosition
              }
            };
          });
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pasteMode.isActive, pasteMode.preview, cancelPasteMode, commitPasteToCanvas]);

  return {
    // State
    pasteMode,
    isInPasteMode: pasteMode.isActive,
    pastePreview: pasteMode.preview,
    isPasteDragging: pasteMode.isDragging,

    // Actions
    startPasteMode,
    updatePastePosition,
    startPasteDrag,
    stopPasteDrag,
    cancelPasteMode,
    commitPaste
  };
};
