/**
 * Time Effects Store
 * 
 * Zustand store for managing time-based effects state, dialog visibility,
 * and preview system. Follows the established effectsStore pattern.
 */

import { create } from 'zustand';
import type { 
  WaveWarpSettings, 
  WiggleSettings, 
  FrameRangeSettings,
  TimeEffectType 
} from '../types/timeEffects';
import { 
  DEFAULT_WAVE_WARP_SETTINGS, 
  DEFAULT_WIGGLE_SETTINGS 
} from '../constants/timeEffects';
import { useAnimationStore } from './animationStore';
import { useCanvasStore } from './canvasStore';
import { usePreviewStore } from './previewStore';
import { 
  applyWaveWarpToFrame, 
  applyWiggleToFrame, 
  calculateAccumulatedTime 
} from '../utils/timeEffectsProcessing';

interface TimeEffectsState {
  // ==========================================
  // Dialog Visibility State
  // ==========================================
  isWaveWarpDialogOpen: boolean;
  isWiggleDialogOpen: boolean;
  isSetDurationDialogOpen: boolean;
  isAddFramesDialogOpen: boolean;
  
  // ==========================================
  // Effect Settings (Persisted)
  // ==========================================
  waveWarpSettings: WaveWarpSettings;
  wiggleSettings: WiggleSettings;
  
  // ==========================================
  // Frame Range Control (Shared across effects)
  // ==========================================
  frameRange: FrameRangeSettings;
  
  // ==========================================
  // Preview System
  // ==========================================
  isPreviewActive: boolean;
  previewEffect: TimeEffectType | null;
  
  // ==========================================
  // Actions - Dialog Management
  // ==========================================
  openWaveWarpDialog: () => void;
  closeWaveWarpDialog: () => void;
  openWiggleDialog: () => void;
  closeWiggleDialog: () => void;
  openSetDurationDialog: () => void;
  closeSetDurationDialog: () => void;
  openAddFramesDialog: () => void;
  closeAddFramesDialog: () => void;
  
  // ==========================================
  // Actions - Settings Updates
  // ==========================================
  updateWaveWarpSettings: (settings: Partial<WaveWarpSettings>) => void;
  updateWiggleSettings: (settings: Partial<WiggleSettings>) => void;
  updateFrameRange: (range: Partial<FrameRangeSettings>) => void;
  resetWaveWarpSettings: () => void;
  resetWiggleSettings: () => void;
  
  // ==========================================
  // Actions - Preview Management
  // ==========================================
  startPreview: (effectType: TimeEffectType) => void;
  stopPreview: () => void;
  updatePreview: () => void; // Manually trigger preview update
}

