/**
 * ImportStore - Zustand store for managing image/video import workflow
 * 
 * Manages:
 * - Import modal state and settings
 * - Media file processing progress
 * - Preview state and conversion settings
 * - Integration with existing stores
 */

import { create } from 'zustand';
import type { MediaFile, ProcessedFrame } from '../utils/mediaProcessor';
import { usePaletteStore } from './paletteStore';

export interface ImportUIState {
  // UI preferences that should persist across sessions
  importMode: 'overwrite' | 'append';
  livePreviewEnabled: boolean;
  previewSectionOpen: boolean;
  positionSectionOpen: boolean;
}

export interface ImportState {
  // Modal state
  isImportModalOpen: boolean;
  
  // File and processing state
  selectedFile: MediaFile | null;
  processedFrames: ProcessedFrame[];
  isProcessing: boolean;
  processingProgress: number; // 0-100
  processingError: string | null;
  
  // Import settings
  settings: ImportSettings;
  
  // Session-persistent settings (maintains user preferences across import sessions)
  sessionSettings: ImportSettings | null;
  
  // UI state (also session-persistent)
  uiState: ImportUIState;
  sessionUIState: ImportUIState | null;
  
  // Preview state
  previewFrameIndex: number;
  isPreviewMode: boolean;
  
  // Actions
  openImportModal: () => void;
  closeImportModal: () => void;
  setSelectedFile: (file: MediaFile | null) => void;
  setProcessedFrames: (frames: ProcessedFrame[]) => void;
  setProcessing: (isProcessing: boolean) => void;
  setProcessingProgress: (progress: number) => void;
  setProcessingError: (error: string | null) => void;
  updateSettings: (settings: Partial<ImportSettings>) => void;
  updateUIState: (uiState: Partial<ImportUIState>) => void;
  setPreviewFrameIndex: (index: number) => void;
  setPreviewMode: (isPreview: boolean) => void;
  resetImportState: () => void;
}

export interface ImportSettings {
  // Size controls (Phase 4.1 - Session 1)
  characterWidth: number;   // Target width in characters
  characterHeight: number;  // Target height in characters
  maintainAspectRatio: boolean;
  cropMode: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  // Nudge controls - fine positioning adjustments
  nudgeX: number;          // Horizontal nudge offset in characters
  nudgeY: number;          // Vertical nudge offset in characters
  
  // Character selection settings (Phase 4.2 - Session 2)
  characterSet: string[];   // Selected ASCII characters for mapping
  characterMappingMode: 'brightness' | 'edge' | 'custom';
  customCharacterMapping: { [brightness: string]: string }; // Custom brightness-to-character mapping
  
  // Character mapping enable/disable
  enableCharacterMapping: boolean;
  
  // Text Color Mapping settings (NEW)
  enableTextColorMapping: boolean;
  textColorPaletteId: string | null;     // Active palette ID from paletteStore
  textColorMappingMode: 'closest' | 'noise-dither' | 'bayer2x2' | 'bayer4x4' | 'by-index';
  textColorDitherStrength: number;       // 0-1 range for dithering intensity
  
  // Background Color Mapping settings (NEW)  
  enableBackgroundColorMapping: boolean;
  backgroundColorPaletteId: string | null; // Active palette ID from paletteStore
  backgroundColorMappingMode: 'closest' | 'noise-dither' | 'bayer2x2' | 'bayer4x4' | 'by-index';
  backgroundColorDitherStrength: number; // 0-1 range for dithering intensity
  
  // Legacy color palette settings (Phase 4.3 - Session 3) 
  useOriginalColors: boolean;
  colorQuantization: 'none' | 'basic' | 'advanced';
  paletteSize: number;      // Number of colors to extract (8, 16, 32, 64)
  colorMappingMode: 'closest' | 'dithering';
  
  // Image pre-processing settings (Phase 4.4 - Session 4)
  brightness: number;       // -100 to 100
  contrast: number;         // -100 to 100  
  highlights: number;       // -100 to 100
  shadows: number;          // -100 to 100
  midtones: number;         // -100 to 100
  blur: number;             // 0 to 10
  sharpen: number;          // 0 to 10
  saturation: number;       // -100 to 100
  
  // Video-specific settings
  frameExtraction: 'all' | 'keyframes' | 'interval';
  frameInterval: number;    // Seconds between frames (for interval mode)
  maxFrames: number;        // Maximum frames to import
  
