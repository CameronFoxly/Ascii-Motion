/**
 * ASCII Motion - PREMIUM FEATURE
 * Silent Save Handler
 * 
 * Handles silent saves for projects that have already been saved to cloud
 * This component must be rendered inside CanvasProvider to access useExportDataCollector
 * 
 * @premium This component requires authentication and uses premium cloud storage features
 */

import { useEffect } from 'react';
import { toast } from 'sonner';
import { CloudUpload } from 'lucide-react';
import { useCloudDialogState } from '../../hooks/useCloudDialogState';
import { useCloudProjectActions } from '../../hooks/useCloudProjectActions';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';
import { useExportDataCollector } from '../../utils/exportDataCollector';
import { useAuth } from '@ascii-motion/premium';

export function SilentSaveHandler() {
  const { user } = useAuth();
  const { triggerSilentSave, setTriggerSilentSave } = useCloudDialogState();
  const { handleSaveToCloud } = useCloudProjectActions();
  const { projectName, projectDescription, currentProjectId } = useProjectMetadataStore();
  const exportData = useExportDataCollector();

  useEffect(() => {
    if (!triggerSilentSave || !user || !currentProjectId) {
      return;
    }

    // Reset the flag immediately to prevent duplicate saves
    setTriggerSilentSave(false);

    console.log('[SilentSaveHandler] Performing silent save for project:', currentProjectId);

    const performSilentSave = async () => {
      try {
        await handleSaveToCloud(
          exportData,
          projectName,
          projectDescription,
          false // Don't force new - update existing
        );
        
        console.log('[SilentSaveHandler] ✓ Silent save successful');
        
        // Show success toast with project name and purple cloud icon
        toast.success('Saved to your projects', {
          description: projectName,
          icon: <CloudUpload className="h-5 w-5 text-purple-500" />,
        });
      } catch (error) {
        console.error('[SilentSaveHandler] ✗ Silent save failed:', error);
        
        // Show error toast
        toast.error('Failed to save project', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
        });
      }
    };

    performSilentSave();
  }, [triggerSilentSave, user, currentProjectId, handleSaveToCloud, exportData, projectName, projectDescription, setTriggerSilentSave]);

  // This component doesn't render anything - it just handles the side effect
  return null;
}
