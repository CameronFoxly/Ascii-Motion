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

const VALID_TOOLS = new Set<Tool>([
  'pencil',
  'eraser',
  'paintbucket',
  'select',
  'lasso',
  'magicwand',
  'rectangle',
  'ellipse',
  'eyedropper',
  'line',
  'text',
  'asciitype',
  'asciibox',
  'brush',
  'beziershape',
  'gradientfill',
  'fliphorizontal',
  'flipvertical',
  'layertransform',
]);

const VALID_MAPPING_METHODS = new Set<CharacterMappingSettings['mappingMethod']>([
  'brightness',
  'luminance',
  'contrast',
  'edge-detection',
  'saturation',
  'red-channel',
  'green-channel',
  'blue-channel',
]);

function invalidSession(path: string, expectation: string): never {
  throw new Error(`Invalid v2 session: ${path} ${expectation}`);
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalidSession(path, 'must be an object');
  }
  return value as Record<string, unknown>;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    invalidSession(path, 'must be an array');
  }
  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    invalidSession(path, 'must be a string');
  }
  return value;
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    invalidSession(path, 'must be a boolean');
  }
  return value;
}

function requireFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    invalidSession(path, 'must be a finite number');
  }
  return value;
}

function requireFrameNumber(value: unknown, path: string, minimum: number): number {
  const frame = requireFiniteNumber(value, path);
  if (!Number.isSafeInteger(frame) || frame < minimum) {
    invalidSession(path, `must be an integer >= ${minimum}`);
  }
  return frame;
}

function validateOptionalString(
  record: Record<string, unknown>,
  property: string,
  path: string,
): void {
  if (record[property] !== undefined) {
    requireString(record[property], `${path}.${property}`);
  }
}

function validateOptionalBoolean(
  record: Record<string, unknown>,
  property: string,
  path: string,
): void {
  if (record[property] !== undefined) {
    requireBoolean(record[property], `${path}.${property}`);
  }
}

function validateEasing(value: unknown, path: string): void {
  const easing = requireRecord(value, path);
  requireString(easing.type, `${path}.type`);
  for (const property of ['x1', 'y1', 'x2', 'y2']) {
    if (easing[property] !== undefined) {
      requireFiniteNumber(easing[property], `${path}.${property}`);
    }
  }
}

function validateKeyframe(
  value: unknown,
  path: string,
  allowStringRecord: boolean,
): void {
  const keyframe = requireRecord(value, path);
  requireString(keyframe.id, `${path}.id`);
  requireFrameNumber(keyframe.frame, `${path}.frame`, 0);

  const keyframeValue = keyframe.value;
  const primitiveValue = typeof keyframeValue === 'string'
    || typeof keyframeValue === 'boolean'
    || (typeof keyframeValue === 'number' && Number.isFinite(keyframeValue));
  const stringRecordValue = allowStringRecord
    && typeof keyframeValue === 'object'
    && keyframeValue !== null
    && !Array.isArray(keyframeValue)
    && Object.values(keyframeValue).every((entry) => typeof entry === 'string');
  if (!primitiveValue && !stringRecordValue) {
    invalidSession(`${path}.value`, 'has an unsupported value');
  }

  validateEasing(keyframe.easing, `${path}.easing`);
}

function validatePropertyTrack(
  value: unknown,
  path: string,
  allowStringRecord: boolean,
): void {
  const track = requireRecord(value, path);
  requireString(track.id, `${path}.id`);
  requireString(track.propertyPath, `${path}.propertyPath`);
  requireBoolean(track.loopKeyframes, `${path}.loopKeyframes`);
  requireArray(track.keyframes, `${path}.keyframes`).forEach((keyframe, index) => {
    validateKeyframe(keyframe, `${path}.keyframes[${index}]`, allowStringRecord);
  });
}

function validateEffectTrack(value: unknown, path: string): void {
  const track = requireRecord(value, path);
  requireString(track.id, `${path}.id`);
  if (track.ownerId !== null) {
    requireString(track.ownerId, `${path}.ownerId`);
  }
  requireBoolean(track.collapsed, `${path}.collapsed`);

  const block = requireRecord(track.effectBlock, `${path}.effectBlock`);
  requireString(block.id, `${path}.effectBlock.id`);
  requireString(block.effectType, `${path}.effectBlock.effectType`);
  requireFrameNumber(block.startFrame, `${path}.effectBlock.startFrame`, 0);
  requireFrameNumber(block.durationFrames, `${path}.effectBlock.durationFrames`, 1);
  requireBoolean(block.enabled, `${path}.effectBlock.enabled`);
  requireRecord(block.settings, `${path}.effectBlock.settings`);
  requireArray(block.propertyTracks, `${path}.effectBlock.propertyTracks`).forEach(
    (propertyTrack, index) => {
      validatePropertyTrack(
        propertyTrack,
        `${path}.effectBlock.propertyTracks[${index}]`,
        true,
      );
    },
  );
}

