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

// Default ASCII character set for brightness mapping (darkest to lightest)
export const DEFAULT_ASCII_CHARS = [
  '@', '#', 'S', '%', '?', '*', '+', ';', ':', ',', '.', ' '
];

// Extended ASCII character set for more detail
export const EXTENDED_ASCII_CHARS = [
  '█', '▉', '▊', '▋', '▌', '▍', '▎', '▏', '▓', '▒', '░', '■', '□', 
  '@', '#', 'S', '%', '?', '*', '+', ';', ':', ',', '.', ' '
];

// Character sets by density for different artistic effects
export const ASCII_CHARACTER_SETS = {
  minimal: [' ', '.', ':', ';', '+', '*', '#', '@'],
  standard: DEFAULT_ASCII_CHARS,
  extended: EXTENDED_ASCII_CHARS,
  blocks: ['█', '▓', '▒', '░', ' '],
  custom: [] as string[] // Will be populated by user selection
};

export interface ConversionSettings {
  // Character mapping
  characterSet: string[];
  characterMappingMode: 'brightness' | 'edge' | 'custom';
  customCharacterMapping?: { [brightness: string]: string };
  
  // Color settings
  useOriginalColors: boolean;
  colorQuantization: 'none' | 'basic' | 'advanced';
  paletteSize: number;
  colorMappingMode: 'closest' | 'dithering';
  
  // Processing options
  contrastEnhancement: number; // 0-2 multiplier
  brightnessAdjustment: number; // -100 to 100
  ditherStrength: number; // 0-1 for dithering algorithms
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
        
        // Calculate brightness for character selection
        const brightness = this.calculateBrightness(r, g, b);
        
        // Apply brightness adjustment
        const adjustedBrightness = Math.max(0, Math.min(255, 
          brightness + (settings.brightnessAdjustment * 2.55)
        ));
        
        // Apply contrast enhancement
        const enhancedBrightness = this.applyContrast(adjustedBrightness, settings.contrastEnhancement);
        
        // Select character based on brightness
        const character = this.selectCharacter(
          enhancedBrightness, 
          settings.characterSet, 
          settings.characterMappingMode,
          settings.customCharacterMapping
        );
        
        // Determine color
        let color: string;
        if (settings.useOriginalColors) {
          if (settings.colorQuantization === 'none') {
            color = this.rgbToHex(r, g, b);
          } else {
            color = this.quantizeColor(r, g, b, quantizedColors);
          }
        } else {
          color = '#ffffff'; // White for simple ASCII
        }
        
        // Create cell
        const cellKey = `${x},${y}`;
        cells.set(cellKey, {
          char: character,
          color,
          bgColor: 'transparent'
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
   * Calculate luminance-based brightness
   */
  private calculateBrightness(r: number, g: number, b: number): number {
    // Using relative luminance formula (Rec. 709)
    return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
  }
  
  /**
   * Apply contrast enhancement
   */
  private applyContrast(brightness: number, enhancement: number): number {
    // Sigmoid contrast curve
    const normalized = brightness / 255;
    const enhanced = 1 / (1 + Math.exp(-enhancement * (normalized - 0.5) * 6));
    return Math.round(enhanced * 255);
  }
  
  /**
   * Select character based on brightness and mapping mode
   */
  private selectCharacter(
    brightness: number,
    characterSet: string[],
    mappingMode: ConversionSettings['characterMappingMode'],
    customMapping?: { [brightness: string]: string }
  ): string {
    if (mappingMode === 'custom' && customMapping) {
      const key = Math.round(brightness / 16) * 16; // Group into ranges
      return customMapping[key.toString()] || characterSet[0];
    }
    
    // Standard brightness mapping
    const charIndex = Math.floor((brightness / 255) * (characterSet.length - 1));
    return characterSet[Math.max(0, Math.min(characterSet.length - 1, charIndex))];
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