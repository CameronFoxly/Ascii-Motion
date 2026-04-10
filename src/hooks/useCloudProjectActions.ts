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
import { useCloudProject, supabase } from '@ascii-motion/premium';
import { generatePreview, uploadPreviewImage, getFontStack } from '@ascii-motion/premium';
import type { SessionData } from '@ascii-motion/premium';
import type { ExportDataBundle } from '../types/export';
import { saveAs } from 'file-saver';
import { useSessionImporter } from '../utils/sessionImporter';
import { useProjectMetadataStore } from '../stores/projectMetadataStore';

export function useCloudProjectActions() {
  const { currentProjectId, setCurrentProjectId } = useProjectMetadataStore();
  const [showProjectsDialog, setShowProjectsDialog] = useState(false);
  const [projectsRefreshTrigger, setProjectsRefreshTrigger] = useState(0);

  const { saveToCloud, saveProgress, saveProgressMessage } = useCloudProject();
  const { importSession } = useSessionImporter();

  /**
   * Convert export data to SessionData format.
   * Uses v2 format (with layers) when sessionDataV2 is available.
   * Falls back to v1 format for legacy projects without layers.
   */
  const createSessionData = useCallback((data: ExportDataBundle): SessionData => {
    if (data.sessionDataV2) {
      // V2 format: preserve full layer structure + include pre-composited frames.
      //
      // sessionDataV2 contains canvas/timeline/layers from getSessionData().
      // data.frames contains composited flat frames from ExportDataCollector
      // (generated via compositeLayersAtFrame with full transform support).
      //
      // The composited animation.frames[] is a READ-ONLY playback cache used by
      // the community gallery. The raw layers[] / timeline are used for re-editing.
      return {
        ...data.sessionDataV2,
        name: data.name,
        description: data.description,
        metadata: {
          exportedAt: new Date().toISOString(),
          exportVersion: '2.1.0',
        },
        // Pre-composited frames for gallery playback and publishing previews.
        // These are regenerated every save from the layer data.
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
          selectedFontId: data.typography.selectedFontId,
        },
        palettes: data.paletteState,
        characterPalettes: data.characterPaletteState,
      } as unknown as SessionData; // SessionData type from premium needs v2 awareness
    }

    // V1 format: flat frames (legacy)
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
        selectedFontId: data.typography.selectedFontId,
      },
      palettes: data.paletteState,
      characterPalettes: data.characterPaletteState,
    };
  }, []);

  /**
   * Check if a project is currently published
   */
  const checkIfPublished = useCallback(
    async (projectId: string): Promise<boolean> => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('is_published')
          .eq('id', projectId)
          .single();

        if (error) {
          console.error('[CloudActions] Error checking publish status:', error);
          return false;
        }

        return (data as { is_published: boolean } | null)?.is_published || false;
      } catch (err) {
        console.error('[CloudActions] Failed to check publish status:', err);
        return false;
      }
    },
    []
  );

  /**
   * Save current project to cloud
   */
  const handleSaveToCloud = useCallback(
    async (exportData: ExportDataBundle, projectName?: string, description?: string, forceNew?: boolean) => {
      try {
        // Create session data from current state
        const sessionData = createSessionData(exportData);

        // Check if updating an existing published project
        const isUpdatingPublished = !forceNew && currentProjectId && await checkIfPublished(currentProjectId);

        // Save to cloud
        // If forceNew is true, don't pass projectId to create a new project
        const project = await saveToCloud(sessionData, {
          name: projectName || exportData.name || 'Untitled Project',
          description,
          projectId: forceNew ? undefined : (currentProjectId || undefined),
        });

        if (project) {
          setCurrentProjectId(project.id);

          // If we're updating a published project, regenerate preview images
          if (isUpdatingPublished) {
            console.log('[CloudActions] Regenerating preview image for published project');
            try {
              // Get current frame from composited animation frames
              const frameIndex = exportData.currentFrameIndex || 0;
              const frames = sessionData.animation?.frames;
              const frame = frames?.[frameIndex];
              
              if (!frame) {
                throw new Error('Selected frame not found');
              }

              // Generate new preview only (no thumbnail to save storage)
              const preview = await generatePreview(
                [frame],
                {
                  frameIndex: 0,
                  width: sessionData.canvas.width,
                  height: sessionData.canvas.height,
                  backgroundColor: sessionData.canvas.canvasBackgroundColor,
                  fontSize: sessionData.typography?.fontSize || 16,
                  fontFamily: getFontStack(sessionData.typography?.selectedFontId),
                  postEffectTracks: (sessionData as any).postEffectTracks,
                  timelineFrameIndex: frameIndex,
                }
              );

              // Upload new preview
              const uploadResult = await uploadPreviewImage(
                project.id,
                preview.blob
              );

              // Add cache-busting timestamp to URL to force browser/CDN refresh
              const timestamp = Date.now();
              const previewUrlWithCache = `${uploadResult.url}?v=${timestamp}`;

              // Update project with new preview URL (name and description already updated by saveToCloud above)
              console.log('[CloudActions] Updating preview image for published project:', project.id);
              
              const { error: updateError } = await supabase
                .from('projects')
                .update({
                  preview_image_url: previewUrlWithCache,
                } as never) // Type assertion to bypass Supabase type inference
                .eq('id', project.id);

              if (updateError) {
                console.error('[CloudActions] Failed to update preview image:', updateError);
              } else {
                console.log('[CloudActions] Preview image updated successfully for published project');
              }
            } catch (previewError) {
              console.error('[CloudActions] Failed to regenerate preview image:', previewError);
              // Don't fail the whole save if preview regeneration fails
            }
          }

          // Trigger project list refresh
          setProjectsRefreshTrigger(prev => prev + 1);

          return project;
        } else {
          console.error('[CloudActions] Save returned null');
        }
      } catch (err) {
        console.error('[CloudActions] Save failed:', err);
      }
      return null;
    },
    [saveToCloud, currentProjectId, createSessionData, setCurrentProjectId, checkIfPublished]
  );

  /**
   * Load project from cloud and restore state
   * Creates a File object and uses existing importSession
   */
  const handleLoadFromCloud = useCallback(
    async (
      projectId: string, 
      sessionData: unknown,
      typographyCallbacks?: {
        setFontSize: (size: number) => void;
        setCharacterSpacing: (spacing: number) => void;
        setLineSpacing: (spacing: number) => void;
        setSelectedFontId?: (fontId: string) => void;
      }
    ) => {
      try {
        console.log('[CloudActions] Loading project, sessionData type:', typeof sessionData);
        console.log('[CloudActions] sessionData sample:', sessionData);
        
        // Create a blob from the session data
        const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
          type: 'application/json',
        });

        // Create a File object
        const file = new File([blob], 'cloud-project.asciimtn', {
          type: 'application/json',
        });

        // Use existing session importer with typography callbacks if provided
        await importSession(file, typographyCallbacks);

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
   * Preserves the original format (v1 or v2) from cloud storage
   */
  const handleDownloadProject = useCallback(
    async (_projectId: string, projectName: string, sessionData: unknown) => {
      try {
        // Pass through the session data as-is — it may be v1 or v2 format
        // The version field is already set correctly from cloud storage
        const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
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
    projectsRefreshTrigger, // Export trigger for project list refresh
    saveProgress, // Progress tracking for save operations
    saveProgressMessage, // Progress message for save operations

    // Actions
    handleSaveToCloud,
    handleLoadFromCloud,
    handleDownloadProject,
    openProjectsDialog,
    clearCurrentProject,
    checkIfPublished,
  };
}