function validatePostEffectTrack(value: unknown, path: string): void {
  const track = requireRecord(value, path);
  requireString(track.id, `${path}.id`);
  requireBoolean(track.collapsed, `${path}.collapsed`);

  const block = requireRecord(track.effectBlock, `${path}.effectBlock`);
  requireString(block.id, `${path}.effectBlock.id`);
  requireString(block.postEffectType, `${path}.effectBlock.postEffectType`);
  requireFrameNumber(block.startFrame, `${path}.effectBlock.startFrame`, 0);
  requireFrameNumber(block.durationFrames, `${path}.effectBlock.durationFrames`, 1);
  requireBoolean(block.enabled, `${path}.effectBlock.enabled`);
  requireRecord(block.settings, `${path}.effectBlock.settings`);
  requireArray(block.propertyTracks, `${path}.effectBlock.propertyTracks`).forEach(
    (propertyTrack, index) => {
      validatePropertyTrack(
        propertyTrack,
        `${path}.effectBlock.propertyTracks[${index}]`,
        false,
      );
    },
  );
}

function validateStaticProperties(value: unknown, path: string): void {
  const properties = requireRecord(value, path);
  for (const [property, propertyValue] of Object.entries(properties)) {
    requireFiniteNumber(propertyValue, `${path}.${property}`);
  }
}

