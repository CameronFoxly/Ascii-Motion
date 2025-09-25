import type { Frame, Cell, Tool } from './index';
import type { FontMetrics } from '../utils/fontMetrics';

// Export format identifiers
export type ExportFormatId = 'png' | 'mp4' | 'session' | 'media' | 'text' | 'json' | 'html';

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
export interface PngExportSettings {
  sizeMultiplier: 1 | 2;
  includeGrid: boolean;
}

export interface VideoExportSettings {
  sizeMultiplier: 1 | 2 | 4;
  frameRate: number; // 1-60 fps
  frameRange: { start: number; end: number } | 'all';
  quality: 'high' | 'medium' | 'low'; // Used for WebM encoding
  crf: number; // 0-51, used for H.264 MP4 encoding (lower = higher quality)
  format: 'webm' | 'mp4'; // WebM for WebCodecs, MP4 for broader compatibility
  includeGrid: boolean;
  loops: 'none' | '2x' | '4x' | '8x'; // Number of times to loop the animation
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
}

// Union type for all export settings
export type ExportSettings = PngExportSettings | VideoExportSettings | SessionExportSettings | TextExportSettings | JsonExportSettings | HtmlExportSettings;

// Export data bundle - all data needed for any export
export interface ExportDataBundle {
  // Version metadata
  metadata: {
    version: string;
    buildDate: string;
    buildHash: string;
    exportDate: string;
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
  pngSettings: PngExportSettings;
  videoSettings: VideoExportSettings;
  sessionSettings: SessionExportSettings;
  textSettings: TextExportSettings;
  jsonSettings: JsonExportSettings;
  htmlSettings: HtmlExportSettings;
  
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
}