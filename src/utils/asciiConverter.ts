/**
 * ASCII Converter - Converts processed image data to ASCII art
 * 
 * Features:
 * - Brightness-to-character mapping
 * - Color extraction and quantization
 * - Cell data generation for canvas
 * - Multiple conversion algorithms
 */

import type { Cell } from '../types';
import type { ProcessedFrame } from './mediaProcessor';
import type { CharacterPalette, CharacterMappingSettings } from '../types/palette';

// Legacy support - kept for backward compatibility
export const DEFAULT_ASCII_CHARS = [
  '@', '#', 'S', '%', '?', '*', '+', ';', ':', ',', '.', ' '
];

export interface ConversionSettings {
  // Character mapping - Enhanced with palette support
  enableCharacterMapping: boolean;
  characterPalette: CharacterPalette;
  mappingMethod: CharacterMappingSettings['mappingMethod'];
  invertDensity: boolean;
  
  // Text (foreground) color mapping - NEW
  enableTextColorMapping: boolean;
  textColorPalette: string[]; // Array of hex colors from selected palette
  textColorMappingMode: 'closest' | 'dithering' | 'by-index';
  defaultTextColor: string; // Default color when text color mapping is disabled
  
  // Background color mapping - NEW
  enableBackgroundColorMapping: boolean;
  backgroundColorPalette: string[]; // Array of hex colors from selected palette
  backgroundColorMappingMode: 'closest' | 'dithering' | 'by-index';
  
  // Legacy color settings (keep for backward compatibility)
  useOriginalColors: boolean;
  colorQuantization: 'none' | 'basic' | 'advanced';
  paletteSize: number;
  colorMappingMode: 'closest' | 'dithering';
  
  // Processing options
  contrastEnhancement: number; // 0-2 multiplier
  brightnessAdjustment: number; // -100 to 100
  ditherStrength: number; // 0-1 for dithering algorithms
}

/**
 * Mapping algorithm interface for extensibility
 */
export interface MappingAlgorithm {
  name: string;
  description: string;
  mapPixelToCharacter: (r: number, g: number, b: number, characters: string[], options?: any) => string;
}

/**
 * Brightness-based mapping algorithm
 */
export const brightnessAlgorithm: MappingAlgorithm = {
  name: 'brightness',
  description: 'Maps characters based on pixel brightness/luminance',
  mapPixelToCharacter: (r: number, g: number, b: number, characters: string[]) => {
    // Using relative luminance formula (Rec. 709)
    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const charIndex = Math.floor((brightness / 255) * (characters.length - 1));
    return characters[Math.max(0, Math.min(characters.length - 1, charIndex))];
  }
};

/**
 * Luminance-based mapping algorithm (alternative weighting)
 */
export const luminanceAlgorithm: MappingAlgorithm = {
  name: 'luminance',
  description: 'Maps characters based on perceptual luminance',
  mapPixelToCharacter: (r: number, g: number, b: number, characters: string[]) => {
    // Perceptual luminance with gamma correction
    const luminance = Math.pow(0.299 * Math.pow(r/255, 2.2) + 0.587 * Math.pow(g/255, 2.2) + 0.114 * Math.pow(b/255, 2.2), 1/2.2) * 255;
    const charIndex = Math.floor((luminance / 255) * (characters.length - 1));
    return characters[Math.max(0, Math.min(characters.length - 1, charIndex))];
  }
};

/**
 * Contrast-based mapping algorithm
 */
export const contrastAlgorithm: MappingAlgorithm = {
  name: 'contrast',
  description: 'Maps characters based on local contrast detection',
  mapPixelToCharacter: (r: number, g: number, b: number, characters: string[], options?: { neighborValues?: number[] }) => {
    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    
    // If neighbor values are provided, calculate local contrast
    if (options?.neighborValues && options.neighborValues.length > 0) {
      const avgNeighbor = options.neighborValues.reduce((sum, val) => sum + val, 0) / options.neighborValues.length;
      const contrast = Math.abs(brightness - avgNeighbor) / 255;
      
      // Use contrast to influence character selection
      const baseIndex = Math.floor((brightness / 255) * (characters.length - 1));
      const contrastOffset = Math.floor(contrast * (characters.length * 0.3));
      const charIndex = Math.min(characters.length - 1, baseIndex + contrastOffset);
      return characters[charIndex];
    }
    
    // Fallback to brightness if no neighbors
    const charIndex = Math.floor((brightness / 255) * (characters.length - 1));
    return characters[Math.max(0, Math.min(characters.length - 1, charIndex))];
  }
};

