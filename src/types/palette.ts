// Color Palette System Types

export interface PaletteColor {
  id: string;
  value: string; // hex color (e.g., "#ff0000")
  name?: string; // optional display name
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: PaletteColor[];
  isPreset: boolean;
  isCustom: boolean;
}

export interface ColorPickerState {
  isOpen: boolean;
  mode: 'foreground' | 'background';
  currentColor: string;
  previewColor: string;
  recentColors: string[];
}

export interface DragState {
  isDragging: boolean;
  draggedColorId: string | null;
  draggedFromIndex: number | null;
  dropTargetIndex: number | null;
}

// Export format for JSON import/export
export interface PaletteExportFormat {
  name: string;
  colors: string[];
}

// HSV color representation
export interface HSVColor {
  h: number; // hue: 0-360
  s: number; // saturation: 0-100
  v: number; // value: 0-100
}

// RGB color representation
export interface RGBColor {
  r: number; // red: 0-255
  g: number; // green: 0-255
  b: number; // blue: 0-255
}

// Utility type for color format validation
export type ColorFormat = 'hex' | 'rgb' | 'hsv';

// Type guards
export const isValidHexColor = (color: string): boolean => {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
};

export const isPaletteColor = (obj: any): obj is PaletteColor => {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.value === 'string' &&
    isValidHexColor(obj.value) &&
    (obj.name === undefined || typeof obj.name === 'string')
  );
};

export const isColorPalette = (obj: any): obj is ColorPalette => {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.colors) &&
    obj.colors.every(isPaletteColor) &&
    typeof obj.isPreset === 'boolean' &&
    typeof obj.isCustom === 'boolean'
  );
};

export const isPaletteExportFormat = (obj: any): obj is PaletteExportFormat => {
  return (
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.colors) &&
    obj.colors.every((color: any) => typeof color === 'string' && isValidHexColor(color))
  );
};

// Character Palette System Types (similar to color palettes but for ASCII characters)

export interface CharacterPalette {
  id: string;
  name: string;
  characters: string[];           // Ordered by density (light to dark)
  isPreset: boolean;             // System preset vs user created
  isCustom: boolean;            // User-created custom palette
  category: 'ascii' | 'unicode' | 'blocks' | 'custom';
}

export interface CharacterMappingSettings {
  activePalette: CharacterPalette;
  mappingMethod: 'brightness' | 'luminance' | 'contrast' | 'edge-detection';
  invertDensity: boolean;         // Reverse light/dark mapping
  characterSpacing: number;       // Spacing between characters (1.0 = normal)
  useCustomOrder: boolean;        // Allow manual character reordering
}

// Character palette editor state
export interface CharacterPaletteEditorState {
  isEditing: boolean;
  editingPaletteId: string | null;
  draggedCharacterIndex: number | null;
  dropTargetIndex: number | null;
}

// Export format for JSON import/export (future feature)
export interface CharacterPaletteExportFormat {
  name: string;
  characters: string[];
  category: CharacterPalette['category'];
}

// Type guards for character palettes
export const isValidCharacter = (char: string): boolean => {
  return typeof char === 'string' && char.length === 1;
};

export const isCharacterPalette = (obj: any): obj is CharacterPalette => {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.characters) &&
    obj.characters.every(isValidCharacter) &&
    typeof obj.isPreset === 'boolean' &&
    typeof obj.isCustom === 'boolean' &&
    ['ascii', 'unicode', 'blocks', 'custom'].includes(obj.category)
  );
};

export const isCharacterPaletteExportFormat = (obj: any): obj is CharacterPaletteExportFormat => {
  return (
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.characters) &&
    obj.characters.every(isValidCharacter) &&
    ['ascii', 'unicode', 'blocks', 'custom'].includes(obj.category)
  );
};

// Utility functions for ID generation
export const generateColorId = (): string => {
  return `color_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generatePaletteId = (): string => {
  return `palette_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateCharacterPaletteId = (): string => {
  return `char_palette_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
