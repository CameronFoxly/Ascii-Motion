/**
 * Intensity → ASCII cell mapping for procedural generators.
 *
 * Fast, allocation-light replacement for running generator output through
 * ASCIIConverter (which needs canvas/ImageData). Replicates the generator
 * branch of ASCIIConverter.convertFrame exactly for grayscale input:
 * brightness == gray level, character index = floor(gray / 256 * n) with
 * optional fractional dithering, colors mapped by index/closest/dither.
 */

import type { Cell } from '../../types';
import { ColorMatcher } from '../asciiConverter';

export type CharacterDitherMode = 'by-index' | 'noise-dither' | 'bayer2x2' | 'bayer4x4';
export type ColorMappingMode = 'closest' | 'by-index' | 'noise-dither' | 'bayer2x2' | 'bayer4x4';

/** Generator output: normalized intensity (0..1) plus per-cell coverage */
export interface IntensityBuffer {
  width: number;
  height: number;
  intensity: Float32Array;
  /** 1 = cell has content, 0 = transparent (skipped) */
  coverage: Uint8Array;
}

export function createIntensityBuffer(width: number, height: number): IntensityBuffer {
  const size = Math.max(0, width * height);
  return {
    width,
    height,
    intensity: new Float32Array(size),
    coverage: new Uint8Array(size),
  };
}

export interface ResolvedMappingSettings {
  enableCharacterMapping: boolean;
  characterSet: string[];
  characterDitherMode: CharacterDitherMode;
  ditherStrength: number;
  reverseCharacterIndex?: boolean;

  enableTextColorMapping: boolean;
  textColors: string[];
  textColorMappingMode: ColorMappingMode;
  textColorDitherStrength: number;
  reverseTextColorIndex?: boolean;

  enableBackgroundColorMapping: boolean;
  backgroundColors: string[];
  backgroundColorMappingMode: ColorMappingMode;
  backgroundColorDitherStrength: number;
  reverseBackgroundColorIndex?: boolean;
}

export const DEFAULT_TEXT_COLOR = '#ffffff';
const TRANSPARENT = 'transparent';

const BAYER2 = [
  [0, 2],
  [3, 1],
];
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Index into a list of n entries from a gray level, with optional dithering. */
function ditheredIndex(
  gray: number,
  n: number,
  threshold: number,
): number {
  const continuousIndex = (gray / 256) * n;
  let idx = Math.floor(continuousIndex);
  const frac = continuousIndex - idx;
  if (frac + threshold > 0.5 && idx < n - 1) idx += 1;
  return idx < 0 ? 0 : idx > n - 1 ? n - 1 : idx;
}

function plainIndex(gray: number, n: number): number {
  const idx = Math.floor((gray / 256) * n);
  return idx < 0 ? 0 : idx > n - 1 ? n - 1 : idx;
}

/** Character dithering threshold (matches CharacterMapper) */
function charThreshold(mode: CharacterDitherMode, strength: number, x: number, y: number): number {
  switch (mode) {
    case 'noise-dither': {
      const noise = ((x * 12.9898 + y * 78.233) * 43758.5453) % 1.0;
      return (noise - 0.5) * strength;
    }
    case 'bayer2x2':
      return (BAYER2[y % 2][x % 2] / 4.0 - 0.5) * strength;
    case 'bayer4x4':
      return (BAYER4[y % 4][x % 4] / 16.0 - 0.5) * strength;
    default:
      return 0;
  }
}

/** Color dithering threshold (matches ColorMatcher.mapColorByIndex*) */
function colorThreshold(mode: ColorMappingMode, strength: number, x: number, y: number): number {
  switch (mode) {
    case 'noise-dither': {
      const n1 = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const n2 = Math.sin(x * 93.9898 + y * 47.233) * 25643.2831;
      const noise = ((n1 - Math.floor(n1)) + (n2 - Math.floor(n2))) / 2;
      return (noise - 0.5) * strength;
    }
    case 'bayer2x2':
      return (BAYER2[Math.abs(y) % 2][Math.abs(x) % 2] / 4 - 0.5) * strength;
    case 'bayer4x4':
      return (BAYER4[Math.abs(y) % 4][Math.abs(x) % 4] / 16 - 0.5) * strength;
    default:
      return 0;
  }
}

function isColorDithered(mode: ColorMappingMode): boolean {
  return mode === 'noise-dither' || mode === 'bayer2x2' || mode === 'bayer4x4';
}