/**
 * Edge detection mapping algorithm
 */
export const edgeDetectionAlgorithm: MappingAlgorithm = {
  name: 'edge-detection',
  description: 'Maps characters based on edge detection for line art',
  mapPixelToCharacter: (r: number, g: number, b: number, characters: string[], options?: { gradientMagnitude?: number }) => {
    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    
    // If gradient magnitude is provided (from edge detection), use it
    if (options?.gradientMagnitude !== undefined) {
      const edgeStrength = options.gradientMagnitude / 255;
      
      // For edges, prefer characters with more visual weight
      if (edgeStrength > 0.3) {
        const edgeCharIndex = Math.floor(edgeStrength * (characters.length - 1));
        return characters[Math.max(characters.length * 0.5, edgeCharIndex)];
      }
    }
    
    // For non-edges, use brightness-based selection
    const charIndex = Math.floor((brightness / 255) * (characters.length - 1));
    return characters[Math.max(0, Math.min(characters.length - 1, charIndex))];
  }
};

/**
 * Registry of available mapping algorithms
 */
export const MAPPING_ALGORITHMS: Record<CharacterMappingSettings['mappingMethod'], MappingAlgorithm> = {
  'brightness': brightnessAlgorithm,
  'luminance': luminanceAlgorithm,
  'contrast': contrastAlgorithm,
  'edge-detection': edgeDetectionAlgorithm
};

/**
 * Color distance calculation utility functions
 */
export class ColorMatcher {
  /**
   * Calculate Euclidean distance between two RGB colors
   */
  static calculateColorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
    return Math.sqrt(Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2));
  }

  /**
   * Find closest color from palette to given RGB values
   */
  static findClosestColor(r: number, g: number, b: number, palette: string[]): string {
    let closestColor = palette[0];
    let minDistance = Infinity;
    
    for (const hexColor of palette) {
      const { r: pr, g: pg, b: pb } = this.hexToRgb(hexColor);
      const distance = this.calculateColorDistance(r, g, b, pr, pg, pb);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = hexColor;
      }
    }
    
    return closestColor;
  }

  /**
   * Convert hex color to RGB values
   */
  static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  /**
   * Convert RGB to hex color
   */
  static rgbToHex(r: number, g: number, b: number): string {
    return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
  }

  /**
   * Simple dithering algorithm for color mapping
   */
  static ditherColor(r: number, g: number, b: number, palette: string[], ditherStrength: number = 0.1): string {
    // Add some noise for dithering effect
    const noise = () => (Math.random() - 0.5) * ditherStrength * 255;
    const ditheredR = Math.max(0, Math.min(255, r + noise()));
    const ditheredG = Math.max(0, Math.min(255, g + noise()));
    const ditheredB = Math.max(0, Math.min(255, b + noise()));
    
    return this.findClosestColor(ditheredR, ditheredG, ditheredB, palette);
  }

  /**
   * Map color by brightness to palette index (like character mapping)
   */
  static mapColorByIndex(r: number, g: number, b: number, palette: string[]): string {
    if (palette.length === 0) return '#000000';
    
    // Calculate brightness using the same formula as character mapping
    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    
    // Map brightness (0-255) to palette index (0 to palette.length-1)
    const paletteIndex = Math.floor((brightness / 255) * (palette.length - 1));
    const clampedIndex = Math.max(0, Math.min(palette.length - 1, paletteIndex));
    
    return palette[clampedIndex];
  }
}

export interface ConversionResult {
  cells: Map<string, Cell>;
  colorPalette: string[];
  characterUsage: { [char: string]: number };
  metadata: {
    width: number;
    height: number;
    totalCells: number;
    uniqueColors: number;
    conversionTime: number;
  };
}

export class ASCIIConverter {
  private colorCache = new Map<string, string>();
  