  // Transparency settings (color keying)
  enableColorAsAlpha: boolean;
  colorAsAlphaKey: string;      // Hex color to treat as transparent
  colorAsAlphaTolerance: number; // 0-255 RGB distance tolerance
}

// Default UI state
const DEFAULT_UI_STATE: ImportUIState = {
  importMode: 'append',
  livePreviewEnabled: true,
  previewSectionOpen: true,
  positionSectionOpen: false
};

// Default import settings
const DEFAULT_IMPORT_SETTINGS: ImportSettings = {
  // Size controls
  characterWidth: 80,
  characterHeight: 24,
  maintainAspectRatio: true,
  cropMode: 'center',
  
  // Nudge controls
  nudgeX: 0,
  nudgeY: 0,
  
  // Character selection (simplified for Session 1)
  characterSet: [' ', '.', ':', ';', 'o', 'O', '#', '@'], // Basic brightness mapping
  characterMappingMode: 'brightness',
  customCharacterMapping: {},
  
  // Character mapping control
  enableCharacterMapping: true,
  
  // Text Color Mapping (NEW)
  enableTextColorMapping: true,
  textColorPaletteId: null, // Will be set to active palette on first load
  textColorMappingMode: 'closest',
  textColorDitherStrength: 0.5,
  
  // Background Color Mapping (NEW)
  enableBackgroundColorMapping: false,
  backgroundColorPaletteId: null, // Will be set to active palette on first load
  backgroundColorMappingMode: 'closest',
  backgroundColorDitherStrength: 0.5,
  
  // Legacy color palette (simplified for Session 1)
  useOriginalColors: true,
  colorQuantization: 'basic',
  paletteSize: 16,
  colorMappingMode: 'closest',
  
  // Image pre-processing (neutral settings for Session 1)
  brightness: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  midtones: 0,
  blur: 0,
  sharpen: 0,
  saturation: 0,
  
  // Video settings
  frameExtraction: 'interval',
  frameInterval: 0.1, // 10 FPS
  maxFrames: 100,
  
  // Transparency settings
  enableColorAsAlpha: false,
  colorAsAlphaKey: '#000000', // Default to black
  colorAsAlphaTolerance: 10 // Small default tolerance
};

