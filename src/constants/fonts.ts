/**
 * Font definitions for ASCII Motion
 * Provides curated monospace fonts optimized for ASCII art rendering
 */

export interface MonospaceFont {
  id: string;
  name: string;
  displayName: string;
  cssStack: string; // No quotes, ready for canvas/CSS
  category: 'system' | 'web' | 'fallback';
  platforms?: ('macos' | 'windows' | 'linux')[];
  description: string;
}

export const MONOSPACE_FONTS: MonospaceFont[] = [
  {
    id: 'sf-mono',
    name: 'SF Mono',
    displayName: 'SF Mono (macOS)',
    cssStack: 'SF Mono, monospace',
    category: 'system',
    platforms: ['macos'],
    description: 'Apple\'s system monospace font - excellent rendering quality'
  },
  {
    id: 'monaco',
    name: 'Monaco',
    displayName: 'Monaco (macOS)',
    cssStack: 'Monaco, monospace',
    category: 'system',
    platforms: ['macos'],
    description: 'Classic macOS monospace - crisp and readable'
  },
  {
    id: 'consolas',
    name: 'Consolas',
    displayName: 'Consolas (Windows)',
    cssStack: 'Consolas, monospace',
    category: 'system',
    platforms: ['windows'],
    description: 'Microsoft\'s premium monospace - optimized for Windows'
  },
  {
    id: 'cascadia-code',
    name: 'Cascadia Code',
    displayName: 'Cascadia Code (Windows)',
    cssStack: 'Cascadia Code, monospace',
    category: 'system',
    platforms: ['windows'],
    description: 'Modern Windows terminal font with ligatures'
  },
  {
    id: 'roboto-mono',
    name: 'Roboto Mono',
    displayName: 'Roboto Mono (Google)',
    cssStack: 'Roboto Mono, monospace',
    category: 'web',
    description: 'Google\'s monospace - clean and modern'
  },
  {
    id: 'inconsolata',
    name: 'Inconsolata',
    displayName: 'Inconsolata (Web)',
    cssStack: 'Inconsolata, monospace',
    category: 'web',
    description: 'Popular web font with good character spacing'
  },
  {
    id: 'courier-new',
    name: 'Courier New',
    displayName: 'Courier New (Universal)',
    cssStack: 'Courier New, monospace',
    category: 'fallback',
    description: 'Universal fallback - available on all systems'
  },
  {
    id: 'auto',
    name: 'Auto',
    displayName: 'Auto (Best Available)',
    cssStack: 'SF Mono, Monaco, Cascadia Code, Consolas, Roboto Mono, Inconsolata, Courier New, monospace',
    category: 'system',
    description: 'Automatically selects the best available monospace font for your system'
  }
];

/**
 * Get font by ID
 */
export const getFontById = (id: string): MonospaceFont => {
  const font = MONOSPACE_FONTS.find(f => f.id === id);
  return font || MONOSPACE_FONTS[MONOSPACE_FONTS.length - 1]; // Default to 'auto'
};

/**
 * Default font ID (auto-selection)
 */
export const DEFAULT_FONT_ID = 'auto';

/**
 * Get CSS font stack for canvas/CSS usage (no quotes around individual font names)
 */
export const getFontStack = (fontId: string): string => {
  const font = getFontById(fontId);
  return font.cssStack;
};
