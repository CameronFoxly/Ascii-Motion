import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import { useToolStore } from '../stores/toolStore';
import { usePaletteStore } from '../stores/paletteStore';
import { useCharacterPaletteStore } from '../stores/characterPaletteStore';
import { useProjectMetadataStore } from '../stores/projectMetadataStore';
import type { Cell, Tool } from '../types';
import { DEFAULT_FRAME_DURATION } from '../constants';
import type { TypographySettings } from './canvasSizeConversion';
import type { ColorPalette, CharacterPalette, CharacterMappingSettings } from '../types/palette';
import { isColorPalette, isCharacterPalette } from '../types/palette';

type SessionFrameCells = Record<string, Cell>;

interface SessionFrameData {
  id: string;
  name?: string;
  duration?: number;
  data?: SessionFrameCells;
  thumbnail?: string;
}

interface SessionCanvasData {
  width: number;
  height: number;
  canvasBackgroundColor: string;
  showGrid?: boolean;
}

interface SessionAnimationData {
  frames: SessionFrameData[];
  currentFrameIndex: number;
  frameRate?: number;
  looping?: boolean;
}

interface SessionToolsData {
  activeTool: Tool;
  selectedColor: string;
  selectedBgColor?: string;
  selectedCharacter?: string;
  rectangleFilled?: boolean;
}

interface SessionPalettesData {
  activePaletteId: string;
  customPalettes: ColorPalette[];
  recentColors: string[];
}

interface SessionCharacterPalettesData {
  activePaletteId: string;
  customPalettes: CharacterPalette[];
  mappingMethod: CharacterMappingSettings['mappingMethod'];
  invertDensity: boolean;
  characterSpacing: number;
}

