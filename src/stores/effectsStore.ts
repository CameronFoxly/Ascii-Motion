/**
 * Effects Store - Zustand store for managing effects system state
 * 
 * Features:
 * - Effects panel state (open/closed, active effect)
 * - Effect settings for all supported effects
 * - Canvas analysis caching for performance
 * - Timeline targeting toggle
 * - Integration with existing stores for apply/preview operations
 */

import { create } from 'zustand';
import type { 
  EffectType, 
  LevelsEffectSettings, 
  HueSaturationEffectSettings, 
  RemapColorsEffectSettings, 
  RemapCharactersEffectSettings,
  CanvasAnalysis
} from '../types/effects';
import { 
  DEFAULT_LEVELS_SETTINGS,
  DEFAULT_HUE_SATURATION_SETTINGS,
  DEFAULT_REMAP_COLORS_SETTINGS,
  DEFAULT_REMAP_CHARACTERS_SETTINGS,
  CANVAS_ANALYSIS
} from '../constants/effectsDefaults';
import { useCanvasStore } from './canvasStore';
import { usePreviewStore } from './previewStore';
import { processEffect } from '../utils/effectsProcessing';

export interface EffectsState {
  // UI State
  isOpen: boolean;                           // Main effects panel visibility
  activeEffect: EffectType | null;           // Currently open effect panel
  applyToTimeline: boolean;                  // Timeline vs canvas targeting
  
  // Effect Settings State
  levelsSettings: LevelsEffectSettings;
  hueSaturationSettings: HueSaturationEffectSettings;
  remapColorsSettings: RemapColorsEffectSettings;
  remapCharactersSettings: RemapCharactersEffectSettings;
  
  // Canvas Analysis State
  canvasAnalysis: CanvasAnalysis | null;     // Cached analysis results
  isAnalyzing: boolean;                      // Analysis in progress
  
  // Preview State
  isPreviewActive: boolean;                  // Live preview enabled
  previewEffect: EffectType | null;          // Effect being previewed
  
  // Error State
  lastError: string | null;                  // Last error message
  
  // Actions - Panel Management
  openEffectPanel: (effect: EffectType) => void;
  closeEffectPanel: () => void;
  setApplyToTimeline: (apply: boolean) => void;
  
  // Actions - Effect Settings
  updateLevelsSettings: (settings: Partial<LevelsEffectSettings>) => void;
  updateHueSaturationSettings: (settings: Partial<HueSaturationEffectSettings>) => void;
  updateRemapColorsSettings: (settings: Partial<RemapColorsEffectSettings>) => void;
  updateRemapCharactersSettings: (settings: Partial<RemapCharactersEffectSettings>) => void;
  resetEffectSettings: (effect: EffectType) => void;
  
  // Actions - Canvas Analysis
  analyzeCanvas: () => Promise<void>;
  clearAnalysisCache: () => void;
  getUniqueColors: () => string[];
  getUniqueCharacters: () => string[];
  
  // Actions - Preview Management
  startPreview: (effect: EffectType) => void;
  stopPreview: () => void;
  updatePreview: () => Promise<void>;
  
  // Actions - Effect Application
  applyEffect: (effect: EffectType) => Promise<boolean>;
  
  // Actions - Error Management
  clearError: () => void;
  
  // Utility Actions
  reset: () => void;
}

