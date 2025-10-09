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
  saturationAdjustment: number; // -100 to 100
  highlightsAdjustment: number; // -100 to 100
  shadowsAdjustment: number; // -100 to 100
  midtonesAdjustment: number; // -100 to 100
  blurAmount: number; // 0-10
  sharpenAmount: number; // 0-10
  ditherStrength: number; // 0-1 for dithering algorithms
}

/**
 * Mapping algorithm interface for extensibility
 */
export interface MappingAlgorithmOptions {
  neighborValues?: number[];
  gradientMagnitude?: number;
  sobelX?: number;
  sobelY?: number;
}

export interface MappingAlgorithm {
  name: string;
  description: string;
  mapPixelToCharacter: (
    r: number,
    g: number,
    b: number,
    characters: string[],
    options?: MappingAlgorithmOptions
  ) => string;
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
    // Fixed mapping: ensures all characters are used by mapping brightness 0-255 to indices 0-(length-1)
    const charIndex = Math.min(Math.floor((brightness / 256) * characters.length), characters.length - 1);
    return characters[charIndex];
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
    // Fixed mapping: ensures all characters are used by mapping luminance 0-255 to indices 0-(length-1)
    const charIndex = Math.min(Math.floor((luminance / 256) * characters.length), characters.length - 1);
    return characters[charIndex];
  }
};

/**
 * Contrast-based mapping algorithm
 */
export const contrastAlgorithm: MappingAlgorithm = {
  name: 'contrast',
  description: 'Maps characters based on local contrast detection',
  mapPixelToCharacter: (
    r: number,
    g: number,
    b: number,
    characters: string[],
    options?: MappingAlgorithmOptions
  ) => {
    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    
    // If neighbor values are provided, calculate local contrast
    if (options?.neighborValues && options.neighborValues.length > 0) {
      const avgNeighbor = options.neighborValues.reduce((sum, val) => sum + val, 0) / options.neighborValues.length;
      const localContrast = Math.abs(brightness - avgNeighbor) / 255;
      
      // Calculate standard deviation for better contrast measurement
      const variance = options.neighborValues.reduce((sum, val) => {
        const diff = val - avgNeighbor;
        return sum + (diff * diff);
      }, 0) / options.neighborValues.length;
      const stdDev = Math.sqrt(variance) / 255;
      
      // Combine local contrast with neighborhood variance for better contrast detection
      const contrastScore = (localContrast * 0.7) + (stdDev * 0.3);
      
      // Map contrast score to character index - higher contrast gets denser characters
      const contrastBasedIndex = Math.min(
        Math.floor(contrastScore * characters.length * 1.5), 
        characters.length - 1
      );
      
      // Blend contrast-based selection with brightness-based selection
      const brightnessIndex = Math.min(Math.floor((brightness / 256) * characters.length), characters.length - 1);
      const blendedIndex = Math.floor((contrastBasedIndex * 0.6) + (brightnessIndex * 0.4));
      
      return characters[Math.min(blendedIndex, characters.length - 1)];
    }
    
    // Fallback to brightness if no neighbors - fixed mapping
    const charIndex = Math.min(Math.floor((brightness / 256) * characters.length), characters.length - 1);
    return characters[charIndex];
  }
};

/**
 * Edge detection mapping algorithm
 */
