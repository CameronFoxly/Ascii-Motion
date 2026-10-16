import { useCallback } from 'react';
import { toast } from 'sonner';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import { useAnimationStore } from '../stores/animationStore';
import { useTimelineStore } from '../stores/timelineStore';
import { cropAllFramesToSelection } from '../utils/cropUtils';
import { getBoundsFromMask } from '../utils/selectionUtils';
import { getContentFrameAtTime } from '../utils/layerCompositing';
import { applyLayerCanvasCrop } from '../utils/canvasGeometryOps';
import type { CanvasResizeHistoryAction, Cell } from '../types';

/**
 * Hook for cropping canvas to selection across all frames
 * Supports rectangular, lasso, and magic wand selections
 */
export function useCropToSelection() {
  // PERF FIX: Targeted selectors instead of broad useCanvasStore()/useToolStore().
  // Previously: `const { width, height, cells, ... } = useCanvasStore();`
  // Broad subscriptions caused re-renders on every cell edit, cascading through
  // ToolOptionsPanel (~700 lines) even though crop only needs callback access.
  const canvasWidth = useCanvasStore((s) => s.width);
  const canvasHeight = useCanvasStore((s) => s.height);
  const cells = useCanvasStore((s) => s.cells);
  const setCanvasSize = useCanvasStore((s) => s.setCanvasSize);
  const setCanvasData = useCanvasStore((s) => s.setCanvasData);
  const selection = useToolStore((s) => s.selection);
  const lassoSelection = useToolStore((s) => s.lassoSelection);
  const magicWandSelection = useToolStore((s) => s.magicWandSelection);
  const activeTool = useToolStore((s) => s.activeTool);
  const clearSelection = useToolStore((s) => s.clearSelection);
  const clearLassoSelection = useToolStore((s) => s.clearLassoSelection);
  const clearMagicWandSelection = useToolStore((s) => s.clearMagicWandSelection);
  const frames = useAnimationStore((s) => s.frames);
  const currentFrameIndex = useAnimationStore((s) => s.currentFrameIndex);
  const setFrameData = useAnimationStore((s) => s.setFrameData);

  /**
   * Get the current active selection's cells based on active tool
   */
  const getActiveSelection = useCallback((): Set<string> | null => {
    // Check which selection tool is active and has a selection
    if (activeTool === 'select' && selection.active && selection.selectedCells.size > 0) {
      return selection.selectedCells;
    } else if (activeTool === 'lasso' && lassoSelection.active && lassoSelection.selectedCells.size > 0) {
      return lassoSelection.selectedCells;
    } else if (activeTool === 'magicwand' && magicWandSelection.active && magicWandSelection.selectedCells.size > 0) {
      return magicWandSelection.selectedCells;
    }
    
    return null;
  }, [activeTool, selection, lassoSelection, magicWandSelection]);

  /**
   * Check if crop is available (has active selection)
   */
  const canCrop = useCallback((): boolean => {
    const activeSelection = getActiveSelection();
    return activeSelection !== null && activeSelection.size > 0;
  }, [getActiveSelection]);

  /**
   * Crop canvas to current selection across ALL layers
   */
  const cropToSelection = useCallback(() => {
    const selectedCells = getActiveSelection();
    
    if (!selectedCells || selectedCells.size === 0) {
      console.warn('No active selection to crop to');
      return;
    }

    // Get crop bounds from selection (screen space)
    const bounds = getBoundsFromMask(selectedCells);
    if (!bounds) {
      console.warn('Failed to calculate crop dimensions');
      return;
    }

    const { minX, minY, maxX, maxY } = bounds;
    const newWidth = maxX - minX + 1;
    const newHeight = maxY - minY + 1;

    // Validate new dimensions
    if (newWidth < 4 || newWidth > 200 || newHeight < 4 || newHeight > 100) {
      toast.error('Cannot execute crop: minimum canvas size is 4x4 characters.');
      return;
    }

    const tl = useTimelineStore.getState();
    const isLayerMode = tl.layers.length > 0;

    // Save previous state for undo
    const previousWidth = canvasWidth;
    const previousHeight = canvasHeight;
    const previousCells = new Map(cells);

    if (isLayerMode) {
      // ── LAYER MODE: Crop ALL layers' content frames ──

      // Flush the active layer's canvas buffer to the timeline store first,
      // so the snapshot captures the latest edits (canvasStore is the live
      // working copy; the timeline store may be stale).
      const activeLayerId = tl.view.activeLayerId;
      if (activeLayerId) {
        const activeLayer = tl.layers.find(l => l.id === activeLayerId);
        if (activeLayer) {
          const activeCf = getContentFrameAtTime(activeLayer, tl.view.currentFrame);
          if (activeCf) {
            tl.updateContentFrameData(activeLayer.id, activeCf.id, new Map(cells));
          }
        }
      }

      // Re-read timeline state after flush
      const tlFlushed = useTimelineStore.getState();

      // Snapshot all layers for undo (deep copy keyframes for proper restore)
      const previousLayerSnapshots = tlFlushed.layers.map(l => ({
        id: l.id,
        contentFrames: l.contentFrames.map(cf => ({
          id: cf.id,
          data: new Map(cf.data),
        })),
        staticProperties: { ...l.staticProperties },
        propertyTracks: l.propertyTracks.map(t => ({
          ...t,
          keyframes: t.keyframes.map(kf => ({ ...kf })),
        })),
      }));
      const previousGroupSnapshots = tlFlushed.layerGroups.map(g => ({
        ...g,
        staticProperties: { ...g.staticProperties },
        propertyTracks: (g.propertyTracks ?? []).map(t => ({
          ...t,
          keyframes: t.keyframes.map(kf => ({ ...kf })),
        })),
      }));

      // Crop offset: after crop, the canvas origin shifts by (minX, minY) in screen space.
      // We shift position values by (-minX, -minY) to account for this.
      // Content data stays in local space (NOT re-keyed) — this correctly preserves
      // animation at all frames, not just the current one. Content outside the new
      // canvas bounds simply won't render (unbounded canvas clips at export).
      //
      // CRITICAL: For grouped layers, only shift the GROUP's position (not the
      // child layer's position). In compositing, group position and layer position
      // are additive, so shifting both would double the offset.
      applyLayerCanvasCrop({ minX, minY, maxX, maxY });
      const updatedTl = useTimelineStore.getState();
      const activeLayerAfterCrop = updatedTl.layers.find(l => l.id === updatedTl.view.activeLayerId);
      if (activeLayerAfterCrop) {
        const activeCf = getContentFrameAtTime(activeLayerAfterCrop, updatedTl.view.currentFrame);
        if (activeCf) {
          setCanvasData(new Map(activeCf.data));
        } else {
          setCanvasData(new Map());
        }
      }

      // Record history with layer snapshots
      // Build new-state snapshots for redo
      const postCropState = useTimelineStore.getState();
      const newLayerSnapshots = postCropState.layers.map(l => ({
        id: l.id as string,
        contentFrames: l.contentFrames.map(cf => ({
          id: cf.id as string,
          data: new Map(cf.data),
        })),
        staticProperties: { ...l.staticProperties },
        propertyTracks: l.propertyTracks.map(t => ({
          ...t,
          id: t.id as string,
          keyframes: t.keyframes.map(kf => ({ ...kf, id: kf.id as string })),
        })),
      }));
      const newGroupSnapshots = postCropState.layerGroups.map(g => ({
        ...g,
        id: g.id as string,
        staticProperties: { ...g.staticProperties },
        propertyTracks: (g.propertyTracks ?? []).map(t => ({
          ...t,
          id: t.id as string,
          keyframes: t.keyframes.map(kf => ({ ...kf, id: kf.id as string })),
        })),
      }));

      const action: CanvasResizeHistoryAction = {
        type: 'canvas_resize' as const,
        timestamp: Date.now(),
        description: `Crop canvas from ${previousWidth}×${previousHeight} to ${newWidth}×${newHeight}`,
        data: {
          previousWidth,
          previousHeight,
          newWidth,
          newHeight,
          previousCanvasData: previousCells,
          frameIndex: currentFrameIndex,
          isCropOperation: true,
          // Layer snapshots for multi-layer undo/redo
          previousLayerSnapshots,
          newLayerSnapshots,
          previousGroupSnapshots,
          newGroupSnapshots,
        }
      };
      useToolStore.getState().pushToHistory(action);

    } else {
      // ── LEGACY MODE: Crop via adapter (single-layer) ──
      const previousAllFramesData = frames.map(frame => new Map(frame.data));
      const croppedFrames = cropAllFramesToSelection(frames, selectedCells);
      
      if (!croppedFrames) {
        console.warn('Failed to crop frames');
        return;
      }

      croppedFrames.forEach((croppedFrameData, index) => {
        setFrameData(index, croppedFrameData);
      });

      setCanvasSize(newWidth, newHeight);
      // Crop the current canvas cells
      const croppedCanvasCells = new Map<string, Cell>();
      selectedCells.forEach((key) => {
        const [sx, sy] = key.split(',').map(Number);
        const cell = cells.get(key);
        if (cell) {
          croppedCanvasCells.set(`${sx - minX},${sy - minY}`, { ...cell });
        }
      });
      setCanvasData(croppedCanvasCells);

      const action: CanvasResizeHistoryAction = {
        type: 'canvas_resize' as const,
        timestamp: Date.now(),
        description: `Crop canvas from ${previousWidth}×${previousHeight} to ${newWidth}×${newHeight}`,
        data: {
          previousWidth,
          previousHeight,
          newWidth,
          newHeight,
          previousCanvasData: previousCells,
          frameIndex: currentFrameIndex,
          allFramesPreviousData: previousAllFramesData,
          allFramesNewData: croppedFrames,
          isCropOperation: true
        }
      };
      useToolStore.getState().pushToHistory(action);
    }

    // Clear the selection after crop
    if (activeTool === 'select') {
      clearSelection();
    } else if (activeTool === 'lasso') {
      clearLassoSelection();
    } else if (activeTool === 'magicwand') {
      clearMagicWandSelection();
    }

    console.log(`Canvas cropped from ${previousWidth}×${previousHeight} to ${newWidth}×${newHeight}`);
  }, [
    getActiveSelection,
    cells,
    canvasWidth,
    canvasHeight,
    frames,
    currentFrameIndex,
    activeTool,
    setCanvasSize,
    setCanvasData,
    setFrameData,
    clearSelection,
    clearLassoSelection,
    clearMagicWandSelection
  ]);

  return {
    canCrop,
    cropToSelection
  };
}
