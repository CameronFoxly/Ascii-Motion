/**
 * Font Registry for ASCII Motion
 * 
 * Central registry of bundled fonts available for SVG text-to-outline conversion.
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
