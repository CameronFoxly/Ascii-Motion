import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import { useAnimationStore } from '../stores/animationStore';
import { useCanvasContext } from '../contexts/CanvasContext';
import { getToolForHotkey } from '../constants/hotkeys';
import { useZoomControls } from '../components/features/ZoomControls';
import { useFrameNavigation } from './useFrameNavigation';
import { useAnimationHistory } from './useAnimationHistory';
import { usePaletteStore } from '../stores/paletteStore';
import { ANSI_COLORS } from '../constants/colors';
import type { AnyHistoryAction, CanvasHistoryAction } from '../types';

/**
 * Helper function to process different types of history actions
 */
const processHistoryAction = (
  action: AnyHistoryAction, 
  isRedo: boolean,
  canvasStore: any,
  animationStore: any
) => {
  switch (action.type) {
    case 'canvas_edit':
      const canvasAction = action as CanvasHistoryAction;
      canvasStore.setCanvasData(canvasAction.data.canvasData);
      // Set current frame to match the frame this edit was made in
      animationStore.setCurrentFrame(canvasAction.data.frameIndex);
      break;
      
    case 'add_frame':
      if (isRedo) {
        // Redo: Re-add the frame
        animationStore.addFrame(action.data.frameIndex, action.data.canvasData);
      } else {
        // Undo: Remove the frame that was added
        animationStore.removeFrame(action.data.frameIndex);
        animationStore.setCurrentFrame(action.data.previousCurrentFrame);
      }
      break;
      
    case 'duplicate_frame':
      if (isRedo) {
        // Redo: Re-duplicate the frame
        animationStore.duplicateFrame(action.data.originalIndex);
      } else {
        // Undo: Remove the duplicated frame
        animationStore.removeFrame(action.data.newIndex);
        animationStore.setCurrentFrame(action.data.previousCurrentFrame);
      }
      break;
      
    case 'delete_frame':
      if (isRedo) {
        // Redo: Re-delete the frame
        animationStore.removeFrame(action.data.frameIndex);
      } else {
        // Undo: Re-add the deleted frame
        const deletedFrame = action.data.frame;
        
        // Add frame at the correct position
        animationStore.addFrame(action.data.frameIndex, deletedFrame.data);
        
        // Update the frame properties to match the deleted frame
        animationStore.updateFrameName(action.data.frameIndex, deletedFrame.name);
        animationStore.updateFrameDuration(action.data.frameIndex, deletedFrame.duration);
        
        // Restore previous current frame
        animationStore.setCurrentFrame(action.data.previousCurrentFrame);
      }
      break;
      
    case 'reorder_frames':
      if (isRedo) {
        // Redo: Re-perform the reorder
        animationStore.reorderFrames(action.data.fromIndex, action.data.toIndex);
      } else {
        // Undo: Reverse the reorder
        animationStore.reorderFrames(action.data.toIndex, action.data.fromIndex);
        animationStore.setCurrentFrame(action.data.previousCurrentFrame);
      }
      break;
      
    case 'update_duration':
      if (isRedo) {
        // Redo: Apply new duration
        animationStore.updateFrameDuration(action.data.frameIndex, action.data.newDuration);
      } else {
        // Undo: Restore old duration
        animationStore.updateFrameDuration(action.data.frameIndex, action.data.oldDuration);
      }
      break;
      
    case 'update_name':
      if (isRedo) {
        // Redo: Apply new name
        animationStore.updateFrameName(action.data.frameIndex, action.data.newName);
      } else {
        // Undo: Restore old name
        animationStore.updateFrameName(action.data.frameIndex, action.data.oldName);
      }
      break;
      
    default:
      console.warn('Unknown history action type:', (action as any).type);
  }
};

