/**
 * ASCII Motion - PREMIUM FEATURE
 * Cloud Project Actions Hook
 * 
 * Handles save to cloud and load from cloud operations
 * Simplified version using session export/import
 * 
 * @premium This hook uses premium cloud storage features
 * @requires @ascii-motion/premium package
 * 
 * Architecture Note:
 * - Integration Hook: Lives in main app to bridge app state with premium features
 * - Uses: useCloudProject from @ascii-motion/premium for storage operations
 * - Converts between app's ExportDataBundle and premium's SessionData format
 */

import { useCallback, useState } from 'react';
import { useCloudProject } from '@ascii-motion/premium';
import type { SessionData } from '@ascii-motion/premium';
import type { ExportDataBundle } from '../types/export';
import { saveAs } from 'file-saver';
import { useSessionImporter } from '../utils/sessionImporter';
import { useProjectMetadataStore } from '../stores/projectMetadataStore';

export function useCloudProjectActions() {
  const { currentProjectId, setCurrentProjectId } = useProjectMetadataStore();
  const [showProjectsDialog, setShowProjectsDialog] = useState(false);

  const { saveToCloud } = useCloudProject();
  const { importSession } = useSessionImporter();

  /**
   * Convert export data to SessionData format
   */
  const createSessionData = useCallback((data: ExportDataBundle): SessionData => {
    return {
      version: '1.0.0',
      name: data.name,
      description: data.description,
      metadata: {
        exportedAt: new Date().toISOString(),
        exportVersion: '1.0.0',
      },
      canvas: {
        width: data.canvasDimensions.width,
        height: data.canvasDimensions.height,
        canvasBackgroundColor: data.canvasBackgroundColor,
        showGrid: data.showGrid,
      },
      animation: {
        frames: data.frames.map((frame) => ({
          id: frame.id,
          name: frame.name,
          duration: frame.duration,
          data: Object.fromEntries(frame.data.entries()),
        })),
        currentFrameIndex: data.currentFrameIndex,
        frameRate: data.frameRate,
        looping: data.looping,
      },
      tools: {
        activeTool: data.toolState.activeTool,
        selectedCharacter: data.toolState.selectedCharacter,
        selectedColor: data.toolState.selectedColor,
        selectedBgColor: data.toolState.selectedBgColor,
        paintBucketContiguous: data.toolState.paintBucketContiguous,
        rectangleFilled: data.toolState.rectangleFilled,
      },
      ui: {
        theme: data.uiState.theme,
        zoom: data.uiState.zoom,
        panOffset: data.uiState.panOffset,
        fontMetrics: data.fontMetrics,
      },
      typography: {
        fontSize: data.typography.fontSize,
        characterSpacing: data.typography.characterSpacing,
        lineSpacing: data.typography.lineSpacing,
      },
      palettes: data.paletteState,
      characterPalettes: data.characterPaletteState,
    };
  }, []);

  /**
   * Save current project to cloud
   */
  const handleSaveToCloud = useCallback(
    async (exportData: ExportDataBundle, projectName?: string, description?: string, forceNew?: boolean) => {
      try {
        // Create session data from current state
        const sessionData = createSessionData(exportData);

        // Save to cloud
        // If forceNew is true, don't pass projectId to create a new project
        const project = await saveToCloud(sessionData, {
          name: projectName || exportData.name || 'Untitled Project',
          description,
          projectId: forceNew ? undefined : (currentProjectId || undefined),
        });

        if (project) {
          setCurrentProjectId(project.id);
          return project;
        } else {
          console.error('[CloudActions] Save returned null');
        }
      } catch (err) {
        console.error('[CloudActions] Save failed:', err);
      }
      return null;
    },
    [saveToCloud, currentProjectId, createSessionData, setCurrentProjectId]
  );

  /**
   * Load project from cloud and restore state
   * Creates a File object and uses existing importSession
   */
  const handleLoadFromCloud = useCallback(
    async (projectId: string, sessionData: unknown) => {
      try {
        // Create a blob from the session data
        const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
          type: 'application/json',
        });

        // Create a File object
        const file = new File([blob], 'cloud-project.asciimtn', {
          type: 'application/json',
        });

        // Use existing session importer
        await importSession(file);

        // Update current project tracking
        setCurrentProjectId(projectId);
      } catch (err) {
        console.error('[CloudActions] Load failed:', err);
        throw err;
      }
    },
    [importSession, setCurrentProjectId]
  );

  /**
   * Download cloud project as .asciimtn file
   * Uses the same export format as local session export for consistency
   */
  const handleDownloadProject = useCallback(
    async (_projectId: string, projectName: string, sessionData: unknown) => {
      try {
        const typedSessionData = sessionData as SessionData;
        
        // Use the same export structure as exportRenderer.exportSession
        // This ensures consistency between local exports and cloud downloads
        const exportData = {
          version: '1.0.0',
          name: typedSessionData.name || projectName,
          description: typedSessionData.description,
          metadata: typedSessionData.metadata,
          canvas: typedSessionData.canvas,
          animation: typedSessionData.animation,
          tools: typedSessionData.tools,
          ui: typedSessionData.ui,
          typography: typedSessionData.typography,
          palettes: typedSessionData.palettes,
          characterPalettes: typedSessionData.characterPalettes,
        };
        
        // Create blob and download with consistent formatting
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        });
        saveAs(blob, `${projectName}.asciimtn`);
      } catch (err) {
        console.error('[CloudActions] Download failed:', err);
      }
    },
    []
  );

  /**
   * Open the projects dialog
   */
  const openProjectsDialog = useCallback(() => {
    setShowProjectsDialog(true);
  }, []);
  
  /**
   * Clear current project tracking (for New Project action)
   */
  const clearCurrentProject = useCallback(() => {
    setCurrentProjectId(null);
  }, [setCurrentProjectId]);

  return {
    // State
    currentProjectId,
    showProjectsDialog,
    setShowProjectsDialog,

    // Actions
    handleSaveToCloud,
    handleLoadFromCloud,
    handleDownloadProject,
    openProjectsDialog,
    clearCurrentProject,
  };
}