export const edgeDetectionAlgorithm: MappingAlgorithm = {
  name: 'edge-detection',
  description: 'Maps characters based on edge detection for line art',
  mapPixelToCharacter: (
    r: number,
    g: number,
    b: number,
    characters: string[],
    options?: MappingAlgorithmOptions
  ) => {
    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    
    // If Sobel gradient values are provided, calculate proper edge strength
    if (options?.sobelX !== undefined && options?.sobelY !== undefined) {
      const gradientMagnitude = Math.sqrt(options.sobelX * options.sobelX + options.sobelY * options.sobelY);
      const edgeStrength = Math.min(gradientMagnitude / 765, 1); // Normalize to 0-1 (765 = max possible gradient)
      
      // For strong edges, prefer characters with more visual density
      if (edgeStrength > 0.2) {
        // Map edge strength to higher-density characters
        const edgeCharIndex = Math.floor(edgeStrength * characters.length);
        const minIndex = Math.floor(characters.length * 0.4); // Prefer at least medium-density chars for edges
        return characters[Math.min(Math.max(edgeCharIndex, minIndex), characters.length - 1)];
      }
      
      // For weak edges, blend with brightness
      const brightnessIndex = Math.min(Math.floor((brightness / 256) * characters.length), characters.length - 1);
      const edgeInfluence = edgeStrength * 0.5; // Moderate influence for weak edges
      const blendedIndex = Math.floor((brightnessIndex * (1 - edgeInfluence)) + (characters.length * 0.6 * edgeInfluence));
      return characters[Math.min(blendedIndex, characters.length - 1)];
    }
    
    // Fallback using gradient magnitude (legacy support)
    if (options?.gradientMagnitude !== undefined) {
      const edgeStrength = options.gradientMagnitude / 255;
      
      if (edgeStrength > 0.3) {
        const edgeCharIndex = Math.min(Math.floor((edgeStrength / 256) * characters.length), characters.length - 1);
        return characters[Math.max(Math.floor(characters.length * 0.5), edgeCharIndex)];
      }
    }
    
    // For non-edges, use brightness-based selection - fixed mapping
    const charIndex = Math.min(Math.floor((brightness / 256) * characters.length), characters.length - 1);
    return characters[charIndex];
  }
};

/**
 * Saturation-based mapping algorithm
 */
export const saturationAlgorithm: MappingAlgorithm = {
  name: 'saturation',
  description: 'Maps characters based on color saturation intensity',
  mapPixelToCharacter: (r: number, g: number, b: number, characters: string[]) => {
    // Calculate HSV saturation
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    
    const saturation = max === 0 ? 0 : (max - min) / max;
    
    // Map saturation (0-1) to character index - higher saturation gets denser characters
    const charIndex = Math.min(Math.floor(saturation * characters.length), characters.length - 1);
    return characters[charIndex];
  }
};

/**
 * Red channel mapping algorithm
 */
export const redChannelAlgorithm: MappingAlgorithm = {
  name: 'red-channel',
  description: 'Maps characters based on red color channel intensity',
  mapPixelToCharacter: (r: number, _g: number, _b: number, characters: string[]) => {
    // Use red channel value directly
    const charIndex = Math.min(Math.floor((r / 256) * characters.length), characters.length - 1);
    return characters[charIndex];
  }
};

/**
 * Green channel mapping algorithm
 */
export const greenChannelAlgorithm: MappingAlgorithm = {
  name: 'green-channel',
  description: 'Maps characters based on green color channel intensity',
  mapPixelToCharacter: (_r: number, g: number, _b: number, characters: string[]) => {
    // Use green channel value directly
    const charIndex = Math.min(Math.floor((g / 256) * characters.length), characters.length - 1);
    return characters[charIndex];
  }
};

/**
 * Blue channel mapping algorithm
 */
export const blueChannelAlgorithm: MappingAlgorithm = {
  name: 'blue-channel',
  description: 'Maps characters based on blue color channel intensity',
  mapPixelToCharacter: (_r: number, _g: number, b: number, characters: string[]) => {
    // Use blue channel value directly
    const charIndex = Math.min(Math.floor((b / 256) * characters.length), characters.length - 1);
    return characters[charIndex];
  }
};

/**
 * Registry of available mapping algorithms
 */
