/**
 * Font metrics and character spacing utilities for ASCII Motion
 * 
 * Handles proper monospace character aspect ratios and spacing calculations.
 * Uses a modern font stack optimized for crisp text rendering.
 */

export interface FontMetrics {
  characterWidth: number;
  characterHeight: number;
  aspectRatio: number;
  fontSize: number;
  fontFamily: string;
}

export interface SpacingSettings {
  characterSpacing: number; // multiplier: 1.0 = normal, 1.2 = 20% wider gaps
  lineSpacing: number;      // multiplier: 1.0 = no gap, 1.2 = 20% extra vertical space
}

/**
 * Standard monospace aspect ratio (character width / character height)
 * Used for font metrics and generator aspect ratio corrections
 */
export const CELL_ASPECT_RATIO = 0.6;

/**
 * Calculate font metrics for a given font size
 * Monospace fonts typically have an aspect ratio of ~0.6 (width/height)
 * 
 * @param fontSize - Font size in pixels
 * @param fontStack - CSS font stack (no quotes around individual font names)
 * @returns FontMetrics object with character dimensions and font info
 */
export const calculateFontMetrics = (fontSize: number, fontStack: string): FontMetrics => {
  // Standard monospace aspect ratio (character width / character height)
  const MONOSPACE_ASPECT_RATIO = CELL_ASPECT_RATIO;
  
  // Calculate character dimensions
  const characterHeight = fontSize;
  const characterWidth = fontSize * MONOSPACE_ASPECT_RATIO;
  
  return {
    characterWidth,
    characterHeight,
    aspectRatio: MONOSPACE_ASPECT_RATIO,
    fontSize,
    fontFamily: fontStack // Store the font stack (no quotes)
  };
};

/**
 * Calculate actual cell dimensions including spacing
 */
export const calculateCellDimensions = (
  fontMetrics: FontMetrics, 
  spacing: SpacingSettings
): { cellWidth: number; cellHeight: number } => {
  const cellWidth = fontMetrics.characterWidth * spacing.characterSpacing;
  const cellHeight = fontMetrics.characterHeight * spacing.lineSpacing;
  
  return { cellWidth, cellHeight };
};

/**
 * Calculate canvas pixel position from grid coordinates
 */
export const gridToPixel = (
  gridX: number, 
  gridY: number, 
  cellWidth: number, 
  cellHeight: number,
  panOffset: { x: number; y: number } = { x: 0, y: 0 }
): { x: number; y: number } => {
  return {
    x: gridX * cellWidth + panOffset.x,
    y: gridY * cellHeight + panOffset.y
  };
};

/**
 * Calculate grid coordinates from canvas pixel position
 */
export const pixelToGrid = (
  pixelX: number, 
  pixelY: number, 
  cellWidth: number, 
  cellHeight: number,
  panOffset: { x: number; y: number } = { x: 0, y: 0 }
): { x: number; y: number } => {
  const adjustedX = pixelX - panOffset.x;
  const adjustedY = pixelY - panOffset.y;
  
  return {
    x: Math.floor(adjustedX / cellWidth),
    y: Math.floor(adjustedY / cellHeight)
  };
};

/**
 * Get font CSS string for canvas rendering
 * Properly quotes font names with spaces for canvas compatibility
 */
export const getFontString = (fontMetrics: FontMetrics): string => {
  // Split the font stack to handle the first font name
  const fonts = fontMetrics.fontFamily.split(',').map(f => f.trim());
  
  // If the first font has spaces and isn't already quoted, quote it
  if (fonts[0] && fonts[0].includes(' ') && !fonts[0].startsWith('"') && !fonts[0].startsWith("'")) {
    fonts[0] = `"${fonts[0]}"`;
  }
  
  return `${fontMetrics.fontSize}px ${fonts.join(', ')}`;
};

/**
 * Default spacing settings
 */
export const DEFAULT_SPACING: SpacingSettings = {
  characterSpacing: 1.0,
  lineSpacing: 1.0
};