export const useTimeEffectsStore = create<TimeEffectsState>((set, get) => ({
  // ==========================================
  // Initial State
  // ==========================================
  isWaveWarpDialogOpen: false,
  isWiggleDialogOpen: false,
  isSetDurationDialogOpen: false,
  isAddFramesDialogOpen: false,
  
  waveWarpSettings: { ...DEFAULT_WAVE_WARP_SETTINGS },
  wiggleSettings: { ...DEFAULT_WIGGLE_SETTINGS },
  
  frameRange: {
    applyToAll: true,
    startFrame: 0,
    endFrame: 0
  },
  
  isPreviewActive: false,
  previewEffect: null,
  
  // ==========================================
  // Dialog Management Actions
  // ==========================================
  
  openWaveWarpDialog: () => {
    // Initialize frame range when dialog opens
    const frames = useAnimationStore.getState().frames;
    
    set({ 
      isWaveWarpDialogOpen: true,
      frameRange: {
        applyToAll: true,
        startFrame: 0,
        endFrame: frames.length - 1
      }
    });
  },
  
  closeWaveWarpDialog: () => {
    const { stopPreview } = get();
    stopPreview();
    set({ isWaveWarpDialogOpen: false });
  },
  
  openWiggleDialog: () => {
    // Initialize frame range when dialog opens
    const frames = useAnimationStore.getState().frames;
    
    set({ 
      isWiggleDialogOpen: true,
      frameRange: {
        applyToAll: true,
        startFrame: 0,
        endFrame: frames.length - 1
      }
    });
  },
  
  closeWiggleDialog: () => {
    const { stopPreview } = get();
    stopPreview();
    set({ isWiggleDialogOpen: false });
  },
  
  openSetDurationDialog: () => set({ isSetDurationDialogOpen: true }),
  closeSetDurationDialog: () => set({ isSetDurationDialogOpen: false }),
  
  openAddFramesDialog: () => set({ isAddFramesDialogOpen: true }),
  closeAddFramesDialog: () => set({ isAddFramesDialogOpen: false }),
  
  // ==========================================
  // Settings Update Actions
  // ==========================================
  
  updateWaveWarpSettings: (settings) => {
    set((state) => ({
      waveWarpSettings: { ...state.waveWarpSettings, ...settings }
    }));
    
    // Auto-update preview if active
    if (get().isPreviewActive && get().previewEffect === 'wave-warp') {
      get().updatePreview();
    }
  },
  
  updateWiggleSettings: (settings) => {
    set((state) => ({
      wiggleSettings: { ...state.wiggleSettings, ...settings }
    }));
    
    // Auto-update preview if active
    if (get().isPreviewActive && get().previewEffect === 'wiggle') {
      get().updatePreview();
    }
  },
  
  updateFrameRange: (range) => {
    set((state) => ({
      frameRange: { ...state.frameRange, ...range }
    }));
  },
  
  resetWaveWarpSettings: () => {
    set({ waveWarpSettings: { ...DEFAULT_WAVE_WARP_SETTINGS } });
    
    // Update preview if active
    if (get().isPreviewActive && get().previewEffect === 'wave-warp') {
      get().updatePreview();
    }
  },
  
  resetWiggleSettings: () => {
    set({ wiggleSettings: { ...DEFAULT_WIGGLE_SETTINGS } });
    
    // Update preview if active
    if (get().isPreviewActive && get().previewEffect === 'wiggle') {
      get().updatePreview();
    }
  },
  
  // ==========================================
  // Preview Management Actions
  // ==========================================
  
  startPreview: (effectType) => {
    console.log('[TimeEffects Store] startPreview called with:', effectType);
    set({ 
      isPreviewActive: true, 
      previewEffect: effectType 
    });
    
    // Trigger initial preview
    get().updatePreview();
  },
  
  stopPreview: () => {
    console.log('[TimeEffects Store] stopPreview called');
    // Clear preview from canvas via previewStore
    try {
      usePreviewStore.getState().clearPreview();
    } catch (error) {
      console.warn('Preview store not available:', error);
    }
    
    set({ isPreviewActive: false, previewEffect: null });
  },
  
  updatePreview: () => {
    const state = get();
    
    console.log('[TimeEffects Store] updatePreview called, state:', {
      isPreviewActive: state.isPreviewActive,
      previewEffect: state.previewEffect
    });
    
    if (!state.isPreviewActive || !state.previewEffect) {
      console.log('[TimeEffects Store] Preview not active or no effect type');
      return;
    }
    
    try {
      // Use imported stores and utilities
      const animationStore = useAnimationStore.getState();
      const canvasStore = useCanvasStore.getState();
      const previewStore = usePreviewStore.getState();
      
      const { currentFrameIndex, frames } = animationStore;
      const { width: canvasWidth, height: canvasHeight } = canvasStore;
      
      // Get current frame data
      const currentFrameData = frames[currentFrameIndex]?.data;
      if (!currentFrameData) return;
      
      // Calculate accumulated time for current frame
      const accumulatedTime = calculateAccumulatedTime(frames, currentFrameIndex);
      
      // Apply effect based on type
      let previewData: Map<string, any> | null = null;
      
      console.log('[TimeEffects Store] Applying effect:', state.previewEffect, 'to frame', currentFrameIndex);
      console.log('[TimeEffects Store] Frame data size:', currentFrameData.size, 'accumulated time:', accumulatedTime);
      
      if (state.previewEffect === 'wave-warp') {
        previewData = applyWaveWarpToFrame(
          currentFrameData,
          canvasWidth,
          canvasHeight,
          state.waveWarpSettings,
          accumulatedTime
        );
        console.log('[TimeEffects Store] Wave warp result:', previewData?.size || 0, 'cells');
      } else if (state.previewEffect === 'wiggle') {
        previewData = applyWiggleToFrame(
          currentFrameData,
          canvasWidth,
          canvasHeight,
          state.wiggleSettings,
          accumulatedTime
        );
      }
      
      // Update preview on canvas
      if (previewData) {
        console.log('[TimeEffects Store] Setting preview data:', previewData.size, 'cells');
        previewStore.setPreviewData(previewData);
      } else {
        console.log('[TimeEffects Store] No preview data generated');
      }
    } catch (error) {
      console.error('Failed to update preview:', error);
    }
  }
}));
