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

export const isPaletteColor = (obj: unknown): obj is PaletteColor => {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Partial<PaletteColor>;
  const hasValidName = candidate.name === undefined || typeof candidate.name === 'string';

  return typeof candidate.id === 'string'
    && typeof candidate.value === 'string'
    && isValidHexColor(candidate.value)
    && hasValidName;
};

export const isColorPalette = (obj: unknown): obj is ColorPalette => {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Partial<ColorPalette> & { colors?: unknown };
  return typeof candidate.id === 'string'
    && typeof candidate.name === 'string'
    && Array.isArray(candidate.colors)
    && candidate.colors.every(isPaletteColor)
    && typeof candidate.isPreset === 'boolean'
    && typeof candidate.isCustom === 'boolean';
};

export const isPaletteExportFormat = (obj: unknown): obj is PaletteExportFormat => {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Partial<PaletteExportFormat> & { colors?: unknown };
  return typeof candidate.name === 'string'
    && Array.isArray(candidate.colors)
    && candidate.colors.every((color): color is string => typeof color === 'string' && isValidHexColor(color));
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
  mappingMethod: 'brightness' | 'luminance' | 'contrast' | 'edge-detection' | 'saturation' | 'red-channel' | 'green-channel' | 'blue-channel';
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

export const isCharacterPalette = (obj: unknown): obj is CharacterPalette => {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Partial<CharacterPalette> & { characters?: unknown };
  return typeof candidate.id === 'string'
    && typeof candidate.name === 'string'
    && Array.isArray(candidate.characters)
    && candidate.characters.every(isValidCharacter)
    && typeof candidate.isPreset === 'boolean'
    && typeof candidate.isCustom === 'boolean'
    && ['ascii', 'unicode', 'blocks', 'custom'].includes(candidate.category as CharacterPalette['category']);
};

export const isCharacterPaletteExportFormat = (obj: unknown): obj is CharacterPaletteExportFormat => {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Partial<CharacterPaletteExportFormat> & { characters?: unknown };
  return typeof candidate.name === 'string'
    && Array.isArray(candidate.characters)
    && candidate.characters.every(isValidCharacter)
    && ['ascii', 'unicode', 'blocks', 'custom'].includes(candidate.category ?? '');
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
