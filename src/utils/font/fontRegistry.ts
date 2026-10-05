/**
 * Font Registry for ASCII Motion
 * 
 * Central registry of bundled fonts available for SVG text-to-outline conversion.
 * IDs match `MONOSPACE_FONTS` ids so the project font can be used for outlines.
 * All fonts are open-source with permissive licenses.
 */

import type { FontMetadata } from './types';

/**
 * Registry of available bundled fonts
 */
export const FONT_REGISTRY: FontMetadata[] = [
  {
    id: 'jetbrains-mono',
    name: 'JetBrains Mono',
    fileName: 'JetBrainsMono-Regular.ttf',
    path: '/fonts/jetbrains-mono/JetBrainsMono-Regular.ttf',
    license: 'OFL-1.1',
    weight: 'regular',
    recommended: true,
  },
  {
    id: 'ibm-vga',
    name: 'Px437 IBM VGA 9x14',
    fileName: 'Px437_IBM_VGA_9x14.ttf',
    path: '/fonts/Px437_IBM_VGA_9x14.ttf',
    license: 'CC-BY-SA-4.0',
    weight: 'regular',
  },
  {
    id: 'ibm-dos',
    name: 'Px437 IBM DOS ISO8',
    fileName: 'Px437_IBM_DOS_ISO8.ttf',
    path: '/fonts/Px437_IBM_DOS_ISO8.ttf',
    license: 'CC-BY-SA-4.0',
    weight: 'regular',
  },
  {
    id: 'c64-pro',
    name: 'C64 Pro',
    fileName: 'C64_Pro-STYLE.ttf',
    path: '/fonts/C64_Pro-STYLE.ttf',
    license: 'Style',
    weight: 'regular',
  },
];

/**
 * Default font ID for text-to-outline conversion
 */
export const DEFAULT_OUTLINE_FONT_ID = 'jetbrains-mono';

/**
 * Get font metadata by ID
 */
export function getFontMetadata(fontId: string): FontMetadata | undefined {
  return FONT_REGISTRY.find(font => font.id === fontId);
}

/**
 * Get all recommended fonts
 */
export function getRecommendedFonts(): FontMetadata[] {
  return FONT_REGISTRY.filter(font => font.recommended);
}

/**
 * Get font path by ID
 */
export function getFontPath(fontId: string): string | undefined {
  const metadata = getFontMetadata(fontId);
  return metadata?.path;
}

/**
 * Check if a font ID is valid
 */
export function isValidFontId(fontId: string): boolean {
  return FONT_REGISTRY.some(font => font.id === fontId);
}

/**
 * Get font display name by ID
 */
export function getFontDisplayName(fontId: string): string {
  const metadata = getFontMetadata(fontId);
  return metadata?.name || 'Unknown Font';
}