export const useImportStore = create<ImportState>((set, get) => ({
  // Initial state
  isImportModalOpen: false,
  selectedFile: null,
  processedFrames: [],
  isProcessing: false,
  processingProgress: 0,
  processingError: null,
  settings: DEFAULT_IMPORT_SETTINGS,
  sessionSettings: null, // No session settings stored initially
  uiState: DEFAULT_UI_STATE,
  sessionUIState: null, // No session UI state stored initially
  previewFrameIndex: 0,
  isPreviewMode: false,
  
  // Modal actions
  openImportModal: () => {
    const state = get();
    // Get the active palette ID from the main app
    const activePaletteId = usePaletteStore.getState().activePaletteId;
    
    // Determine settings to use: session settings if available, otherwise defaults
    const settingsToUse = state.sessionSettings 
      ? {
          ...state.sessionSettings,
          // Only use current active palette if user hasn't selected a specific palette
          textColorPaletteId: state.sessionSettings.textColorPaletteId || activePaletteId,
          backgroundColorPaletteId: state.sessionSettings.backgroundColorPaletteId || activePaletteId,
        }
      : {
          ...DEFAULT_IMPORT_SETTINGS,
          textColorPaletteId: activePaletteId,
          backgroundColorPaletteId: activePaletteId,
        };
    
    // Determine UI state to use: session UI state if available, otherwise defaults
    const uiStateToUse = state.sessionUIState || DEFAULT_UI_STATE;
    
    set({ 
      isImportModalOpen: true,
      // Reset transient state when opening modal
      selectedFile: null,
      processedFrames: [],
      isProcessing: false,
      processingProgress: 0,
      processingError: null,
      previewFrameIndex: 0,
      isPreviewMode: false,
      // Use session-persistent settings and UI state or defaults
      settings: settingsToUse,
      uiState: uiStateToUse
    });
  },
  
  closeImportModal: () => {
    const state = get();
    // Save current settings and UI state to session before closing
    const currentSettings = state.settings;
    const currentUIState = state.uiState;
    
    set({ 
      isImportModalOpen: false,
      sessionSettings: currentSettings, // Preserve settings for next session
      sessionUIState: currentUIState, // Preserve UI state for next session
      // Reset transient state but keep current settings and session state
      selectedFile: null,
      processedFrames: [],
      isProcessing: false,
      processingProgress: 0,
      processingError: null,
      previewFrameIndex: 0,
      isPreviewMode: false
    });
  },
  
  // File and processing actions
  setSelectedFile: (file: MediaFile | null) => {
    set({ 
      selectedFile: file,
      processedFrames: [], // Clear previous frames
      processingError: null,
      previewFrameIndex: 0
    });
  },
  
  setProcessedFrames: (frames: ProcessedFrame[]) => {
    set({ 
      processedFrames: frames,
      previewFrameIndex: 0,
      isPreviewMode: frames.length > 0
    });
  },
  
  setProcessing: (isProcessing: boolean) => {
    set({ 
      isProcessing,
      processingError: isProcessing ? null : get().processingError // Clear error when starting
    });
  },
  
  setProcessingProgress: (progress: number) => {
    set({ processingProgress: Math.max(0, Math.min(100, progress)) });
  },
  
  setProcessingError: (error: string | null) => {
    set({ 
      processingError: error,
      isProcessing: false,
      processingProgress: 0
    });
  },
  
  // Settings actions
  updateSettings: (newSettings: Partial<ImportSettings>) => {
    set((state) => {
      const updatedSettings = {
        ...state.settings,
        ...newSettings
      };
      
      return {
        settings: updatedSettings,
        // Also save to session settings for persistence
        sessionSettings: updatedSettings
      };
    });
  },
  
  // UI state actions
  updateUIState: (newUIState: Partial<ImportUIState>) => {
    set((state) => {
      const updatedUIState = {
        ...state.uiState,
        ...newUIState
      };
      
      return {
        uiState: updatedUIState,
        // Also save to session UI state for persistence
        sessionUIState: updatedUIState
      };
    });
  },
  
  // Preview actions
  setPreviewFrameIndex: (index: number) => {
    const frames = get().processedFrames;
    if (frames.length > 0) {
      set({ previewFrameIndex: Math.max(0, Math.min(frames.length - 1, index)) });
    }
  },
  
  setPreviewMode: (isPreview: boolean) => {
    set({ isPreviewMode: isPreview });
  },
  
  // Reset action - only resets transient state, preserves sessionSettings
  resetImportState: () => {
    set({
      selectedFile: null,
      processedFrames: [],
      isProcessing: false,
      processingProgress: 0,
      processingError: null,
      previewFrameIndex: 0,
      isPreviewMode: false,
      // Don't reset settings or sessionSettings - they should persist
    });
  }
}));

// Selectors for common state combinations
export const useImportModal = () => {
  const store = useImportStore();
  return {
    isOpen: store.isImportModalOpen,
    openModal: store.openImportModal,
    closeModal: store.closeImportModal
  };
};

export const useImportFile = () => {
  const store = useImportStore();
  return {
    selectedFile: store.selectedFile,
    setSelectedFile: store.setSelectedFile,
    processedFrames: store.processedFrames,
    setProcessedFrames: store.setProcessedFrames
  };
};

export const useImportProcessing = () => {
  const store = useImportStore();
  return {
    isProcessing: store.isProcessing,
    progress: store.processingProgress,
    error: store.processingError,
    setProcessing: store.setProcessing,
    setProgress: store.setProcessingProgress,
    setError: store.setProcessingError
  };
};

export const useImportSettings = () => {
  const store = useImportStore();
  return {
    settings: store.settings,
    updateSettings: store.updateSettings
  };
};

export const useImportPreview = () => {
  const store = useImportStore();
  return {
    frameIndex: store.previewFrameIndex,
    isPreviewMode: store.isPreviewMode,
    setFrameIndex: store.setPreviewFrameIndex,
    setPreviewMode: store.setPreviewMode,
    frames: store.processedFrames
  };
};

export const useImportUIState = () => {
  const store = useImportStore();
  return {
    uiState: store.uiState,
    updateUIState: store.updateUIState
  };
};

export const useImportSessionState = () => {
  const store = useImportStore();
  return {
    hasSessionSettings: store.sessionSettings !== null,
    sessionSettings: store.sessionSettings
  };
};