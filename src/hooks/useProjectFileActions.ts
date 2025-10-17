import { useCallback } from 'react';
import { useAuth } from '@ascii-motion/premium';
import { useCloudDialogState } from './useCloudDialogState';
import { useExportStore } from '../stores/exportStore';

/**
 * Provides actions for Save (Ctrl+S) and Open (Ctrl+O) shortcuts
 * - If user is authenticated: Opens cloud save/open dialogs
 * - If user is not authenticated: Falls back to session export/import
 */
export const useProjectFileActions = () => {
  const { user } = useAuth();
  const { setShowSaveToCloudDialog, setShowProjectsDialog } = useCloudDialogState();
  const setActiveFormat = useExportStore((state) => state.setActiveFormat);
  const setShowExportModal = useExportStore((state) => state.setShowExportModal);
  const setShowImportModal = useExportStore((state) => state.setShowImportModal);

  const showSaveProjectDialog = useCallback(() => {
    if (user) {
      // User is authenticated - use cloud save
      setShowSaveToCloudDialog(true);
    } else {
      // User not authenticated - fall back to session export
      setActiveFormat('session');
      setShowExportModal(true);
    }
  }, [user, setShowSaveToCloudDialog, setActiveFormat, setShowExportModal]);

  const showOpenProjectDialog = useCallback(() => {
    if (user) {
      // User is authenticated - use cloud projects dialog
      setShowProjectsDialog(true);
    } else {
      // User not authenticated - fall back to session import
      setActiveFormat('session');
      setShowImportModal(true);
    }
  }, [user, setShowProjectsDialog, setActiveFormat, setShowImportModal]);

  return {
    showSaveProjectDialog,
    showOpenProjectDialog,
  } as const;
};
