import { useCallback } from 'react';
import { useAuth } from '@ascii-motion/premium';
import { useCloudDialogState } from './useCloudDialogState';
import { useProjectMetadataStore } from '../stores/projectMetadataStore';

/**
 * Provides actions for Save (Ctrl+S), Save As (Ctrl+Shift+S), and Open (Ctrl+O) shortcuts
 * - If user is authenticated: Opens cloud save/open dialogs or performs silent save
 * - If user is not authenticated: Shortcuts are disabled (no-op)
 */
export const useProjectFileActions = () => {
  const { user } = useAuth();
  const { setShowSaveToCloudDialog, setShowProjectsDialog, setSaveAsMode, setTriggerSilentSave } = useCloudDialogState();
  const { currentProjectId } = useProjectMetadataStore();

  const showSaveProjectDialog = useCallback(() => {
    if (!user) {
      return; // Not authenticated, do nothing
    }

    console.log('[ProjectFileActions] showSaveProjectDialog called, currentProjectId:', currentProjectId);

    // If project has been saved before (has currentProjectId), trigger silent save
    if (currentProjectId) {
      console.log('[ProjectFileActions] Project has currentProjectId, triggering silent save');
      setTriggerSilentSave(true); // This will be handled by a component with CanvasContext access
    } else {
      // New project, show dialog to get name/description
      console.log('[ProjectFileActions] New project, showing save dialog');
      setSaveAsMode(false);
      setShowSaveToCloudDialog(true);
    }
  }, [user, currentProjectId, setSaveAsMode, setShowSaveToCloudDialog, setTriggerSilentSave]);

  const showSaveAsDialog = useCallback(() => {
    if (user) {
      setSaveAsMode(true); // Save As mode (always create new)
      setShowSaveToCloudDialog(true);
    }
    // If not authenticated, do nothing (shortcuts disabled)
  }, [user, setShowSaveToCloudDialog, setSaveAsMode]);

  const showOpenProjectDialog = useCallback(() => {
    if (user) {
      // User is authenticated - use cloud projects dialog
      setShowProjectsDialog(true);
    }
    // If not authenticated, do nothing (shortcuts disabled)
  }, [user, setShowProjectsDialog]);

  return {
    showSaveProjectDialog,
    showSaveAsDialog,
    showOpenProjectDialog,
    currentProjectId, // Expose for checking if project is saved
  } as const;
};