export const MAPPING_ALGORITHMS: Record<CharacterMappingSettings['mappingMethod'], MappingAlgorithm> = {
  'brightness': brightnessAlgorithm,
  'luminance': luminanceAlgorithm,
  'contrast': contrastAlgorithm,
  'edge-detection': edgeDetectionAlgorithm,
  'saturation': saturationAlgorithm,
  'red-channel': redChannelAlgorithm,
  'green-channel': greenChannelAlgorithm,
  'blue-channel': blueChannelAlgorithm
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
    
    // Fixed mapping: ensures all colors are used by mapping brightness 0-255 to indices 0-(length-1)
    const paletteIndex = Math.min(Math.floor((brightness / 256) * palette.length), palette.length - 1);
    
    return palette[paletteIndex];
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
    
    let { imageData } = frame;
    
    // Apply blur filter if specified
    if (settings.blurAmount > 0) {
      imageData = this.applyBlurFilter(imageData, settings.blurAmount);
    }
    
    // Apply sharpen filter if specified
    if (settings.sharpenAmount > 0) {
      imageData = this.applySharpenFilter(imageData, settings.sharpenAmount);
    }
    
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
        
        // Apply preprocessing adjustments to RGB values
        let adjustedR = r, adjustedG = g, adjustedB = b;
        
        // Apply brightness adjustment
        if (settings.brightnessAdjustment !== 0) {
          const adjustment = settings.brightnessAdjustment * 2.55;
          adjustedR = Math.max(0, Math.min(255, r + adjustment));
          adjustedG = Math.max(0, Math.min(255, g + adjustment));
          adjustedB = Math.max(0, Math.min(255, b + adjustment));
        }
        
        // Apply contrast enhancement
        if (settings.contrastEnhancement !== 1) {
          adjustedR = this.applyContrastToChannel(adjustedR, settings.contrastEnhancement);
          adjustedG = this.applyContrastToChannel(adjustedG, settings.contrastEnhancement);
          adjustedB = this.applyContrastToChannel(adjustedB, settings.contrastEnhancement);
        }
        
        // Apply saturation adjustment
        if (settings.saturationAdjustment !== 0) {
          [adjustedR, adjustedG, adjustedB] = this.applySaturationAdjustment(adjustedR, adjustedG, adjustedB, settings.saturationAdjustment);
        }
        
        // Apply tonal adjustments (highlights, shadows, midtones)
        if (settings.highlightsAdjustment !== 0 || settings.shadowsAdjustment !== 0 || settings.midtonesAdjustment !== 0) {
          [adjustedR, adjustedG, adjustedB] = this.applyTonalAdjustments(
            adjustedR, adjustedG, adjustedB,
            settings.highlightsAdjustment,
            settings.shadowsAdjustment,
            settings.midtonesAdjustment
          );
        }
        
        // Select character using the chosen algorithm (if character mapping is enabled)
        let character: string;
        if (settings.enableCharacterMapping) {
          // Calculate additional data for advanced algorithms
          const algorithmOptions: MappingAlgorithmOptions = {};
          
          if (settings.mappingMethod === 'contrast' || settings.mappingMethod === 'edge-detection') {
            // Calculate neighbor values for contrast and edge detection
            const neighbors = this.getNeighborValues(data, width, height, x, y);
            algorithmOptions.neighborValues = neighbors;
            
            // For edge detection, calculate Sobel gradients
            if (settings.mappingMethod === 'edge-detection') {
              const { sobelX, sobelY } = this.calculateSobelGradients(data, width, height, x, y);
              algorithmOptions.sobelX = sobelX;
              algorithmOptions.sobelY = sobelY;
            }
          }
          
          character = this.selectCharacterWithAlgorithm(
            adjustedR, adjustedG, adjustedB,
            settings.characterPalette,
            settings.mappingMethod,
            settings.invertDensity,
            algorithmOptions
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
   * Apply saturation adjustment to RGB values
   */
  private applySaturationAdjustment(r: number, g: number, b: number, saturationAdjustment: number): [number, number, number] {
    // Convert RGB to HSL
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;
    
    // Calculate lightness
    const lightness = (max + min) / 2;
    
    // If no saturation (grayscale), return original
    if (delta === 0) {
      return [r, g, b];
    }
    
    // Calculate current saturation
    const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    
    // Apply saturation adjustment (-100 to 100 -> 0 to 2 multiplier)
    const saturationMultiplier = 1 + (saturationAdjustment / 100);
    const newSaturation = Math.max(0, Math.min(1, saturation * saturationMultiplier));
    
    // Calculate hue
    let hue = 0;
    if (max === rNorm) {
      hue = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) / 6;
    } else if (max === gNorm) {
      hue = ((bNorm - rNorm) / delta + 2) / 6;
    } else {
      hue = ((rNorm - gNorm) / delta + 4) / 6;
    }
    
    // Convert HSL back to RGB
    const c = (1 - Math.abs(2 * lightness - 1)) * newSaturation;
    const x = c * (1 - Math.abs(((hue * 6) % 2) - 1));
    const m = lightness - c / 2;
    
    let rPrime = 0, gPrime = 0, bPrime = 0;
    const hueSegment = hue * 6;
    
    if (hueSegment < 1) {
      rPrime = c; gPrime = x; bPrime = 0;
    } else if (hueSegment < 2) {
      rPrime = x; gPrime = c; bPrime = 0;
    } else if (hueSegment < 3) {
      rPrime = 0; gPrime = c; bPrime = x;
    } else if (hueSegment < 4) {
      rPrime = 0; gPrime = x; bPrime = c;
    } else if (hueSegment < 5) {
      rPrime = x; gPrime = 0; bPrime = c;
    } else {
      rPrime = c; gPrime = 0; bPrime = x;
    }
    
    const newR = Math.round((rPrime + m) * 255);
    const newG = Math.round((gPrime + m) * 255);
    const newB = Math.round((bPrime + m) * 255);
    
    return [
      Math.max(0, Math.min(255, newR)),
      Math.max(0, Math.min(255, newG)),
      Math.max(0, Math.min(255, newB))
    ];
  }

  /**
   * Apply tonal adjustments (highlights, shadows, midtones)
   */
  private applyTonalAdjustments(
    r: number, g: number, b: number,
    highlightsAdjustment: number,
    shadowsAdjustment: number,
    midtonesAdjustment: number
  ): [number, number, number] {
    // Calculate luminance to determine which tonal range this pixel belongs to
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const normalizedLuminance = luminance / 255;
    
    // Calculate weights for each tonal range using smooth transitions
    const shadowWeight = Math.max(0, 1 - normalizedLuminance * 2); // Strong in dark areas
    const highlightWeight = Math.max(0, (normalizedLuminance - 0.5) * 2); // Strong in bright areas
    const midtoneWeight = 1 - Math.abs(normalizedLuminance - 0.5) * 2; // Strong in middle areas
    
    // Apply adjustments based on tonal range weights
    const shadowAdjust = (shadowsAdjustment / 100) * shadowWeight;
    const highlightAdjust = (highlightsAdjustment / 100) * highlightWeight;
    const midtoneAdjust = (midtonesAdjustment / 100) * midtoneWeight;
    
    // Combine adjustments
    const totalAdjustment = (shadowAdjust + highlightAdjust + midtoneAdjust) * 2.55;
    
    const newR = Math.max(0, Math.min(255, r + totalAdjustment));
    const newG = Math.max(0, Math.min(255, g + totalAdjustment));
    const newB = Math.max(0, Math.min(255, b + totalAdjustment));
    
    return [newR, newG, newB];
  }

  /**
   * Apply blur filter to image data
   */
  private applyBlurFilter(imageData: ImageData, blurAmount: number): ImageData {
    if (blurAmount <= 0) return imageData;
    
    const { data, width, height } = imageData;
    const result = new ImageData(width, height);
    const resultData = result.data;
    
    // Gaussian blur approximation using box blur passes
    // Number of passes increases with blur amount for better quality
    const passes = Math.ceil(blurAmount / 2);
    const currentData = new Uint8ClampedArray(data);
    const tempData = new Uint8ClampedArray(data.length);
    
    for (let pass = 0; pass < passes; pass++) {
      // Horizontal pass
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const centerIndex = (y * width + x) * 4;
          let r = 0, g = 0, b = 0, a = 0;
          let count = 0;
          
          // Box blur kernel size based on blur amount
          const kernelRadius = Math.max(1, Math.floor(blurAmount / Math.max(1, passes)));
          
          for (let i = -kernelRadius; i <= kernelRadius; i++) {
            const sampleX = Math.max(0, Math.min(width - 1, x + i));
            const sampleIndex = (y * width + sampleX) * 4;
            
            r += currentData[sampleIndex];
            g += currentData[sampleIndex + 1];
            b += currentData[sampleIndex + 2];
            a += currentData[sampleIndex + 3];
            count++;
          }
          
          tempData[centerIndex] = r / count;
          tempData[centerIndex + 1] = g / count;
          tempData[centerIndex + 2] = b / count;
          tempData[centerIndex + 3] = a / count;
        }
      }
      
      // Vertical pass
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const centerIndex = (y * width + x) * 4;
          let r = 0, g = 0, b = 0, a = 0;
          let count = 0;
          
          const kernelRadius = Math.max(1, Math.floor(blurAmount / Math.max(1, passes)));
          
          for (let i = -kernelRadius; i <= kernelRadius; i++) {
            const sampleY = Math.max(0, Math.min(height - 1, y + i));
            const sampleIndex = (sampleY * width + x) * 4;
            
            r += tempData[sampleIndex];
            g += tempData[sampleIndex + 1];
            b += tempData[sampleIndex + 2];
            a += tempData[sampleIndex + 3];
            count++;
          }
          
          currentData[centerIndex] = r / count;
          currentData[centerIndex + 1] = g / count;
          currentData[centerIndex + 2] = b / count;
          currentData[centerIndex + 3] = a / count;
        }
      }
    }
    
    // Copy result back
    resultData.set(currentData);
    return result;
  }

  /**
   * Apply sharpen filter to image data
   */
  private applySharpenFilter(imageData: ImageData, sharpenAmount: number): ImageData {
    if (sharpenAmount <= 0) return imageData;
    
    const { data, width, height } = imageData;
    const result = new ImageData(width, height);
    const resultData = result.data;
    
    // Unsharp mask kernel - center weight increases with sharpen amount
    const centerWeight = 1 + (sharpenAmount * 0.8);
    const neighborWeight = -(sharpenAmount * 0.2);
    
    // Sharpen kernel: neighbor values are negative, center is positive
    // This enhances edges by subtracting the blur from the original
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const centerIndex = (y * width + x) * 4;
        
        let r = data[centerIndex] * centerWeight;
        let g = data[centerIndex + 1] * centerWeight;
        let b = data[centerIndex + 2] * centerWeight;
        const a = data[centerIndex + 3]; // Alpha unchanged
        
        // Apply 3x3 kernel with neighbor weights
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue; // Skip center pixel
            
            const neighborX = Math.max(0, Math.min(width - 1, x + dx));
            const neighborY = Math.max(0, Math.min(height - 1, y + dy));
            const neighborIndex = (neighborY * width + neighborX) * 4;
            
            r += data[neighborIndex] * neighborWeight;
            g += data[neighborIndex + 1] * neighborWeight;
            b += data[neighborIndex + 2] * neighborWeight;
          }
        }
        
        // Clamp values and apply
        resultData[centerIndex] = Math.max(0, Math.min(255, Math.round(r)));
        resultData[centerIndex + 1] = Math.max(0, Math.min(255, Math.round(g)));
        resultData[centerIndex + 2] = Math.max(0, Math.min(255, Math.round(b)));
        resultData[centerIndex + 3] = a;
      }
    }
    
    return result;
  }
  
  /**
   * Get neighbor brightness values for contrast calculation
   */
  private getNeighborValues(data: Uint8ClampedArray, width: number, height: number, x: number, y: number): number[] {
    const neighbors: number[] = [];
    
    // Check 8-connected neighbors
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue; // Skip center pixel
        
        const nx = x + dx;
        const ny = y + dy;
        
        // Check bounds
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const pixelIndex = (ny * width + nx) * 4;
          const r = data[pixelIndex];
          const g = data[pixelIndex + 1];
          const b = data[pixelIndex + 2];
          
          // Calculate brightness using same formula as brightness algorithm
          const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          neighbors.push(brightness);
        }
      }
    }
    
    return neighbors;
  }

  /**
   * Calculate Sobel gradients for edge detection
   */
  private calculateSobelGradients(data: Uint8ClampedArray, width: number, height: number, x: number, y: number): { sobelX: number, sobelY: number } {
    // Sobel X kernel: [-1, 0, 1; -2, 0, 2; -1, 0, 1]
    // Sobel Y kernel: [-1, -2, -1; 0, 0, 0; 1, 2, 1]
    
    let sobelX = 0;
    let sobelY = 0;
    
    const sobelXKernel = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelYKernel = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        
        // Use edge pixel values for out-of-bounds pixels
        const boundedX = Math.max(0, Math.min(width - 1, nx));
        const boundedY = Math.max(0, Math.min(height - 1, ny));
        
        const pixelIndex = (boundedY * width + boundedX) * 4;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        
        // Convert to grayscale
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        
        // Apply Sobel kernels
        const kernelY = dy + 1;
        const kernelX = dx + 1;
        
        sobelX += gray * sobelXKernel[kernelY][kernelX];
        sobelY += gray * sobelYKernel[kernelY][kernelX];
      }
    }
    
    return { sobelX, sobelY };
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
    invertDensity: boolean,
    options?: MappingAlgorithmOptions
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
    return algorithm.mapPixelToCharacter(r, g, b, characters, options);
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