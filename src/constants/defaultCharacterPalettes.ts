// Default character palette presets for ASCII art conversion

import type { CharacterPalette } from '../types/palette';
import { generateCharacterPaletteId } from '../types/palette';

/**
 * Helper function to create character palettes
 */
const createCharacterPalette = (
  id: string,
  name: string,
  characters: string[],
  category: CharacterPalette['category'],
  isPreset: boolean = true
): CharacterPalette => ({
  id,
  name,
  characters,
  category,
  isPreset,
  isCustom: !isPreset
});

/**
 * MINIMAL ASCII PALETTE - Simple terminal-compatible characters
 * Ordered from light to dark (lowest to highest density)
 */
export const MINIMAL_ASCII_PALETTE: CharacterPalette = createCharacterPalette(
  'minimal-ascii',
  'Minimal ASCII',
  [' ', '.', ':', ';', '+', '*', '#', '@'],
  'ascii'
);

/**
 * STANDARD ASCII PALETTE - Full keyboard character range
 * Ordered by visual density for optimal brightness mapping
 */
export const STANDARD_ASCII_PALETTE: CharacterPalette = createCharacterPalette(
  'standard-ascii',
  'Standard ASCII',
  [
    ' ', '.', ',', ':', ';', '!', 'i', 'l', 'I', '|', 
    '/', '\\', 'r', 'c', 'v', 'x', 'z', 'u', 'n', 'o', 
    'e', 'a', 'h', 'k', 'b', 'd', 'p', 'q', 'w', 'm', 
    'A', 'U', 'J', 'C', 'L', 'Q', 'O', 'Z', 'X', '0', 
    '#', 'M', 'W', '&', '8', '%', 'B', '@'
  ],
  'ascii'
);

/**
 * BLOCK CHARACTERS PALETTE - Unicode block elements
 * Perfect for solid fill effects and clean gradients
 */
export const BLOCK_CHARACTERS_PALETTE: CharacterPalette = createCharacterPalette(
  'block-characters',
  'Block Characters',
  [' ', '░', '▒', '▓', '█'],
  'blocks'
);

/**
 * EXTENDED UNICODE PALETTE - Artistic symbols and shapes
 * Rich character set for detailed artistic effects
 */
export const EXTENDED_UNICODE_PALETTE: CharacterPalette = createCharacterPalette(
  'extended-unicode',
  'Extended Unicode',
  [
    ' ', '·', '∙', '•', '○', '◦', '◯', '⦾', '⦿',
    '░', '▒', '▓', '█', '▬', '▭', '▮', '▯',
    '□', '▢', '▣', '▤', '▥', '▦', '▧', '▨', '▩', '■',
    '◇', '◈', '◉', '◊', '○', '◌', '◍', '◎', '●',
    '△', '▲', '▴', '▵', '▶', '▷', '▸', '▹',
    '★', '☆', '✦', '✧', '✩', '✪', '✫', '✬'
  ],
  'unicode'
);

/**
 * DOTS AND LINES PALETTE - Fine detail characters
 * Excellent for line art and detailed textures
 */
export const DOTS_LINES_PALETTE: CharacterPalette = createCharacterPalette(
  'dots-lines',
  'Dots & Lines',
  [
    ' ', '.', '·', '∙', '•', 
    '-', '–', '—', '―', '─',
    '|', '¦', '│', '║', '┃',
    '/', '\\', '╱', '╲', '╳',
    '+', '×', '✕', '✗', '✘'
  ],
  'ascii'
);

/**
 * RETRO COMPUTING PALETTE - Classic computer characters
 * Nostalgic character set from early computing
 */
export const RETRO_COMPUTING_PALETTE: CharacterPalette = createCharacterPalette(
  'retro-computing',
  'Retro Computing',
  [
    ' ', '.', ':', '=', '+', '*', '#', '&', '@',
    '░', '▒', '▓', '█', '▄', '▀', '▌', '▐',
    '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼',
    '╔', '╗', '╚', '╝', '╠', '╣', '╦', '╩', '╬'
  ],
  'blocks'
);

/**
 * All default character palettes
 */
export const DEFAULT_CHARACTER_PALETTES: CharacterPalette[] = [
  MINIMAL_ASCII_PALETTE,
  STANDARD_ASCII_PALETTE,
  BLOCK_CHARACTERS_PALETTE,
  EXTENDED_UNICODE_PALETTE,
  DOTS_LINES_PALETTE,
  RETRO_COMPUTING_PALETTE
];

/**
 * Get default character palette by ID
 */
export const getDefaultCharacterPalette = (id: string): CharacterPalette | undefined => {
  return DEFAULT_CHARACTER_PALETTES.find(palette => palette.id === id);
};

/**
 * Get character palettes by category
 */
export const getCharacterPalettesByCategory = (category: CharacterPalette['category']): CharacterPalette[] => {
  return DEFAULT_CHARACTER_PALETTES.filter(palette => palette.category === category);
};

/**
 * Create a custom character palette from character array
 */
export const createCustomCharacterPalette = (name: string, characters: string[]): CharacterPalette => {
  return createCharacterPalette(
    generateCharacterPaletteId(),
    name,
    characters,
    'custom',
    false // isPreset = false for custom palettes
  );
};