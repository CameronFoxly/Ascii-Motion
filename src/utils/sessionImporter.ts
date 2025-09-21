import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import { useToolStore } from '../stores/toolStore';
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
      // Convert session frame data to the format expected by the animation store
      const importFrameData = sessionData.animation.frames.map((frameData: any) => {
        // Convert frame data object back to Map
        const frameMap = new Map<string, Cell>();
        if (frameData.data && typeof frameData.data === 'object') {
          Object.entries(frameData.data).forEach(([key, cellData]) => {
            if (cellData && typeof cellData === 'object') {
              frameMap.set(key, cellData as Cell);
            }
          });
        }
        
        return {
          data: frameMap,
          duration: frameData.duration || DEFAULT_FRAME_DURATION
        };
      });
      
      // Use the bulk import method to replace all frames at once
      // This preserves the exact order from the export file
      animationStore.importFramesOverwrite(importFrameData, 0);
      
      // Update frame names to match the original export
      sessionData.animation.frames.forEach((frameData: any, index: number) => {
        if (frameData.name) {
          animationStore.updateFrameName(index, frameData.name);
        }
      });
      
      // Set animation properties
      if (sessionData.animation.frameRate !== undefined) {
        animationStore.setFrameRate(sessionData.animation.frameRate);
      }
      if (sessionData.animation.looping !== undefined) {
        animationStore.setLooping(sessionData.animation.looping);
      }
      
      // Set current frame and load its data into canvas
      if (sessionData.animation.currentFrameIndex >= 0 && 
          sessionData.animation.currentFrameIndex < sessionData.animation.frames.length) {
        animationStore.setCurrentFrame(sessionData.animation.currentFrameIndex);
        
        // Load the current frame's data into the canvas from the animation store
        const animationState = useAnimationStore.getState();
        const currentFrame = animationState.frames[animationState.currentFrameIndex];
        if (currentFrame && currentFrame.data) {
          canvasStore.clearCanvas();
          currentFrame.data.forEach((cell, key) => {
            const [x, y] = key.split(',').map(Number);
            canvasStore.setCell(x, y, cell as Cell);
          });
        }
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
    
    console.log('Session imported successfully');
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