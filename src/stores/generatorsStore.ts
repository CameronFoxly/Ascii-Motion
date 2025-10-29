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
import { useToolStore } from './toolStore';
import { generateFrames } from '../utils/generators/generatorEngine';
import { ASCIIConverter, type ConversionSettings } from '../utils/asciiConverter';
import { usePaletteStore } from './paletteStore';
import { usePreviewStore } from './previewStore';
// import { cloneFrames } from '../utils/frameUtils'; // TODO: Phase 5 - Use for history
import type { Frame } from '../types';

// UI state for panel tabs and playback
export interface GeneratorUIState {
  activeTab: 'animation' | 'mapping';
  isPlaying: boolean;
  currentPreviewFrame: number;
}

// Default mapping settings - enable character and text color mapping for better defaults
const DEFAULT_MAPPING_SETTINGS: GeneratorMappingSettings = {
  enableCharacterMapping: true,
  characterSet: [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'],
  characterMappingMode: 'brightness',
  customCharacterMapping: {},
  
  enableTextColorMapping: true,
  textColorPaletteId: null, // Will be initialized on first open
  textColorMappingMode: 'by-index', // Default to by-index for better gradient mapping
  
  enableBackgroundColorMapping: false,
  backgroundColorPaletteId: null,
  backgroundColorMappingMode: 'by-index' // Default to by-index for better gradient mapping
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
  outputMode: 'overwrite',  // Default to overwrite mode
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
    // Initialize palette IDs if not set
    const currentSettings = get().mappingSettings;
    const paletteStore = usePaletteStore.getState();
    
    // Set first available palette as default for text color if not already set
    if (currentSettings.enableTextColorMapping && !currentSettings.textColorPaletteId && paletteStore.palettes.length > 0) {
      get().updateMappingSettings({
        textColorPaletteId: paletteStore.palettes[0].id
      });
    }
    
    set({ 
      isOpen: true, 
      activeGenerator: id,
      uiState: { 
        ...DEFAULT_UI_STATE,
        isPlaying: false  // Start paused for canvas preview tuning
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
    usePreviewStore.getState().clearPreview();
    get().clearError();
  },
  
  setOutputMode: (mode: 'overwrite' | 'append') => {
    set({ outputMode: mode });
  },
  
  setActiveTab: (tab: 'animation' | 'mapping') => {
    set(state => ({
      uiState: {
        ...state.uiState,
        activeTab: tab
      }
    }));

    const currentState = get();
    const previewStore = usePreviewStore.getState();

    // Update canvas preview with current frame when not playing
    if (!currentState.uiState.isPlaying) {
      const frame = currentState.convertedFrames[currentState.uiState.currentPreviewFrame];
      if (frame) {
        previewStore.setPreviewData(frame.data);
      } else {
        previewStore.clearPreview();
      }
    }
    // When playing, keep the last frame visible (don't clear on tab switch)
  },
  
  // Playback Control Actions
  setPlaying: (playing: boolean) => {
    set(state => ({
      uiState: {
        ...state.uiState,
        isPlaying: playing
      }
    }));

    const currentState = get();
    const previewStore = usePreviewStore.getState();

    if (!playing) {
      // When pausing, sync canvas with current frame for live preview
      const frame = currentState.convertedFrames[currentState.uiState.currentPreviewFrame];
      if (frame) {
        previewStore.setPreviewData(frame.data);
      }
    }
    // When playing, keep the last frame visible (don't clear canvas)
    // This avoids blank canvas while still preventing updates during playback
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

    const state = get();
    const previewStore = usePreviewStore.getState();
    
    // Update canvas preview when not playing
    if (!state.uiState.isPlaying) {
      const frame = state.convertedFrames[clampedIndex];
      if (frame) {
        previewStore.setPreviewData(frame.data);
      } else {
        previewStore.clearPreview();
      }
    }
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
    console.log('[Generators] updateMappingSettings called with:', settings);
    set(state => {
      const newSettings = {
        ...state.mappingSettings,
        ...settings
      };
      console.log('[Generators] Updated mapping settings:', {
        characterSet: newSettings.characterSet,
        enableCharacterMapping: newSettings.enableCharacterMapping,
        textColorPaletteId: newSettings.textColorPaletteId,
        enableTextColorMapping: newSettings.enableTextColorMapping
      });
      return {
        mappingSettings: newSettings,
        isPreviewDirty: true // Mark dirty so preview regenerates with new mapping
      };
    });
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
    
  set({ isGenerating: true, lastError: null, isPreviewDirty: false });
    
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
      
      // Get character set from mapping settings and create a temporary palette
      const characterSet = state.mappingSettings.characterSet;
      console.log('[Generators] Using character set for conversion:', characterSet);
      
      const tempCharacterPalette: import('../types/palette').CharacterPalette = {
        id: 'temp-generator-palette',
        name: 'Generator Palette',
        characters: characterSet,
        isPreset: false,
        isCustom: true,
        category: 'custom'
      };
      
      // Get color palettes for text and background
      const paletteStore = usePaletteStore.getState();
      // Look in both preset palettes and custom palettes (just like TextColorMappingSection does)
      const allColorPalettes = [...paletteStore.palettes, ...paletteStore.customPalettes];
      const textColorPalette = state.mappingSettings.textColorPaletteId
        ? allColorPalettes.find(p => p.id === state.mappingSettings.textColorPaletteId)
        : null;
      const backgroundColorPalette = state.mappingSettings.backgroundColorPaletteId
        ? allColorPalettes.find(p => p.id === state.mappingSettings.backgroundColorPaletteId)
        : null;
      
      // Extract hex color strings from palette colors
      const textColors = textColorPalette?.colors.map(c => c.value) || [];
      const bgColors = backgroundColorPalette?.colors.map(c => c.value) || [];
      
      console.log('[Generators] Conversion settings:', {
        enableCharacterMapping: state.mappingSettings.enableCharacterMapping,
        characterSet,
        enableTextColorMapping: state.mappingSettings.enableTextColorMapping,
        textColorPaletteId: state.mappingSettings.textColorPaletteId,
        textColorPaletteName: textColorPalette?.name,
        textColorsCount: textColors.length,
        textColors: textColors.slice(0, 5), // First 5 colors
        enableBackgroundColorMapping: state.mappingSettings.enableBackgroundColorMapping,
        backgroundColorPaletteId: state.mappingSettings.backgroundColorPaletteId,
        backgroundColorPaletteName: backgroundColorPalette?.name,
        bgColorsCount: bgColors.length,
        bgColors: bgColors.slice(0, 5) // First 5 colors
      });
      
      // Build conversion settings from mapping settings
      const conversionSettings: ConversionSettings = {
        // Character mapping
        enableCharacterMapping: state.mappingSettings.enableCharacterMapping,
        characterPalette: tempCharacterPalette,
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
      
      // Log conversion details
      const sampleFrame = convertedFrames[0];
      const cellCount = sampleFrame ? sampleFrame.data.size : 0;
      console.log(`[Generators] Converted ${convertedFrames.length} frames to ASCII (sample frame has ${cellCount} cells)`);
      

      let hadPendingDirtyChanges = false;
      set((state) => {
        hadPendingDirtyChanges = state.isPreviewDirty;
        return {
          previewFrames: result.frames,
          convertedFrames,
          totalPreviewFrames: result.frameCount,
          isPreviewDirty: false,
          isGenerating: false,
          uiState: {
            ...state.uiState,
            currentPreviewFrame: 0
          }
        };
      });

      if (hadPendingDirtyChanges) {
        // Schedule another regeneration immediately to process pending mapping changes
        setTimeout(() => {
          const { regeneratePreview: rerunPreview } = useGeneratorsStore.getState();
          rerunPreview();
        }, 0);
      }

      const updatedState = get();
      const previewStore = usePreviewStore.getState();
      
      // Sync canvas with first frame when not playing (for live preview)
      if (!updatedState.uiState.isPlaying) {
        const frame = updatedState.convertedFrames[updatedState.uiState.currentPreviewFrame];
        if (frame) {
          previewStore.setPreviewData(frame.data);
        } else {
          previewStore.clearPreview();
        }
      }
      
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
    const state = get();
    const { 
      activeGenerator, 
      convertedFrames, 
      outputMode,
      isPreviewDirty
    } = state;
    
    if (!activeGenerator) {
      set({ lastError: 'No active generator' });
      return false;
    }
    
    // If preview is dirty (mapping settings changed), regenerate before applying
    if (isPreviewDirty) {
      console.log('[Generators] Preview is dirty, regenerating before apply...');
      await state.regeneratePreview();
      
      // Get updated frames after regeneration
      const updatedState = get();
      if (updatedState.convertedFrames.length === 0) {
        set({ lastError: 'No frames to apply after regeneration' });
        return false;
      }
    }
    
    // Use the latest converted frames
    const framesToApply = get().convertedFrames;
    
    if (framesToApply.length === 0) {
      set({ lastError: 'No frames to apply' });
      return false;
    }
    
    try {
      set({ lastError: null });
      
      // Get current animation state for history
      const animationStore = useAnimationStore.getState();
      const { currentFrameIndex, frames, importFramesOverwrite, importFramesAppend } = animationStore;
      
      // Capture before state for history
      const previousFrames = outputMode === 'overwrite' ? [...frames] : undefined;
      const previousCurrentFrame = currentFrameIndex;
      
      // Prepare frame data for import
      const frameData = framesToApply.map(frame => ({
        data: frame.data,
        duration: frame.duration
      }));
      
      // Apply based on output mode
      if (outputMode === 'overwrite') {
        importFramesOverwrite(frameData, currentFrameIndex);
      } else {
        importFramesAppend(frameData);
      }
      
      // Capture after state and record history
      const newFrames = [...useAnimationStore.getState().frames];
      const newCurrentFrame = useAnimationStore.getState().currentFrameIndex;
      
      const historyAction: import('../types').ApplyGeneratorHistoryAction = {
        type: 'apply_generator',
        timestamp: Date.now(),
        description: `Apply ${activeGenerator} generator (${outputMode})`,
        data: {
          mode: outputMode,
          generatorId: activeGenerator,
          previousFrames,
          previousCurrentFrame,
          newFrames,
          newCurrentFrame,
          frameCount: convertedFrames.length
        }
      };
      
      useToolStore.getState().pushToHistory(historyAction);
      
      // Sync canvas with the new current frame
      const currentFrame = useAnimationStore.getState().frames[newCurrentFrame];
      if (currentFrame) {
        useCanvasStore.getState().setCanvasData(currentFrame.data);
        console.log(`[Generators] Synced canvas with frame ${newCurrentFrame} (${currentFrame.data.size} cells)`);
      } else {
        console.warn(`[Generators] Could not sync canvas - frame ${newCurrentFrame} not found`);
      }
      
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
