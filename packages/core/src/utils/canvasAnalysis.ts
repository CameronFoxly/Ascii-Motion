/**
 * canvasAnalysis.ts - Canvas analysis utilities for Effects system
 * 
 * Provides functions to analyze canvas data and extract information needed
 * for various effects like color remapping, character analysis, etc.
 */

import type { Frame, Canvas } from '../types';
import type { 
  CanvasAnalysis, 
  ColorFrequency, 
  CharacterFrequency
} from '../types/effects';

/**
 * Analyzes a single canvas to extract unique colors, characters, and other metadata
 */
export function analyzeCanvas(canvas: Canvas): CanvasAnalysis {
  const uniqueColors = new Set<string>();
  const uniqueChars = new Set<string>();
  const colorFrequency: Record<string, number> = {};
  const charFrequency: Record<string, number> = {};
  const colorToCharMap: Record<string, Set<string>> = {};
  const charToColorMap: Record<string, Set<string>> = {};
  
  let totalCells = 0;
  let filledCells = 0;

  // Analyze each cell
  canvas.cells.forEach((cell) => {
    totalCells++;
    
    // Skip empty cells (space character with transparent/default colors)
    const isEmpty = cell.char === ' ' || cell.char === '';
    if (!isEmpty) {
      filledCells++;
    }

    // Track foreground colors
    if (cell.color) {
      uniqueColors.add(cell.color);
      colorFrequency[cell.color] = (colorFrequency[cell.color] || 0) + 1;
      
      if (!colorToCharMap[cell.color]) {
        colorToCharMap[cell.color] = new Set();
      }
      colorToCharMap[cell.color].add(cell.char);
    }

    // Track background colors (if not transparent/default)
    if (cell.bgColor && cell.bgColor !== 'transparent' && cell.bgColor !== '#000000') {
      uniqueColors.add(cell.bgColor);
      colorFrequency[cell.bgColor] = (colorFrequency[cell.bgColor] || 0) + 1;
    }

    // Track characters
    if (cell.char) {
      uniqueChars.add(cell.char);
      charFrequency[cell.char] = (charFrequency[cell.char] || 0) + 1;
      
      if (!charToColorMap[cell.char]) {
        charToColorMap[cell.char] = new Set();
      }
      if (cell.color) {
        charToColorMap[cell.char].add(cell.color);
      }
    }
  });

  // Convert frequency objects to sorted arrays
  const colorsByFrequency: ColorFrequency[] = Object.entries(colorFrequency)
    .map(([color, count]) => ({ color, count }))
    .sort((a, b) => b.count - a.count);

  const charactersByFrequency: CharacterFrequency[] = Object.entries(charFrequency)
    .map(([char, count]) => ({ char, count }))
    .sort((a, b) => b.count - a.count);

  // Calculate color distribution percentages
  const colorDistribution = colorsByFrequency.map(({ color, count }) => ({
    color,
    count,
    percentage: totalCells > 0 ? (count / totalCells) * 100 : 0
  }));

  // Calculate character distribution percentages
  const characterDistribution = charactersByFrequency.map(({ char, count }) => ({
    char,
    count,
    percentage: totalCells > 0 ? (count / totalCells) * 100 : 0
  }));

  // Get brightness statistics for colors
  const colorBrightnessStats = calculateColorBrightnessStats(Array.from(uniqueColors));

  return {
    // Basic unique values
    uniqueColors: Array.from(uniqueColors),
    uniqueCharacters: Array.from(uniqueChars),
    
    // Frequency data (original simple format)
    colorFrequency,
    characterFrequency: charFrequency,
    
    // Extended frequency data (sorted arrays)
    colorsByFrequency,
    charactersByFrequency,
    
    // Distribution data with percentages
    colorDistribution,
    characterDistribution,
    
    // Cross-reference mappings
    colorToCharMap: Object.fromEntries(
      Object.entries(colorToCharMap).map(([color, chars]) => [color, Array.from(chars)])
    ),
    charToColorMap: Object.fromEntries(
      Object.entries(charToColorMap).map(([char, colors]) => [char, Array.from(colors)])
    ),
    
    // Canvas statistics
    totalCells,
    filledCells,
    fillPercentage: totalCells > 0 ? (filledCells / totalCells) * 100 : 0,
    
    // Color analysis
    colorBrightnessStats,
    
    // Metadata
    analysisTimestamp: Date.now()
  };
}

/**
 * Analyzes a single frame to extract canvas analysis
 */
