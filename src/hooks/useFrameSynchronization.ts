import React, { useEffect, useCallback, useRef } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useToolStore } from '../stores/toolStore';
import { useSelectionStore } from '../stores/selectionStore';
import { getContentFrameAtTime } from '../utils/layerCompositing';
import type { Cell } from '../types';
import { registerAtomicFrameNavigator } from '../mcp/frameNavigation';

/**
 * Hook that manages synchronization between canvas state and animation frames.
 * 
 * PERF-CRITICAL: This hook runs inside CanvasProvider, which wraps the ENTIRE app.
 * Any reactive state subscription here causes CanvasProvider to re-render,
 * which creates a new context value, which re-renders EVERY context consumer.
 * 
 * Therefore, we use NON-REACTIVE subscriptions (useCanvasStore.subscribe / refs)
 * wherever possible, and only use reactive selectors for values that the
 * CanvasProvider actually needs to pass through context.
 */
export const useFrameSynchronization = (
  moveStateParam?: { 
    originalData: Map<string, Cell>;
    originalPositions: Set<string>;
    startPos: { x: number; y: number };
    baseOffset: { x: number; y: number };
    currentOffset: { x: number; y: number };
  } | null,
  setMoveStateParam?: React.Dispatch<React.SetStateAction<{ 
    originalData: Map<string, Cell>;
    originalPositions: Set<string>;
    startPos: { x: number; y: number };
    baseOffset: { x: number; y: number };
    currentOffset: { x: number; y: number };
  } | null>>
) => {
  // PERF FIX: Do NOT subscribe to cells reactively! That causes CanvasProvider
  // to re-render on every cell change → new context → entire app cascade.
  // Instead, track cells via a ref + non-reactive subscribe().
  const cellsRef = useRef(useCanvasStore.getState().cells);
  const widthRef = useRef(useCanvasStore.getState().width);
  const heightRef = useRef(useCanvasStore.getState().height);
  
  // Non-reactive actions
  const setCanvasData = useCanvasStore.getState().setCanvasData;
  
  // PERF FIX: Use individual selectors instead of broad useAnimationStore()
  // to avoid re-rendering this hook (which lives in CanvasProvider and affects
  // the entire app) on every animationStore change.
  // These scalars rarely change — fine as reactive (they gate behavior, not hot-path)
  const currentFrameIndex = useAnimationStore((s) => s.currentFrameIndex);
  const isPlaying = useAnimationStore((s) => s.isPlaying);
  const isDraggingFrame = useAnimationStore((s) => s.isDraggingFrame);
  const isDeletingFrame = useAnimationStore((s) => s.isDeletingFrame);
  const isImportingSession = useAnimationStore((s) => s.isImportingSession);
  const legacySetFrameData = useAnimationStore.getState().setFrameData;
  const legacyGetFrameData = useAnimationStore.getState().getFrameData;
  const getCurrentFrame = useAnimationStore.getState().getCurrentFrame;

  const layerCount = useTimelineStore((s) => s.layers.length);
  const activeLayerId = useTimelineStore((s) => s.view.activeLayerId);
  const tlCurrentFrame = useTimelineStore((s) => s.view.currentFrame);
  const isLayerMode = layerCount > 0;
  const effectiveFrameIndex = isLayerMode ? tlCurrentFrame : currentFrameIndex;

  const setFrameData = useCallback((frameIndex: number, data: Map<string, Cell>) => {
    if (isLayerMode) {
      const tl = useTimelineStore.getState();
      const layer = tl.layers.find((l) => l.id === (activeLayerId ?? tl.view.activeLayerId));
      if (!layer) return;
      const cf = getContentFrameAtTime(layer, frameIndex);
      if (!cf) return;
      tl.updateContentFrameData(layer.id, cf.id, data);
    } else {
      legacySetFrameData(frameIndex, data);
    }
  }, [isLayerMode, activeLayerId, legacySetFrameData]);

  const getFrameData = useCallback((frameIndex: number): Map<string, Cell> | undefined => {
    if (isLayerMode) {
      const tl = useTimelineStore.getState();
      const layer = tl.layers.find((l) => l.id === (activeLayerId ?? tl.view.activeLayerId));
      if (!layer) return undefined;
      const cf = getContentFrameAtTime(layer, frameIndex);
      return cf ? new Map(cf.data) : undefined;
    } else {
      return legacyGetFrameData(frameIndex);
    }
  }, [isLayerMode, activeLayerId, legacyGetFrameData]);
  
  const isProcessingHistory = useToolStore((s) => s.isProcessingHistory);
  
  const lastFrameIndexRef = useRef<number>(effectiveFrameIndex);
  const lastCellsRef = useRef<Map<string, Cell>>(new Map());
  const isLoadingFrameRef = useRef<boolean>(false);
  const frameWasEmptyOnLoadRef = useRef<boolean>(false);
  const lastActiveLayerIdRef = useRef<string | null>(activeLayerId);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync for use in non-reactive callbacks
  const effectiveFrameIndexRef = useRef(effectiveFrameIndex);
  effectiveFrameIndexRef.current = effectiveFrameIndex;
  const setFrameDataRef = useRef(setFrameData);
  setFrameDataRef.current = setFrameData;

  const installFrameData = useCallback((frameData?: Map<string, Cell>) => {
    const nextCells = frameData && frameData.size > 0
      ? new Map(frameData)
      : new Map<string, Cell>();
    setCanvasData(nextCells);

    const installedCells = useCanvasStore.getState().cells;
    cellsRef.current = installedCells;
    lastCellsRef.current = installedCells;
    frameWasEmptyOnLoadRef.current = installedCells.size === 0;
  }, [setCanvasData]);

  // ── Layer-switch sync ──
  // When the active layer changes, flush canvas to the old layer's content frame
  // and load the new layer's content frame into canvasStore.
  useEffect(() => {
    if (!isLayerMode) return;
    const prevLayerId = lastActiveLayerIdRef.current;
    if (activeLayerId === prevLayerId) return;

    const tl = useTimelineStore.getState();
    const frame = tl.view.currentFrame;

    // Flush current canvas to the OLD layer's content frame
    // CRITICAL: Skip flush during session import! The old layer ID might collide
    // with a loaded layer's ID (e.g., default "layer-1" matches a saved layer's
    // "layer-1"), and flushing empty canvas data would destroy loaded content.
    if (prevLayerId && !isPlaying && !isLoadingFrameRef.current && !isImportingSession) {
      const oldLayer = tl.layers.find((l) => l.id === prevLayerId);
      if (oldLayer) {
        const oldCf = getContentFrameAtTime(oldLayer, frame);
        if (oldCf) {
          tl.updateContentFrameData(oldLayer.id, oldCf.id, new Map(cellsRef.current));
        }
      }
    }

    // Load the NEW layer's content frame into canvasStore
    isLoadingFrameRef.current = true;
    const newLayer = tl.layers.find((l) => l.id === activeLayerId);
    if (newLayer) {
      const newCf = getContentFrameAtTime(newLayer, frame);
      installFrameData(newCf?.data);
      useCanvasStore.getState().setActiveLayerId(newLayer.id);
    } else {
      installFrameData();
      useCanvasStore.getState().setActiveLayerId(null);
    }
    useCanvasStore.getState().setDirty(false);
    setTimeout(() => { isLoadingFrameRef.current = false; }, 0);

    lastActiveLayerIdRef.current = activeLayerId;
  }, [activeLayerId, isLayerMode, isPlaying, isImportingSession, installFrameData]);

  const commitPendingMove = useCallback((fallbackCells: Map<string, Cell>): Map<string, Cell> => {
    if (!moveStateParam || !setMoveStateParam) {
      return fallbackCells;
    }

    const totalOffset = {
      x: moveStateParam.baseOffset.x + moveStateParam.currentOffset.x,
      y: moveStateParam.baseOffset.y + moveStateParam.currentOffset.y
    };
    const newCells = new Map(cellsRef.current);
    const originalKeys = moveStateParam.originalPositions ?? new Set(moveStateParam.originalData.keys());
    originalKeys.forEach((key) => {
      newCells.delete(key);
    });

    const updatedSelectionMask = new Set<string>();
    moveStateParam.originalData.forEach((cell, key) => {
      const [origX, origY] = key.split(',').map(Number);
      const newX = origX + totalOffset.x;
      const newY = origY + totalOffset.y;

      if (newX >= 0 && newX < widthRef.current && newY >= 0 && newY < heightRef.current) {
        newCells.set(`${newX},${newY}`, cell);
        updatedSelectionMask.add(`${newX},${newY}`);
      }
    });

    const toolStore = useToolStore.getState();
    const activeSelection = toolStore.selection.active ? toolStore.selection.selectedCells
      : (toolStore.lassoSelection.active ? toolStore.lassoSelection.selectedCells
      : (toolStore.magicWandSelection.active ? toolStore.magicWandSelection.selectedCells : null));

    if (activeSelection) {
      activeSelection.forEach((key) => {
        const [origX, origY] = key.split(',').map(Number);
        const newX = origX + totalOffset.x;
        const newY = origY + totalOffset.y;
        if (newX >= 0 && newX < widthRef.current && newY >= 0 && newY < heightRef.current) {
          updatedSelectionMask.add(`${newX},${newY}`);
        }
      });
    }

    setCanvasData(newCells);

    if (updatedSelectionMask.size > 0) {
      const { activeTool } = toolStore;
      toolStore.clearSelection();
      toolStore.clearLassoSelection();
      toolStore.clearMagicWandSelection();

      if (activeTool === 'select') {
        toolStore.setSelectionFromMask(updatedSelectionMask);
      } else if (activeTool === 'lasso') {
        toolStore.setLassoSelectionFromMask(updatedSelectionMask, []);
      } else if (activeTool === 'magicwand') {
        toolStore.setMagicWandSelectionFromMask(updatedSelectionMask);
      } else {
        toolStore.setSelectionFromMask(updatedSelectionMask);
      }

      useSelectionStore.getState().setSelection(updatedSelectionMask);
    }

    setMoveStateParam(null);
    return newCells;
  }, [moveStateParam, setMoveStateParam, setCanvasData]);

  // Auto-save current canvas to current frame whenever canvas changes
  const saveCurrentCanvasToFrame = useCallback(() => {
    if (isLoadingFrameRef.current || isPlaying || isDraggingFrame || isDeletingFrame || isImportingSession || useToolStore.getState().isProcessingHistory) return;
    
    const currentCells = new Map(cellsRef.current);
    setFrameDataRef.current(effectiveFrameIndexRef.current, currentCells);
    lastCellsRef.current = currentCells;
  }, [isPlaying, isDraggingFrame, isDeletingFrame, isImportingSession]);

  // Load frame data into canvas when frame changes
  const loadFrameToCanvas = useCallback((frameIndex: number) => {
    isLoadingFrameRef.current = true;
    installFrameData(getFrameData(frameIndex));
    
    // Small delay to ensure canvas update completes
    setTimeout(() => {
      isLoadingFrameRef.current = false;
    }, 0);
  }, [getFrameData, installFrameData]);

  const navigateToFrameAtomically = useCallback(async (frameIndex: number): Promise<number> => {
    const timeline = useTimelineStore.getState();
    if (!Number.isInteger(frameIndex)) {
      throw new Error('go_to_frame index must be an integer');
    }
    if (frameIndex < 0 || frameIndex >= timeline.config.durationFrames) {
      throw new Error(
        `go_to_frame index ${frameIndex} is out of range for ${timeline.config.durationFrames} timeline frames`,
      );
    }
    if (isLoadingFrameRef.current) {
      throw new Error('Frame synchronization is already in progress');
    }

    const requestedLayer = timeline.layers.find((layer) => layer.id === timeline.view.activeLayerId)
      ?? timeline.layers[0];
    if (!requestedLayer) {
      throw new Error('go_to_frame requires an active layer');
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    isLoadingFrameRef.current = true;
    try {
      const canvas = useCanvasStore.getState();
      const installedLayerId = canvas.activeLayerId ?? lastActiveLayerIdRef.current;
      const installedLayer = timeline.layers.find((layer) => layer.id === installedLayerId)
        ?? requestedLayer;
      const previousFrameIndex = lastFrameIndexRef.current;
      const currentCells = commitPendingMove(new Map(cellsRef.current));
      const previousContentFrame = getContentFrameAtTime(installedLayer, previousFrameIndex);
      if (previousContentFrame) {
        timeline.updateContentFrameData(
          installedLayer.id,
          previousContentFrame.id,
          new Map(currentCells),
        );
      }

      timeline.goToFrame(frameIndex);
      const appliedTimeline = useTimelineStore.getState();
      const confirmedFrameIndex = appliedTimeline.view.currentFrame;
      if (confirmedFrameIndex !== frameIndex) {
        throw new Error(
          `go_to_frame applied frame ${confirmedFrameIndex} instead of requested frame ${frameIndex}`,
        );
      }

      const appliedLayer = appliedTimeline.layers.find(
        (layer) => layer.id === appliedTimeline.view.activeLayerId,
      ) ?? appliedTimeline.layers[0];
      if (!appliedLayer) {
        throw new Error('go_to_frame target layer is unavailable');
      }

      const targetContentFrame = getContentFrameAtTime(appliedLayer, confirmedFrameIndex);
      installFrameData(targetContentFrame?.data);
      useCanvasStore.getState().setActiveLayerId(appliedLayer.id);
      useCanvasStore.getState().setDirty(false);

      lastFrameIndexRef.current = confirmedFrameIndex;
      effectiveFrameIndexRef.current = confirmedFrameIndex;
      lastActiveLayerIdRef.current = appliedLayer.id;
      return confirmedFrameIndex;
    } finally {
      isLoadingFrameRef.current = false;
    }
  }, [commitPendingMove, installFrameData]);

  useEffect(
    () => registerAtomicFrameNavigator(navigateToFrameAtomically),
    [navigateToFrameAtomically],
  );

  // Handle frame switching
  useEffect(() => {
    const previousFrameIndex = lastFrameIndexRef.current;
    
    if (effectiveFrameIndex !== previousFrameIndex) {
      // CRITICAL: Use the last known cells state, not current cells which may have already been updated
      const currentCellsToSave = commitPendingMove(new Map(lastCellsRef.current));
      
      // PERSISTENT SELECTION: Selections now persist across frame changes
      // The selection coordinates remain the same - they represent a "region of interest"
      // that applies to whatever frame is currently active
      // NOTE: Move operations are committed above, but the selection itself persists
      // Users must explicitly deselect with Escape, Cmd+D, or click outside
      
      // Save current canvas (with committed moves) to the frame we're leaving
      if (!isPlaying && !isLoadingFrameRef.current && !isDraggingFrame && !isDeletingFrame && !isImportingSession && !isProcessingHistory) {
        // Only save if the canvas content has actually changed from what was last loaded
        // PERF FIX: Use reference inequality instead of JSON.stringify comparison.
        // This runs during frame switches which are less frequent, but still saves
        // the cost of serializing the entire cell map.
        const lastLoadedCells = lastCellsRef.current;
        const cellsChanged = currentCellsToSave !== lastLoadedCells && 
                           (currentCellsToSave.size !== lastLoadedCells.size || currentCellsToSave.size > 0);
        
        // Don't save to frames that were empty when loaded unless user actually added content
        const previousFrameData = getFrameData(previousFrameIndex);
        const previousFrameWasEmpty = !previousFrameData || previousFrameData.size === 0;
        const userAddedContentToEmptyFrame = previousFrameWasEmpty && currentCellsToSave.size > 0;
        
        if (cellsChanged && (!previousFrameWasEmpty || userAddedContentToEmptyFrame)) {
          setFrameData(previousFrameIndex, currentCellsToSave);
        }
      }
      
      // Load the new frame's data
      loadFrameToCanvas(effectiveFrameIndex);
      
      lastFrameIndexRef.current = effectiveFrameIndex;
    }
  }, [effectiveFrameIndex, setFrameData, getFrameData, loadFrameToCanvas, isPlaying, isDraggingFrame, isDeletingFrame, isImportingSession, isProcessingHistory, commitPendingMove]);

  // PERF FIX: Auto-save via non-reactive Zustand subscribe() instead of useEffect([cells]).
  // This is THE most critical performance fix: previously, `cells` was a reactive dependency
  // which caused CanvasProvider (the host) to re-render on every cell change → new context
  // value → every context consumer re-renders → entire CanvasGrid tree re-renders.
  // Now we watch for cells changes via a vanilla JS subscription that does NOT trigger
  // React re-renders of CanvasProvider.
  const saveCurrentCanvasToFrameRef = useRef(saveCurrentCanvasToFrame);
  saveCurrentCanvasToFrameRef.current = saveCurrentCanvasToFrame;

  useEffect(() => {
    const unsub = useCanvasStore.subscribe((state) => {
      const newCells = state.cells;
      // Update the ref (non-reactive — no React re-render)
      cellsRef.current = newCells;
      widthRef.current = state.width;
      heightRef.current = state.height;

      // Skip during loading/playback/etc
      if (isLoadingFrameRef.current) return;

      // During history processing (undo/redo), sync refs but don't save.
      // This prevents the auto-save from overwriting restored content frames.
      if (useToolStore.getState().isProcessingHistory) {
        lastCellsRef.current = newCells;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        return;
      }
      
      // Check if cells actually changed
      const lastCells = lastCellsRef.current;
      if (newCells === lastCells) return;
      if (newCells.size === lastCells.size && newCells.size === 0) return;

      // Debounced save (replaces the old useEffect + setTimeout pattern)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveCurrentCanvasToFrameRef.current();
      }, 150);
    });
    return () => {
      unsub();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []); // Empty deps — stable subscription for the lifetime of the component

  // Initialize first frame with current canvas data if empty (only on app startup)
  // CRITICAL: This useEffect was previously contaminating ALL empty frames when switching
  // See docs/FRAME_SYNCHRONIZATION_DEBUGGING_GUIDE.md for detailed analysis and prevention patterns
  // NOTE: Only applies in legacy (non-layer) mode — layer mode manages data through content frames
  useEffect(() => {
    if (isLayerMode) return;
    const currentFrame = getCurrentFrame();
    const currentCells = cellsRef.current;
    if (effectiveFrameIndex === 0 && currentFrame && currentFrame.data.size === 0 && currentCells.size > 0 && !isLoadingFrameRef.current) {
      setFrameData(effectiveFrameIndex, new Map(currentCells));
    }
  }, [getCurrentFrame, effectiveFrameIndex, setFrameData, isLayerMode]);

  return {
    saveCurrentCanvasToFrame,
    loadFrameToCanvas,
    isLoadingFrame: isLoadingFrameRef.current
  };
};
