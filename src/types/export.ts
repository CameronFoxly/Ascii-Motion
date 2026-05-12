import type { Frame, Cell, Tool } from './index';
import type { FontMetrics } from '../utils/fontMetrics';
import type { ColorPalette, CharacterPalette, CharacterMappingSettings } from './palette';
import type { SessionDataV2 } from './timeline';

// Export format identifiers
export type ExportFormatId = 'png' | 'svg' | 'mp4' | 'session' | 'media' | 'text' | 'json' | 'html' | 'react' | 'ink' | 'opentui' | 'bubbletea';

// Base export format interface
export interface ExportFormat {
  id: ExportFormatId;
  name: string;
  description: string;
  fileExtension: string;
  requiresAnimation: boolean;
  icon: string; // Lucide icon name
}

// Export settings for each format
export interface SvgExportSettings {
  includeGrid: boolean;
  textAsOutlines: boolean;
  includeBackground: boolean;
  prettify: boolean;
  outlineFont?: 'jetbrains-mono'; // Font to use for text-to-outlines
}

export interface ImageExportSettings {
  sizeMultiplier: 1 | 2 | 3 | 4;
  includeGrid: boolean;
  format: 'png' | 'jpg' | 'svg';
  quality: number; // 1-100 JPEG quality scale (ignored for PNG and SVG)
  includePostEffects?: boolean; // Apply WebGL post effects (default: true)
  // SVG-specific settings (only used when format === 'svg')
  svgSettings?: SvgExportSettings;
  // Image sequence export settings
  sequenceMode?: boolean; // true = export all frames as a sequence, false/undefined = current frame only
  sequenceRange?: { start: number; end: number } | 'all'; // Frame range (0-indexed) or 'all' for entire timeline
}

export interface ReactExportSettings {
  typescript: boolean;
  includeControls: boolean;
  includeBackground: boolean;
  fileName: string;
  includePostEffects?: boolean; // Apply WebGL post effects (default: true)
}

export interface InkExportSettings {
  fileName: string;
  includePlaybackControls: boolean; // Expose play/pause/restart functions via onReady
  loopAnimation: boolean;           // Loop animation by default
  colorMode: 'ansi' | '256' | 'hex'; // ANSI (16 colors), xterm-256, or full hex
}

export interface OpenTuiExportSettings {
  fileName: string;
  includePlaybackControls: boolean; // Expose play/pause/restart functions via onReady
  loopAnimation: boolean;           // Loop animation by default
  colorMode: 'ansi' | '256' | 'hex'; // ANSI (16 colors), xterm-256, or full hex
}

export interface BubbleteaExportSettings {
  fileName: string;                                // Output filename (without .go extension)
  packageName: string;                             // Go package name
  colorMode: 'hex' | '256' | 'semantic';           // Hex (24-bit), xterm-256, or Semantic (ANSI 16)
  playbackStyle: 'autoplay' | 'keyboard' | 'api';  // How playback is controlled
  loopAnimation: boolean;                          // Loop animation by default
}

export interface VideoExportSettings {
  sizeMultiplier: 1 | 2 | 4;
  frameRate: number | 'auto'; // 'auto' = use project frame rate, or 1-60 fps
  frameRange: { start: number; end: number } | 'all';
  quality: 'high' | 'medium' | 'low'; // Used for WebM encoding
  crf: number; // 0-51, used for H.264 MP4 encoding (lower = higher quality)
  format: 'webm' | 'mp4'; // WebM for WebCodecs, MP4 for broader compatibility
  includeGrid: boolean;
  loops: 'none' | '2x' | '4x' | '8x'; // Number of times to loop the animation
  includePostEffects?: boolean; // Apply WebGL post effects (default: true)
}

export interface SessionExportSettings {
  // No settings needed for session export
  includeMetadata: boolean;
}

export interface TextExportSettings {
  removeLeadingSpaces: boolean;
  removeTrailingSpaces: boolean;
  removeLeadingLines: boolean;
  removeTrailingLines: boolean;
  includeMetadata: boolean;
}

export interface JsonExportSettings {
  includeMetadata: boolean;
  humanReadable: boolean; // Pretty-print JSON
  includeEmptyCells: boolean; // Include cells with default values
}

export interface HtmlExportSettings {
  includeMetadata: boolean;
  animationSpeed: number; // 0.1 to 5.0 speed multiplier
  backgroundColor: string;
  fontFamily: 'monospace' | 'courier' | 'consolas';
  fontSize: number; // 8-24px
  loops: 'infinite' | number; // 'infinite' or specific number
  includePostEffects?: boolean; // Apply WebGL post effects (default: true)
}

export interface PaletteExportState {
  activePaletteId: string;
  customPalettes: ColorPalette[];
  recentColors: string[];
}

export interface CharacterPaletteExportState {
  activePaletteId: string;
  customPalettes: CharacterPalette[];
  mappingMethod: CharacterMappingSettings['mappingMethod'];
  invertDensity: boolean;
  characterSpacing: number;
}

