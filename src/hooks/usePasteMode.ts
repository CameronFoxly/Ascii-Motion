import { useCallback, useEffect, useState } from 'react';
import { useToolStore } from '../stores/toolStore';

export interface PastePreview {
  data: Map<string, any>;
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
}

/**
 * Hook for managing enhanced paste mode with visual preview and positioning
 */
export const usePasteMode = () => {
  const { hasClipboard, clipboard } = useToolStore();
  const [pasteMode, setPasteMode] = useState<PasteModeState>({
    isActive: false,
    preview: null,
    isDragging: false
  });

  /**
   * Calculate bounds of clipboard data
   */
  const calculateClipboardBounds = useCallback((clipboardData: Map<string, any>) => {
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
    if (!hasClipboard() || !clipboard) {
      return false;
    }

    const bounds = calculateClipboardBounds(clipboard);
    
    setPasteMode({
      isActive: true,
      preview: {
        data: new Map(clipboard),
        position: initialPosition,
        bounds
      },
      isDragging: false
    });

    return true;
  }, [hasClipboard, clipboard, calculateClipboardBounds]);

  /**
   * Update paste preview position
   */
  const updatePastePosition = useCallback((newPosition: { x: number; y: number }) => {
    setPasteMode(prev => {
      if (!prev.isActive || !prev.preview) return prev;

      return {
        ...prev,
        preview: {
          ...prev.preview,
          position: newPosition
        }
      };
    });
  }, []);

  /**
   * Start dragging the paste preview
   */
  const startPasteDrag = useCallback(() => {
    setPasteMode(prev => ({
      ...prev,
      isDragging: true
    }));
  }, []);

  /**
   * Stop dragging the paste preview
   */
  const stopPasteDrag = useCallback(() => {
    setPasteMode(prev => ({
      ...prev,
      isDragging: false
    }));
  }, []);

  /**
   * Cancel paste mode without committing
   */
  const cancelPasteMode = useCallback(() => {
    setPasteMode({
      isActive: false,
      preview: null,
      isDragging: false
    });
  }, []);

  /**
   * Commit paste at current preview position
   */
  const commitPaste = useCallback(() => {
    if (!pasteMode.isActive || !pasteMode.preview) {
      return null;
    }

    const { data, position } = pasteMode.preview;
    const pastedData = new Map<string, any>();

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
   * Handle keyboard shortcuts for paste mode
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!pasteMode.isActive) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          cancelPasteMode();
          break;
        case 'Enter':
          event.preventDefault();
          // Commit paste and let parent handle the actual pasting
          commitPaste();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pasteMode.isActive, cancelPasteMode, commitPaste]);

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
