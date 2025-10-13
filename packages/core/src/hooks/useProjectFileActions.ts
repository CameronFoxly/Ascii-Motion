import { useCallback } from 'react';
import { useExportStore } from '../stores/exportStore';

export const useProjectFileActions = () => {
  const setActiveFormat = useExportStore((state) => state.setActiveFormat);
  const setShowExportModal = useExportStore((state) => state.setShowExportModal);
  const setShowImportModal = useExportStore((state) => state.setShowImportModal);

  const showSaveProjectDialog = useCallback(() => {
    setActiveFormat('session');
    setShowExportModal(true);
  }, [setActiveFormat, setShowExportModal]);

  const showOpenProjectDialog = useCallback(() => {
    setActiveFormat('session');
    setShowImportModal(true);
  }, [setActiveFormat, setShowImportModal]);

  return {
    showSaveProjectDialog,
    showOpenProjectDialog,
  } as const;
};
