import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import { useToolStore } from '../stores/toolStore';
import { usePaletteStore } from '../stores/paletteStore';
import { useCharacterPaletteStore } from '../stores/characterPaletteStore';
import type { Cell } from '../types';
import { DEFAULT_FRAME_DURATION } from '../constants';

/**
 * Session Import Utility
 * Handles loading and restoring session data from .asciimtn files
 */
export class SessionImporter {
  
  /**
   * Import session data from a JSON file
   */
  static async importSessionFile(
    file: File, 
    typographyCallbacks?: {
      setFontSize: (size: number) => void;
      setCharacterSpacing: (spacing: number) => void;
      setLineSpacing: (spacing: number) => void;
    }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const sessionData = JSON.parse(content);
          
          // Validate session data structure
          if (!SessionImporter.validateSessionData(sessionData)) {
            throw new Error('Invalid session file format');
          }
          
          // Import the session data
          SessionImporter.restoreSessionData(sessionData, typographyCallbacks);
          
          resolve();
        } catch (error) {
          reject(new Error(`Failed to import session: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }
  
  /**
   * Validate session data structure
   */
  private static validateSessionData(data: any): boolean {
    try {
      // Check required top-level properties
      if (!data || typeof data !== 'object') return false;
      if (!data.version) return false;
      if (!data.canvas || typeof data.canvas !== 'object') return false;
      if (!data.animation || typeof data.animation !== 'object') return false;
      if (!data.tools || typeof data.tools !== 'object') return false;
      
      // Check canvas properties
      if (typeof data.canvas.width !== 'number' || typeof data.canvas.height !== 'number') return false;
      
      // Check animation properties
      if (!Array.isArray(data.animation.frames)) return false;
      if (typeof data.animation.currentFrameIndex !== 'number') return false;
      
      // Check tools properties
      if (!data.tools.activeTool || !data.tools.selectedColor) return false;
      
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Restore session data to application stores
   */
  private static restoreSessionData(
    sessionData: any, 
    typographyCallbacks?: {
      setFontSize: (size: number) => void;
      setCharacterSpacing: (spacing: number) => void;
      setLineSpacing: (spacing: number) => void;
    }
  ): void {
    const canvasStore = useCanvasStore.getState();
    const animationStore = useAnimationStore.getState();
    const toolStore = useToolStore.getState();
    const paletteStore = usePaletteStore.getState();
    const characterPaletteStore = useCharacterPaletteStore.getState();
    
    // Restore canvas data
    canvasStore.setCanvasSize(sessionData.canvas.width, sessionData.canvas.height);
    canvasStore.setCanvasBackgroundColor(sessionData.canvas.canvasBackgroundColor);
    
    if (sessionData.canvas.showGrid !== undefined) {
      if (sessionData.canvas.showGrid !== canvasStore.showGrid) {
        canvasStore.toggleGrid();
      }
    }
    
    // Clear current canvas
    canvasStore.clearCanvas();
    
    // Restore animation frames
    if (sessionData.animation.frames && sessionData.animation.frames.length > 0) {
      // Convert session frame data preserving ALL original properties
      const importedFrames = sessionData.animation.frames.map((frameData: any) => {
        // Convert frame data object back to Map
        const frameMap = new Map<string, Cell>();
        if (frameData.data && typeof frameData.data === 'object') {
          Object.entries(frameData.data).forEach(([key, cellData]) => {
            if (cellData && typeof cellData === 'object') {
              frameMap.set(key, cellData as Cell);
            }
          });
        }
        
        // Preserve ALL original frame properties from the export
        return {
          id: frameData.id, // Preserve original frame ID
          name: frameData.name || 'Untitled Frame', // Preserve original name
          duration: frameData.duration || DEFAULT_FRAME_DURATION,
          data: frameMap,
          thumbnail: frameData.thumbnail // Preserve thumbnail if exists
        };
      });
      
      // Use the new session-specific import method that preserves all frame properties
      // This is the most reliable way to ensure exact frame order preservation
      animationStore.importSessionFrames(importedFrames);
      
      // Set animation properties
      if (sessionData.animation.frameRate !== undefined) {
        animationStore.setFrameRate(sessionData.animation.frameRate);
      }
      if (sessionData.animation.looping !== undefined) {
        animationStore.setLooping(sessionData.animation.looping);
      }
      
      // Always start at the first frame (index 0) when importing
      // This ensures the user sees frame 1 content, not the original currentFrameIndex content
      animationStore.setCurrentFrame(0);
      
      // Load the first frame's data into the canvas
      const animationState = useAnimationStore.getState();
      const firstFrame = animationState.frames[0];
      if (firstFrame && firstFrame.data) {
        canvasStore.clearCanvas();
        firstFrame.data.forEach((cell, key) => {
          const [x, y] = key.split(',').map(Number);
          canvasStore.setCell(x, y, cell as Cell);
        });
      }
    }
    
    // Restore tool state
    if (sessionData.tools.activeTool) {
      toolStore.setActiveTool(sessionData.tools.activeTool);
    }
    if (sessionData.tools.selectedColor) {
      toolStore.setSelectedColor(sessionData.tools.selectedColor);
    }
    if (sessionData.tools.selectedBgColor) {
      toolStore.setSelectedBgColor(sessionData.tools.selectedBgColor);
    }
    if (sessionData.tools.selectedCharacter) {
      toolStore.setSelectedChar(sessionData.tools.selectedCharacter);
    }
    if (sessionData.tools.rectangleFilled !== undefined) {
      toolStore.setRectangleFilled(sessionData.tools.rectangleFilled);
    }

    // Restore palette data
    if (sessionData.palettes) {
      paletteStore.loadSessionPalettes({
        customPalettes: Array.isArray(sessionData.palettes.customPalettes) ? sessionData.palettes.customPalettes : [],
        activePaletteId: sessionData.palettes.activePaletteId,
        recentColors: sessionData.palettes.recentColors
      });
    }

    if (sessionData.characterPalettes) {
      characterPaletteStore.loadSessionCharacterPalettes({
        customPalettes: Array.isArray(sessionData.characterPalettes.customPalettes) ? sessionData.characterPalettes.customPalettes : [],
        activePaletteId: sessionData.characterPalettes.activePaletteId,
        mappingMethod: sessionData.characterPalettes.mappingMethod,
        invertDensity: sessionData.characterPalettes.invertDensity,
        characterSpacing: sessionData.characterPalettes.characterSpacing
      });
    }
    
    // Restore typography settings
    if (typographyCallbacks && sessionData.typography) {
      if (sessionData.typography.fontSize !== undefined) {
        typographyCallbacks.setFontSize(sessionData.typography.fontSize);
      }
      if (sessionData.typography.characterSpacing !== undefined) {
        typographyCallbacks.setCharacterSpacing(sessionData.typography.characterSpacing);
      }
      if (sessionData.typography.lineSpacing !== undefined) {
        typographyCallbacks.setLineSpacing(sessionData.typography.lineSpacing);
      }
    }
  }
}

/**
 * Hook for session import functionality
 */
export const useSessionImporter = () => {
  const importSession = async (
    file: File, 
    typographyCallbacks?: {
      setFontSize: (size: number) => void;
      setCharacterSpacing: (spacing: number) => void;
      setLineSpacing: (spacing: number) => void;
    }
  ): Promise<void> => {
    try {
      await SessionImporter.importSessionFile(file, typographyCallbacks);
    } catch (error) {
      console.error('Session import failed:', error);
      throw error;
    }
  };
  
  return { importSession };
};