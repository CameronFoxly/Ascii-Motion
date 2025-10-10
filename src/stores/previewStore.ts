import { create } from 'zustand';
import type { Cell } from '../types';

interface PreviewState {
  // Preview data
  previewData: Map<string, Cell>;
  isPreviewActive: boolean;
  
  // Actions
  setPreviewData: (data: Map<string, Cell>) => void;
  clearPreview: () => void;
  setPreviewActive: (active: boolean) => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
  // Initial state
  previewData: new Map(),
  isPreviewActive: false,
  
  // Actions
  setPreviewData: (data: Map<string, Cell>) => {
    set({
      previewData: new Map(data),
      isPreviewActive: true
    });
  },
  
  clearPreview: () => {
    set({
      previewData: new Map(),
      isPreviewActive: false
    });
  },
  
  setPreviewActive: (active: boolean) => {
    set({ isPreviewActive: active });
  }
}));