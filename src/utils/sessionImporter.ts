import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import { useToolStore } from '../stores/toolStore';
import { usePaletteStore } from '../stores/paletteStore';
import { useCharacterPaletteStore } from '../stores/characterPaletteStore';
import { useProjectMetadataStore } from '../stores/projectMetadataStore';
import { useTimelineStore } from '../stores/timelineStore';
import type { Cell, Tool } from '../types';
import type { Layer, LayerId, ContentFrameId, PropertyTrackId, KeyframeId, LayerGroup, LayerGroupId, SessionDataV2 } from '../types/timeline';
import type { PostEffectTrack, PostEffectTrackId, PostEffectBlockId, PostEffectPropertyTrackId } from '../types/postEffect';
import { DEFAULT_FRAME_DURATION } from '../constants';
import type { TypographySettings } from './canvasSizeConversion';
import type { ColorPalette, CharacterPalette, CharacterMappingSettings } from '../types/palette';
import { isColorPalette, isCharacterPalette } from '../types/palette';
import { detectSessionVersion, migrateV1ToV2, validateAndRepairV2 } from './sessionMigration';
import { getContentFrameAtTime } from './layerCompositing';

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

interface TypographyCallbacks {
  setFontSize: (size: number) => void;
  setCharacterSpacing: (spacing: number) => void;
  setLineSpacing: (spacing: number) => void;
  setSelectedFontId?: (fontId: string) => void;
}