// Union type for all export settings
export type ExportSettings =
  | ImageExportSettings
  | VideoExportSettings
  | SessionExportSettings
  | TextExportSettings
  | JsonExportSettings
  | HtmlExportSettings
  | ReactExportSettings
  | InkExportSettings
  | OpenTuiExportSettings;

// Export data bundle - all data needed for any export
export interface ExportDataBundle {
  // Project metadata
  name?: string;
  description?: string;
  
  // Version metadata
  metadata: {
    version: string;
    buildDate: string;
    buildHash: string;
    exportDate: string;
    projectName?: string;
    projectDescription?: string;
  };
  
  // Animation data
  frames: Frame[];
  currentFrameIndex: number;
  frameRate: number;
  looping: boolean;
  
  // Canvas data
  canvasData: Map<string, Cell>;
  canvasDimensions: { width: number; height: number };
  canvasBackgroundColor: string;
  showGrid: boolean;
  
  // Typography & rendering
  fontMetrics: FontMetrics;
  typography: {
    fontSize: number;
    characterSpacing: number;
    lineSpacing: number;
    selectedFontId: string;
    actualFont?: string | null; // The font actually detected/rendered (for SVG export compatibility)
  };
  
  // Tool state (for session saves)
  toolState: {
    activeTool: Tool;
    selectedColor: string;
    selectedBgColor: string;
    selectedCharacter: string;
    paintBucketContiguous: boolean;
    rectangleFilled: boolean;
  };
  
  // UI state (for session saves)
  uiState: {
    zoom: number;
    panOffset: { x: number; y: number };
    theme: 'light' | 'dark';
  };

  // Palette state
  paletteState: PaletteExportState;

  // Character palette state
  characterPaletteState: CharacterPaletteExportState;

  // Layer data (v2 session data for session exports — raw layer structure)
  // Present when layers exist; session export uses this instead of composited frames
  sessionDataV2?: SessionDataV2;

  // Post effect tracks for WebGL post-processing during visual exports
  postEffectTracks?: import('./postEffect').PostEffectTrack[];
}

// Export result from exporters
export interface ExportResult {
  success: boolean;
  blob?: Blob;
  filename: string;
  error?: string;
}

// Progress callback for long exports
export interface ExportProgress {
  stage: string;
  progress: number; // 0-100
  message: string;
}

// Export handler interface for all exporters
export interface ExportHandler {
  export(
    data: ExportDataBundle, 
    settings: ExportSettings,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult>;
}

// Export history entry
export interface ExportHistoryEntry {
  id: string;
  format: ExportFormatId;
  filename: string;
  timestamp: number;
  settings: ExportSettings;
}

// Export store state
export interface ExportState {
  // Current export operation
  activeFormat: ExportFormatId | null;
  isExporting: boolean;
  progress: ExportProgress | null;
  
  // Export settings for each format
  imageSettings: ImageExportSettings;
  videoSettings: VideoExportSettings;
  sessionSettings: SessionExportSettings;
  textSettings: TextExportSettings;
  jsonSettings: JsonExportSettings;
  htmlSettings: HtmlExportSettings;
  reactSettings: ReactExportSettings;
  inkSettings: InkExportSettings;
  opentuiSettings: OpenTuiExportSettings;
  bubbleteaSettings: BubbleteaExportSettings;
  
  // Export history
  history: ExportHistoryEntry[];
  
  // UI state
  showExportModal: boolean;
  showImportModal: boolean;
}

// Import types
export interface ImportResult {
  success: boolean;
  data?: ExportDataBundle;
  error?: string;
}

export interface ImportValidator {
  validate(file: File): Promise<ImportResult>;
}

// Session export data structure
export interface SessionExportData {
  version: string;
  metadata: {
    name: string;
    createdAt: string;
    appVersion: string;
  };
  
  // Complete animation state
  animation: {
    frames: Frame[];
    currentFrameIndex: number;
    frameRate: number;
    looping: boolean;
  };
  
  // Canvas state
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
    showGrid: boolean;
  };
  
  // Core tool state
  tools: {
    activeTool: Tool;
    selectedColor: string;
    selectedBgColor: string;
    selectedCharacter: string;
    paintBucketContiguous: boolean;
    rectangleFilled: boolean;
  };
  
  // Typography settings
  typography: {
    fontSize: number;
    characterSpacing: number;
    lineSpacing: number;
  };
  
  // UI state
  ui: {
    zoom: number;
    panOffset: { x: number; y: number };
    theme: 'light' | 'dark';
  };

  // Palette data
  palettes?: {
    activePaletteId: string;
    customPalettes: ColorPalette[];
    recentColors?: string[];
  };

  // Character palette data
  characterPalettes?: {
    activePaletteId: string;
    customPalettes: CharacterPalette[];
    mappingMethod: CharacterMappingSettings['mappingMethod'];
    invertDensity: boolean;
    characterSpacing: number;
  };
}