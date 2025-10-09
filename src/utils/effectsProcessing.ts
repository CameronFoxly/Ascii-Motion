/**
 * effectsProcessing.ts - Core effect processing algorithms for ASCII Motion
 * 
 * Provides functions to apply each effect type to canvas data, supporting
 * both single frame and timeline application with proper error handling.
 */

import type { Cell, Frame } from '../types';
import type {
  EffectType,
  LevelsEffectSettings,
  HueSaturationEffectSettings,
  RemapColorsEffectSettings,
  RemapCharactersEffectSettings,
  EffectProcessingResult,
  ColorRange,
} from '../types/effects';

/**
 * Main effect processing function - applies an effect to canvas data
 */
export async function processEffect(
  effectType: EffectType,
  cells: Map<string, Cell>,
  settings: LevelsEffectSettings | HueSaturationEffectSettings | RemapColorsEffectSettings | RemapCharactersEffectSettings
): Promise<EffectProcessingResult> {
  const startTime = performance.now();
  
  try {
    let processedCells: Map<string, Cell> | null = null;
    let affectedCells = 0;

    switch (effectType) {
      case 'levels': {
        const result = await processLevelsEffect(cells, settings as LevelsEffectSettings);
        processedCells = result.processedCells;
        affectedCells = result.affectedCells;
        break;
      }
        
      case 'hue-saturation': {
        const hsResult = await processHueSaturationEffect(cells, settings as HueSaturationEffectSettings);
        processedCells = hsResult.processedCells;
        affectedCells = hsResult.affectedCells;
        break;
      }
        
      case 'remap-colors': {
        const rcResult = await processRemapColorsEffect(cells, settings as RemapColorsEffectSettings);
        processedCells = rcResult.processedCells;
        affectedCells = rcResult.affectedCells;
        break;
      }
        
      case 'remap-characters': {
        const rchResult = await processRemapCharactersEffect(cells, settings as RemapCharactersEffectSettings);
        processedCells = rchResult.processedCells;
        affectedCells = rchResult.affectedCells;
        break;
      }
        
      default:
        throw new Error(`Unknown effect type: ${effectType}`);
    }

    const processingTime = performance.now() - startTime;

    return {
      success: true,
      processedCells,
      affectedCells,
      processingTime,
    };

  } catch (error) {
    const processingTime = performance.now() - startTime;
    console.error(`Effect processing failed for ${effectType}:`, error);
    
    return {
      success: false,
      processedCells: null,
      affectedCells: 0,
      processingTime,
      error: error instanceof Error ? error.message : 'Unknown processing error'
    };
  }
}

/**
 * Process multiple frames with an effect (for timeline application)
 */