// Canvas hash generation for cache invalidation
const generateCanvasHash = (cells: Map<string, any>, frameCount: number): string => {
  // Simple hash based on cell count, first few cells, and frame count
  const cellCount = cells.size;
  const firstCells = Array.from(cells.entries()).slice(0, 10);
  const hashData = `${cellCount}-${frameCount}-${JSON.stringify(firstCells)}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < hashData.length; i++) {
    const char = hashData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

export const useEffectsStore = create<EffectsState>((set, get) => ({
  // Initial state
  isOpen: false,
  activeEffect: null,
  applyToTimeline: false,
  
  // Default effect settings
  levelsSettings: { ...DEFAULT_LEVELS_SETTINGS },
  hueSaturationSettings: { ...DEFAULT_HUE_SATURATION_SETTINGS },
  remapColorsSettings: { ...DEFAULT_REMAP_COLORS_SETTINGS },
  remapCharactersSettings: { ...DEFAULT_REMAP_CHARACTERS_SETTINGS },
  
  // Analysis state
  canvasAnalysis: null,
  isAnalyzing: false,
  
  // Preview state
  isPreviewActive: false,
  previewEffect: null,
  
  // Error state
  lastError: null,
  
  // Panel Management Actions
  openEffectPanel: (effect: EffectType) => {
    set({ 
      isOpen: true, 
      activeEffect: effect 
    });
    
    // Analyze canvas when opening any effect
    get().analyzeCanvas();
  },
  
  closeEffectPanel: () => {
    // Stop any active preview when closing
    if (get().isPreviewActive) {
      get().stopPreview();
    }
    
    set({ 
      isOpen: false, 
      activeEffect: null 
    });
  },
  
  setApplyToTimeline: (apply: boolean) => {
    set({ applyToTimeline: apply });
  },
  
  // Effect Settings Actions
  updateLevelsSettings: (settings: Partial<LevelsEffectSettings>) => {
    set(state => ({
      levelsSettings: { ...state.levelsSettings, ...settings }
    }));
  },
  
  updateHueSaturationSettings: (settings: Partial<HueSaturationEffectSettings>) => {
    set(state => ({
      hueSaturationSettings: { ...state.hueSaturationSettings, ...settings }
    }));
  },
  
  updateRemapColorsSettings: (settings: Partial<RemapColorsEffectSettings>) => {
    set(state => ({
      remapColorsSettings: { ...state.remapColorsSettings, ...settings }
    }));
  },
  
  updateRemapCharactersSettings: (settings: Partial<RemapCharactersEffectSettings>) => {
    set(state => ({
      remapCharactersSettings: { ...state.remapCharactersSettings, ...settings }
    }));
  },
  
  resetEffectSettings: (effect: EffectType) => {
    switch (effect) {
      case 'levels':
        set({ levelsSettings: { ...DEFAULT_LEVELS_SETTINGS } });
        break;
      case 'hue-saturation':
        set({ hueSaturationSettings: { ...DEFAULT_HUE_SATURATION_SETTINGS } });
        break;
      case 'remap-colors':
        set({ remapColorsSettings: { ...DEFAULT_REMAP_COLORS_SETTINGS } });
        break;
      case 'remap-characters':
        set({ remapCharactersSettings: { ...DEFAULT_REMAP_CHARACTERS_SETTINGS } });
        break;
    }
  },
  
  // Canvas Analysis Actions
  analyzeCanvas: async () => {
    // Avoid concurrent analysis
    if (get().isAnalyzing) return;
    
    set({ isAnalyzing: true });
    
    try {
      // Import stores dynamically to avoid circular dependencies
      const { useCanvasStore } = await import('../stores/canvasStore');
      const { useAnimationStore } = await import('../stores/animationStore');
      
      const canvasStore = useCanvasStore.getState();
      const animationStore = useAnimationStore.getState();
      
      const { cells } = canvasStore;
      const { frames } = animationStore;
      
      // Generate hash for cache invalidation
      const canvasHash = generateCanvasHash(cells, frames.length);
      
      // Check if analysis is still valid
      const currentAnalysis = get().canvasAnalysis;
      if (currentAnalysis && 
          currentAnalysis.canvasHash === canvasHash &&
          (Date.now() - currentAnalysis.analysisTimestamp) < CANVAS_ANALYSIS.CACHE_EXPIRY_MS) {
        set({ isAnalyzing: false });
        return;
      }
      
      // Analyze canvas for unique colors and characters
      const uniqueColors = new Set<string>();
      const uniqueCharacters = new Set<string>();
      const colorFrequency: Record<string, number> = {};
      const characterFrequency: Record<string, number> = {};
      
      // Analyze current canvas
      cells.forEach(cell => {
        // Track colors
        if (cell.color && cell.color !== 'transparent') {
          uniqueColors.add(cell.color);
          colorFrequency[cell.color] = (colorFrequency[cell.color] || 0) + 1;
        }
        if (cell.bgColor && cell.bgColor !== 'transparent') {
          uniqueColors.add(cell.bgColor);
          colorFrequency[cell.bgColor] = (colorFrequency[cell.bgColor] || 0) + 1;
        }
        
        // Track characters
        if (cell.char && cell.char.trim()) {
          uniqueCharacters.add(cell.char);
          characterFrequency[cell.char] = (characterFrequency[cell.char] || 0) + 1;
        }
      });
      
      // If applying to timeline, analyze all frames
      if (get().applyToTimeline) {
        frames.forEach(frame => {
          frame.data.forEach(cell => {
            // Same analysis for timeline frames
            if (cell.color && cell.color !== 'transparent') {
              uniqueColors.add(cell.color);
              colorFrequency[cell.color] = (colorFrequency[cell.color] || 0) + 1;
            }
            if (cell.bgColor && cell.bgColor !== 'transparent') {
              uniqueColors.add(cell.bgColor);
              colorFrequency[cell.bgColor] = (colorFrequency[cell.bgColor] || 0) + 1;
            }
            if (cell.char && cell.char.trim()) {
              uniqueCharacters.add(cell.char);
              characterFrequency[cell.char] = (characterFrequency[cell.char] || 0) + 1;
            }
          });
        });
      }
      
      // Create analysis results
      const analysis: CanvasAnalysis = {
        // Basic unique values
        uniqueColors: Array.from(uniqueColors).slice(0, CANVAS_ANALYSIS.MAX_UNIQUE_ITEMS),
        uniqueCharacters: Array.from(uniqueCharacters).slice(0, CANVAS_ANALYSIS.MAX_UNIQUE_ITEMS),
        
        // Frequency data (original simple format)
        colorFrequency,
        characterFrequency,
        
        // Extended frequency data (sorted arrays) - add these for compatibility
        colorsByFrequency: Object.entries(colorFrequency)
          .map(([color, count]) => ({ color, count }))
          .sort((a, b) => b.count - a.count),
        charactersByFrequency: Object.entries(characterFrequency)
          .map(([char, count]) => ({ char, count }))
          .sort((a, b) => b.count - a.count),
        
        // Distribution data with percentages
        colorDistribution: Object.entries(colorFrequency)
          .map(([color, count]) => ({ 
            color, 
            count, 
            percentage: cells.size > 0 ? (count / cells.size) * 100 : 0 
          }))
          .sort((a, b) => b.count - a.count),
        characterDistribution: Object.entries(characterFrequency)
          .map(([char, count]) => ({ 
            char, 
            count, 
            percentage: cells.size > 0 ? (count / cells.size) * 100 : 0 
          }))
          .sort((a, b) => b.count - a.count),
        
        // Cross-reference mappings - simplified for now
        colorToCharMap: {},
        charToColorMap: {},
        
        // Canvas statistics
        totalCells: cells.size,
        filledCells: cells.size, // Simplified - all cells with data are filled
        fillPercentage: 100,
        
        // Color analysis - simplified for now
        colorBrightnessStats: {
          brightest: '',
          darkest: '',
          averageBrightness: 0,
          brightColors: [],
          darkColors: []
        },
        
        // Metadata
        canvasHash,
        frameCount: frames.length,
        analysisTimestamp: Date.now()
      };
      
      set({ 
        canvasAnalysis: analysis,
        isAnalyzing: false 
      });
      
    } catch (error) {
      console.error('Canvas analysis failed:', error);
      set({ isAnalyzing: false });
    }
  },
  
  clearAnalysisCache: () => {
    set({ canvasAnalysis: null });
  },
  
  getUniqueColors: () => {
    return get().canvasAnalysis?.uniqueColors || [];
  },
  
  getUniqueCharacters: () => {
    return get().canvasAnalysis?.uniqueCharacters || [];
  },
  
  // Preview Management Actions
  startPreview: (effect: EffectType) => {
    const { updatePreview } = get();
    set({ 
      isPreviewActive: true, 
      previewEffect: effect 
    });
    
    // Generate and show preview immediately
    updatePreview().catch(error => {
      console.error('Initial preview generation failed:', error);
    });
  },
  
  stopPreview: () => {
    set({ 
      isPreviewActive: false, 
      previewEffect: null 
    });
    
    // Clear preview from previewStore
    const previewStore = usePreviewStore.getState();
    previewStore.clearPreview();
  },
  
  // Generate and update preview
  updatePreview: async () => {
    const state = get();
    if (!state.isPreviewActive || !state.previewEffect) return;
    
    try {
      const canvasStore = useCanvasStore.getState();
      const previewStore = usePreviewStore.getState();
      
      // Get current canvas data
      const currentCells = canvasStore.cells;
      
      // Get effect settings
      let effectSettings;
      switch (state.previewEffect) {
        case 'levels':
          effectSettings = state.levelsSettings;
          break;
        case 'hue-saturation':
          effectSettings = state.hueSaturationSettings;
          break;
        case 'remap-colors':
          effectSettings = state.remapColorsSettings;
          break;
        case 'remap-characters':
          effectSettings = state.remapCharactersSettings;
          break;
        default:
          return;
      }
      
      // Process effect on current canvas data (await the async function)
      const result = await processEffect(
        state.previewEffect,
        currentCells, 
        effectSettings,
        canvasStore.width,
        canvasStore.height
      );
      
      // Update preview store with processed cells if successful
      if (result.success && result.processedCells) {
        previewStore.setPreviewData(result.processedCells);
      } else {
        console.error('Preview processing failed:', result);
        previewStore.clearPreview();
      }
      
    } catch (error) {
      console.error('Preview generation error:', error);
      set({ lastError: error instanceof Error ? error.message : 'Preview generation failed' });
    }
  },
  
  // Effect Application Actions
  applyEffect: async (effect: EffectType): Promise<boolean> => {
    try {
      const state = get();
      
      // Clear any previous errors
      state.clearError();
      
      // Stop preview if active
      if (state.isPreviewActive) {
        state.stopPreview();
      }

      // Get effect settings
      const getEffectSettings = () => {
        switch (effect) {
          case 'levels':
            return state.levelsSettings;
          case 'hue-saturation':
            return state.hueSaturationSettings;
          case 'remap-colors':
            return state.remapColorsSettings;
          case 'remap-characters':
            return state.remapCharactersSettings;
          default:
            throw new Error(`Unknown effect type: ${effect}`);
        }
      };

      const settings = getEffectSettings();

      // Import processing engine dynamically
      const { processEffect, processEffectOnFrames } = await import('../utils/effectsProcessing');

      if (state.applyToTimeline) {
        // Apply to entire timeline
        const { useAnimationStore } = await import('./animationStore');
        const { useCanvasStore } = await import('./canvasStore');
        
        const animationStore = useAnimationStore.getState();
        const canvasStore = useCanvasStore.getState();
        
        console.log(`Applying ${effect} effect to ${animationStore.frames.length} frames...`);
        
        const result = await processEffectOnFrames(
          effect,
          animationStore.frames,
          settings,
          canvasStore.width,
          canvasStore.height,
          (frameIndex, totalFrames) => {
            console.log(`Processing frame ${frameIndex + 1}/${totalFrames}`);
          }
        );

        if (result.errors.length > 0) {
          console.warn('Effect processing had errors:', result.errors);
        }

        // Update animation store with processed frames
        // Use the set function directly to update frames
        useAnimationStore.setState((state) => ({
          ...state,
          frames: result.processedFrames
        }));

        // Sync the canvas with the processed current frame
        const updatedAnimationStore = useAnimationStore.getState();
        const currentFrame = updatedAnimationStore.frames[updatedAnimationStore.currentFrameIndex];
        if (currentFrame) {
          const { useCanvasStore } = await import('./canvasStore');
          const canvasStore = useCanvasStore.getState();
          canvasStore.setCanvasData(currentFrame.data);
        }

        console.log(`✅ Applied ${effect} to timeline: ${result.totalAffectedCells} cells modified in ${result.processingTime.toFixed(2)}ms`);
        
      } else {
        // Apply to current canvas only
        const { useCanvasStore } = await import('./canvasStore');
        const canvasStore = useCanvasStore.getState();
        
        console.log(`Applying ${effect} effect to current canvas...`);
        
        const result = await processEffect(
          effect,
          canvasStore.cells,
          settings,
          canvasStore.width,
          canvasStore.height
        );

        if (result.success && result.processedCells) {
          // Update canvas store with processed cells
          const { setCanvasData } = canvasStore;
          setCanvasData(result.processedCells);
          
          console.log(`✅ Applied ${effect} to canvas: ${result.affectedCells} cells modified in ${result.processingTime.toFixed(2)}ms`);
        } else {
          throw new Error(result.error || 'Effect processing failed');
        }
      }

      // Clear analysis cache since canvas changed
      state.clearAnalysisCache();
      
      // Close panel after successful application
      state.closeEffectPanel();
      
      return true;
    } catch (error) {
      console.error(`Failed to apply ${effect} effect:`, error);
      set(state => ({ ...state, lastError: `Failed to apply effect: ${error instanceof Error ? error.message : 'Unknown error'}` }));
      return false;
    }
  },
  
  // Utility Actions
  clearError: () => {
    set({ lastError: null });
  },
  
  reset: () => {
    set({
      isOpen: false,
      activeEffect: null,
      applyToTimeline: false,
      levelsSettings: { ...DEFAULT_LEVELS_SETTINGS },
      hueSaturationSettings: { ...DEFAULT_HUE_SATURATION_SETTINGS },
      remapColorsSettings: { ...DEFAULT_REMAP_COLORS_SETTINGS },
      remapCharactersSettings: { ...DEFAULT_REMAP_CHARACTERS_SETTINGS },
      canvasAnalysis: null,
      isAnalyzing: false,
      isPreviewActive: false,
      previewEffect: null,
      lastError: null
    });
  }
}));