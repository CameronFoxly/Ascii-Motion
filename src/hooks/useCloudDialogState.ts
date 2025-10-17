/**
 * ASCII Motion
 * Cloud Dialog State Hook
 * 
 * Manages the open/close state of cloud storage dialogs
 * This allows the dialogs to be rendered in App.tsx (inside CanvasProvider)
 * while being controlled from HamburgerMenu (outside CanvasProvider)
 */

import { create } from 'zustand';

interface CloudDialogState {
  showSaveToCloudDialog: boolean;
  showProjectsDialog: boolean;
  saveAsMode: boolean; // true = "Save As...", false = "Save"
  setShowSaveToCloudDialog: (show: boolean) => void;
  setShowProjectsDialog: (show: boolean) => void;
  setSaveAsMode: (saveAs: boolean) => void;
}

export const useCloudDialogState = create<CloudDialogState>((set) => ({
  showSaveToCloudDialog: false,
  showProjectsDialog: false,
  saveAsMode: false,
  setShowSaveToCloudDialog: (show) => set({ showSaveToCloudDialog: show }),
  setShowProjectsDialog: (show) => set({ showProjectsDialog: show }),
  setSaveAsMode: (saveAs) => set({ saveAsMode: saveAs }),
}));
