/**
 * Generators Store - Zustand store for managing procedural animation generators
 * 
 * Features:
 * - Generator panel state (open/closed, active generator)
 * - Generator settings for all 4 generators
 * - Output mode (append/overwrite) configuration
 * - Preview playback state management
 * - Mapping settings integration
 * - Seed management for deterministic generation
 */

import { create } from 'zustand';
import type { 
  GeneratorId,
  RadioWavesSettings,
  TurbulentNoiseSettings,
  ParticlePhysicsSettings,
  RainDropsSettings,
  GeneratorMappingSettings,
  GeneratorFrame,
  GeneratorSettings
} from '../types/generators';
import {
  DEFAULT_RADIO_WAVES_SETTINGS,
  DEFAULT_TURBULENT_NOISE_SETTINGS,
  DEFAULT_PARTICLE_PHYSICS_SETTINGS,
  DEFAULT_RAIN_DROPS_SETTINGS
} from '../constants/generators';
import { useCanvasStore } from './canvasStore';
import { useAnimationStore } from './animationStore';
import { generateFrames } from '../utils/generators/generatorEngine';
import { ASCIIConverter, type ConversionSettings } from '../utils/asciiConverter';
import { useCharacterPaletteStore } from './characterPaletteStore';
import { usePaletteStore } from './paletteStore';
// import { cloneFrames } from '../utils/frameUtils'; // TODO: Phase 5 - Use for history
import type { Frame } from '../types';

// UI state for panel tabs and playback
export interface GeneratorUIState {
  activeTab: 'animation' | 'mapping';
  isPlaying: boolean;
  currentPreviewFrame: number;
}

