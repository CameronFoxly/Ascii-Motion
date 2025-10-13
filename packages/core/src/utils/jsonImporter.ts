import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import type { Cell } from '../types';
import { DEFAULT_FRAME_DURATION } from '../constants';
import type { TypographySettings } from './canvasSizeConversion';

type JsonFrameContent = string | string[];

type JsonFrameColorsValue = Record<string, string> | string | undefined;

interface JsonFrameColors {
  foreground?: Record<string, string> | string;
  background?: Record<string, string> | string;
}

interface JsonImportFrame {
  title: string;
  duration: number;
  content?: JsonFrameContent;
  contentString?: string;
  colors?: JsonFrameColors;
}

interface JsonImportAnimation {
  frameRate?: number;
  looping?: boolean;
  currentFrame?: number;
}

interface JsonImportData {
  canvas: {
    width: number;
    height: number;
    backgroundColor?: string;
  };
  typography?: TypographySettings;
  frames: JsonImportFrame[];
  animation?: JsonImportAnimation;
}

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
          const jsonData = JSON.parse(content) as unknown;
          
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
  private static validateJsonData(data: unknown): data is JsonImportData {
    try {
      if (typeof data !== 'object' || data === null) {
        return false;
      }

      const candidate = data as Partial<JsonImportData> & Record<string, unknown>;
      const { canvas, frames, typography } = candidate;

      if (!canvas || typeof canvas !== 'object') {
        return false;
      }

      const canvasSettings = canvas as JsonImportData['canvas'];
      if (typeof canvasSettings.width !== 'number' || typeof canvasSettings.height !== 'number') {
        return false;
      }

      if (!Array.isArray(frames)) {
        return false;
      }

      if (typography) {
        const typographySettings = typography as TypographySettings;
        if (typeof typographySettings.fontSize !== 'number') return false;
        if (typeof typographySettings.characterSpacing !== 'number') return false;
        if (typeof typographySettings.lineSpacing !== 'number') return false;
      }

      for (const frame of frames) {
        if (typeof frame !== 'object' || frame === null) {
          return false;
        }

        const frameCandidate = frame as Partial<JsonImportFrame>;

        if (typeof frameCandidate.title !== 'string') return false;
        if (typeof frameCandidate.duration !== 'number') return false;

        const contentField = frameCandidate.content ?? frameCandidate.contentString;
        const isStringContent = typeof contentField === 'string';
        const isArrayContent = Array.isArray(contentField) && contentField.every((line: unknown) => typeof line === 'string');

        if (!isStringContent && !isArrayContent) {
          return false;
        }

        if (frameCandidate.colors !== undefined) {
          if (typeof frameCandidate.colors !== 'object' || frameCandidate.colors === null) {
            return false;
          }

          const { foreground, background } = frameCandidate.colors as JsonFrameColors;

          if (
            foreground !== undefined &&
            typeof foreground !== 'string' &&
            (typeof foreground !== 'object' || foreground === null)
          ) {
            return false;
          }

          if (
            background !== undefined &&
            typeof background !== 'string' &&
            (typeof background !== 'object' || background === null)
          ) {
            return false;
          }
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
    jsonData: JsonImportData, 
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
      const importedFrames = jsonData.frames.map((frameData, index) => {
        // Parse the text content into cells
        const contentField = frameData.content ?? frameData.contentString;
        const lines: string[] = Array.isArray(contentField)
          ? contentField
          : typeof contentField === 'string'
            ? contentField.split('\n')
            : [];

        const parseColorMap = (input: JsonFrameColorsValue): Record<string, string> => {
          if (!input) return {};
          if (typeof input === 'string') {
            try {
              const parsed = JSON.parse(input);
              return typeof parsed === 'object' && parsed !== null
                ? parsed as Record<string, string>
                : {};
            } catch {
              return {};
            }
          }
          if (typeof input === 'object' && input !== null) {
            return input as Record<string, string>;
          }
          return {};
        };

  const foregroundMap = parseColorMap(frameData.colors?.foreground);
  const backgroundMap = parseColorMap(frameData.colors?.background);

        const frameMap = new Map<string, Cell>();
        
        lines.forEach((line: string, y: number) => {
          [...line].forEach((character: string, x: number) => {
            if (character !== ' ' && character !== '') {
              const cellKey = `${x},${y}`;
              
              // Start with default colors
              let foregroundColor = '#FFFFFF';
              let backgroundColor = 'transparent';
              
              // Apply colors from color data
              if (foregroundMap[cellKey]) {
                foregroundColor = foregroundMap[cellKey];
              }
              if (backgroundMap[cellKey]) {
                backgroundColor = backgroundMap[cellKey];
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