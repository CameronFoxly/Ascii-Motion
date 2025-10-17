/**
 * ASCII Motion
 * Project Dialog State Hook
 * 
 * Manages the open/close state of project management dialogs
 * This allows the dialogs to be rendered in App.tsx (inside CanvasProvider)
 * while being controlled from HamburgerMenu (outside CanvasProvider)
 */

import { create } from 'zustand';

interface ProjectDialogState {
  showNewProjectDialog: boolean;
  showProjectSettingsDialog: boolean;
  setShowNewProjectDialog: (show: boolean) => void;
  setShowProjectSettingsDialog: (show: boolean) => void;
}

export const useProjectDialogState = create<ProjectDialogState>((set) => ({
  showNewProjectDialog: false,
  showProjectSettingsDialog: false,
  setShowNewProjectDialog: (show) => set({ showNewProjectDialog: show }),
  setShowProjectSettingsDialog: (show) => set({ showProjectSettingsDialog: show }),
}));