export function analyzeFrame(frame: Frame, canvasWidth: number, canvasHeight: number): CanvasAnalysis {
  // Convert frame data to canvas format for analysis
  const canvas: Canvas = {
    width: canvasWidth,
    height: canvasHeight,
    cells: frame.data
  };
  
  return analyzeCanvas(canvas);
}

/**
 * Analyzes multiple frames and combines the results
 */
export function analyzeFrames(frames: Frame[], canvasWidth: number, canvasHeight: number): CanvasAnalysis {
  if (frames.length === 0) {
    return getEmptyAnalysis();
  }

  if (frames.length === 1) {
    return analyzeFrame(frames[0], canvasWidth, canvasHeight);
  }

  // Combine analysis from multiple frames
  const allColors = new Set<string>();
  const allChars = new Set<string>();
  const combinedColorFreq: Record<string, number> = {};
  const combinedCharFreq: Record<string, number> = {};
  const combinedColorToChar: Record<string, Set<string>> = {};
  const combinedCharToColor: Record<string, Set<string>> = {};
  
  let totalCells = 0;
  let totalFilledCells = 0;

  frames.forEach(frame => {
    const frameAnalysis = analyzeFrame(frame, canvasWidth, canvasHeight);
    
    // Combine unique values
    frameAnalysis.uniqueColors.forEach(color => allColors.add(color));
    frameAnalysis.uniqueCharacters.forEach(char => allChars.add(char));
    
    // Combine frequencies
    frameAnalysis.colorsByFrequency.forEach(({ color, count }) => {
      combinedColorFreq[color] = (combinedColorFreq[color] || 0) + count;
    });
    
    frameAnalysis.charactersByFrequency.forEach(({ char, count }) => {
      combinedCharFreq[char] = (combinedCharFreq[char] || 0) + count;
    });
    
    // Combine mappings
    Object.entries(frameAnalysis.colorToCharMap).forEach(([color, chars]) => {
      if (!combinedColorToChar[color]) {
        combinedColorToChar[color] = new Set();
      }
      chars.forEach(char => combinedColorToChar[color].add(char));
    });
    
    Object.entries(frameAnalysis.charToColorMap).forEach(([char, colors]) => {
      if (!combinedCharToColor[char]) {
        combinedCharToColor[char] = new Set();
      }
      colors.forEach(color => combinedCharToColor[char].add(color));
    });
    
    totalCells += frameAnalysis.totalCells;
    totalFilledCells += frameAnalysis.filledCells;
  });

  // Convert to sorted arrays
  const colorsByFrequency: ColorFrequency[] = Object.entries(combinedColorFreq)
    .map(([color, count]) => ({ color, count }))
    .sort((a, b) => b.count - a.count);

  const charactersByFrequency: CharacterFrequency[] = Object.entries(combinedCharFreq)
    .map(([char, count]) => ({ char, count }))
    .sort((a, b) => b.count - a.count);

  // Calculate distributions
  const colorDistribution = colorsByFrequency.map(({ color, count }) => ({
    color,
    count,
    percentage: totalCells > 0 ? (count / totalCells) * 100 : 0
  }));

  const characterDistribution = charactersByFrequency.map(({ char, count }) => ({
    char,
    count,
    percentage: totalCells > 0 ? (count / totalCells) * 100 : 0
  }));

  const colorBrightnessStats = calculateColorBrightnessStats(Array.from(allColors));

  return {
    // Basic unique values
    uniqueColors: Array.from(allColors),
    uniqueCharacters: Array.from(allChars),
    
    // Frequency data (original simple format)
    colorFrequency: combinedColorFreq,
    characterFrequency: combinedCharFreq,
    
    // Extended frequency data (sorted arrays)
    colorsByFrequency,
    charactersByFrequency,
    
    // Distribution data with percentages
    colorDistribution,
    characterDistribution,
    
    // Cross-reference mappings
    colorToCharMap: Object.fromEntries(
      Object.entries(combinedColorToChar).map(([color, chars]) => [color, Array.from(chars)])
    ),
    charToColorMap: Object.fromEntries(
      Object.entries(combinedCharToColor).map(([char, colors]) => [char, Array.from(colors)])
    ),
    
    // Canvas statistics
    totalCells,
    filledCells: totalFilledCells,
    fillPercentage: totalCells > 0 ? (totalFilledCells / totalCells) * 100 : 0,
    
    // Color analysis
    colorBrightnessStats,
    
    // Metadata
    analysisTimestamp: Date.now()
  };
}

/**
 * Calculate brightness statistics for a collection of colors
 */
