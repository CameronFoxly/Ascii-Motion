import { useCallback } from 'react';
import { useAuth } from '@ascii-motion/premium';
import { useCloudDialogState } from './useCloudDialogState';
import { useCloudProjectActions } from './useCloudProjectActions';

/**
 * Provides actions for Save (Ctrl+S), Save As (Ctrl+Shift+S), and Open (Ctrl+O) shortcuts
 * - If user is authenticated: Opens cloud save/open dialogs
 * - If user is not authenticated: Shortcuts are disabled (no-op)
 */
export const useProjectFileActions = () => {
  const { user } = useAuth();
  const { setShowSaveToCloudDialog, setShowProjectsDialog, setSaveAsMode } = useCloudDialogState();
  const { currentProjectId } = useCloudProjectActions();

  const showSaveProjectDialog = useCallback(() => {
    if (user) {
      setSaveAsMode(false); // Regular save mode
      setShowSaveToCloudDialog(true);
    }
    // If not authenticated, do nothing (shortcuts disabled)
  }, [user, setShowSaveToCloudDialog, setSaveAsMode]);

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