/** Build a 256-entry lookup table for a non-dithered color mode */
function buildColorLut(mode: ColorMappingMode, palette: string[]): string[] {
  const lut = new Array<string>(256);
  for (let g = 0; g < 256; g++) {
    lut[g] = mode === 'by-index'
      ? palette[plainIndex(g, palette.length)]
      : ColorMatcher.findClosestColor(g, g, g, palette);
  }
  return lut;
}

const lutCache = new Map<string, string[]>();
function getColorLut(mode: ColorMappingMode, palette: string[]): string[] {
  const key = `${mode}|${palette.join(',')}`;
  let lut = lutCache.get(key);
  if (!lut) {
    lut = buildColorLut(mode, palette);
    if (lutCache.size > 64) lutCache.clear();
    lutCache.set(key, lut);
  }
  return lut;
}

/** Quantize a 0..1 intensity to a 0..255 gray level (matches Uint8ClampedArray writes) */
export function intensityToGray(v: number): number {
  if (!(v > 0)) return 0;
  if (v >= 1) return 255;
  return Math.round(v * 255);
}

/**
 * Map a generator intensity buffer to sparse ASCII cells.
 * Cells with no coverage, or a blank character with a transparent background, are omitted.
 */
export function mapIntensityToCells(
  buffer: IntensityBuffer,
  settings: ResolvedMappingSettings,
): Map<string, Cell> {
  const { width, height, intensity, coverage } = buffer;
  const out = new Map<string, Cell>();

  let chars = settings.enableCharacterMapping && settings.characterSet.length > 0
    ? settings.characterSet
    : null;
  const charMode = settings.characterDitherMode;
  if (chars && charMode === 'by-index' && settings.reverseCharacterIndex) chars = [...chars].reverse();
  const charDither = chars !== null && charMode !== 'by-index';

  const textPalette = settings.enableTextColorMapping
    ? settings.textColorMappingMode === 'by-index' && settings.reverseTextColorIndex
      ? [...settings.textColors].reverse() : settings.textColors
    : [];
  const useTextPalette = textPalette.length > 0;
  const textMode = settings.textColorMappingMode;
  const textDither = useTextPalette && isColorDithered(textMode);
  const textLut = useTextPalette && !textDither ? getColorLut(textMode, textPalette) : null;

  const bgPalette = settings.enableBackgroundColorMapping
    ? settings.backgroundColorMappingMode === 'by-index' && settings.reverseBackgroundColorIndex
      ? [...settings.backgroundColors].reverse() : settings.backgroundColors
    : [];
  const useBgPalette = bgPalette.length > 0;
  const bgMode = settings.backgroundColorMappingMode;
  const bgDither = useBgPalette && isColorDithered(bgMode);
  const bgLut = useBgPalette && !bgDither ? getColorLut(bgMode, bgPalette) : null;

  // Character LUT for the non-dithered path
  let charLut: string[] | null = null;
  if (chars && !charDither) {
    charLut = new Array<string>(256);
    for (let g = 0; g < 256; g++) charLut[g] = chars[plainIndex(g, chars.length)];
  }

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const i = row + x;
      if (!coverage[i]) continue;
      const gray = intensityToGray(intensity[i]);

      let char: string;
      if (!chars) {
        char = ' ';
      } else if (charLut) {
        char = charLut[gray];
      } else {
        char = chars[ditheredIndex(gray, chars.length, charThreshold(charMode, settings.ditherStrength, x, y))];
      }

      let bgColor: string;
      if (!useBgPalette) {
        bgColor = TRANSPARENT;
      } else if (bgLut) {
        bgColor = bgLut[gray];
      } else {
        bgColor = bgPalette[ditheredIndex(gray, bgPalette.length, colorThreshold(bgMode, settings.backgroundColorDitherStrength, x, y))];
      }

      if ((char === ' ' || char === '') && bgColor === TRANSPARENT) continue;

      let color: string;
      if (!useTextPalette) {
        color = DEFAULT_TEXT_COLOR;
      } else if (textLut) {
        color = textLut[gray];
      } else {
        color = textPalette[ditheredIndex(gray, textPalette.length, colorThreshold(textMode, settings.textColorDitherStrength, x, y))];
      }

      out.set(`${x},${y}`, { char, color, bgColor });
    }
  }

  return out;
}