/**
 * Custom hook for handling keyboard shortcuts
 * 
 * Frame Navigation:
 * - Comma (,) - Previous frame
 * - Period (.) - Next frame
 * 
 * Frame Management:
 * - Ctrl+N - Add new frame after current frame
 * - Ctrl+Delete - Delete current frame (if more than one frame exists)
 * 
 * Other shortcuts:
 * - Tool hotkeys (P, E, G, M, L, W, etc.)
 * - Canvas operations (Cmd/Ctrl+A, C, V, Z)
 * - Zoom (+/-, =)
 */
export const useKeyboardShortcuts = () => {
  const { cells, setCanvasData, width, height } = useCanvasStore();
  const { startPasteMode, commitPaste, pasteMode } = useCanvasContext();
  const { toggleOnionSkin, currentFrameIndex, frames } = useAnimationStore();
  const { zoomIn, zoomOut } = useZoomControls();
  
  // Frame navigation and management hooks
  const { navigateNext, navigatePrevious, canNavigate } = useFrameNavigation();
  const { addFrame, removeFrame } = useAnimationHistory();

  // Helper function to handle different types of history actions
  const handleHistoryAction = useCallback((action: AnyHistoryAction, isRedo: boolean) => {
    processHistoryAction(action, isRedo, { setCanvasData }, useAnimationStore.getState());
  }, [setCanvasData]);
  const { 
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
    startSelection,
    updateSelection,
    undo,
    redo,
    canUndo,
    canRedo,
    pushCanvasHistory,
    activeTool,
    setActiveTool,
    hasClipboard,
    hasLassoClipboard,
    hasMagicWandClipboard,
    getClipboardOriginalPosition,
    getLassoClipboardOriginalPosition,
    getMagicWandClipboardOriginalPosition,
    textToolState
  } = useToolStore();

  // Helper function to swap foreground/background colors
  const swapForegroundBackground = useCallback(() => {
    const { selectedColor, selectedBgColor, setSelectedColor, setSelectedBgColor } = useToolStore.getState();
    const { addRecentColor } = usePaletteStore.getState();
    
    const tempColor = selectedColor;
    
    // Handle edge case: never allow transparent as foreground color
    if (selectedBgColor === 'transparent' || selectedBgColor === ANSI_COLORS.transparent) {
      // Background becomes current foreground color
      setSelectedBgColor(tempColor);
      // Foreground stays the same (no transparent characters allowed)
    } else {
      // Normal swap
      setSelectedColor(selectedBgColor);
      setSelectedBgColor(tempColor);
    }
    
    // Add both colors to recent colors (only if they're not transparent)
    if (selectedBgColor !== 'transparent' && selectedBgColor !== ANSI_COLORS.transparent) {
      addRecentColor(selectedBgColor);
    }
    if (tempColor !== 'transparent' && tempColor !== ANSI_COLORS.transparent) {
      addRecentColor(tempColor);
    }
  }, []);

  // Helper function to navigate palette colors
  const navigatePaletteColor = useCallback((direction: 'previous' | 'next') => {
    const { getActiveColors, selectedColorId, setSelectedColor: setSelectedColorId } = usePaletteStore.getState();
    const { setSelectedColor, setSelectedBgColor } = useToolStore.getState();
    
    // Determine if we're in background tab context by checking the active tab in the ColorPicker
    // Look for the active background tab using multiple strategies
    let isBackgroundTab = false;
    
    // Strategy 1: Look for Radix UI tabs trigger with various attribute combinations
    const backgroundTabQueries = [
      'button[data-state="active"][data-value="bg"]',
      '[data-state="active"][value="bg"]', 
      'button[aria-selected="true"][value="bg"]',
      '[role="tab"][aria-selected="true"][value="bg"]',
      '[data-radix-collection-item][data-state="active"][value="bg"]'
    ];
    
    for (const query of backgroundTabQueries) {
      if (document.querySelector(query)) {
        isBackgroundTab = true;
        break;
      }
    }
    
    // Strategy 2: If no direct match, look for any tab with "BG" text content that's active
    if (!isBackgroundTab) {
      const activeTabs = document.querySelectorAll('[data-state="active"], [aria-selected="true"]');
      isBackgroundTab = Array.from(activeTabs).some(tab => 
        tab.textContent?.includes('BG') || tab.textContent?.includes('Background')
      );
    }
    
    const activeColors = getActiveColors();
    if (activeColors.length === 0) return;
    
    // Filter colors based on context (foreground = no transparent, background = include transparent)
    const availableColors = isBackgroundTab 
      ? [{ id: 'transparent', value: 'transparent', name: 'Transparent' }, ...activeColors.filter(c => c.value !== 'transparent' && c.value !== ANSI_COLORS.transparent)]
      : activeColors.filter(c => c.value !== 'transparent' && c.value !== ANSI_COLORS.transparent);
      
    if (availableColors.length === 0) return;
    
    let newIndex = 0;
    
    if (selectedColorId) {
      // Find current index
      const currentIndex = availableColors.findIndex(c => c.id === selectedColorId);
      if (currentIndex !== -1) {
        // Navigate with loop-around
        if (direction === 'next') {
          newIndex = (currentIndex + 1) % availableColors.length;
        } else {
          newIndex = currentIndex === 0 ? availableColors.length - 1 : currentIndex - 1;
        }
      }
    }
    // If no selection, default to first color (newIndex = 0)
    
    const newColor = availableColors[newIndex];
    setSelectedColorId(newColor.id);
    
    // Set the drawing color
    if (isBackgroundTab) {
      setSelectedBgColor(newColor.value);
    } else {
      setSelectedColor(newColor.value);
    }
    
    // Add to recent colors if not transparent
    if (newColor.value !== 'transparent' && newColor.value !== ANSI_COLORS.transparent) {
      const { addRecentColor } = usePaletteStore.getState();
      addRecentColor(newColor.value);
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // If any modal dialog is open, disable all keyboard shortcuts
    // Check for shadcn/ui dialogs that are actually open and visible
    const openDialogs = Array.from(document.querySelectorAll('[role="dialog"]')).filter(dialog => {
      const style = window.getComputedStyle(dialog);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });
    
    if (openDialogs.length > 0) {
      return;
    }

    // If paste mode is active, let paste mode handle its own keyboard events (except Ctrl/Cmd+V to commit)
    if (pasteMode.isActive && !((event.metaKey || event.ctrlKey) && event.key === 'v')) {
      return;
    }

    // If any input field is focused, block specific canvas hotkeys that conflict with typing
    // But allow text editing shortcuts (Cmd+A, arrow keys, etc.) to work normally
    const activeElement = document.activeElement as HTMLElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true' ||
      activeElement.getAttribute('role') === 'textbox'
    );
    
    if (isInputFocused) {
      // Allow all modifier-based shortcuts (Cmd+A, Cmd+C, etc.) - these are text editing commands
      if (event.metaKey || event.ctrlKey) {
        return; // Let the input field handle text editing shortcuts
      }
      
      // Allow navigation keys that are essential for text editing
      const allowedKeys = [
        'Escape', 'Tab', 'Enter', 'Backspace', 'Delete',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'Home', 'End', 'PageUp', 'PageDown'
      ];
      
      if (allowedKeys.includes(event.key)) {
        // For Escape, still handle our canvas logic after the input handles it
        if (event.key === 'Escape') {
          // Don't return yet - let canvas logic handle Escape below
        } else {
          return; // Let the input field handle navigation keys
        }
      } else {
        // Block tool hotkeys and other single-key shortcuts that conflict with typing
        // This includes letters (b, p, e, etc.), numbers, space, etc.
        return;
      }
    }

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

    // Handle Delete/Backspace key (without modifier) - Clear selected cells
    if ((event.key === 'Delete' || event.key === 'Backspace') && !event.metaKey && !event.ctrlKey) {
      // Check if any selection is active and clear the selected cells
      if (magicWandSelection.active && magicWandSelection.selectedCells.size > 0) {
        event.preventDefault();
        
        // Save current state for undo
        pushCanvasHistory(new Map(cells), currentFrameIndex, 'Delete magic wand selection');
        
        // Clear all selected cells
        const newCells = new Map(cells);
        magicWandSelection.selectedCells.forEach(cellKey => {
          newCells.delete(cellKey);
        });
        setCanvasData(newCells);
        
        // Clear the selection after deleting content
        clearMagicWandSelection();
        return;
      }
      
      if (lassoSelection.active && lassoSelection.selectedCells.size > 0) {
        event.preventDefault();
        
        // Save current state for undo
        pushCanvasHistory(new Map(cells), currentFrameIndex, 'Delete lasso selection');
        
        // Clear all selected cells
        const newCells = new Map(cells);
        lassoSelection.selectedCells.forEach(cellKey => {
          newCells.delete(cellKey);
        });
        setCanvasData(newCells);
        
        // Clear the selection after deleting content
        clearLassoSelection();
        return;
      }
      
      if (selection.active) {
        event.preventDefault();
        
        // Save current state for undo
        pushCanvasHistory(new Map(cells), currentFrameIndex, 'Delete rectangular selection');
        
        // Clear all cells in rectangular selection
        const newCells = new Map(cells);
        const { start, end } = selection;
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const cellKey = `${x},${y}`;
            newCells.delete(cellKey);
          }
        }
        setCanvasData(newCells);
        
        // Clear the selection after deleting content
        clearSelection();
        return;
      }
    }

    // Handle tool hotkeys (single key presses for tool switching)
    // Only process if no modifier keys are pressed and key is a valid tool hotkey
    if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      // Handle zoom hotkeys
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomIn();
        return;
      }
      if (event.key === '-') {
        event.preventDefault();
        zoomOut();
        return;
      }
      
      // Handle frame navigation shortcuts (comma and period keys)
      if (event.key === ',' && canNavigate) {
        event.preventDefault();
        console.log('Previous frame navigation triggered');
        navigatePrevious();
        return;
      }
      if (event.key === '.' && canNavigate) {
        event.preventDefault();
        console.log('Next frame navigation triggered');
        navigateNext();
        return;
      }
      
      // Handle color hotkeys
      if (event.key === 'x') {
        // Swap foreground/background colors using existing logic
        event.preventDefault();
        swapForegroundBackground();
        return;
      }
      
      if (event.key === '[') {
        // Previous palette color
        event.preventDefault();
        navigatePaletteColor('previous');
        return;
      }
      
      if (event.key === ']') {
        // Next palette color
        event.preventDefault();
        navigatePaletteColor('next');
        return;
      }
      
      const targetTool = getToolForHotkey(event.key);
      if (targetTool) {
        event.preventDefault();
        setActiveTool(targetTool);
        return;
      }
    }

    // Check for modifier keys (Cmd on Mac, Ctrl on Windows/Linux)
    const isModifierPressed = event.metaKey || event.ctrlKey;
    
    if (!isModifierPressed) return;
    
    // Handle Ctrl+Delete or Ctrl+Backspace for frame deletion (before the switch statement)
    if ((event.key === 'Delete' || event.key === 'Backspace') && (event.metaKey || event.ctrlKey)) {
      console.log(`Ctrl+${event.key} detected, frames.length:`, frames.length, 'currentFrameIndex:', currentFrameIndex);
      if (frames.length > 1) {
        event.preventDefault();
        removeFrame(currentFrameIndex);
        console.log('Frame removed successfully');
      } else {
        console.log('Cannot delete frame - only one frame remaining');
      }
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'n':
        // Ctrl+N = Add new frame after current frame
        if (!event.shiftKey) {
          event.preventDefault();
          console.log('Ctrl+N detected, adding frame after index:', currentFrameIndex);
          addFrame(currentFrameIndex + 1);
        }
        break;
        

        
      case 'a':
        // Select All - activate selection tool and select entire canvas
        event.preventDefault();
        
        // Switch to selection tool if not already active
        if (activeTool !== 'select') {
          setActiveTool('select');
        }
        
        // Clear any existing selections
        clearSelection();
        clearLassoSelection();
        clearMagicWandSelection();
        
        // Create a selection that covers the entire canvas
        // Canvas coordinates go from 0,0 to width-1,height-1
        startSelection(0, 0);
        updateSelection(width - 1, height - 1);
        break;
        
      case 'c':
        // Copy selection (prioritize magic wand, then lasso, then rectangular)
        if (magicWandSelection.active) {
          event.preventDefault();
          copyMagicWandSelection(cells);
        } else if (lassoSelection.active) {
          event.preventDefault();
          copyLassoSelection(cells);
        } else if (selection.active) {
          event.preventDefault();
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
            pushCanvasHistory(new Map(cells), currentFrameIndex, 'Paste lasso selection');
            
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
            // Always use stored original position for consistent paste behavior
            const originalPos = getMagicWandClipboardOriginalPosition();
            startPasteMode(originalPos || { x: 0, y: 0 });
          } else if (hasLassoClipboard()) {
            // Always use stored original position for consistent paste behavior
            const originalPos = getLassoClipboardOriginalPosition();
            startPasteMode(originalPos || { x: 0, y: 0 });
          } else if (hasClipboard()) {
            // Always use stored original position for consistent paste behavior
            const originalPos = getClipboardOriginalPosition();
            const pastePos = originalPos || { x: 0, y: 0 };
            
            startPasteMode(pastePos);
          }
        }
        break;
        
      case 'o':
        // Shift+O = Toggle Onion Skin
        if (event.shiftKey) {
          event.preventDefault();
          toggleOnionSkin();
        }
        break;
        
      case 'z':
        // Undo/Redo with enhanced history support
        if (event.shiftKey) {
          // Shift+Cmd+Z = Redo
          if (canRedo()) {
            event.preventDefault();
            const redoAction = redo();
            if (redoAction) {
              handleHistoryAction(redoAction, true);
            }
          }
        } else {
          // Cmd+Z = Undo
          if (canUndo()) {
            event.preventDefault();
            const undoAction = undo();
            if (undoAction) {
              handleHistoryAction(undoAction, false);
            }
          }
        }
        break;
    }
  }, [
    cells, 
    width,
    height,
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
    startSelection,
    updateSelection,
    pushCanvasHistory, 
    setCanvasData,
    undo,
    redo,
    canUndo,
    canRedo,
    handleHistoryAction,
    startPasteMode,
    commitPaste,
    pasteMode,
    hasClipboard,
    hasLassoClipboard,
    hasMagicWandClipboard,
    getClipboardOriginalPosition,
    getLassoClipboardOriginalPosition,
    getMagicWandClipboardOriginalPosition,
    textToolState,
    setActiveTool,
    toggleOnionSkin,
    currentFrameIndex,
    frames,
    zoomIn,
    zoomOut,
    navigateNext,
    navigatePrevious,
    canNavigate,
    addFrame,
    removeFrame
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
          pushCanvasHistory(new Map(cells), currentFrameIndex, 'Paste selection');
          const newCells = new Map(cells);
          pastedData.forEach((cell, key) => {
            newCells.set(key, cell);
          });
          setCanvasData(newCells);
        }
      } else {
        // Start paste mode if clipboard has data
        if (hasClipboard()) {
          // Always use stored original position for consistent paste behavior
          const originalPos = getClipboardOriginalPosition();
          const pastePos = originalPos || { x: 0, y: 0 };
          
          startPasteMode(pastePos);
        }
      }
    }
  };
};
