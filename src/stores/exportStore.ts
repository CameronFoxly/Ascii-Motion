import { create } from 'zustand';
import type { 
  ExportState, 
  ExportFormatId, 
  ExportProgress, 
  PngExportSettings, 
  VideoExportSettings, 
  SessionExportSettings,
  ExportHistoryEntry 
} from '../types/export';

interface ExportActions {
  // Modal control
  setShowExportModal: (show: boolean) => void;
  setShowImportModal: (show: boolean) => void;
  
  // Export operation control
  setActiveFormat: (format: ExportFormatId | null) => void;
  setIsExporting: (exporting: boolean) => void;
  setProgress: (progress: ExportProgress | null) => void;
  
  // Settings management
  setPngSettings: (settings: Partial<PngExportSettings>) => void;
  setVideoSettings: (settings: Partial<VideoExportSettings>) => void;
  setSessionSettings: (settings: Partial<SessionExportSettings>) => void;
  
  // History management
  addToHistory: (entry: ExportHistoryEntry) => void;
  clearHistory: () => void;
  
  // Reset state
  resetExportState: () => void;
}

interface ExportStoreState extends ExportState, ExportActions {}

// Default settings for each export format
const DEFAULT_PNG_SETTINGS: PngExportSettings = {
  sizeMultiplier: 1,
  includeGrid: false,
};

const DEFAULT_VIDEO_SETTINGS: VideoExportSettings = {
  sizeMultiplier: 1,
  frameRate: 12, // Match typical animation frame rate
  frameRange: { start: 0, end: -1 }, // -1 means "end of animation"
  quality: 'medium',
};

const DEFAULT_SESSION_SETTINGS: SessionExportSettings = {
  includeMetadata: true,
};

export const useExportStore = create<ExportStoreState>((set, get) => ({
  // Initial state
  activeFormat: null,
  isExporting: false,
  progress: null,
  
  // Default settings
  pngSettings: DEFAULT_PNG_SETTINGS,
  videoSettings: DEFAULT_VIDEO_SETTINGS,
  sessionSettings: DEFAULT_SESSION_SETTINGS,
  
  // UI state - updated for dropdown UX
  showExportModal: false, // Now used for format-specific dialogs
  showImportModal: false,
  
  // History
  history: [],
  
  // Actions
  setShowExportModal: (show: boolean) => {
    set({ showExportModal: show });
    // Reset export state when closing modal
    if (!show) {
      get().resetExportState();
    }
  },
  
  setShowImportModal: (show: boolean) => {
    set({ showImportModal: show });
  },
  
  setActiveFormat: (format: ExportFormatId | null) => {
    set({ activeFormat: format });
  },
  
  setIsExporting: (exporting: boolean) => {
    set({ isExporting: exporting });
    // Clear progress when export completes
    if (!exporting) {
      set({ progress: null });
    }
  },
  
  setProgress: (progress: ExportProgress | null) => {
    set({ progress });
  },
  
  setPngSettings: (settings: Partial<PngExportSettings>) => {
    set((state) => ({
      pngSettings: { ...state.pngSettings, ...settings }
    }));
  },
  
  setVideoSettings: (settings: Partial<VideoExportSettings>) => {
    set((state) => ({
      videoSettings: { ...state.videoSettings, ...settings }
    }));
  },
  
  setSessionSettings: (settings: Partial<SessionExportSettings>) => {
    set((state) => ({
      sessionSettings: { ...state.sessionSettings, ...settings }
    }));
  },
  
  addToHistory: (entry: ExportHistoryEntry) => {
    set((state) => ({
      history: [entry, ...state.history].slice(0, 10) // Keep last 10 exports
    }));
  },
  
  clearHistory: () => {
    set({ history: [] });
  },
  
  resetExportState: () => {
    set({
      activeFormat: null,
      isExporting: false,
      progress: null,
    });
  },
  
  // Computed getters
  getCurrentSettings: () => {
    const state = get();
    switch (state.activeFormat) {
      case 'png':
        return state.pngSettings;
      case 'mp4':
        return state.videoSettings;
      case 'session':
        return state.sessionSettings;
      default:
        return null;
    }
  },
}));

// Note: Use direct store access like useExportStore(state => state.property) 
// instead of object-returning selectors to avoid infinite re-renders