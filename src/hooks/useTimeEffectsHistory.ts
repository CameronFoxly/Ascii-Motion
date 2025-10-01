/**
 * useTimeEffectsHistory Hook
 * 
 * Provides time effects actions with integrated undo/redo history tracking.
 * Follows the established useEffectsHistory pattern for consistent history management.
 */

import { useCallback } from 'react';
import { useTimeEffectsStore } from '../stores/timeEffectsStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import { useToolStore } from '../stores/toolStore';
import { 
  applyWaveWarpToFrame, 
  applyWiggleToFrame, 
  calculateAccumulatedTime,
  clampFrameDuration
} from '../utils/timeEffectsProcessing';
import type { ApplyTimeEffectHistoryAction, SetFrameDurationsHistoryAction } from '../types';

/**
 * Custom hook providing time effects actions with integrated undo/redo history.
 * All operations are recorded in the history stack for seamless undo/redo support.
 */
export const useTimeEffectsHistory = () => {
  const { pushToHistory } = useToolStore();
  const { 
    waveWarpSettings, 
    wiggleSettings, 
    frameRange,
    closeWaveWarpDialog,
    closeWiggleDialog,
    closeSetDurationDialog
  } = useTimeEffectsStore();
  
  const { width: canvasWidth, height: canvasHeight } = useCanvasStore();
  const { frames } = useAnimationStore();
  
  /**
   * Get affected frame indices based on frame range settings
   */
  const getAffectedFrameIndices = useCallback((): number[] => {
    if (frameRange.applyToAll) {
      return frames.map((_, index) => index);
    }
    
    const indices: number[] = [];
    const start = Math.max(0, frameRange.startFrame);
    const end = Math.min(frames.length - 1, frameRange.endFrame);
    
    for (let i = start; i <= end; i++) {
      indices.push(i);
    }
    
    return indices;
  }, [frameRange, frames]);
  
  /**
   * Apply wave warp with history tracking
   */
  const applyWaveWarpWithHistory = useCallback(async (): Promise<boolean> => {
    try {
      const affectedIndices = getAffectedFrameIndices();
      if (affectedIndices.length === 0) {
        console.warn('No frames selected for wave warp');
        return false;
      }
      
      // Save previous state for undo
      const previousFramesData = affectedIndices.map(index => ({
        frameIndex: index,
        data: new Map(frames[index].data)
      }));
      
      // Apply wave warp to each affected frame
      const animationStore = useAnimationStore.getState();
      
      affectedIndices.forEach(frameIndex => {
        const accumulatedTime = calculateAccumulatedTime(frames, frameIndex);
        const transformedData = applyWaveWarpToFrame(
          frames[frameIndex].data,
          canvasWidth,
          canvasHeight,
          waveWarpSettings,
          accumulatedTime
        );
        
        animationStore.setFrameData(frameIndex, transformedData);
      });
      
      // Sync current frame to canvas if it was affected
      const currentFrameIndex = animationStore.currentFrameIndex;
      if (affectedIndices.includes(currentFrameIndex)) {
        const currentFrameData = animationStore.frames[currentFrameIndex]?.data;
        if (currentFrameData) {
          useCanvasStore.getState().setCanvasData(currentFrameData);
        }
      }
      
      // Create history action
      const historyAction: ApplyTimeEffectHistoryAction = {
        type: 'apply_time_effect',
        timestamp: Date.now(),
        description: `Apply wave warp (${waveWarpSettings.axis}) to ${affectedIndices.length} frame(s)`,
        data: {
          effectType: 'wave-warp',
          effectSettings: { ...waveWarpSettings },
          frameRange: { ...frameRange },
          affectedFrameIndices: affectedIndices,
          previousFramesData
        }
      };
      
      pushToHistory(historyAction);
      closeWaveWarpDialog();
      
      console.log(`Wave warp applied to ${affectedIndices.length} frame(s)`);
      return true;
    } catch (error) {
      console.error('Failed to apply wave warp:', error);
      return false;
    }
  }, [
    waveWarpSettings, 
    frameRange, 
    frames, 
    canvasWidth, 
    canvasHeight, 
    pushToHistory, 
    closeWaveWarpDialog, 
    getAffectedFrameIndices
  ]);
  
  /**
   * Apply wiggle with history tracking
   */
  const applyWiggleWithHistory = useCallback(async (): Promise<boolean> => {
    try {
      const affectedIndices = getAffectedFrameIndices();
      if (affectedIndices.length === 0) {
        console.warn('No frames selected for wiggle');
        return false;
      }
      
      // Save previous state for undo
      const previousFramesData = affectedIndices.map(index => ({
        frameIndex: index,
        data: new Map(frames[index].data)
      }));
      
      // Apply wiggle to each affected frame
      const animationStore = useAnimationStore.getState();
      
      affectedIndices.forEach(frameIndex => {
        const accumulatedTime = calculateAccumulatedTime(frames, frameIndex);
        const transformedData = applyWiggleToFrame(
          frames[frameIndex].data,
          canvasWidth,
          canvasHeight,
          wiggleSettings,
          accumulatedTime
        );
        
        animationStore.setFrameData(frameIndex, transformedData);
      });
      
      // Sync current frame to canvas if it was affected
      const currentFrameIndex = animationStore.currentFrameIndex;
      if (affectedIndices.includes(currentFrameIndex)) {
        const currentFrameData = animationStore.frames[currentFrameIndex]?.data;
        if (currentFrameData) {
          useCanvasStore.getState().setCanvasData(currentFrameData);
        }
      }
      
      // Create history action
      const historyAction: ApplyTimeEffectHistoryAction = {
        type: 'apply_time_effect',
        timestamp: Date.now(),
        description: `Apply wiggle (${wiggleSettings.mode}) to ${affectedIndices.length} frame(s)`,
        data: {
          effectType: 'wiggle',
          effectSettings: { ...wiggleSettings },
          frameRange: { ...frameRange },
          affectedFrameIndices: affectedIndices,
          previousFramesData
        }
      };
      
      pushToHistory(historyAction);
      closeWiggleDialog();
      
      console.log(`Wiggle applied to ${affectedIndices.length} frame(s)`);
      return true;
    } catch (error) {
      console.error('Failed to apply wiggle:', error);
      return false;
    }
  }, [
    wiggleSettings, 
    frameRange, 
    frames, 
    canvasWidth, 
    canvasHeight, 
    pushToHistory, 
    closeWiggleDialog, 
    getAffectedFrameIndices
  ]);
  
  /**
   * Set frame duration for all frames with history tracking
   */
  const setFrameDurationsWithHistory = useCallback(async (
    newDuration: number,
    affectedFrameIndices?: number[]
  ): Promise<boolean> => {
    try {
      // Clamp duration to valid range
      const clampedDuration = clampFrameDuration(newDuration);
      
      // If no indices provided, apply to all frames
      const indices = affectedFrameIndices || frames.map((_, index) => index);
      
      if (indices.length === 0) {
        console.warn('No frames to update duration');
        return false;
      }
      
      // Save previous durations for undo
      const previousDurations = indices.map(index => ({
        frameIndex: index,
        duration: frames[index].duration
      }));
      
      // Apply new duration to all affected frames
      const animationStore = useAnimationStore.getState();
      
      indices.forEach(frameIndex => {
        animationStore.updateFrameDuration(frameIndex, clampedDuration);
      });
      
      // Create history action
      const historyAction: SetFrameDurationsHistoryAction = {
        type: 'set_frame_durations',
        timestamp: Date.now(),
        description: `Set duration to ${clampedDuration}ms for ${indices.length} frame(s)`,
        data: {
          affectedFrameIndices: indices,
          newDuration: clampedDuration,
          previousDurations
        }
      };
      
      pushToHistory(historyAction);
      closeSetDurationDialog();
      
      console.log(`Duration set to ${clampedDuration}ms for ${indices.length} frame(s)`);
      return true;
    } catch (error) {
      console.error('Failed to set frame durations:', error);
      return false;
    }
  }, [frames, pushToHistory, closeSetDurationDialog]);
  
  return {
    applyWaveWarpWithHistory,
    applyWiggleWithHistory,
    setFrameDurationsWithHistory,
    getAffectedFrameIndices
  };
};
