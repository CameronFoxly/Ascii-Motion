/**
 * Canvas Size Conversion Utility
 * Handles bidirectional conversion between character dimensions and pixel dimensions
 * based on typography settings (fontSize, characterSpacing, lineSpacing)
 */

export interface TypographySettings {
  fontSize: number;
  characterSpacing: number;
  lineSpacing: number;
  selectedFontId?: string; // Optional for backwards compatibility
}

export interface CharacterDimensions {
  width: number;
  height: number;
}

export interface PixelDimensions {
  width: number;
  height: number;
}

/**
 * Convert character dimensions to pixel dimensions
 * Uses monospace aspect ratio (0.6) and typography settings
 */
export function charactersToPixels(
  characters: CharacterDimensions,
  typography: TypographySettings
): PixelDimensions {
  const { fontSize, characterSpacing, lineSpacing } = typography;
  
  // Calculate base character dimensions from font size
  const baseCharWidth = fontSize * 0.6; // Standard monospace aspect ratio
  const baseCharHeight = fontSize;
  
  // Apply spacing multipliers
  const cellWidth = baseCharWidth * characterSpacing;
  const cellHeight = baseCharHeight * lineSpacing;
  
  // Calculate total pixel dimensions
  return {
    width: Math.round(characters.width * cellWidth),
    height: Math.round(characters.height * cellHeight)
  };
}

/**
 * Convert pixel dimensions to character dimensions
 * Uses floor() to ensure no partial characters are visible
 */
export function pixelsToCharacters(
  pixels: PixelDimensions,
  typography: TypographySettings
): CharacterDimensions {
  const { fontSize, characterSpacing, lineSpacing } = typography;
  
  // Calculate base character dimensions from font size
  const baseCharWidth = fontSize * 0.6; // Standard monospace aspect ratio
  const baseCharHeight = fontSize;
  
  // Apply spacing multipliers
  const cellWidth = baseCharWidth * characterSpacing;
  const cellHeight = baseCharHeight * lineSpacing;
  
  // Convert to characters and floor to avoid partial characters
  return {
    width: Math.floor(pixels.width / cellWidth),
    height: Math.floor(pixels.height / cellHeight)
  };
}

/**
 * Validate character dimensions against constraints
 * Returns constrained values if outside valid range
 */
export function validateCharacterDimensions(
  dimensions: CharacterDimensions
): CharacterDimensions {
  return {
    width: Math.max(4, Math.min(200, dimensions.width)),
    height: Math.max(4, Math.min(100, dimensions.height))
  };
}

/**
 * Calculate pixel constraints based on character constraints and typography
 */
export function getPixelConstraints(typography: TypographySettings): {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
} {
  const minChars = { width: 4, height: 4 };
  const maxChars = { width: 200, height: 100 };
  
  const minPixels = charactersToPixels(minChars, typography);
  const maxPixels = charactersToPixels(maxChars, typography);
  
  return {
    minWidth: minPixels.width,
    maxWidth: maxPixels.width,
    minHeight: minPixels.height,
    maxHeight: maxPixels.height
  };
}

/**
 * Validate and convert pixel input to valid character dimensions
 * Ensures the result falls within character constraints
 */
export function validatePixelInput(
  pixels: PixelDimensions,
  typography: TypographySettings
): CharacterDimensions {
  // Convert pixels to characters (with floor)
  const characters = pixelsToCharacters(pixels, typography);
  
  // Validate against character constraints
  return validateCharacterDimensions(characters);
}
