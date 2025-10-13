// Default palette presets for the color palette system

import type { ColorPalette, PaletteColor } from '../types/palette';
import { generateColorId } from '../types/palette';
import { ANSI_COLORS } from './colors';

/**
 * Helper function to create palette colors from hex values
 */
const createPaletteColors = (colors: Array<{ hex: string; name?: string }>): PaletteColor[] => {
  return colors.map(({ hex, name }) => ({
    id: generateColorId(),
    value: hex,
    name
  }));
};

/**
 * ANSI 16-Color Palette (current system colors)
 */
export const ANSI_PALETTE: ColorPalette = {
  id: 'ansi-16',
  name: 'ANSI 16-Color',
  isPreset: true,
  isCustom: false,
  colors: createPaletteColors([
    { hex: ANSI_COLORS.black, name: 'Black' },
    { hex: ANSI_COLORS.red, name: 'Red' },
    { hex: ANSI_COLORS.green, name: 'Green' },
    { hex: ANSI_COLORS.yellow, name: 'Yellow' },
    { hex: ANSI_COLORS.blue, name: 'Blue' },
    { hex: ANSI_COLORS.magenta, name: 'Magenta' },
    { hex: ANSI_COLORS.cyan, name: 'Cyan' },
    { hex: ANSI_COLORS.white, name: 'White' },
    { hex: ANSI_COLORS.brightBlack, name: 'Bright Black' },
    { hex: ANSI_COLORS.brightRed, name: 'Bright Red' },
    { hex: ANSI_COLORS.brightGreen, name: 'Bright Green' },
    { hex: ANSI_COLORS.brightYellow, name: 'Bright Yellow' },
    { hex: ANSI_COLORS.brightBlue, name: 'Bright Blue' },
    { hex: ANSI_COLORS.brightMagenta, name: 'Bright Magenta' },
    { hex: ANSI_COLORS.brightCyan, name: 'Bright Cyan' },
    { hex: ANSI_COLORS.brightWhite, name: 'Bright White' }
  ])
};

/**
 * Web Safe Colors Palette (216 colors)
 */
export const WEB_SAFE_PALETTE: ColorPalette = {
  id: 'web-safe',
  name: 'Web Safe Colors',
  isPreset: true,
  isCustom: false,
  colors: (() => {
    const colors: Array<{ hex: string; name?: string }> = [];
    const values = [0x00, 0x33, 0x66, 0x99, 0xCC, 0xFF];
    
    for (const r of values) {
      for (const g of values) {
        for (const b of values) {
          const hex = `#${r.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${b.toString(16).padStart(2, '0').toUpperCase()}`;
          colors.push({ hex });
        }
      }
    }
    
    return createPaletteColors(colors);
  })()
};

/**
 * Material Design Palette
 */