interface InstalledSessionCanvas {
  activeLayerId: LayerId | null;
  cells: Map<string, Cell>;
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
    typographyCallbacks?: TypographyCallbacks,
  ): Promise<void> {
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        if (typeof event.target?.result !== 'string') {
          reject(new Error('Failed to read file'));
          return;
        }

        resolve(event.target.result);
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });

    let rawData: unknown;
    try {
      rawData = JSON.parse(content) as unknown;
    } catch (error) {
      throw new Error(`Failed to import session: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }

    await SessionImporter.importSessionData(rawData, typographyCallbacks);
  }

  /**
   * Import already-parsed session data and resolve only after every store,
   * including the active canvas, reflects the loaded project.
   */
  static async importSessionData(
    rawData: unknown,
    typographyCallbacks?: TypographyCallbacks,
  ): Promise<void> {
    try {
      const version = detectSessionVersion(rawData);
      let sessionData: SessionDataV2;

      if (version === '2.0.0') {
        const { data, repairs } = validateAndRepairV2(rawData as SessionDataV2);
        if (repairs.length > 0) {
          console.warn(`Session import: ${repairs.length} repairs applied:`, repairs);
        }
        sessionData = data;
      } else if (version === '1.0.0') {
        const migrated = migrateV1ToV2(rawData);
        const { data, repairs } = validateAndRepairV2(migrated);
        if (repairs.length > 0) {
          console.warn(`Session v1->v2 migration: ${repairs.length} repairs applied:`, repairs);
        }
        sessionData = data;
      } else {
        throw new Error('Unknown session file format');
      }

      await SessionImporter.restoreSessionDataV2(sessionData, typographyCallbacks);
    } catch (error) {
      throw new Error(`Failed to import session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Validate session data structure
   */
  // @ts-expect-error - Legacy v1 validator, preserved for reference. All imports now use v2 pipeline.
  private static _validateSessionData(data: unknown): data is SessionImportData {
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
  // @ts-expect-error - Legacy v1 restorer, preserved for reference. All imports now use restoreSessionDataV2.
  private static _restoreSessionData(
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

  /**
   * Restore session data from v2 format (layer-based).
   * Loads layers into timelineStore, canvas settings into canvasStore,
   * and tool/palette/typography state into their respective stores.
   */
  private static async restoreSessionDataV2(
    sessionData: SessionDataV2,
    typographyCallbacks?: TypographyCallbacks,
  ): Promise<void> {
    const animationStore = useAnimationStore.getState();
    animationStore.setImportingSession(true);

    try {
      const installedCanvas = SessionImporter.installSessionDataV2(
        sessionData,
        typographyCallbacks,
      );

      // Preserve the import guard across a render boundary. This lets
      // useFrameSynchronization observe the temporary null active layer and
      // prevents it from flushing a pre-import layer into loaded data when IDs
      // collide during a round-trip import.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      useTimelineStore.getState().setActiveLayer(installedCanvas.activeLayerId);
      const canvasStore = useCanvasStore.getState();
      canvasStore.setActiveLayerId(installedCanvas.activeLayerId);
      canvasStore.setCanvasData(installedCanvas.cells);
      canvasStore.setDirty(false);
    } finally {
      animationStore.setImportingSession(false);
    }
  }

  private static installSessionDataV2(
    sessionData: SessionDataV2,
    typographyCallbacks?: TypographyCallbacks,
  ): InstalledSessionCanvas {
    const canvasStore = useCanvasStore.getState();
    const toolStore = useToolStore.getState();
    const paletteStore = usePaletteStore.getState();
    const characterPaletteStore = useCharacterPaletteStore.getState();
    const projectMetadataStore = useProjectMetadataStore.getState();
    const timelineStore = useTimelineStore.getState();
    const animationStore = useAnimationStore.getState();

    // Restore project metadata
    if (sessionData.name) {
      projectMetadataStore.setProjectName(sessionData.name);
    }
    if (sessionData.description) {
      projectMetadataStore.setProjectDescription(sessionData.description);
    }

    // Restore canvas settings
    canvasStore.setCanvasSize(sessionData.canvas.width, sessionData.canvas.height);
    canvasStore.setCanvasBackgroundColor(sessionData.canvas.canvasBackgroundColor);
    if (sessionData.canvas.showGrid !== undefined) {
      if (sessionData.canvas.showGrid !== canvasStore.showGrid) {
        canvasStore.toggleGrid();
      }
    }

    // Guard: block auto-save during session import to prevent race conditions.
    // Must be set BEFORE clearCanvas() to prevent the auto-save subscription from
    // scheduling saves during the import window.
    canvasStore.clearCanvas();

    // Deserialize layers: convert Record<string, Cell> back to Map<string, Cell>
    const layers: Layer[] = sessionData.layers.map((sessionLayer) => ({
      id: sessionLayer.id as LayerId,
      name: sessionLayer.name,
      visible: sessionLayer.visible,
      solo: sessionLayer.solo,
      locked: sessionLayer.locked,
      opacity: sessionLayer.opacity,
      parentGroupId: sessionLayer.parentGroupId as LayerGroupId | undefined,
      contentFrames: sessionLayer.contentFrames.map((cf) => ({
        id: cf.id as ContentFrameId,
        name: cf.name,
        startFrame: cf.startFrame,
        durationFrames: cf.durationFrames,
        data: new Map(Object.entries(cf.data)) as Map<string, Cell>,
        hidden: cf.hidden,
        labelColor: cf.labelColor,
      })),
      propertyTracks: sessionLayer.propertyTracks.map((track) => ({
        id: track.id as PropertyTrackId,
        propertyPath: track.propertyPath as import('../types/timeline').PropertyPath,
        loopKeyframes: track.loopKeyframes,
        keyframes: track.keyframes.map((kf) => ({
          id: kf.id as KeyframeId,
          frame: kf.frame,
          value: kf.value,
          easing: kf.easing,
        })),
      })),
      staticProperties: sessionLayer.staticProperties ?? {},
      syncKeyframesToFrames: sessionLayer.syncKeyframesToFrames,
      effectTracks: (sessionLayer.effectTracks ?? []).map((et) => ({
        id: et.id as import('../types/effectBlock').EffectTrackId,
        ownerId: et.ownerId as import('../types/timeline').LayerId | import('../types/timeline').LayerGroupId | null,
        effectBlock: {
          id: et.effectBlock.id as import('../types/effectBlock').EffectBlockId,
          effectType: et.effectBlock.effectType,
          startFrame: et.effectBlock.startFrame,
          durationFrames: et.effectBlock.durationFrames,
          enabled: et.effectBlock.enabled,
          settings: et.effectBlock.settings ?? {},
          propertyTracks: (et.effectBlock.propertyTracks ?? []).map((pt) => ({
            id: pt.id as import('../types/effectBlock').EffectPropertyTrackId,
            propertyPath: pt.propertyPath,
            keyframes: pt.keyframes.map((kf) => ({
              id: kf.id as KeyframeId,
              frame: kf.frame,
              value: kf.value,
              easing: kf.easing,
            })),
            loopKeyframes: pt.loopKeyframes,
          })),
        },
        collapsed: et.collapsed,
      })),
    }));

    // Deserialize layer groups
    const layerGroups: LayerGroup[] = (sessionData.layerGroups ?? []).map((sessionGroup) => ({
      id: sessionGroup.id as LayerGroupId,
      name: sessionGroup.name,
      childLayerIds: sessionGroup.childLayerIds.map((id) => id as LayerId),
      visible: sessionGroup.visible,
      solo: sessionGroup.solo,
      locked: sessionGroup.locked,
      collapsed: sessionGroup.collapsed,
      propertyTracks: (sessionGroup.propertyTracks ?? []).map((track) => ({
        id: track.id as PropertyTrackId,
        propertyPath: track.propertyPath as import('../types/timeline').PropertyPath,
        loopKeyframes: track.loopKeyframes,
        keyframes: track.keyframes.map((kf) => ({
          id: kf.id as KeyframeId,
          frame: kf.frame,
          value: kf.value,
          easing: kf.easing,
        })),
      })),
      staticProperties: sessionGroup.staticProperties ?? {},
      effectTracks: (sessionGroup.effectTracks ?? []).map((et) => ({
        id: et.id as import('../types/effectBlock').EffectTrackId,
        ownerId: et.ownerId as import('../types/timeline').LayerId | import('../types/timeline').LayerGroupId | null,
        effectBlock: {
          id: et.effectBlock.id as import('../types/effectBlock').EffectBlockId,
          effectType: et.effectBlock.effectType,
          startFrame: et.effectBlock.startFrame,
          durationFrames: et.effectBlock.durationFrames,
          enabled: et.effectBlock.enabled,
          settings: et.effectBlock.settings ?? {},
          propertyTracks: (et.effectBlock.propertyTracks ?? []).map((pt) => ({
            id: pt.id as import('../types/effectBlock').EffectPropertyTrackId,
            propertyPath: pt.propertyPath,
            keyframes: pt.keyframes.map((kf) => ({
              id: kf.id as KeyframeId,
              frame: kf.frame,
              value: kf.value,
              easing: kf.easing,
            })),
            loopKeyframes: pt.loopKeyframes,
          })),
        },
        collapsed: et.collapsed,
      })),
    }));

    // Deserialize global effects
    const globalEffectsData: import('../types/effectBlock').EffectTrack[] = (sessionData.globalEffects ?? []).map((et) => ({
      id: et.id as import('../types/effectBlock').EffectTrackId,
      ownerId: et.ownerId as import('../types/timeline').LayerId | import('../types/timeline').LayerGroupId | null,
      effectBlock: {
        id: et.effectBlock.id as import('../types/effectBlock').EffectBlockId,
        effectType: et.effectBlock.effectType,
        startFrame: et.effectBlock.startFrame,
        durationFrames: et.effectBlock.durationFrames,
        enabled: et.effectBlock.enabled,
        settings: et.effectBlock.settings ?? {},
        propertyTracks: (et.effectBlock.propertyTracks ?? []).map((pt) => ({
          id: pt.id as import('../types/effectBlock').EffectPropertyTrackId,
          propertyPath: pt.propertyPath,
          keyframes: pt.keyframes.map((kf) => ({
            id: kf.id as KeyframeId,
            frame: kf.frame,
            value: kf.value,
            easing: kf.easing,
          })),
          loopKeyframes: pt.loopKeyframes,
        })),
      },
      collapsed: et.collapsed,
    }));

    // Deserialize post effect tracks (WebGL shader-based post-processing)
    const postEffectTracksData: PostEffectTrack[] = (sessionData.postEffectTracks ?? []).map((t) => ({
      id: t.id as PostEffectTrackId,
      effectBlock: {
        id: t.effectBlock.id as PostEffectBlockId,
        postEffectType: t.effectBlock.postEffectType,
        startFrame: t.effectBlock.startFrame,
        durationFrames: t.effectBlock.durationFrames,
        enabled: t.effectBlock.enabled,
        settings: t.effectBlock.settings ?? {},
        propertyTracks: (t.effectBlock.propertyTracks ?? []).map((pt) => ({
          id: pt.id as PostEffectPropertyTrackId,
          propertyPath: pt.propertyPath,
          keyframes: (pt.keyframes ?? []).map((kf) => ({
            id: kf.id as KeyframeId,
            frame: kf.frame,
            value: kf.value,
            easing: kf.easing,
          })),
          loopKeyframes: pt.loopKeyframes,
        })),
      },
      collapsed: t.collapsed,
    }));

    // Load layers and groups into timeline store.
    timelineStore.loadFromSessionData(
      layers,
      {
        frameRate: sessionData.timeline.frameRate,
        durationFrames: sessionData.timeline.durationFrames,
      },
      {
        looping: sessionData.timeline.looping,
      },
      layerGroups,
      globalEffectsData,
      postEffectTracksData,
    );

    // Restore tool state
    const tools = sessionData.tools as Record<string, unknown> | undefined;
    if (tools) {
      if (typeof tools.activeTool === 'string') {
        toolStore.setActiveTool(tools.activeTool as Tool);
      }
      if (typeof tools.selectedColor === 'string') {
        toolStore.setSelectedColor(tools.selectedColor);
      }
      if (typeof tools.selectedBgColor === 'string') {
        toolStore.setSelectedBgColor(tools.selectedBgColor);
      }
      if (typeof tools.selectedCharacter === 'string') {
        toolStore.setSelectedChar(tools.selectedCharacter);
      }
      if (typeof tools.rectangleFilled === 'boolean') {
        toolStore.setRectangleFilled(tools.rectangleFilled);
      }
    }

    // Restore palette data
    const palettes = sessionData.palettes as Record<string, unknown> | undefined;
    if (palettes) {
      const customPalettes = palettes.customPalettes;
      const activePaletteId = palettes.activePaletteId;
      const recentColors = palettes.recentColors;
      if (Array.isArray(customPalettes) && typeof activePaletteId === 'string') {
        paletteStore.loadSessionPalettes({
          customPalettes: customPalettes as ColorPalette[],
          activePaletteId,
          recentColors: Array.isArray(recentColors) ? recentColors as string[] : [],
        });
      }
    }

    const characterPalettes = sessionData.characterPalettes as Record<string, unknown> | undefined;
    if (characterPalettes) {
      const customPalettes = characterPalettes.customPalettes;
      const activePaletteId = characterPalettes.activePaletteId;
      if (Array.isArray(customPalettes) && typeof activePaletteId === 'string') {
        characterPaletteStore.loadSessionCharacterPalettes({
          customPalettes: customPalettes as CharacterPalette[],
          activePaletteId,
          mappingMethod: (characterPalettes.mappingMethod as CharacterMappingSettings['mappingMethod']) ?? 'luminance',
          invertDensity: (characterPalettes.invertDensity as boolean) ?? false,
          characterSpacing: (characterPalettes.characterSpacing as number) ?? 1,
        });
      }
    }

    // Restore typography settings
    const typography = sessionData.typography as Record<string, unknown> | undefined;
    if (typographyCallbacks && typography) {
      if (typeof typography.fontSize === 'number') {
        typographyCallbacks.setFontSize(typography.fontSize);
      }
      if (typeof typography.characterSpacing === 'number') {
        typographyCallbacks.setCharacterSpacing(typography.characterSpacing);
      }
      if (typeof typography.lineSpacing === 'number') {
        typographyCallbacks.setLineSpacing(typography.lineSpacing);
      }
      if (typographyCallbacks.setSelectedFontId) {
        const fontId = (typography.selectedFontId as string) ?? 'auto';
        typographyCallbacks.setSelectedFontId(fontId);
      }
    }

    animationStore.setCurrentFrame(0);

    const restoredTimeline = useTimelineStore.getState();
    const activeLayer = restoredTimeline.layers.find(
      (layer) => layer.id === restoredTimeline.view.activeLayerId,
    ) ?? restoredTimeline.layers[0];
    const activeFrame = activeLayer
      ? getContentFrameAtTime(activeLayer, restoredTimeline.view.currentFrame)
      : null;
    const installedCanvas: InstalledSessionCanvas = {
      activeLayerId: activeLayer?.id ?? null,
      cells: activeFrame ? new Map(activeFrame.data) : new Map<string, Cell>(),
    };

    timelineStore.setActiveLayer(null);
    canvasStore.setActiveLayerId(null);
    canvasStore.setCanvasData(installedCanvas.cells);
    canvasStore.setDirty(false);

    return installedCanvas;
  }
}

/**
 * Hook for session import functionality
 */
export const useSessionImporter = () => {
  const importSession = async (
    file: File,
    typographyCallbacks?: TypographyCallbacks,
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