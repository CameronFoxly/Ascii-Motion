import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import type { Cell } from '../types';
import { DEFAULT_FRAME_DURATION } from '../constants';

/**
 * JSON Import Utility
 * Handles loading and restoring data from human-readable JSON files exported by ASCII Motion
 */
export class JsonImporter {
  
  /**
   * Import project data from a JSON file
   */
  static async importJsonFile(
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
          const jsonData = JSON.parse(content);
          
          // Validate JSON data structure
          if (!JsonImporter.validateJsonData(jsonData)) {
            throw new Error('Invalid JSON file format or structure');
          }
          
          // Import the JSON data
          JsonImporter.restoreJsonData(jsonData, typographyCallbacks);
          
          resolve();
        } catch (error) {
          reject(new Error(`Failed to import JSON: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }
  
    /**
   * Validate JSON data structure for the new text-based format
   */
  private static validateJsonData(data: any): boolean {
    try {
      // Check top-level structure
      if (typeof data !== 'object' || data === null) return false;
      if (!data.canvas || typeof data.canvas !== 'object') return false;
      if (!data.frames || !Array.isArray(data.frames)) return false;
      
      // Validate canvas settings
      if (typeof data.canvas.width !== 'number' || typeof data.canvas.height !== 'number') return false;
      
      // Validate typography (optional)
      if (data.typography) {
        if (typeof data.typography.fontSize !== 'number') return false;
        if (typeof data.typography.characterSpacing !== 'number') return false;
        if (typeof data.typography.lineSpacing !== 'number') return false;
      }
      
      // Validate frames
      for (const frame of data.frames) {
        if (typeof frame !== 'object' || frame === null) return false;
        if (typeof frame.title !== 'string') return false;
        if (typeof frame.duration !== 'number') return false;
        if (typeof frame.content !== 'string') return false;
        
        // Validate colors (optional)
        if (frame.colors) {
          if (typeof frame.colors !== 'object') return false;
          if (frame.colors.foreground && typeof frame.colors.foreground !== 'object') return false;
          if (frame.colors.background && typeof frame.colors.background !== 'object') return false;
        }
      }
      
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Restore JSON data to application stores for text-based format
   */
  private static restoreJsonData(
    jsonData: any, 
    typographyCallbacks?: {
      setFontSize: (size: number) => void;
      setCharacterSpacing: (spacing: number) => void;
      setLineSpacing: (spacing: number) => void;
    }
  ): void {
    const canvasStore = useCanvasStore.getState();
    const animationStore = useAnimationStore.getState();
    
    // Restore canvas settings
    canvasStore.setCanvasSize(jsonData.canvas.width, jsonData.canvas.height);
    if (jsonData.canvas.backgroundColor) {
      canvasStore.setCanvasBackgroundColor(jsonData.canvas.backgroundColor);
    }
    
    // Clear current canvas
    canvasStore.clearCanvas();
    
    // Restore typography settings if available
    if (jsonData.typography && typographyCallbacks) {
      if (jsonData.typography.fontSize) {
        typographyCallbacks.setFontSize(jsonData.typography.fontSize);
      }
      if (jsonData.typography.characterSpacing !== undefined) {
        typographyCallbacks.setCharacterSpacing(jsonData.typography.characterSpacing);
      }
      if (jsonData.typography.lineSpacing !== undefined) {
        typographyCallbacks.setLineSpacing(jsonData.typography.lineSpacing);
      }
    }
    
    // Process frames from text content
    if (jsonData.frames && jsonData.frames.length > 0) {
      // Convert text-based frames to internal format
      const importedFrames = jsonData.frames.map((frameData: any, index: number) => {
        // Parse the text content into cells
        const lines = frameData.content.split('\n');
        const frameMap = new Map<string, Cell>();
        
        lines.forEach((line: string, y: number) => {
          [...line].forEach((character: string, x: number) => {
            if (character !== ' ' && character !== '') {
              const cellKey = `${x},${y}`;
              
              // Start with default colors
              let foregroundColor = '#FFFFFF';
              let backgroundColor = 'transparent';
              
              // Apply colors from color data
              if (frameData.colors?.foreground?.[cellKey]) {
                foregroundColor = frameData.colors.foreground[cellKey];
              }
              if (frameData.colors?.background?.[cellKey]) {
                backgroundColor = frameData.colors.background[cellKey];
              }
              
              frameMap.set(cellKey, {
                char: character,
                color: foregroundColor,
                bgColor: backgroundColor
              });
            }
          });
        });
        
        return {
          id: `frame-${index}`,
          name: frameData.title || `Frame ${index}`,
          duration: frameData.duration || DEFAULT_FRAME_DURATION,
          data: frameMap
        };
      });
      
      // Import the frames using the session import method
      animationStore.importSessionFrames(importedFrames);
      
      // Restore animation settings
      if (jsonData.animation) {
        if (jsonData.animation.frameRate) {
          animationStore.setFrameRate(jsonData.animation.frameRate);
        }
        if (jsonData.animation.looping !== undefined) {
          animationStore.setLooping(jsonData.animation.looping);
        }
        if (jsonData.animation.currentFrame !== undefined) {
          animationStore.setCurrentFrame(jsonData.animation.currentFrame);
        } else {
          animationStore.setCurrentFrame(0);
        }
      } else {
        // Default to first frame
        animationStore.setCurrentFrame(0);
      }
      
      // Load the current frame's data into the canvas
      const animationState = useAnimationStore.getState();
      const currentFrameIndex = animationState.currentFrameIndex;
      const currentFrame = animationState.frames[currentFrameIndex];
      if (currentFrame && currentFrame.data) {
        canvasStore.clearCanvas();
        currentFrame.data.forEach((cell, key) => {
          const [x, y] = key.split(',').map(Number);
          canvasStore.setCell(x, y, cell);
        });
      }
    }
    
    console.log(`Imported ${jsonData.frames.length} frames from JSON (text-based format)`);
  }
}

/**
 * Hook for JSON import functionality
 */
export const useJsonImporter = () => {
  const importJson = async (
    file: File, 
    typographyCallbacks?: {
      setFontSize: (size: number) => void;
      setCharacterSpacing: (spacing: number) => void;
      setLineSpacing: (spacing: number) => void;
    }
  ): Promise<void> => {
    try {
      await JsonImporter.importJsonFile(file, typographyCallbacks);
    } catch (error) {
      console.error('JSON import failed:', error);
      throw error;
    }
  };
  
  return { importJson };
};