export const MATERIAL_DESIGN_PALETTE: ColorPalette = {
  id: 'material-design',
  name: 'Material Design',
  isPreset: true,
  isCustom: false,
  colors: createPaletteColors([
    // Red
    { hex: '#FFEBEE', name: 'Red 50' },
    { hex: '#FFCDD2', name: 'Red 100' },
    { hex: '#EF9A9A', name: 'Red 200' },
    { hex: '#E57373', name: 'Red 300' },
    { hex: '#EF5350', name: 'Red 400' },
    { hex: '#F44336', name: 'Red 500' },
    { hex: '#E53935', name: 'Red 600' },
    { hex: '#D32F2F', name: 'Red 700' },
    { hex: '#C62828', name: 'Red 800' },
    { hex: '#B71C1C', name: 'Red 900' },
    
    // Pink
    { hex: '#FCE4EC', name: 'Pink 50' },
    { hex: '#F8BBD9', name: 'Pink 100' },
    { hex: '#F48FB1', name: 'Pink 200' },
    { hex: '#F06292', name: 'Pink 300' },
    { hex: '#EC407A', name: 'Pink 400' },
    { hex: '#E91E63', name: 'Pink 500' },
    { hex: '#D81B60', name: 'Pink 600' },
    { hex: '#C2185B', name: 'Pink 700' },
    { hex: '#AD1457', name: 'Pink 800' },
    { hex: '#880E4F', name: 'Pink 900' },
    
    // Purple
    { hex: '#F3E5F5', name: 'Purple 50' },
    { hex: '#E1BEE7', name: 'Purple 100' },
    { hex: '#CE93D8', name: 'Purple 200' },
    { hex: '#BA68C8', name: 'Purple 300' },
    { hex: '#AB47BC', name: 'Purple 400' },
    { hex: '#9C27B0', name: 'Purple 500' },
    { hex: '#8E24AA', name: 'Purple 600' },
    { hex: '#7B1FA2', name: 'Purple 700' },
    { hex: '#6A1B9A', name: 'Purple 800' },
    { hex: '#4A148C', name: 'Purple 900' },
    
    // Blue
    { hex: '#E3F2FD', name: 'Blue 50' },
    { hex: '#BBDEFB', name: 'Blue 100' },
    { hex: '#90CAF9', name: 'Blue 200' },
    { hex: '#64B5F6', name: 'Blue 300' },
    { hex: '#42A5F5', name: 'Blue 400' },
    { hex: '#2196F3', name: 'Blue 500' },
    { hex: '#1E88E5', name: 'Blue 600' },
    { hex: '#1976D2', name: 'Blue 700' },
    { hex: '#1565C0', name: 'Blue 800' },
    { hex: '#0D47A1', name: 'Blue 900' },
    
    // Green
    { hex: '#E8F5E8', name: 'Green 50' },
    { hex: '#C8E6C9', name: 'Green 100' },
    { hex: '#A5D6A7', name: 'Green 200' },
    { hex: '#81C784', name: 'Green 300' },
    { hex: '#66BB6A', name: 'Green 400' },
    { hex: '#4CAF50', name: 'Green 500' },
    { hex: '#43A047', name: 'Green 600' },
    { hex: '#388E3C', name: 'Green 700' },
    { hex: '#2E7D32', name: 'Green 800' },
    { hex: '#1B5E20', name: 'Green 900' },
    
    // Orange
    { hex: '#FFF3E0', name: 'Orange 50' },
    { hex: '#FFE0B2', name: 'Orange 100' },
    { hex: '#FFCC80', name: 'Orange 200' },
    { hex: '#FFB74D', name: 'Orange 300' },
    { hex: '#FFA726', name: 'Orange 400' },
    { hex: '#FF9800', name: 'Orange 500' },
    { hex: '#FB8C00', name: 'Orange 600' },
    { hex: '#F57C00', name: 'Orange 700' },
    { hex: '#EF6C00', name: 'Orange 800' },
    { hex: '#E65100', name: 'Orange 900' }
  ])
};

/**
 * Retro 8-bit Gaming Palette
 */
export const RETRO_8BIT_PALETTE: ColorPalette = {
  id: 'retro-8bit',
  name: 'Retro 8-bit',
  isPreset: true,
  isCustom: false,
  colors: createPaletteColors([
    { hex: '#000000', name: 'Black' },
    { hex: '#FFFFFF', name: 'White' },
    { hex: '#880000', name: 'Dark Red' },
    { hex: '#AAFFEE', name: 'Cyan' },
    { hex: '#CC44CC', name: 'Purple' },
    { hex: '#00CC55', name: 'Green' },
    { hex: '#0000AA', name: 'Blue' },
    { hex: '#EEEE77', name: 'Yellow' },
    { hex: '#DD8855', name: 'Orange' },
    { hex: '#664400', name: 'Brown' },
    { hex: '#FF7777', name: 'Light Red' },
    { hex: '#333333', name: 'Dark Grey' },
    { hex: '#777777', name: 'Grey' },
    { hex: '#AAFF66', name: 'Light Green' },
    { hex: '#0088FF', name: 'Light Blue' },
    { hex: '#BBBBBB', name: 'Light Grey' }
  ])
};

/**
 * Earth Tones Palette
 */