function validateSessionDataV2ForImport(value: unknown): asserts value is SessionDataV2 {
  const session = requireRecord(value, 'session');
  if (session.version !== '2.0.0' && session.version !== '2.1.0') {
    invalidSession('session.version', 'must be 2.0.0 or 2.1.0');
  }
  validateOptionalString(session, 'name', 'session');
  validateOptionalString(session, 'description', 'session');

  const canvas = requireRecord(session.canvas, 'session.canvas');
  requireFrameNumber(canvas.width, 'session.canvas.width', 1);
  requireFrameNumber(canvas.height, 'session.canvas.height', 1);
  requireString(canvas.canvasBackgroundColor, 'session.canvas.canvasBackgroundColor');
  requireBoolean(canvas.showGrid, 'session.canvas.showGrid');

  const timeline = requireRecord(session.timeline, 'session.timeline');
  const frameRate = requireFiniteNumber(timeline.frameRate, 'session.timeline.frameRate');
  if (frameRate <= 0) {
    invalidSession('session.timeline.frameRate', 'must be greater than zero');
  }
  requireFrameNumber(
    timeline.durationFrames,
    'session.timeline.durationFrames',
    1,
  );
  requireBoolean(timeline.looping, 'session.timeline.looping');

  requireArray(session.layers, 'session.layers').forEach((layerValue, layerIndex) => {
    const path = `session.layers[${layerIndex}]`;
    const layer = requireRecord(layerValue, path);
    requireString(layer.id, `${path}.id`);
    requireString(layer.name, `${path}.name`);
    requireBoolean(layer.visible, `${path}.visible`);
    requireBoolean(layer.solo, `${path}.solo`);
    requireBoolean(layer.locked, `${path}.locked`);
    requireFiniteNumber(layer.opacity, `${path}.opacity`);
    validateOptionalString(layer, 'parentGroupId', path);
    validateOptionalBoolean(layer, 'syncKeyframesToFrames', path);

    requireArray(layer.contentFrames, `${path}.contentFrames`).forEach(
      (frameValue, frameIndex) => {
        const framePath = `${path}.contentFrames[${frameIndex}]`;
        const frame = requireRecord(frameValue, framePath);
        requireString(frame.id, `${framePath}.id`);
        requireString(frame.name, `${framePath}.name`);
        requireFrameNumber(
          frame.startFrame,
          `${framePath}.startFrame`,
          0,
        );
        requireFrameNumber(
          frame.durationFrames,
          `${framePath}.durationFrames`,
          1,
        );
        validateOptionalBoolean(frame, 'hidden', framePath);
        validateOptionalString(frame, 'labelColor', framePath);

        const data = requireRecord(frame.data, `${framePath}.data`);
        for (const [cellKey, cellValue] of Object.entries(data)) {
          const cellPath = `${framePath}.data.${cellKey}`;
          const cell = requireRecord(cellValue, cellPath);
          requireString(cell.char, `${cellPath}.char`);
          requireString(cell.color, `${cellPath}.color`);
          requireString(cell.bgColor, `${cellPath}.bgColor`);
        }
      },
    );

    requireArray(layer.propertyTracks, `${path}.propertyTracks`).forEach(
      (propertyTrack, index) => {
        validatePropertyTrack(propertyTrack, `${path}.propertyTracks[${index}]`, false);
      },
    );
    if (layer.staticProperties !== undefined) {
      validateStaticProperties(layer.staticProperties, `${path}.staticProperties`);
    }
    if (layer.effectTracks !== undefined) {
      requireArray(layer.effectTracks, `${path}.effectTracks`).forEach(
        (effectTrack, index) => {
          validateEffectTrack(effectTrack, `${path}.effectTracks[${index}]`);
        },
      );
    }
  });

  if (session.layerGroups !== undefined) {
    requireArray(session.layerGroups, 'session.layerGroups').forEach(
      (groupValue, groupIndex) => {
        const path = `session.layerGroups[${groupIndex}]`;
        const group = requireRecord(groupValue, path);
        requireString(group.id, `${path}.id`);
        requireString(group.name, `${path}.name`);
        requireArray(group.childLayerIds, `${path}.childLayerIds`).forEach(
          (layerId, index) => requireString(layerId, `${path}.childLayerIds[${index}]`),
        );
        requireBoolean(group.visible, `${path}.visible`);
        requireBoolean(group.solo, `${path}.solo`);
        requireBoolean(group.locked, `${path}.locked`);
        requireBoolean(group.collapsed, `${path}.collapsed`);
        requireArray(group.propertyTracks, `${path}.propertyTracks`).forEach(
          (propertyTrack, index) => {
            validatePropertyTrack(propertyTrack, `${path}.propertyTracks[${index}]`, false);
          },
        );
        if (group.staticProperties !== undefined) {
          validateStaticProperties(group.staticProperties, `${path}.staticProperties`);
        }
        if (group.effectTracks !== undefined) {
          requireArray(group.effectTracks, `${path}.effectTracks`).forEach(
            (effectTrack, index) => {
              validateEffectTrack(effectTrack, `${path}.effectTracks[${index}]`);
            },
          );
        }
      },
    );
  }

  if (session.globalEffects !== undefined) {
    requireArray(session.globalEffects, 'session.globalEffects').forEach(
      (effectTrack, index) => {
        validateEffectTrack(effectTrack, `session.globalEffects[${index}]`);
      },
    );
  }
  if (session.postEffectTracks !== undefined) {
    requireArray(session.postEffectTracks, 'session.postEffectTracks').forEach(
      (effectTrack, index) => {
        validatePostEffectTrack(effectTrack, `session.postEffectTracks[${index}]`);
      },
    );
  }

  if (session.tools !== undefined) {
    const tools = requireRecord(session.tools, 'session.tools');
    if (
      tools.activeTool !== undefined
      && (
        typeof tools.activeTool !== 'string'
        || !VALID_TOOLS.has(tools.activeTool as Tool)
      )
    ) {
      invalidSession('session.tools.activeTool', 'must be a supported tool');
    }
    validateOptionalString(tools, 'selectedColor', 'session.tools');
    validateOptionalString(tools, 'selectedBgColor', 'session.tools');
    validateOptionalString(tools, 'selectedCharacter', 'session.tools');
    validateOptionalBoolean(tools, 'rectangleFilled', 'session.tools');
  }

  if (session.palettes !== undefined) {
    const palettes = requireRecord(session.palettes, 'session.palettes');
    validateOptionalString(palettes, 'activePaletteId', 'session.palettes');
    if (palettes.customPalettes !== undefined) {
      const customPalettes = requireArray(
        palettes.customPalettes,
        'session.palettes.customPalettes',
      );
      if (!customPalettes.every(isColorPalette)) {
        invalidSession(
          'session.palettes.customPalettes',
          'must contain valid color palettes',
        );
      }
    }
    if (palettes.recentColors !== undefined) {
      requireArray(palettes.recentColors, 'session.palettes.recentColors').forEach(
        (color, index) => requireString(color, `session.palettes.recentColors[${index}]`),
      );
    }
  }

  if (session.characterPalettes !== undefined) {
    const palettes = requireRecord(
      session.characterPalettes,
      'session.characterPalettes',
    );
    validateOptionalString(
      palettes,
      'activePaletteId',
      'session.characterPalettes',
    );
    if (palettes.customPalettes !== undefined) {
      const customPalettes = requireArray(
        palettes.customPalettes,
        'session.characterPalettes.customPalettes',
      );
      if (!customPalettes.every(isCharacterPalette)) {
        invalidSession(
          'session.characterPalettes.customPalettes',
          'must contain valid character palettes',
        );
      }
    }
    if (palettes.mappingMethod !== undefined) {
      if (
        typeof palettes.mappingMethod !== 'string'
        || !VALID_MAPPING_METHODS.has(
          palettes.mappingMethod as CharacterMappingSettings['mappingMethod'],
        )
      ) {
        invalidSession(
          'session.characterPalettes.mappingMethod',
          'must be a supported mapping method',
        );
      }
    }
    validateOptionalBoolean(
      palettes,
      'invertDensity',
      'session.characterPalettes',
    );
    if (palettes.characterSpacing !== undefined) {
      requireFiniteNumber(
        palettes.characterSpacing,
        'session.characterPalettes.characterSpacing',
      );
    }
  }

  if (session.typography !== undefined) {
    const typography = requireRecord(session.typography, 'session.typography');
    for (const property of ['fontSize', 'characterSpacing', 'lineSpacing']) {
      if (typography[property] !== undefined) {
        requireFiniteNumber(typography[property], `session.typography.${property}`);
      }
    }
    validateOptionalString(typography, 'selectedFontId', 'session.typography');
  }
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
    validateSessionDataV2ForImport(sessionData);

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