export async function processEffectOnFrames(
  effectType: EffectType,
  frames: Frame[],
  settings: LevelsEffectSettings | HueSaturationEffectSettings | RemapColorsEffectSettings | RemapCharactersEffectSettings,
  onProgress?: (frameIndex: number, totalFrames: number) => void
): Promise<{ processedFrames: Frame[], totalAffectedCells: number, processingTime: number, errors: string[] }> {
  const startTime = performance.now();
  const processedFrames: Frame[] = [];
  const errors: string[] = [];
  let totalAffectedCells = 0;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    onProgress?.(i, frames.length);

    try {
  const result = await processEffect(effectType, frame.data, settings);
      
      if (result.success && result.processedCells) {
        processedFrames.push({
          ...frame,
          data: result.processedCells
        });
        totalAffectedCells += result.affectedCells;
      } else {
        // Keep original frame if processing failed
        processedFrames.push(frame);
        if (result.error) {
          errors.push(`Frame ${i}: ${result.error}`);
        }
      }
    } catch (error) {
      processedFrames.push(frame);
      errors.push(`Frame ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const processingTime = performance.now() - startTime;

  return {
    processedFrames,
    totalAffectedCells,
    processingTime,
    errors
  };
}

/**
 * Levels Effect Processing
 */
async function processLevelsEffect(
  cells: Map<string, Cell>,
  settings: LevelsEffectSettings
): Promise<{ processedCells: Map<string, Cell>, affectedCells: number }> {
  const processedCells = new Map<string, Cell>();
  let affectedCells = 0;

  const {
    shadowsInput,
    midtonesInput,
    highlightsInput,
    outputMin,
    outputMax,
    colorRange
  } = settings;

  cells.forEach((cell, position) => {
    const newCell = { ...cell };
    let cellModified = false;

    // Apply levels to foreground color
    if (cell.color && shouldProcessColor(cell.color, colorRange)) {
      const adjustedColor = applyLevelsToColor(
        cell.color,
        shadowsInput,
        midtonesInput,
        highlightsInput,
        outputMin,
        outputMax
      );
      if (adjustedColor !== cell.color) {
        newCell.color = adjustedColor;
        cellModified = true;
      }
    }

    // Apply levels to background color
    if (cell.bgColor && cell.bgColor !== 'transparent' && shouldProcessColor(cell.bgColor, colorRange)) {
      const adjustedBgColor = applyLevelsToColor(
        cell.bgColor,
        shadowsInput,
        midtonesInput,
        highlightsInput,
        outputMin,
        outputMax
      );
      if (adjustedBgColor !== cell.bgColor) {
        newCell.bgColor = adjustedBgColor;
        cellModified = true;
      }
    }

    processedCells.set(position, newCell);
    if (cellModified) affectedCells++;
  });

  return { processedCells, affectedCells };
}

/**
 * Hue & Saturation Effect Processing
 */
async function processHueSaturationEffect(
  cells: Map<string, Cell>,
  settings: HueSaturationEffectSettings
): Promise<{ processedCells: Map<string, Cell>, affectedCells: number }> {
  const processedCells = new Map<string, Cell>();
  let affectedCells = 0;

  const { hue, saturation, lightness, colorRange } = settings;

  cells.forEach((cell, position) => {
    const newCell = { ...cell };
    let cellModified = false;

    // Apply HSL adjustments to foreground color
    if (cell.color && shouldProcessColor(cell.color, colorRange)) {
      const adjustedColor = applyHSLAdjustments(cell.color, hue, saturation, lightness);
      if (adjustedColor !== cell.color) {
        newCell.color = adjustedColor;
        cellModified = true;
      }
    }

    // Apply HSL adjustments to background color
    if (cell.bgColor && cell.bgColor !== 'transparent' && shouldProcessColor(cell.bgColor, colorRange)) {
      const adjustedBgColor = applyHSLAdjustments(cell.bgColor, hue, saturation, lightness);
      if (adjustedBgColor !== cell.bgColor) {
        newCell.bgColor = adjustedBgColor;
        cellModified = true;
      }
    }

    processedCells.set(position, newCell);
    if (cellModified) affectedCells++;
  });

  return { processedCells, affectedCells };
}

/**
 * Remap Colors Effect Processing
 */
async function processRemapColorsEffect(
  cells: Map<string, Cell>,
  settings: RemapColorsEffectSettings
): Promise<{ processedCells: Map<string, Cell>, affectedCells: number }> {
  const processedCells = new Map<string, Cell>();
  let affectedCells = 0;

  const { colorMappings, matchExact } = settings;

  cells.forEach((cell, position) => {
    const newCell = { ...cell };
    let cellModified = false;

    // Remap foreground color
    if (cell.color) {
      const mappedColor = findColorMapping(cell.color, colorMappings, matchExact);
      if (mappedColor && mappedColor !== cell.color) {
        newCell.color = mappedColor;
        cellModified = true;
      }
    }

    // Remap background color
    if (cell.bgColor && cell.bgColor !== 'transparent') {
      const mappedBgColor = findColorMapping(cell.bgColor, colorMappings, matchExact);
      if (mappedBgColor && mappedBgColor !== cell.bgColor) {
        newCell.bgColor = mappedBgColor;
        cellModified = true;
      }
    }

    processedCells.set(position, newCell);
    if (cellModified) affectedCells++;
  });

  return { processedCells, affectedCells };
}

/**
 * Remap Characters Effect Processing
 */
async function processRemapCharactersEffect(
  cells: Map<string, Cell>,
  settings: RemapCharactersEffectSettings
): Promise<{ processedCells: Map<string, Cell>, affectedCells: number }> {
  const processedCells = new Map<string, Cell>();
  let affectedCells = 0;

  const { characterMappings } = settings;

  cells.forEach((cell, position) => {
    const newCell = { ...cell };
    let cellModified = false;

    // Remap character
    if (cell.char && characterMappings[cell.char]) {
      const mappedChar = characterMappings[cell.char];
      if (mappedChar !== cell.char) {
        newCell.char = mappedChar;
        cellModified = true;
      }
    }

    processedCells.set(position, newCell);
    if (cellModified) affectedCells++;
  });

  return { processedCells, affectedCells };
}

// =============================================================================
// Color Processing Utilities
// =============================================================================

/**
 * Check if a color should be processed based on color range settings
 */
function shouldProcessColor(color: string, colorRange: ColorRange | undefined): boolean {
  if (!colorRange || colorRange.type === 'all') {
    return true;
  }
  
  if (colorRange.type === 'custom') {
    return (colorRange.customColors ?? []).includes(color);
  }
  
  // For 'text' and 'background' types, we'd need context about which colors are text vs background
  // For now, process all colors
  return true;
}

/**
 * Apply levels adjustment to a single color
 */
function applyLevelsToColor(
  color: string,
  shadowsInput: number,
  midtonesInput: number,
  highlightsInput: number,
  outputMin: number,
  outputMax: number
): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  // Apply levels to each channel
  const adjustedR = applyLevelsToChannel(rgb.r, shadowsInput, midtonesInput, highlightsInput, outputMin, outputMax);
  const adjustedG = applyLevelsToChannel(rgb.g, shadowsInput, midtonesInput, highlightsInput, outputMin, outputMax);
  const adjustedB = applyLevelsToChannel(rgb.b, shadowsInput, midtonesInput, highlightsInput, outputMin, outputMax);

  return rgbToHex(adjustedR, adjustedG, adjustedB);
}

/**
 * Apply levels adjustment to a single color channel
 */
function applyLevelsToChannel(
  value: number,
  shadowsInput: number,
  midtonesInput: number,
  highlightsInput: number,
  outputMin: number,
  outputMax: number
): number {
  // Validate input range - prevent division by zero
  if (highlightsInput <= shadowsInput) {
    // Invalid range: highlights must be greater than shadows
    // Return value unchanged to prevent processing errors
    return Math.round(Math.max(0, Math.min(255, value)));
  }
  
  // Clamp input to shadows-highlights range
  if (value <= shadowsInput) return outputMin;
  if (value >= highlightsInput) return outputMax;
  
  // Apply gamma correction for midtones
  const normalizedInput = (value - shadowsInput) / (highlightsInput - shadowsInput);
  const gammaAdjusted = Math.pow(normalizedInput, 1.0 / midtonesInput);
  
  // Map to output range
  const result = outputMin + (gammaAdjusted * (outputMax - outputMin));
  
  return Math.round(Math.max(0, Math.min(255, result)));
}

/**
 * Apply HSL adjustments to a color
 */
function applyHSLAdjustments(color: string, hueShift: number, saturationShift: number, lightnessShift: number): string {
  const hsl = hexToHsl(color);
  if (!hsl) return color;

  // Apply adjustments
  let newHue = (hsl.h + hueShift) % 360;
  if (newHue < 0) newHue += 360;
  
  const newSaturation = Math.max(0, Math.min(100, hsl.s + saturationShift));
  const newLightness = Math.max(0, Math.min(100, hsl.l + lightnessShift));

  return hslToHex(newHue, newSaturation, newLightness);
}

/**
 * Find a color mapping, supporting exact and fuzzy matching
 */
function findColorMapping(color: string, mappings: Record<string, string>, exactMatch: boolean): string | null {
  // Direct exact match
  if (mappings[color]) {
    return mappings[color];
  }
  
  if (!exactMatch) {
    // Try case-insensitive match
    const lowerColor = color.toLowerCase();
    const lowerMappings = Object.entries(mappings).find(([key]) => key.toLowerCase() === lowerColor);
    if (lowerMappings) {
      return lowerMappings[1];
    }
    
    // Try without # prefix
    if (color.startsWith('#')) {
      const withoutHash = color.slice(1);
      if (mappings[withoutHash]) {
        return mappings[withoutHash];
      }
    } else {
      const withHash = '#' + color;
      if (mappings[withHash]) {
        return mappings[withHash];
      }
    }
  }
  
  return null;
}

// =============================================================================
// Color Conversion Utilities
// =============================================================================

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert hex color to HSL
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Convert HSL to hex
 */
function hslToHex(h: number, s: number, l: number): string {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}