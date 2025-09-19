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
  
  // Color palette settings (Phase 4.3 - Session 3) 
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
}

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
  
  // Color palette (simplified for Session 1)
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
  maxFrames: 100
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
  previewFrameIndex: 0,
  isPreviewMode: false,
  
  // Modal actions
  openImportModal: () => {
    set({ 
      isImportModalOpen: true,
      // Reset state when opening modal
      selectedFile: null,
      processedFrames: [],
      isProcessing: false,
      processingProgress: 0,
      processingError: null,
      previewFrameIndex: 0,
      isPreviewMode: false
    });
  },
  
  closeImportModal: () => {
    set({ isImportModalOpen: false });
    // Clean up any processing resources
    get().resetImportState();
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
    set((state) => ({
      settings: {
        ...state.settings,
        ...newSettings
      }
    }));
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
  
  // Reset action
  resetImportState: () => {
    set({
      selectedFile: null,
      processedFrames: [],
      isProcessing: false,
      processingProgress: 0,
      processingError: null,
      previewFrameIndex: 0,
      isPreviewMode: false,
      settings: DEFAULT_IMPORT_SETTINGS
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