function calculateColorBrightnessStats(colors: string[]) {
  if (colors.length === 0) {
    return {
      brightest: '',
      darkest: '',
      averageBrightness: 0,
      brightColors: [],
      darkColors: []
    };
  }

  const brightnesses = colors.map(color => ({
    color,
    brightness: calculateColorBrightness(color)
  }));

  brightnesses.sort((a, b) => b.brightness - a.brightness);

  const averageBrightness = brightnesses.reduce((sum, { brightness }) => sum + brightness, 0) / brightnesses.length;
  const brightColors = brightnesses.filter(({ brightness }) => brightness > averageBrightness).map(({ color }) => color);
  const darkColors = brightnesses.filter(({ brightness }) => brightness <= averageBrightness).map(({ color }) => color);

  return {
    brightest: brightnesses[0]?.color || '',
    darkest: brightnesses[brightnesses.length - 1]?.color || '',
    averageBrightness,
    brightColors,
    darkColors
  };
}

/**
 * Calculate the perceived brightness of a color
 * Uses the relative luminance formula: 0.299*R + 0.587*G + 0.114*B
 */
function calculateColorBrightness(color: string): number {
  // Handle different color formats
  let r = 0, g = 0, b = 0;
  
  if (color.startsWith('#')) {
    // Hex color
    const hex = color.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
  } else if (color.startsWith('rgb')) {
    // RGB/RGBA color
    const match = color.match(/rgb\(?(\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      r = parseInt(match[1], 10);
      g = parseInt(match[2], 10);
      b = parseInt(match[3], 10);
    }
  } else if (color.startsWith('hsl')) {
    // HSL color - convert to RGB first
    const hslMatch = color.match(/hsl\(?(\d+),\s*(\d+)%,\s*(\d+)%/);
    if (hslMatch) {
      const h = parseInt(hslMatch[1], 10) / 360;
      const s = parseInt(hslMatch[2], 10) / 100;
      const l = parseInt(hslMatch[3], 10) / 100;
      const rgb = hslToRgb(h, s, l);
      r = rgb.r;
      g = rgb.g;
      b = rgb.b;
    }
  }
  
  // Calculate relative luminance
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
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

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * Returns an empty analysis object
 */
function getEmptyAnalysis(): CanvasAnalysis {
  return {
    // Basic unique values
    uniqueColors: [],
    uniqueCharacters: [],
    
    // Frequency data (original simple format)
    colorFrequency: {},
    characterFrequency: {},
    
    // Extended frequency data (sorted arrays)
    colorsByFrequency: [],
    charactersByFrequency: [],
    
    // Distribution data with percentages
    colorDistribution: [],
    characterDistribution: [],
    
    // Cross-reference mappings
    colorToCharMap: {},
    charToColorMap: {},
    
    // Canvas statistics
    totalCells: 0,
    filledCells: 0,
    fillPercentage: 0,
    
    // Color analysis
    colorBrightnessStats: {
      brightest: '',
      darkest: '',
      averageBrightness: 0,
      brightColors: [],
      darkColors: []
    },
    
    // Metadata
    analysisTimestamp: Date.now()
  };
}

/**
 * Filters analysis results based on minimum frequency threshold
 */
export function filterAnalysisByFrequency(
  analysis: CanvasAnalysis, 
  minColorFrequency = 1, 
  minCharFrequency = 1
): CanvasAnalysis {
  return {
    ...analysis,
    colorsByFrequency: analysis.colorsByFrequency.filter(({ count }) => count >= minColorFrequency),
    charactersByFrequency: analysis.charactersByFrequency.filter(({ count }) => count >= minCharFrequency),
    colorDistribution: analysis.colorDistribution.filter(({ count }) => count >= minColorFrequency),
    characterDistribution: analysis.characterDistribution.filter(({ count }) => count >= minCharFrequency)
  };
}

/**
 * Compares two analyses and returns the differences
 */
export function compareAnalyses(oldAnalysis: CanvasAnalysis, newAnalysis: CanvasAnalysis) {
  const newColors = newAnalysis.uniqueColors.filter(color => !oldAnalysis.uniqueColors.includes(color));
  const removedColors = oldAnalysis.uniqueColors.filter(color => !newAnalysis.uniqueColors.includes(color));
  const newCharacters = newAnalysis.uniqueCharacters.filter(char => !oldAnalysis.uniqueCharacters.includes(char));
  const removedCharacters = oldAnalysis.uniqueCharacters.filter(char => !newAnalysis.uniqueCharacters.includes(char));

  return {
    newColors,
    removedColors,
    newCharacters,
    removedCharacters,
    colorCountChanged: oldAnalysis.uniqueColors.length !== newAnalysis.uniqueColors.length,
    characterCountChanged: oldAnalysis.uniqueCharacters.length !== newAnalysis.uniqueCharacters.length
  };
}