// Default mapping settings (mirrors import store defaults)
const DEFAULT_MAPPING_SETTINGS: GeneratorMappingSettings = {
  enableCharacterMapping: false,
  characterSet: [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'],
  characterMappingMode: 'brightness',
  customCharacterMapping: {},
  
  enableTextColorMapping: false,
  textColorPaletteId: null,
  textColorMappingMode: 'closest',
  
  enableBackgroundColorMapping: false,
  backgroundColorPaletteId: null,
  backgroundColorMappingMode: 'closest'
};

export interface GeneratorsState {
  // UI State
  isOpen: boolean;
  activeGenerator: GeneratorId | null;
  outputMode: 'overwrite' | 'append';
  uiState: GeneratorUIState;
  
  // Generator Settings
  radioWavesSettings: RadioWavesSettings;
  turbulentNoiseSettings: TurbulentNoiseSettings;
  particlePhysicsSettings: ParticlePhysicsSettings;
  rainDropsSettings: RainDropsSettings;
  
  // Mapping Settings (shared across all generators)
  mappingSettings: GeneratorMappingSettings;
  
  // Preview State
  isGenerating: boolean;
  previewFrames: GeneratorFrame[];      // Raw RGBA frames from generator
  convertedFrames: Frame[];             // Converted ASCII frames
  totalPreviewFrames: number;
  isPreviewDirty: boolean;              // Settings changed, preview needs regeneration
  
  // Error State
  lastError: string | null;
  
  // Actions - Panel Management
  openGenerator: (id: GeneratorId) => void;
  closeGenerator: () => void;
  setOutputMode: (mode: 'overwrite' | 'append') => void;
  setActiveTab: (tab: 'animation' | 'mapping') => void;
  
  // Actions - Playback Control
  setPlaying: (playing: boolean) => void;
  setPreviewFrame: (frameIndex: number) => void;
  
  // Actions - Generator Settings
  updateRadioWavesSettings: (settings: Partial<RadioWavesSettings>) => void;
  updateTurbulentNoiseSettings: (settings: Partial<TurbulentNoiseSettings>) => void;
  updateParticlePhysicsSettings: (settings: Partial<ParticlePhysicsSettings>) => void;
  updateRainDropsSettings: (settings: Partial<RainDropsSettings>) => void;
  resetGeneratorSettings: (id: GeneratorId) => void;
  
  // Actions - Mapping Settings
  updateMappingSettings: (settings: Partial<GeneratorMappingSettings>) => void;
  
  // Actions - Preview Generation
  regeneratePreview: () => Promise<void>;
  markPreviewDirty: () => void;
  
  // Actions - Apply to Canvas
  applyGenerator: () => Promise<boolean>;
  
  // Actions - Error Management
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Utility Actions
  reset: () => void;
}

const DEFAULT_UI_STATE: GeneratorUIState = {
  activeTab: 'animation',
  isPlaying: false,
  currentPreviewFrame: 0
};

export const useGeneratorsStore = create<GeneratorsState>((set, get) => ({
  // Initial state
  isOpen: false,
  activeGenerator: null,
  outputMode: 'append',  // Default to append mode (matches import store)
  uiState: { ...DEFAULT_UI_STATE },
  
  // Default generator settings
  radioWavesSettings: { ...DEFAULT_RADIO_WAVES_SETTINGS },
  turbulentNoiseSettings: { ...DEFAULT_TURBULENT_NOISE_SETTINGS },
  particlePhysicsSettings: { ...DEFAULT_PARTICLE_PHYSICS_SETTINGS },
  rainDropsSettings: { ...DEFAULT_RAIN_DROPS_SETTINGS },
  
  // Default mapping settings
  mappingSettings: { ...DEFAULT_MAPPING_SETTINGS },
  
  // Preview state
  isGenerating: false,
  previewFrames: [],
  convertedFrames: [],
  totalPreviewFrames: 0,
  isPreviewDirty: false,
  
  // Error state
  lastError: null,
  
  // Panel Management Actions
  openGenerator: (id: GeneratorId) => {
    set({ 
      isOpen: true, 
      activeGenerator: id,
      uiState: { 
        ...DEFAULT_UI_STATE,
        isPlaying: true  // Auto-play on open
      },
      isPreviewDirty: true
    });
    
    // Trigger preview generation
    get().regeneratePreview();
  },
  
  closeGenerator: () => {
    set({ 
      isOpen: false, 
      activeGenerator: null,
      uiState: { ...DEFAULT_UI_STATE },
      previewFrames: [],
      convertedFrames: [],
      totalPreviewFrames: 0,
      isPreviewDirty: false
    });
    get().clearError();
  },
  
  setOutputMode: (mode: 'overwrite' | 'append') => {
    set({ outputMode: mode });
  },
  
  setActiveTab: (tab: 'animation' | 'mapping') => {
    set(state => ({
      uiState: {
        ...state.uiState,
        activeTab: tab,
        // Pause playback when entering mapping tab
        isPlaying: tab === 'animation' ? state.uiState.isPlaying : false
      }
    }));
  },
  
  // Playback Control Actions
  setPlaying: (playing: boolean) => {
    set(state => ({
      uiState: {
        ...state.uiState,
        isPlaying: playing
      }
    }));
  },
  
  setPreviewFrame: (frameIndex: number) => {
    const { totalPreviewFrames } = get();
    const clampedIndex = Math.max(0, Math.min(frameIndex, totalPreviewFrames - 1));
    
    set(state => ({
      uiState: {
        ...state.uiState,
        currentPreviewFrame: clampedIndex
      }
    }));
  },
  
  // Generator Settings Actions
  updateRadioWavesSettings: (settings: Partial<RadioWavesSettings>) => {
    set(state => ({
      radioWavesSettings: {
        ...state.radioWavesSettings,
        ...settings
      },
      isPreviewDirty: true
    }));
  },
  
  updateTurbulentNoiseSettings: (settings: Partial<TurbulentNoiseSettings>) => {
    set(state => ({
      turbulentNoiseSettings: {
        ...state.turbulentNoiseSettings,
        ...settings
      },
      isPreviewDirty: true
    }));
  },
  
  updateParticlePhysicsSettings: (settings: Partial<ParticlePhysicsSettings>) => {
    set(state => ({
      particlePhysicsSettings: {
        ...state.particlePhysicsSettings,
        ...settings
      },
      isPreviewDirty: true
    }));
  },
  
  updateRainDropsSettings: (settings: Partial<RainDropsSettings>) => {
    set(state => ({
      rainDropsSettings: {
        ...state.rainDropsSettings,
        ...settings
      },
      isPreviewDirty: true
    }));
  },
  
  resetGeneratorSettings: (id: GeneratorId) => {
    switch (id) {
      case 'radio-waves':
        set({ 
          radioWavesSettings: { ...DEFAULT_RADIO_WAVES_SETTINGS },
          isPreviewDirty: true
        });
        break;
      case 'turbulent-noise':
        set({ 
          turbulentNoiseSettings: { ...DEFAULT_TURBULENT_NOISE_SETTINGS },
          isPreviewDirty: true
        });
        break;
      case 'particle-physics':
        set({ 
          particlePhysicsSettings: { ...DEFAULT_PARTICLE_PHYSICS_SETTINGS },
          isPreviewDirty: true
        });
        break;
      case 'rain-drops':
        set({ 
          rainDropsSettings: { ...DEFAULT_RAIN_DROPS_SETTINGS },
          isPreviewDirty: true
        });
        break;
    }
  },
  
  // Mapping Settings Actions
  updateMappingSettings: (settings: Partial<GeneratorMappingSettings>) => {
    set(state => ({
      mappingSettings: {
        ...state.mappingSettings,
        ...settings
      }
      // Note: Mapping changes don't make preview dirty for RGBA frames,
      // but will trigger ASCII re-conversion when applied
    }));
  },
  
  // Preview Generation Actions
  regeneratePreview: async () => {
    const state = get();
    const { activeGenerator, isGenerating } = state;
    
    console.log('[Generators] regeneratePreview called', { activeGenerator, isGenerating });
    
    if (!activeGenerator || isGenerating) {
      console.log('[Generators] Skipping regeneration:', !activeGenerator ? 'no active generator' : 'already generating');
      return;
    }
    
    set({ isGenerating: true, lastError: null });
    
    try {
      const canvasWidth = useCanvasStore.getState().width;
      const canvasHeight = useCanvasStore.getState().height;
      
      console.log('[Generators] Canvas dimensions:', { canvasWidth, canvasHeight });
      
      // Get generator-specific settings
      let settings: GeneratorSettings;
      let frameCount: number;
      let frameRate: number;
      let seed: number;
      
      switch (activeGenerator) {
        case 'radio-waves':
          settings = state.radioWavesSettings;
          frameCount = state.radioWavesSettings.frameCount;
          frameRate = state.radioWavesSettings.frameRate;
          seed = state.radioWavesSettings.seed;
          break;
        case 'turbulent-noise':
          settings = state.turbulentNoiseSettings;
          frameCount = state.turbulentNoiseSettings.frameCount;
          frameRate = state.turbulentNoiseSettings.frameRate;
          seed = state.turbulentNoiseSettings.seed;
          break;
        case 'particle-physics':
          settings = state.particlePhysicsSettings;
          frameCount = state.particlePhysicsSettings.frameCount;
          frameRate = state.particlePhysicsSettings.frameRate;
          seed = state.particlePhysicsSettings.seed;
          break;
        case 'rain-drops':
          settings = state.rainDropsSettings;
          frameCount = state.rainDropsSettings.frameCount;
          frameRate = state.rainDropsSettings.frameRate;
          seed = state.rainDropsSettings.seed;
          break;
        default:
          throw new Error(`Unknown generator: ${activeGenerator}`);
      }
      
      // Calculate frame duration from frame rate
      const frameDuration = Math.floor(1000 / frameRate);
      
      console.log('[Generators] Starting generation:', { 
        generator: activeGenerator, 
        frameCount, 
        frameRate, 
        frameDuration,
        seed,
        canvasWidth,
        canvasHeight
      });
      
      // Generate frames using the generator engine
      const result = await generateFrames(
        activeGenerator,
        settings,
        canvasWidth,
        canvasHeight,
        frameCount,
        frameDuration,
        seed,
        false // TODO: Phase 4 - Add loop smoothing toggle to UI state
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Frame generation failed');
      }
      
      console.log(`[Generators] Generated ${result.frameCount} frames in ${result.processingTime.toFixed(2)}ms`);
      
      // Convert RGBA frames to ASCII using mapping settings
      const converter = new ASCIIConverter();
      const convertedFrames: Frame[] = [];
      
      // Get active character palette
      const characterPaletteStore = useCharacterPaletteStore.getState();
      const activePalette = characterPaletteStore.activePalette;
      
      // Get color palettes for text and background
      const paletteStore = usePaletteStore.getState();
      const textColorPalette = state.mappingSettings.textColorPaletteId
        ? paletteStore.palettes.find(p => p.id === state.mappingSettings.textColorPaletteId)
        : null;
      const backgroundColorPalette = state.mappingSettings.backgroundColorPaletteId
        ? paletteStore.palettes.find(p => p.id === state.mappingSettings.backgroundColorPaletteId)
        : null;
      
      // Extract hex color strings from palette colors
      const textColors = textColorPalette?.colors.map(c => c.value) || [];
      const bgColors = backgroundColorPalette?.colors.map(c => c.value) || [];
      
      // Build conversion settings from mapping settings
      const conversionSettings: ConversionSettings = {
        // Character mapping
        enableCharacterMapping: state.mappingSettings.enableCharacterMapping,
        characterPalette: activePalette,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mappingMethod: state.mappingSettings.characterMappingMode as any, // Type compatibility
        invertDensity: false,
        
        // Text color mapping
        enableTextColorMapping: state.mappingSettings.enableTextColorMapping,
        textColorPalette: textColors,
        textColorMappingMode: state.mappingSettings.textColorMappingMode,
        defaultTextColor: '#ffffff',
        
        // Background color mapping
        enableBackgroundColorMapping: state.mappingSettings.enableBackgroundColorMapping,
        backgroundColorPalette: bgColors,
        backgroundColorMappingMode: state.mappingSettings.backgroundColorMappingMode,
        
        // Legacy/unused settings (required by ConversionSettings interface)
        useOriginalColors: false,
        colorQuantization: 'none',
        paletteSize: 16,
        colorMappingMode: 'closest' as 'closest' | 'dithering',
        blurAmount: 0,
        sharpenAmount: 0,
        brightnessAdjustment: 0,
        contrastEnhancement: 1,
        saturationAdjustment: 0,
        highlightsAdjustment: 0,
        shadowsAdjustment: 0,
        midtonesAdjustment: 0,
        ditherStrength: 0.5
      };
      
      // Convert each RGBA frame to ASCII
      for (let frameIdx = 0; frameIdx < result.frames.length; frameIdx++) {
        const generatorFrame = result.frames[frameIdx];
        const { width, height, data, frameDuration } = generatorFrame;
        
        // Create canvas for ProcessedFrame requirement
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Create ImageData from generator frame
        const imageData = new ImageData(
          new Uint8ClampedArray(data), // Clone the data
          width,
          height
        );
        
        // Convert using ASCIIConverter
        const conversionResult = converter.convertFrame(
          { canvas, imageData }, // ProcessedFrame format
          conversionSettings
        );
        
        // Generate frame ID
        const frameId = `generator-${activeGenerator}-${frameIdx}` as import('../types').FrameId;
        
        // Create Frame object for animation system
        convertedFrames.push({
          id: frameId,
          name: `Frame ${frameIdx + 1}`,
          duration: frameDuration,
          data: conversionResult.cells
        });
      }
      
      console.log(`[Generators] Converted ${convertedFrames.length} frames to ASCII`);
      
      set({
        previewFrames: result.frames,
        convertedFrames,
        totalPreviewFrames: result.frameCount,
        isPreviewDirty: false,
        isGenerating: false,
        uiState: {
          ...get().uiState,
          currentPreviewFrame: 0
        }
      });
      
    } catch (error) {
      console.error('[Generators] Preview generation failed:', error);
      set({
        lastError: error instanceof Error ? error.message : 'Preview generation failed',
        isGenerating: false
      });
    }
  },
  
  markPreviewDirty: () => {
    set({ isPreviewDirty: true });
  },
  
  // Apply to Canvas Actions
  applyGenerator: async () => {
    const { 
      activeGenerator, 
      convertedFrames, 
      outputMode
      // TODO: Phase 5 - Use these for history recording
      // radioWavesSettings,
      // turbulentNoiseSettings,
      // particlePhysicsSettings,
      // rainDropsSettings,
      // mappingSettings
    } = get();
    
    if (!activeGenerator || convertedFrames.length === 0) {
      set({ lastError: 'No frames to apply' });
      return false;
    }
    
    try {
      set({ lastError: null });
      
      // Get current animation state for history
      const { currentFrameIndex, importFramesOverwrite, importFramesAppend } = useAnimationStore.getState();
      
      // TODO: Phase 5 - Capture before/after snapshots for history
      // const previousFrames = cloneFrames(frames);
      // const previousCurrentFrame = currentFrameIndex;
      
      // Prepare frame data for import
      const frameData = convertedFrames.map(frame => ({
        data: frame.data,
        duration: frame.duration
      }));
      
      // Apply based on output mode
      if (outputMode === 'overwrite') {
        importFramesOverwrite(frameData, currentFrameIndex);
      } else {
        importFramesAppend(frameData);
      }
      
      // TODO: Phase 5 - Capture after state and record history
      // const newFrames = cloneFrames(useAnimationStore.getState().frames);
      // const newCurrentFrame = useAnimationStore.getState().currentFrameIndex;
      // const historyAction: ApplyGeneratorHistoryAction = { ... }
      // pushToHistory(historyAction);
      
      console.log(`[Generators] Applied ${convertedFrames.length} frames in ${outputMode} mode`);
      
      // Close panel on success
      get().closeGenerator();
      
      return true;
    } catch (error) {
      console.error('[Generators] Apply failed:', error);
      set({ lastError: error instanceof Error ? error.message : 'Failed to apply generator' });
      return false;
    }
  },
  
  // Error Management Actions
  setError: (error: string | null) => {
    set({ lastError: error });
  },
  
  clearError: () => {
    set({ lastError: null });
  },
  
  // Utility Actions
  reset: () => {
    set({
      isOpen: false,
      activeGenerator: null,
      outputMode: 'append',
      uiState: { ...DEFAULT_UI_STATE },
      radioWavesSettings: { ...DEFAULT_RADIO_WAVES_SETTINGS },
      turbulentNoiseSettings: { ...DEFAULT_TURBULENT_NOISE_SETTINGS },
      particlePhysicsSettings: { ...DEFAULT_PARTICLE_PHYSICS_SETTINGS },
      rainDropsSettings: { ...DEFAULT_RAIN_DROPS_SETTINGS },
      mappingSettings: { ...DEFAULT_MAPPING_SETTINGS },
      isGenerating: false,
      previewFrames: [],
      convertedFrames: [],
      totalPreviewFrames: 0,
      isPreviewDirty: false,
      lastError: null
    });
  }
}));

// Selector hooks for optimal re-rendering
export const useGeneratorPanel = () => {
  const store = useGeneratorsStore();
  return {
    isOpen: store.isOpen,
    activeGenerator: store.activeGenerator,
    closeGenerator: store.closeGenerator
  };
};

export const useGeneratorUIState = () => {
  const store = useGeneratorsStore();
  return {
    uiState: store.uiState,
    setActiveTab: store.setActiveTab,
    outputMode: store.outputMode,
    setOutputMode: store.setOutputMode
  };
};

export const useGeneratorStatus = () => {
  const store = useGeneratorsStore();
  return {
    isGenerating: store.isGenerating,
    lastError: store.lastError
  };
};

export const useGeneratorActions = () => {
  const store = useGeneratorsStore();
  return {
    openGenerator: store.openGenerator,
    isGenerating: store.isGenerating
  };
};
