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

/**
 * Estimate file size for PNG export (rough approximation)
 */
export const estimatePngFileSize = (dimensions: PixelDimensions): string => {
  // Very rough estimate: 4 bytes per pixel (RGBA) with some compression
  const bytesPerPixel = 2; // Assuming decent PNG compression
  const totalBytes = dimensions.width * dimensions.height * bytesPerPixel;
  
  if (totalBytes < 1024) {
    return `${totalBytes} B`;
  } else if (totalBytes < 1024 * 1024) {
    return `${Math.round(totalBytes / 1024)} KB`;
  } else {
    return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
};