export const EARTH_TONES_PALETTE: ColorPalette = {
  id: 'earth-tones',
  name: 'Earth Tones',
  isPreset: true,
  isCustom: false,
  colors: createPaletteColors([
    { hex: '#8B4513', name: 'Saddle Brown' },
    { hex: '#A0522D', name: 'Sienna' },
    { hex: '#CD853F', name: 'Peru' },
    { hex: '#DEB887', name: 'Burlywood' },
    { hex: '#F4A460', name: 'Sandy Brown' },
    { hex: '#D2691E', name: 'Chocolate' },
    { hex: '#B22222', name: 'Fire Brick' },
    { hex: '#DC143C', name: 'Crimson' },
    { hex: '#800000', name: 'Maroon' },
    { hex: '#556B2F', name: 'Dark Olive Green' },
    { hex: '#808000', name: 'Olive' },
    { hex: '#6B8E23', name: 'Olive Drab' },
    { hex: '#9ACD32', name: 'Yellow Green' },
    { hex: '#32CD32', name: 'Lime Green' },
    { hex: '#228B22', name: 'Forest Green' },
    { hex: '#006400', name: 'Dark Green' }
  ])
};

/**
 * Cool Blues Palette
 */
export const COOL_BLUES_PALETTE: ColorPalette = {
  id: 'cool-blues',
  name: 'Cool Blues',
  isPreset: true,
  isCustom: false,
  colors: createPaletteColors([
    { hex: '#F0F8FF', name: 'Alice Blue' },
    { hex: '#E6F3FF', name: 'Very Light Blue' },
    { hex: '#CCE7FF', name: 'Light Blue' },
    { hex: '#B3DBFF', name: 'Pale Blue' },
    { hex: '#87CEEB', name: 'Sky Blue' },
    { hex: '#87CEFA', name: 'Light Sky Blue' },
    { hex: '#00BFFF', name: 'Deep Sky Blue' },
    { hex: '#1E90FF', name: 'Dodger Blue' },
    { hex: '#6495ED', name: 'Cornflower Blue' },
    { hex: '#4169E1', name: 'Royal Blue' },
    { hex: '#0000FF', name: 'Blue' },
    { hex: '#0000CD', name: 'Medium Blue' },
    { hex: '#00008B', name: 'Dark Blue' },
    { hex: '#000080', name: 'Navy' },
    { hex: '#191970', name: 'Midnight Blue' },
    { hex: '#483D8B', name: 'Dark Slate Blue' }
  ])
};

/**
 * Warm Reds Palette
 */
export const WARM_REDS_PALETTE: ColorPalette = {
  id: 'warm-reds',
  name: 'Warm Reds',
  isPreset: true,
  isCustom: false,
  colors: createPaletteColors([
    { hex: '#FFF5F5', name: 'Very Light Pink' },
    { hex: '#FFE4E1', name: 'Misty Rose' },
    { hex: '#FFCCCB', name: 'Light Pink' },
    { hex: '#FFA07A', name: 'Light Salmon' },
    { hex: '#FA8072', name: 'Salmon' },
    { hex: '#F08080', name: 'Light Coral' },
    { hex: '#FF7F50', name: 'Coral' },
    { hex: '#FF6347', name: 'Tomato' },
    { hex: '#FF4500', name: 'Orange Red' },
    { hex: '#FF0000', name: 'Red' },
    { hex: '#DC143C', name: 'Crimson' },
    { hex: '#B22222', name: 'Fire Brick' },
    { hex: '#8B0000', name: 'Dark Red' },
    { hex: '#800000', name: 'Maroon' },
    { hex: '#A52A2A', name: 'Brown' },
    { hex: '#CD5C5C', name: 'Indian Red' }
  ])
};

/**
 * Array of all default palettes
 */
export const DEFAULT_PALETTES: ColorPalette[] = [
  ANSI_PALETTE,
  MATERIAL_DESIGN_PALETTE,
  RETRO_8BIT_PALETTE,
  EARTH_TONES_PALETTE,
  COOL_BLUES_PALETTE,
  WARM_REDS_PALETTE,
  WEB_SAFE_PALETTE // Put web safe last since it's very large
];

/**
 * Default active palette ID
 */
export const DEFAULT_ACTIVE_PALETTE_ID = 'ansi-16';

/**
 * Get palette by ID
 */
export const getPaletteById = (id: string): ColorPalette | null => {
  return DEFAULT_PALETTES.find(palette => palette.id === id) || null;
};

/**
 * Get preset palettes only
 */
export const getPresetPalettes = (): ColorPalette[] => {
  return DEFAULT_PALETTES.filter(palette => palette.isPreset);
};