interface SessionImportData {
  version: string;
  name?: string;
  description?: string;
  canvas: SessionCanvasData;
  animation: SessionAnimationData;
  tools: SessionToolsData;
  typography?: TypographySettings;
  palettes?: SessionPalettesData;
  characterPalettes?: SessionCharacterPalettesData;
}

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
      setSelectedFontId?: (fontId: string) => void;
    }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const sessionData = JSON.parse(content) as unknown;
          
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
  private static validateSessionData(data: unknown): data is SessionImportData {
    try {
      if (typeof data !== 'object' || data === null) {
        return false;
      }

      const candidate = data as Partial<SessionImportData> & Record<string, unknown>;

      if (typeof candidate.version !== 'string') {
        return false;
      }

      const canvas = candidate.canvas;
      if (!canvas || typeof canvas !== 'object') {
        return false;
      }
      const canvasData = canvas as SessionCanvasData;
      if (typeof canvasData.width !== 'number' || typeof canvasData.height !== 'number') return false;
      if (typeof canvasData.canvasBackgroundColor !== 'string') return false;
      if (canvasData.showGrid !== undefined && typeof canvasData.showGrid !== 'boolean') return false;

      const animation = candidate.animation;
      if (!animation || typeof animation !== 'object') {
        return false;
      }
      const animationData = animation as SessionAnimationData;
      if (!Array.isArray(animationData.frames)) return false;
      if (typeof animationData.currentFrameIndex !== 'number') return false;
      if (animationData.frameRate !== undefined && typeof animationData.frameRate !== 'number') return false;
      if (animationData.looping !== undefined && typeof animationData.looping !== 'boolean') return false;

      for (const frame of animationData.frames) {
        if (typeof frame !== 'object' || frame === null) {
          return false;
        }

        const frameCandidate = frame as SessionFrameData & Record<string, unknown>;
        if (typeof frameCandidate.id !== 'string') return false;
        if (frameCandidate.name !== undefined && typeof frameCandidate.name !== 'string') return false;
        if (frameCandidate.duration !== undefined && typeof frameCandidate.duration !== 'number') return false;
        if (frameCandidate.thumbnail !== undefined && typeof frameCandidate.thumbnail !== 'string') return false;
        if (frameCandidate.data !== undefined && (typeof frameCandidate.data !== 'object' || frameCandidate.data === null)) {
          return false;
        }
      }

      const tools = candidate.tools;
      if (!tools || typeof tools !== 'object') {
        return false;
      }
      const toolsData = tools as SessionToolsData & Record<string, unknown>;
      if (typeof toolsData.activeTool !== 'string') return false;
      if (typeof toolsData.selectedColor !== 'string') return false;
      if (toolsData.selectedBgColor !== undefined && typeof toolsData.selectedBgColor !== 'string') return false;
      if (toolsData.selectedCharacter !== undefined && typeof toolsData.selectedCharacter !== 'string') return false;
      if (toolsData.rectangleFilled !== undefined && typeof toolsData.rectangleFilled !== 'boolean') return false;

      if (candidate.typography) {
        const typography = candidate.typography as TypographySettings;
        if (typeof typography.fontSize !== 'number') return false;
        if (typeof typography.characterSpacing !== 'number') return false;
        if (typeof typography.lineSpacing !== 'number') return false;
      }

      if (candidate.palettes) {
        const palettes = candidate.palettes as SessionPalettesData & Record<string, unknown>;
        if (typeof palettes.activePaletteId !== 'string') return false;
        if (!Array.isArray(palettes.customPalettes)) return false;
        if (!palettes.customPalettes.every(isColorPalette)) return false;
        if (!Array.isArray(palettes.recentColors)) return false;
        if (!palettes.recentColors.every(color => typeof color === 'string')) return false;
      }

      if (candidate.characterPalettes) {
        const characterPalettes = candidate.characterPalettes as SessionCharacterPalettesData & Record<string, unknown>;
        if (typeof characterPalettes.activePaletteId !== 'string') return false;
        if (!Array.isArray(characterPalettes.customPalettes)) return false;
        if (!characterPalettes.customPalettes.every(isCharacterPalette)) return false;
        if (typeof characterPalettes.mappingMethod !== 'string') return false;
        if (typeof characterPalettes.invertDensity !== 'boolean') return false;
        if (typeof characterPalettes.characterSpacing !== 'number') return false;
      }

      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Restore session data to application stores
   */
  private static restoreSessionData(
    sessionData: SessionImportData, 
    typographyCallbacks?: {
      setFontSize: (size: number) => void;
      setCharacterSpacing: (spacing: number) => void;
      setLineSpacing: (spacing: number) => void;
      setSelectedFontId?: (fontId: string) => void;
    }
  ): void {
    const canvasStore = useCanvasStore.getState();
    const animationStore = useAnimationStore.getState();
    const toolStore = useToolStore.getState();
    const paletteStore = usePaletteStore.getState();
    const characterPaletteStore = useCharacterPaletteStore.getState();
    const projectMetadataStore = useProjectMetadataStore.getState();
    
    // Set importing flag to prevent auto-save during import
    animationStore.setImportingSession(true);
    
    // Restore project metadata (name and description)
    if (sessionData.name) {
      projectMetadataStore.setProjectName(sessionData.name);
    }
    
    if (sessionData.description) {
      projectMetadataStore.setProjectDescription(sessionData.description);
    }
    
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
      const importedFrames = sessionData.animation.frames.map((frameData) => {
        // Convert frame data object back to Map
        const frameMap = new Map<string, Cell>();
        if (frameData.data) {
          Object.entries(frameData.data).forEach(([key, cellData]) => {
            if (cellData) {
              frameMap.set(key, cellData);
            }
          });
        }
        
        // Preserve ALL original frame properties from the export
        return {
          id: frameData.id, // Preserve original frame ID
          name: frameData.name || 'Untitled Frame', // Preserve original name
          duration: frameData.duration ?? DEFAULT_FRAME_DURATION,
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
      
      // Clear current canvas before frame switching
      canvasStore.clearCanvas();
      
      // importSessionFrames already sets currentFrameIndex to 0, but call setCurrentFrame 
      // explicitly to ensure frame synchronization triggers properly after import flag is cleared
      animationStore.setCurrentFrame(0);
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
        customPalettes: sessionData.palettes.customPalettes,
        activePaletteId: sessionData.palettes.activePaletteId,
        recentColors: sessionData.palettes.recentColors
      });
    }

    if (sessionData.characterPalettes) {
      characterPaletteStore.loadSessionCharacterPalettes({
        customPalettes: sessionData.characterPalettes.customPalettes,
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
      // Restore font selection - defaults to 'auto' for backwards compatibility
      if (typographyCallbacks.setSelectedFontId) {
        const fontId = sessionData.typography.selectedFontId ?? 'auto';
        typographyCallbacks.setSelectedFontId(fontId);
      }
    }
    
    // Clear importing flag after all frame operations are complete
    // This allows useFrameSynchronization to load the first frame naturally
    setTimeout(() => {
      const animationStore = useAnimationStore.getState();
      const canvasStore = useCanvasStore.getState();
      
      animationStore.setImportingSession(false);
      
      // Force load the frame data into canvas, even if we're already on frame 0
      // This handles the case where user is already on frame 1 during import
      const firstFrame = animationStore.frames[0];
      if (firstFrame && firstFrame.data) {
        canvasStore.clearCanvas();
        firstFrame.data.forEach((cell, key) => {
          const [x, y] = key.split(',').map(Number);
          canvasStore.setCell(x, y, cell);
        });
      }
      
      // Also trigger setCurrentFrame to ensure the frame synchronization system is in sync
      animationStore.setCurrentFrame(0);
    }, 50);
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
      setSelectedFontId?: (fontId: string) => void;
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