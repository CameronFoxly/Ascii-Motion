/**
 * Export Pixel Calculator Utility
 * Calculates final pixel dimensions for exports based on canvas size, typography, and multipliers
 */

export interface PixelDimensions {
  width: number;
  height: number;
}

export interface ExportPixelOptions {
  gridWidth: number;
  gridHeight: number;
  sizeMultiplier: number;
  fontSize?: number;
  characterSpacing?: number;
  lineSpacing?: number;
}

/**
 * Calculate the final pixel dimensions for export
 * This mirrors the logic in ExportRenderer.createExportCanvas()
 */
export const calculateExportPixelDimensions = (options: ExportPixelOptions): PixelDimensions => {
  const {
    gridWidth,
    gridHeight,
    sizeMultiplier,
    fontSize = 16,
    characterSpacing = 1.0,
    lineSpacing = 1.0
  } = options;

  // Calculate base character dimensions from font size
  const baseCharWidth = fontSize * 0.6; // Standard monospace aspect ratio
  const baseCharHeight = fontSize;
  
  // Apply spacing multipliers and size multiplier
  const baseCellWidth = baseCharWidth * characterSpacing * sizeMultiplier;
  const baseCellHeight = baseCharHeight * lineSpacing * sizeMultiplier;
  
  // Calculate display dimensions (before device pixel ratio)
  const displayWidth = Math.max(gridWidth * baseCellWidth, 1);
  const displayHeight = Math.max(gridHeight * baseCellHeight, 1);
  
  // Use device pixel ratio for high-DPI export (minimum 2x for crisp exports)
  const devicePixelRatio = Math.max(window.devicePixelRatio || 1, 2);
  
  // Final canvas dimensions
  const finalWidth = Math.round(displayWidth * devicePixelRatio);
  const finalHeight = Math.round(displayHeight * devicePixelRatio);
  
  return {
    width: finalWidth,
    height: finalHeight  
  };
};

/**
 * Format pixel dimensions for display (e.g., "1920 × 1080 px")
 */
export const formatPixelDimensions = (dimensions: PixelDimensions): string => {
  return `${dimensions.width} × ${dimensions.height} px`;
};

/**
 * Calculate aspect ratio from pixel dimensions
 */
export const calculateAspectRatio = (dimensions: PixelDimensions): number => {
  return dimensions.width / dimensions.height;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${Math.max(1, Math.round(bytes))} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface ImageEstimateOptions {
  format: 'png' | 'jpg';
  quality?: number; // 1-100
}

/**
 * Estimate file size for image export (rough approximation)
 */
export const estimateImageFileSize = (
  dimensions: PixelDimensions,
  { format, quality = 90 }: ImageEstimateOptions
): string => {
  const totalPixels = dimensions.width * dimensions.height;
  const normalizedQuality = Math.min(Math.max(quality, 1), 100) / 100;

  if (format === 'png') {
    const bytesPerPixel = 2; // Assuming decent PNG compression (RGBA)
    return formatBytes(totalPixels * bytesPerPixel);
  }

  // JPEG typically ranges between ~0.2-1.5 bytes per pixel depending on quality/content
  const baseBytesPerPixel = 0.25; // Base overhead for JPEG structure
  const variableBytesPerPixel = 1.0 * normalizedQuality; // Scale with quality slider
  const totalBytes = totalPixels * (baseBytesPerPixel + variableBytesPerPixel);

  return formatBytes(totalBytes);
};

interface SvgEstimateOptions {
  includeGrid: boolean;
  textAsOutlines: boolean;
  prettify: boolean;
}

/**
 * Estimate SVG file size based on content
 */
export const estimateSvgFileSize = (
  gridWidth: number,
  gridHeight: number,
  characterCount: number,
  options: SvgEstimateOptions
): string => {
  // Base SVG structure: ~200 bytes (header, namespaces, closing tags)
  let bytes = 200;
  
  // Grid lines estimation: ~80 bytes per line (including attributes and whitespace)
  if (options.includeGrid) {
    const lineCount = gridWidth + gridHeight + 2; // Vertical + horizontal lines
    bytes += lineCount * 80;
  }
  
  // Character estimation
  if (options.textAsOutlines) {
    // Path outlines: ~300 bytes per character (path data, transforms, attributes)
    // Note: Actual size depends on glyph complexity
    bytes += characterCount * 300;
  } else {
    // Text elements: ~120 bytes per character (simpler than paths)
    bytes += characterCount * 120;
  }
  
  // Prettification adds ~30% overhead (newlines, indentation)
  if (options.prettify) {
    bytes *= 1.3;
  }
  
  return formatBytes(bytes);
};
