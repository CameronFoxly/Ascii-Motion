import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import { useToolStore } from '../stores/toolStore';
import type { Cell } from '../types';

/**
 * Session Import Utility
 * Handles loading and restoring session data from .asciimtn files
 */
export class SessionImporter {
  
  /**
   * Import session data from a JSON file
   */
  static async importSessionFile(file: File): Promise<void> {
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
          SessionImporter.restoreSessionData(sessionData);
          
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
  private static restoreSessionData(sessionData: any): void {
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
      // Get current animation state
      const currentState = useAnimationStore.getState();
      
      // Remove all existing frames except the first one (can't remove last frame)
      while (currentState.frames.length > 1) {
        animationStore.removeFrame(currentState.frames.length - 1);
      }
      
      // Clear the first frame and restore session frames
      sessionData.animation.frames.forEach((frameData: any, index: number) => {
        // Convert frame data object back to Map
        const frameMap = new Map<string, Cell>();
        if (frameData.data && typeof frameData.data === 'object') {
          Object.entries(frameData.data).forEach(([key, cellData]) => {
            if (cellData && typeof cellData === 'object') {
              frameMap.set(key, cellData as Cell);
            }
          });
        }
        
        if (index === 0) {
          // Update the first existing frame
          animationStore.setFrameData(0, frameMap);
          if (frameData.name) {
            animationStore.updateFrameName(0, frameData.name);
          }
          if (frameData.duration !== undefined) {
            animationStore.updateFrameDuration(0, frameData.duration);
          }
        } else {
          // Add new frames
          animationStore.addFrame(undefined, frameMap);
          // Update the newly added frame's properties
          const newFrameIndex = useAnimationStore.getState().frames.length - 1;
          if (frameData.name) {
            animationStore.updateFrameName(newFrameIndex, frameData.name);
          }
          if (frameData.duration !== undefined) {
            animationStore.updateFrameDuration(newFrameIndex, frameData.duration);
          }
        }
      });
      
      // Set current frame
      if (sessionData.animation.currentFrameIndex >= 0 && 
          sessionData.animation.currentFrameIndex < sessionData.animation.frames.length) {
        animationStore.setCurrentFrame(sessionData.animation.currentFrameIndex);
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
    
    console.log('Session imported successfully');
  }
}

/**
 * Hook for session import functionality
 */
export const useSessionImporter = () => {
  const importSession = async (file: File): Promise<void> => {
    try {
      await SessionImporter.importSessionFile(file);
    } catch (error) {
      console.error('Session import failed:', error);
      throw error;
    }
  };
  
  return { importSession };
};