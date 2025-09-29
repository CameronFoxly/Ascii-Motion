/**
 * useEffectsHistory.ts - History integration for Effects system
 * 
 * Provides effects actions that integrate with the undo/redo history system,
 * ensuring all effect applications can be undone and redone seamlessly.
 */

import { useCallback } from 'react';
import { useEffectsStore } from '../stores/effectsStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import { useToolStore } from '../stores/toolStore';
import type { EffectType } from '../types/effects';
import type { ApplyEffectHistoryAction } from '../types';

/**
 * Custom hook that provides effects actions with integrated undo/redo history
 * This ensures all effect applications are recorded in the history stack
 */
export const useEffectsHistory = () => {
  const { pushToHistory } = useToolStore();
  const { 
    applyToTimeline,
    levelsSettings,
    hueSaturationSettings,
    remapColorsSettings,
    remapCharactersSettings,
    clearError
  } = useEffectsStore();
  
  const { cells: canvasData } = useCanvasStore();
  const { frames, currentFrameIndex } = useAnimationStore();

  /**
   * Get the current effect settings for a given effect type
   */
  const getCurrentEffectSettings = useCallback((effectType: EffectType) => {
    switch (effectType) {
      case 'levels':
        return levelsSettings;
      case 'hue-saturation':
        return hueSaturationSettings;
      case 'remap-colors':
        return remapColorsSettings;
      case 'remap-characters':
        return remapCharactersSettings;
      default:
        throw new Error(`Unknown effect type: ${effectType}`);
    }
  }, [levelsSettings, hueSaturationSettings, remapColorsSettings, remapCharactersSettings]);

  /**
   * Apply effect with history tracking
   */
  const applyEffectWithHistory = useCallback(async (effectType: EffectType): Promise<boolean> => {
    try {
      // Clear any previous errors
      clearError();
      
      const settings = getCurrentEffectSettings(effectType);
      
      // Prepare history data
      let historyData: ApplyEffectHistoryAction['data'];
      
      if (applyToTimeline) {
        // Save current state of all frames for undo
        const previousFramesData = frames.map((frame, index) => ({
          frameIndex: index,
          data: new Map(frame.data)
        }));
        
        historyData = {
          effectType,
          effectSettings: { ...settings },
          applyToTimeline: true,
          affectedFrameIndices: frames.map((_, index) => index),
          previousFramesData
        };
      } else {
        // Save current canvas state for undo
        historyData = {
          effectType,
          effectSettings: { ...settings },
          applyToTimeline: false,
          affectedFrameIndices: [currentFrameIndex],
          previousCanvasData: new Map(canvasData)
        };
      }

      // Create history action
      const historyAction: ApplyEffectHistoryAction = {
        type: 'apply_effect',
        timestamp: Date.now(),
        description: applyToTimeline 
          ? `Apply ${effectType} effect to timeline (${frames.length} frames)`
          : `Apply ${effectType} effect to frame ${currentFrameIndex + 1}`,
        data: historyData
      };

      // Apply the effect using the store's method
      const { applyEffect } = useEffectsStore.getState();
      const success = await applyEffect(effectType);
      
      if (success) {
        // Push to history stack only if effect was successfully applied
        pushToHistory(historyAction);
        console.log(`✅ Effect applied and added to history: ${historyAction.description}`);
      } else {
        console.error(`❌ Effect application failed, not adding to history`);
      }
      
      return success;
    } catch (error) {
      console.error(`Failed to apply ${effectType} effect with history:`, error);
      return false;
    }
  }, [
    applyToTimeline, 
    frames, 
    currentFrameIndex, 
    canvasData, 
    getCurrentEffectSettings, 
    pushToHistory,
    clearError
  ]);

  /**
   * Get effect description for UI display
   */
  const getEffectDescription = useCallback((effectType: EffectType): string => {
    const effectNames = {
      'levels': 'Levels',
      'hue-saturation': 'Hue & Saturation',
      'remap-colors': 'Remap Colors', 
      'remap-characters': 'Remap Characters'
    };
    return effectNames[effectType] || effectType;
  }, []);

  /**
   * Check if effect can be applied (has canvas data to work with)
   */
  const canApplyEffect = useCallback((): boolean => {
    if (applyToTimeline) {
      return frames.length > 0 && frames.some(frame => frame.data.size > 0);
    } else {
      return canvasData.size > 0;
    }
  }, [applyToTimeline, frames, canvasData]);

  return {
    applyEffectWithHistory,
    getEffectDescription,
    canApplyEffect,
    getCurrentEffectSettings
  };
};