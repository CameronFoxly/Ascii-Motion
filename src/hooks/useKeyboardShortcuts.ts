import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import { useAnimationStore } from '../stores/animationStore';
import { useCanvasContext } from '../contexts/CanvasContext';
import { getToolForHotkey } from '../constants/hotkeys';
import { useZoomControls } from './useZoomControls';
import { useFrameNavigation } from './useFrameNavigation';
import { useAnimationHistory } from './useAnimationHistory';
import { usePaletteStore } from '../stores/paletteStore';
import { useCharacterPaletteStore } from '../stores/characterPaletteStore';
import { useFlipUtilities } from './useFlipUtilities';
import { useProjectFileActions } from './useProjectFileActions';
import { ANSI_COLORS } from '../constants/colors';
import type { AnyHistoryAction, CanvasHistoryAction, FrameId } from '../types';

type CanvasStoreState = ReturnType<typeof useCanvasStore.getState>;
type CanvasStoreForHistory = Pick<CanvasStoreState, 'setCanvasData'>;
type AnimationStoreState = ReturnType<typeof useAnimationStore.getState>;

/**
 * Helper function to process different types of history actions
 */
const processHistoryAction = (
  action: AnyHistoryAction,
  isRedo: boolean,
  canvasStore: CanvasStoreForHistory,
  animationStore: AnimationStoreState
) => {
  switch (action.type) {
    case 'canvas_edit': {
      const canvasAction = action as CanvasHistoryAction;
      // Determine which snapshot to apply
      // Undo -> previousCanvasData (state before edit)
      // Redo -> newCanvasData (state after edit) if available, else fallback to previousCanvasData (legacy entries)
      const targetData = isRedo
        ? (canvasAction.data.newCanvasData ?? canvasAction.data.previousCanvasData)
        : canvasAction.data.previousCanvasData;
      if (isRedo && !canvasAction.data.newCanvasData) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[history] Redo encountered legacy canvas_edit entry without newCanvasData; using previousCanvasData fallback');
        }
      }

      // Update frame data FIRST to avoid auto-save race conditions
      animationStore.setFrameData(canvasAction.data.frameIndex, targetData);

      // Ensure we're on the correct frame
      if (animationStore.currentFrameIndex !== canvasAction.data.frameIndex) {
        animationStore.setCurrentFrame(canvasAction.data.frameIndex);
      }

      // Apply to visible canvas
      canvasStore.setCanvasData(targetData);
      break;
    }
    
    case 'canvas_resize': {
      const resizeAction = action as import('../types').CanvasResizeHistoryAction;
      const canvas = useCanvasStore.getState();
      if (isRedo) {
        // Redo: Apply new size
        canvas.setCanvasSize(resizeAction.data.newWidth, resizeAction.data.newHeight);
      } else {
        // Undo: Restore previous size and data
        canvas.setCanvasSize(resizeAction.data.previousWidth, resizeAction.data.previousHeight);
        canvas.setCanvasData(resizeAction.data.previousCanvasData);
      }
      // Set current frame to match the frame this resize was made in
      animationStore.setCurrentFrame(resizeAction.data.frameIndex);
      break;
    }
      
    case 'add_frame': {
      if (isRedo) {
        // Redo: Re-add the frame with full properties
        const frame = action.data.frame;
        animationStore.addFrame(action.data.frameIndex, frame.data, frame.duration);
        animationStore.updateFrameName(action.data.frameIndex, frame.name);
        // Canvas will sync automatically since addFrame sets current frame
      } else {
        // Undo: Remove the frame that was added
        animationStore.removeFrame(action.data.frameIndex);
        animationStore.setCurrentFrame(action.data.previousCurrentFrame);
        // After removing frame and switching to previous frame, 
        // sync canvas with the frame we switched to
        const currentFrame = animationStore.frames[action.data.previousCurrentFrame];
        if (currentFrame) {
          canvasStore.setCanvasData(currentFrame.data);
        }
      }
      break;
    }
      
    case 'duplicate_frame': {
      if (isRedo) {
        // Redo: Re-add the duplicated frame using the stored frame data
        const frame = action.data.frame;
        animationStore.addFrame(action.data.newIndex, frame.data, frame.duration);
        animationStore.updateFrameName(action.data.newIndex, frame.name);
        // Canvas will sync automatically since addFrame sets current frame
      } else {
        // Undo: Remove the duplicated frame
        animationStore.removeFrame(action.data.newIndex);
        animationStore.setCurrentFrame(action.data.previousCurrentFrame);
        // Sync canvas with the frame we switched to
        const currentFrame = animationStore.frames[action.data.previousCurrentFrame];
        if (currentFrame) {
          canvasStore.setCanvasData(currentFrame.data);
        }
      }
      break;
    }
      
    case 'delete_frame': {
      if (isRedo) {
        // Redo: Re-delete the frame
        animationStore.removeFrame(action.data.frameIndex);
        // After deletion, sync canvas with the new current frame
        const newCurrentIndex = Math.min(action.data.frameIndex, animationStore.frames.length - 1);
        const currentFrame = animationStore.frames[newCurrentIndex];
        if (currentFrame) {
          canvasStore.setCanvasData(currentFrame.data);
        }
      } else {
        // Undo: Re-add the deleted frame
        const deletedFrame = action.data.frame;
        
        // Add frame at the correct position
        animationStore.addFrame(action.data.frameIndex, deletedFrame.data, deletedFrame.duration);
        
        // Update the frame properties to match the deleted frame
        animationStore.updateFrameName(action.data.frameIndex, deletedFrame.name);
        
        // Restore previous current frame
        animationStore.setCurrentFrame(action.data.previousCurrentFrame);
        // Sync canvas with the restored frame
        canvasStore.setCanvasData(deletedFrame.data);
      }
      break;
    }
      
    case 'reorder_frames': {
      if (isRedo) {
        // Redo: Re-perform the reorder
        animationStore.reorderFrames(action.data.fromIndex, action.data.toIndex);
      } else {
        // Undo: Reverse the reorder
        animationStore.reorderFrames(action.data.toIndex, action.data.fromIndex);
        animationStore.setCurrentFrame(action.data.previousCurrentFrame);
      }
      // Sync canvas after reorder to ensure we're showing the right frame
      const currentFrame = animationStore.frames[animationStore.currentFrameIndex];
      if (currentFrame) {
        canvasStore.setCanvasData(currentFrame.data);
      }
      break;
    }
      
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
      
    case 'navigate_frame':
      if (isRedo) {
        // Redo: Go to the new frame index
        animationStore.setCurrentFrame(action.data.newFrameIndex);
      } else {
        // Undo: Go back to the previous frame index
        animationStore.setCurrentFrame(action.data.previousFrameIndex);
      }
      break;
      
    case 'apply_effect': {
      const effectAction = action as import('../types').ApplyEffectHistoryAction;
      if (isRedo) {
        // Redo: Re-apply the effect
        console.log(`Redo: Re-applying ${effectAction.data.effectType} effect`);
        // Note: For redo, we would need to re-run the effect processing
        // This is complex because we'd need to re-apply the effect with the same settings
        // For now, we'll show a message that redo for effects is not yet implemented
        console.warn('Redo for effects is not yet implemented - would need to re-apply effect');
      } else {
        // Undo: Restore previous data
        if (effectAction.data.applyToTimeline) {
          // Restore all affected frames
          if (effectAction.data.previousFramesData) {
            effectAction.data.previousFramesData.forEach(({ frameIndex, data }) => {
              animationStore.setFrameData(frameIndex, data);
            });
            console.log(`✅ Undo: Restored ${effectAction.data.previousFramesData.length} frames from ${effectAction.data.effectType} effect`);
          }
        } else {
          // Restore single canvas
          if (effectAction.data.previousCanvasData) {
            canvasStore.setCanvasData(effectAction.data.previousCanvasData);
            console.log(`✅ Undo: Restored canvas from ${effectAction.data.effectType} effect`);
          }
        }
      }
      break;
    }

    case 'apply_time_effect': {
      const timeEffectAction = action as import('../types').ApplyTimeEffectHistoryAction;
      if (isRedo) {
        // Redo: Re-apply the time effect
        console.log(`Redo: Re-applying ${timeEffectAction.data.effectType} time effect`);
        console.warn('Redo for time effects is not yet implemented - would need to re-apply effect');
      } else {
        // Undo: Restore previous frame data
        if (timeEffectAction.data.previousFramesData) {
          timeEffectAction.data.previousFramesData.forEach(({ frameIndex, data }) => {
            animationStore.setFrameData(frameIndex, data);
          });
          console.log(`✅ Undo: Restored ${timeEffectAction.data.previousFramesData.length} frames from ${timeEffectAction.data.effectType} time effect`);
        }
      }
      break;
    }

    case 'set_frame_durations': {
      const durationsAction = action as import('../types').SetFrameDurationsHistoryAction;
      if (isRedo) {
        // Redo: Re-apply the new duration to all affected frames
        durationsAction.data.affectedFrameIndices.forEach(frameIndex => {
          animationStore.updateFrameDuration(frameIndex, durationsAction.data.newDuration);
        });
        console.log(`✅ Redo: Applied duration ${durationsAction.data.newDuration}ms to ${durationsAction.data.affectedFrameIndices.length} frames`);
      } else {
        // Undo: Restore previous durations
        durationsAction.data.previousDurations.forEach(({ frameIndex, duration }) => {
          animationStore.updateFrameDuration(frameIndex, duration);
        });
        console.log(`✅ Undo: Restored durations for ${durationsAction.data.previousDurations.length} frames`);
      }
      break;
    }

    case 'delete_frame_range': {
      const deleteRangeAction = action as import('../types').DeleteFrameRangeHistoryAction;
      if (isRedo) {
        // Redo: Re-delete the frames
        animationStore.removeFrameRange(deleteRangeAction.data.frameIndices);
        console.log(`✅ Redo: Deleted ${deleteRangeAction.data.frameIndices.length} frames`);
      } else {
        // Undo: Restore snapshot prior to deletion
        const { previousFrames, previousCurrentFrame, previousSelection } = deleteRangeAction.data;

        animationStore.replaceFrames(
          previousFrames,
          previousCurrentFrame,
          previousSelection.length > 0 ? previousSelection : undefined
        );

        console.log(`✅ Undo: Restored ${deleteRangeAction.data.frames.length} deleted frames`);
      }
      break;
    }

    case 'duplicate_frame_range': {
      const duplicateRangeAction = action as import('../types').DuplicateFrameRangeHistoryAction;
      const {
        previousFrames,
        newFrames,
        previousSelection,
        newSelection,
        previousCurrentFrame,
        newCurrentFrame,
        originalFrameIndices
      } = duplicateRangeAction.data;

      if (isRedo) {
        animationStore.replaceFrames(
          newFrames,
          newCurrentFrame,
          newSelection.length > 0 ? newSelection : undefined
        );
        console.log(`🔁 Redo: Duplicated ${originalFrameIndices.length} frame(s)`);
      } else {
        animationStore.replaceFrames(
          previousFrames,
          previousCurrentFrame,
          previousSelection.length > 0 ? previousSelection : undefined
        );
        console.log(`↩️ Undo: Removed duplicated frames`);
      }
      break;
    }

    case 'delete_all_frames': {
      const deleteAllAction = action as import('../types').DeleteAllFramesHistoryAction;
      if (isRedo) {
        // Redo: Clear all frames again
        animationStore.clearAllFrames();
        console.log('✅ Redo: Cleared all frames');
      } else {
        // Undo: Restore all deleted frames
        deleteAllAction.data.frames.forEach((frame, index) => {
          if (index === 0) {
            // Replace the default frame created by clearAllFrames
            animationStore.setFrameData(0, frame.data);
            animationStore.updateFrameName(0, frame.name);
            animationStore.updateFrameDuration(0, frame.duration);
          } else {
            // Add additional frames
            animationStore.addFrame(index, frame.data, frame.duration);
            animationStore.updateFrameName(index, frame.name);
          }
        });
        
        animationStore.setCurrentFrame(deleteAllAction.data.previousCurrentFrame);
        console.log(`✅ Undo: Restored ${deleteAllAction.data.frames.length} frames`);
      }
      break;
    }

    case 'reorder_frame_range': {
      const reorderRangeAction = action as import('../types').ReorderFrameRangeHistoryAction;
      const {
        frameIndices,
        targetIndex,
        previousCurrentFrame,
        newCurrentFrame,
        movedFrameIds,
        previousSelectionFrameIds,
        newSelectionFrameIds
      } = reorderRangeAction.data;

      const findIndicesForIds = (ids: FrameId[]) => {
        const { frames } = useAnimationStore.getState();
        return ids
          .map((id) => frames.findIndex((frame) => frame.id === id))
          .filter((idx) => idx >= 0)
          .sort((a, b) => a - b);
      };

      const setSelectionByIds = (ids: FrameId[]) => {
        if (ids.length === 0) {
          useAnimationStore.setState({ selectedFrameIndices: new Set<number>() });
          return;
        }
        const indices = findIndicesForIds(ids);
        if (indices.length === 0) return;
        useAnimationStore.setState({ selectedFrameIndices: new Set(indices) });
      };

      if (isRedo) {
        const currentPositions = findIndicesForIds(movedFrameIds);
        if (currentPositions.length === movedFrameIds.length) {
          animationStore.reorderFrameRange(currentPositions, targetIndex);
        }
        setSelectionByIds(newSelectionFrameIds);
        useAnimationStore.getState().setCurrentFrameOnly(newCurrentFrame);
        console.log(`🔁 Redo: Reordered ${movedFrameIds.length} frame(s)`);
      } else {
        const currentPositions = findIndicesForIds(movedFrameIds);
        if (currentPositions.length === movedFrameIds.length) {
          const originalTarget = Math.min(...frameIndices);
          animationStore.reorderFrameRange(currentPositions, originalTarget);
        }
        setSelectionByIds(previousSelectionFrameIds);
        useAnimationStore.getState().setCurrentFrameOnly(previousCurrentFrame);
        console.log(`↩️ Undo: Restored ${movedFrameIds.length} frame(s) to original positions`);
      }
      break;
    }

    case 'import_media': {
      const importAction = action as import('../types').ImportMediaHistoryAction;
      
      if (importAction.data.mode === 'single') {
        // Single image import - restore canvas data
        if (isRedo) {
          if (importAction.data.newCanvasData) {
            canvasStore.setCanvasData(importAction.data.newCanvasData);
            if (importAction.data.previousFrameIndex !== undefined) {
              animationStore.setCurrentFrame(importAction.data.previousFrameIndex);
            }
            console.log(`✅ Redo: Imported media to canvas`);
          }
        } else {
          if (importAction.data.previousCanvasData) {
            canvasStore.setCanvasData(importAction.data.previousCanvasData);
            if (importAction.data.previousFrameIndex !== undefined) {
              animationStore.setCurrentFrame(importAction.data.previousFrameIndex);
            }
            console.log(`✅ Undo: Restored canvas before media import`);
          }
        }
      } else {
        // Multi-frame import (overwrite or append)
        if (isRedo) {
          if (importAction.data.newFrames) {
            animationStore.replaceFrames(
              importAction.data.newFrames,
              importAction.data.newCurrentFrame || 0
            );
            console.log(`✅ Redo: Imported ${importAction.data.importedFrameCount} frame(s)`);
          }
        } else {
          if (importAction.data.previousFrames) {
            animationStore.replaceFrames(
              importAction.data.previousFrames,
              importAction.data.previousCurrentFrame || 0
            );
            console.log(`✅ Undo: Restored ${importAction.data.previousFrames.length} frame(s) before import`);
          }
        }
      }
      break;
    }
      
    default:
      console.warn('Unknown history action type:', action);
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
  const { toggleOnionSkin, currentFrameIndex, frames, selectedFrameIndices } = useAnimationStore();
  const { zoomIn, zoomOut } = useZoomControls();
  const { showSaveProjectDialog, showOpenProjectDialog } = useProjectFileActions();
  
  // Frame navigation and management hooks
  const { navigateNext, navigatePrevious, navigateFirst, navigateLast, canNavigate } = useFrameNavigation();
  const { addFrame, removeFrame, duplicateFrame, duplicateFrameRange, deleteFrameRange } = useAnimationHistory();
  
  // Flip utilities for Shift+H and Shift+V
  const { flipHorizontal, flipVertical } = useFlipUtilities();

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
    textToolState
  } = useToolStore();

  const startPasteFromClipboard = useCallback(() => {
    const {
      activeClipboardType,
      clipboard,
      lassoClipboard,
      magicWandClipboard,
      getClipboardOriginalPosition: getRectOrigin,
      getLassoClipboardOriginalPosition: getLassoOrigin,
      getMagicWandClipboardOriginalPosition: getMagicOrigin
    } = useToolStore.getState();

    const priority: Array<'magicwand' | 'lasso' | 'rectangle'> = [];
    if (activeClipboardType) {
      priority.push(activeClipboardType);
    }
    priority.push('magicwand', 'lasso', 'rectangle');

    const seen = new Set<string>();

    const ensureStarted = (origin: { x: number; y: number } | null | undefined) => {
      const fallbackPosition = origin || { x: 0, y: 0 };
      return startPasteMode(fallbackPosition);
    };

    for (const type of priority) {
      if (seen.has(type)) {
        continue;
      }
      seen.add(type);

      switch (type) {
        case 'magicwand': {
          if (magicWandClipboard && magicWandClipboard.size > 0) {
            if (ensureStarted(getMagicOrigin())) {
              return true;
            }
          }
          break;
        }
        case 'lasso': {
          if (lassoClipboard && lassoClipboard.size > 0) {
            if (ensureStarted(getLassoOrigin())) {
              return true;
            }
          }
          break;
        }
        case 'rectangle': {
          if (clipboard && clipboard.size > 0) {
            if (ensureStarted(getRectOrigin())) {
              return true;
            }
          }
          break;
        }
      }
    }

    return false;
  }, [startPasteMode]);

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

  const adjustBrushSize = useCallback((direction: 'decrease' | 'increase') => {
    const { activeTool, brushSettings, setBrushSize } = useToolStore.getState();
    if (activeTool !== 'pencil' && activeTool !== 'eraser') {
      return;
    }

    const currentSize = brushSettings[activeTool].size;
    const delta = direction === 'increase' ? 1 : -1;
    const newSize = Math.max(1, Math.min(20, currentSize + delta));

    if (newSize !== currentSize) {
      setBrushSize(newSize, activeTool);
    }
  }, []);

  const navigateCharacterPaletteCharacters = useCallback((direction: 'previous' | 'next') => {
    const { activePalette } = useCharacterPaletteStore.getState();
    const { selectedChar, setSelectedChar } = useToolStore.getState();

    const characters = activePalette?.characters ?? [];
    if (characters.length === 0) {
      return;
    }

    const total = characters.length;
    const currentIndex = selectedChar ? characters.findIndex(char => char === selectedChar) : -1;

    let targetIndex: number;
    if (direction === 'next') {
      targetIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % total;
    } else {
      targetIndex = currentIndex === -1 ? total - 1 : (currentIndex - 1 + total) % total;
    }

    const nextCharacter = characters[targetIndex];
    if (typeof nextCharacter === 'string' && nextCharacter.length > 0) {
      setSelectedChar(nextCharacter);
    }
  }, []);

  const blockBrowserShortcut = useCallback((event: KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
    (event as unknown as { returnValue?: boolean }).returnValue = false;
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

    const isModifierPressed = event.metaKey || event.ctrlKey;
    const normalizedKey = typeof event.key === 'string' ? event.key.toLowerCase() : '';

    if (isModifierPressed && !event.altKey && !event.shiftKey) {
      if (normalizedKey === 's') {
        blockBrowserShortcut(event);
        showSaveProjectDialog();
        return;
      }

      if (normalizedKey === 'o') {
        blockBrowserShortcut(event);
        showOpenProjectDialog();
        return;
      }
    }

    // If paste mode is active, let paste mode handle its own keyboard events (except Ctrl/Cmd+V to commit)
    if (pasteMode.isActive && !(isModifierPressed && normalizedKey === 'v')) {
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
      if (isModifierPressed) {
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
    if (textToolState.isTyping && !isModifierPressed && event.key !== 'Escape') {
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
      const animationStore = useAnimationStore.getState();
      if (animationStore.selectedFrameIndices.size > 1) {
        animationStore.clearSelection();
      }
      return;
    }

    // Handle Delete/Backspace key (without modifier) - Clear selected cells
    if ((event.key === 'Delete' || event.key === 'Backspace') && !isModifierPressed) {
      // Check if any selection is active and clear the selected cells
      if (magicWandSelection.active && magicWandSelection.selectedCells.size > 0) {
        event.preventDefault();
        
        // Save current state for undo
  const { pushCanvasHistory, finalizeCanvasHistory } = useToolStore.getState();
  pushCanvasHistory(new Map(cells), currentFrameIndex, 'Delete magic wand selection');
        
        // Clear all selected cells
        const newCells = new Map(cells);
        magicWandSelection.selectedCells.forEach(cellKey => {
          newCells.delete(cellKey);
        });
  setCanvasData(newCells);
  finalizeCanvasHistory(new Map(newCells));
        
        // Clear the selection after deleting content
        clearMagicWandSelection();
        return;
      }
      
      if (lassoSelection.active && lassoSelection.selectedCells.size > 0) {
        event.preventDefault();
        
        // Save current state for undo
  const { pushCanvasHistory: pushCanvasHistory2, finalizeCanvasHistory: finalizeCanvasHistory2 } = useToolStore.getState();
  pushCanvasHistory2(new Map(cells), currentFrameIndex, 'Delete lasso selection');
        
        // Clear all selected cells
        const newCells = new Map(cells);
        lassoSelection.selectedCells.forEach(cellKey => {
          newCells.delete(cellKey);
        });
  setCanvasData(newCells);
  finalizeCanvasHistory2(new Map(newCells));
        
        // Clear the selection after deleting content
        clearLassoSelection();
        return;
      }
      
      if (selection.active) {
        event.preventDefault();
        
        // Save current state for undo
  const { pushCanvasHistory: pushCanvasHistory3, finalizeCanvasHistory: finalizeCanvasHistory3 } = useToolStore.getState();
  pushCanvasHistory3(new Map(cells), currentFrameIndex, 'Delete rectangular selection');
        
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
  finalizeCanvasHistory3(new Map(newCells));
        
        // Clear the selection after deleting content
        clearSelection();
        return;
      }
    }

    const isBracketLeft = event.code === 'BracketLeft' || event.key === '[' || event.key === '{';
    const isBracketRight = event.code === 'BracketRight' || event.key === ']' || event.key === '}';

    if (isModifierPressed && !event.altKey && !event.shiftKey) {
      if (isBracketLeft) {
        event.preventDefault();
        navigateCharacterPaletteCharacters('previous');
        return;
      }

      if (isBracketRight) {
        event.preventDefault();
        navigateCharacterPaletteCharacters('next');
        return;
      }
    }

    // Handle shift-modified hotkeys (first/last frame, palette colors, flip utilities, onion skinning)
    if (event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const isShiftComma = event.key === '<' || event.code === 'Comma';
      const isShiftPeriod = event.key === '>' || event.code === 'Period';

      if (canNavigate && isShiftComma) {
        event.preventDefault();
        navigateFirst();
        return;
      }

      if (canNavigate && isShiftPeriod) {
        event.preventDefault();
        navigateLast();
        return;
      }

      if (isBracketLeft) {
        event.preventDefault();
        navigatePaletteColor('previous');
        return;
      }

      if (isBracketRight) {
        event.preventDefault();
        navigatePaletteColor('next');
        return;
      }

      if (event.key === 'H' || event.key === 'h') {
        event.preventDefault();
        flipHorizontal();
        return;
      }
      if (event.key === 'V' || event.key === 'v') {
        event.preventDefault();
        flipVertical();
        return;
      }
      if (event.key === 'O' || event.key === 'o') {
        event.preventDefault();
        toggleOnionSkin();
        return;
      }
    }

    // Handle tool hotkeys (single key presses for tool switching)
    // Only process if no modifier keys are pressed and key is a valid tool hotkey
    if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      if (isBracketLeft) {
        event.preventDefault();
        adjustBrushSize('decrease');
        return;
      }

      if (isBracketRight) {
        event.preventDefault();
        adjustBrushSize('increase');
        return;
      }

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
        navigatePrevious();
        return;
      }
      if (event.key === '.' && canNavigate) {
        event.preventDefault();
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
    if (!isModifierPressed) return;
    
    // Handle Ctrl+Delete or Ctrl+Backspace for frame deletion (before the switch statement)
    if ((event.key === 'Delete' || event.key === 'Backspace') && isModifierPressed) {
      if (frames.length > 1) {
        event.preventDefault();
        
        // Check if multiple frames are selected
        const selectedFrames = Array.from(selectedFrameIndices).sort((a, b) => a - b);
        
        if (selectedFrames.length > 1) {
          // Batch delete all selected frames
          deleteFrameRange(selectedFrames);
        } else {
          // Single frame delete
          removeFrame(currentFrameIndex);
        }
      }
      return;
    }

    switch (normalizedKey) {
      case 'n':
        // Ctrl+N = Add new frame after current frame
        if (!event.shiftKey) {
          event.preventDefault();
          addFrame(currentFrameIndex + 1);
        }
        break;
        
      case 'd':
        // Ctrl+D = Duplicate current frame
        if (!event.shiftKey) {
          event.preventDefault();
          const selectedFrames = Array.from(selectedFrameIndices).sort((a, b) => a - b);
          if (selectedFrames.length > 1) {
            duplicateFrameRange(selectedFrames);
          } else {
            duplicateFrame(currentFrameIndex);
          }
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
            const { pushCanvasHistory, finalizeCanvasHistory } = useToolStore.getState();
            pushCanvasHistory(new Map(cells), currentFrameIndex, 'Paste lasso selection');
            
            // Merge pasted data with current canvas
            const newCells = new Map(cells);
            pastedData.forEach((cell, key) => {
              newCells.set(key, cell);
            });
            
            setCanvasData(newCells);
            finalizeCanvasHistory(new Map(newCells));
          }
        } else {
          startPasteFromClipboard();
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
              // Set flag to prevent auto-save during history processing
              useToolStore.setState({ isProcessingHistory: true });
              try {
                handleHistoryAction(redoAction, true);
              } finally {
                // Clear flag after a small delay to ensure all effects have settled
                setTimeout(() => {
                  useToolStore.setState({ isProcessingHistory: false });
                }, 200);
              }
            }
          }
        } else {
          // Cmd+Z = Undo
          if (canUndo()) {
            event.preventDefault();
            const undoAction = undo();
            if (undoAction) {
              // Set flag to prevent auto-save during history processing
              useToolStore.setState({ isProcessingHistory: true });
              try {
                handleHistoryAction(undoAction, false);
              } finally {
                // Clear flag after a small delay to ensure all effects have settled
                setTimeout(() => {
                  useToolStore.setState({ isProcessingHistory: false });
                }, 200);
              }
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
    commitPaste,
    pasteMode,
    startPasteFromClipboard,
    textToolState,
    activeTool,
    setActiveTool,
    swapForegroundBackground,
    adjustBrushSize,
    toggleOnionSkin,
    currentFrameIndex,
    frames,
    selectedFrameIndices,
    zoomIn,
    zoomOut,
    navigateNext,
    navigatePrevious,
    navigateFirst,
    navigateLast,
    navigatePaletteColor,
    navigateCharacterPaletteCharacters,
    canNavigate,
    addFrame,
    removeFrame,
    duplicateFrame,
    duplicateFrameRange,
    deleteFrameRange,
    flipHorizontal,
    flipVertical,
    showSaveProjectDialog,
    showOpenProjectDialog,
    blockBrowserShortcut
  ]);

  const handleShortcutKeyPress = useCallback((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
      const normalizedKey = typeof event.key === 'string' ? event.key.toLowerCase() : '';
      if (normalizedKey === 's' || normalizedKey === 'o') {
        blockBrowserShortcut(event);
      }
    }
  }, [blockBrowserShortcut]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keypress', handleShortcutKeyPress, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keypress', handleShortcutKeyPress, true);
    };
  }, [handleKeyDown, handleShortcutKeyPress]);

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
          const { pushCanvasHistory, finalizeCanvasHistory } = useToolStore.getState();
          pushCanvasHistory(new Map(cells), currentFrameIndex, 'Paste selection');
          const newCells = new Map(cells);
          pastedData.forEach((cell, key) => {
            newCells.set(key, cell);
          });
          setCanvasData(newCells);
          finalizeCanvasHistory(new Map(newCells));
        }
      } else {
        startPasteFromClipboard();
      }
    }
  };
};