  /**
   * Convert processed frame to ASCII art cells
   */
  convertFrame(frame: ProcessedFrame, settings: ConversionSettings): ConversionResult {
    const startTime = performance.now();
    
    const { imageData } = frame;
    const { data, width, height } = imageData;
    
    const cells = new Map<string, Cell>();
    const colorPalette = new Set<string>();
    const characterUsage: { [char: string]: number } = {};
    
    // Extract colors if quantization is enabled
    let quantizedColors: string[] = [];
    if (settings.colorQuantization !== 'none') {
      quantizedColors = this.extractColors(imageData, settings.paletteSize);
    }
    
    // Process each pixel/cell
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        const a = data[pixelIndex + 3];
        
        // Skip transparent pixels
        if (a < 128) continue;
        
        // Apply brightness and contrast adjustments to RGB values
        let adjustedR = r, adjustedG = g, adjustedB = b;
        
        if (settings.brightnessAdjustment !== 0) {
          const adjustment = settings.brightnessAdjustment * 2.55;
          adjustedR = Math.max(0, Math.min(255, r + adjustment));
          adjustedG = Math.max(0, Math.min(255, g + adjustment));
          adjustedB = Math.max(0, Math.min(255, b + adjustment));
        }
        
        if (settings.contrastEnhancement !== 1) {
          adjustedR = this.applyContrastToChannel(adjustedR, settings.contrastEnhancement);
          adjustedG = this.applyContrastToChannel(adjustedG, settings.contrastEnhancement);
          adjustedB = this.applyContrastToChannel(adjustedB, settings.contrastEnhancement);
        }
        
        // Select character using the chosen algorithm (if character mapping is enabled)
        let character: string;
        if (settings.enableCharacterMapping) {
          character = this.selectCharacterWithAlgorithm(
            adjustedR, adjustedG, adjustedB,
            settings.characterPalette,
            settings.mappingMethod,
            settings.invertDensity
          );
        } else {
          // Use space character if character mapping is disabled (for pixel-art style effects)
          character = ' ';
        }
        
        // Determine text (foreground) color
        let color: string;
        if (settings.enableTextColorMapping && settings.textColorPalette.length > 0) {
          // Use palette-based color mapping
          if (settings.textColorMappingMode === 'dithering') {
            color = ColorMatcher.ditherColor(adjustedR, adjustedG, adjustedB, settings.textColorPalette, settings.ditherStrength);
          } else if (settings.textColorMappingMode === 'by-index') {
            color = ColorMatcher.mapColorByIndex(adjustedR, adjustedG, adjustedB, settings.textColorPalette);
          } else {
            color = ColorMatcher.findClosestColor(adjustedR, adjustedG, adjustedB, settings.textColorPalette);
          }
        } else if (!settings.enableTextColorMapping) {
          // Use default text color when text color mapping is explicitly disabled
          color = settings.defaultTextColor;
        } else if (settings.useOriginalColors) {
          // Legacy color handling (only when text color mapping is not explicitly controlled)
          if (settings.colorQuantization === 'none') {
            color = ColorMatcher.rgbToHex(r, g, b);
          } else {
            color = this.quantizeColor(r, g, b, quantizedColors);
          }
        } else {
          // Fallback to default text color
          color = settings.defaultTextColor;
        }
        
        // Determine background color
        let bgColor: string;
        if (settings.enableBackgroundColorMapping && settings.backgroundColorPalette.length > 0) {
          // Use palette-based background color mapping
          if (settings.backgroundColorMappingMode === 'dithering') {
            bgColor = ColorMatcher.ditherColor(adjustedR, adjustedG, adjustedB, settings.backgroundColorPalette, settings.ditherStrength);
          } else if (settings.backgroundColorMappingMode === 'by-index') {
            bgColor = ColorMatcher.mapColorByIndex(adjustedR, adjustedG, adjustedB, settings.backgroundColorPalette);
          } else {
            bgColor = ColorMatcher.findClosestColor(adjustedR, adjustedG, adjustedB, settings.backgroundColorPalette);
          }
        } else {
          bgColor = 'transparent'; // Default transparent background
        }
        
        // Create cell
        const cellKey = `${x},${y}`;
        cells.set(cellKey, {
          char: character,
          color,
          bgColor
        });
        
        // Track usage
        colorPalette.add(color);
        characterUsage[character] = (characterUsage[character] || 0) + 1;
      }
    }
    
    const endTime = performance.now();
    
    return {
      cells,
      colorPalette: Array.from(colorPalette),
      characterUsage,
      metadata: {
        width,
        height,
        totalCells: cells.size,
        uniqueColors: colorPalette.size,
        conversionTime: endTime - startTime
      }
    };
  }
  
  /**
   * Apply contrast enhancement to individual color channel
   */
  private applyContrastToChannel(channelValue: number, enhancement: number): number {
    // Sigmoid contrast curve applied to individual channel
    const normalized = channelValue / 255;
    const enhanced = 1 / (1 + Math.exp(-enhancement * (normalized - 0.5) * 6));
    return Math.round(Math.max(0, Math.min(255, enhanced * 255)));
  }
  
  /**
   * Select character using the specified algorithm
   */
  private selectCharacterWithAlgorithm(
    r: number,
    g: number,
    b: number,
    characterPalette: CharacterPalette,
    mappingMethod: CharacterMappingSettings['mappingMethod'],
    invertDensity: boolean
  ): string {
    const algorithm = MAPPING_ALGORITHMS[mappingMethod];
    if (!algorithm) {
      console.warn(`Unknown mapping algorithm: ${mappingMethod}, falling back to brightness`);
      return MAPPING_ALGORITHMS.brightness.mapPixelToCharacter(r, g, b, characterPalette.characters);
    }
    
    let characters = [...characterPalette.characters];
    
    // Invert character order if requested (light to dark becomes dark to light)
    if (invertDensity) {
      characters = characters.reverse();
    }
    
    // Use the algorithm to map pixel to character
    return algorithm.mapPixelToCharacter(r, g, b, characters);
  }
  
  /**
   * Convert RGB to hex color
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
  }
  
  /**
   * Extract dominant colors from image using k-means clustering
   */
  private extractColors(imageData: ImageData, paletteSize: number): string[] {
    const { data, width, height } = imageData;
    const pixels: [number, number, number][] = [];
    
    // Sample pixels (take every nth pixel for performance)
    const sampleRate = Math.max(1, Math.floor((width * height) / 1000));
    
    for (let i = 0; i < data.length; i += 4 * sampleRate) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      if (a >= 128) { // Skip transparent pixels
        pixels.push([r, g, b]);
      }
    }
    
    // Simple color quantization (can be enhanced with k-means later)
    const colorCounts = new Map<string, number>();
    
    pixels.forEach(([r, g, b]) => {
      // Quantize to reduce color space
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const key = this.rgbToHex(qr, qg, qb);
      
      colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
    });
    
    // Get most frequent colors
    const sortedColors = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, paletteSize)
      .map(([color]) => color);
    
    return sortedColors;
  }
  
  /**
   * Quantize color to nearest palette color
   */
  private quantizeColor(
    r: number, 
    g: number, 
    b: number, 
    palette: string[]
  ): string {
    const originalColor = this.rgbToHex(r, g, b);
    
    // Check cache first
    if (this.colorCache.has(originalColor)) {
      return this.colorCache.get(originalColor)!;
    }
    
    let nearestColor = palette[0] || '#000000';
    let minDistance = Infinity;
    
    palette.forEach(paletteColor => {
      const distance = this.colorDistance(r, g, b, paletteColor);
      if (distance < minDistance) {
        minDistance = distance;
        nearestColor = paletteColor;
      }
    });
    
    // Cache result
    this.colorCache.set(originalColor, nearestColor);
    
    return nearestColor;
  }
  
  /**
   * Calculate Euclidean distance between colors
   */
  private colorDistance(r: number, g: number, b: number, hexColor: string): number {
    const targetR = parseInt(hexColor.slice(1, 3), 16);
    const targetG = parseInt(hexColor.slice(3, 5), 16);
    const targetB = parseInt(hexColor.slice(5, 7), 16);
    
    return Math.sqrt(
      Math.pow(r - targetR, 2) +
      Math.pow(g - targetG, 2) +
      Math.pow(b - targetB, 2)
    );
  }
  
  /**
   * Clear color cache (call when settings change)
   */
  clearCache(): void {
    this.colorCache.clear();
  }
}

// Singleton instance
export const asciiConverter = new ASCIIConverter();