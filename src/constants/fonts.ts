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
  isBundled?: boolean; // True for bundled web fonts (lazy loaded)
  fileSize?: string; // e.g., "~120KB" for bundled fonts
}

export const MONOSPACE_FONTS: MonospaceFont[] = [
  {
    id: 'sf-mono',
    name: 'SF Mono',
    displayName: 'SF Mono (macOS)',
    cssStack: 'SF Mono, SFMono-Regular, ui-monospace, monospace',
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
    id: 'courier-new',
    name: 'Courier New',
    displayName: 'Courier New (Universal)',
    cssStack: 'Courier New, monospace',
    category: 'fallback',
    description: 'Universal fallback - available on all systems'
  },
  {
    id: 'jetbrains-mono',
    name: 'JetBrains Mono',
    displayName: 'JetBrains Mono',
    cssStack: 'JetBrains Mono, monospace',
    category: 'web',
    description: 'Popular coding font with excellent readability',
    isBundled: true,
    fileSize: '~90KB'
  },
  {
    id: 'fira-code',
    name: 'Fira Code',
    displayName: 'Fira Code',
    cssStack: 'Fira Code, monospace',
    category: 'web',
    description: 'Modern font with programming ligatures',
    isBundled: true,
    fileSize: '~101KB'
  },
  {
    id: 'monaspace-neon',
    name: 'Monaspace Neon',
    displayName: 'Monaspace (GitHub)',
    cssStack: 'Monaspace Neon, monospace',
    category: 'web',
    description: 'GitHub\'s texture healing monospace font',
    isBundled: true,
    fileSize: '~43KB'
  },
  {
    id: 'geist-mono',
    name: 'Geist Mono',
    displayName: 'Geist Mono (Vercel)',
    cssStack: 'Geist Mono, monospace',
    category: 'web',
    description: 'Vercel\'s modern geometric monospace font',
    isBundled: true,
    fileSize: '~41KB'
  },
  {
    id: 'ibm-vga',
    name: 'Px437 IBM VGA 9x14',
    displayName: 'IBM VGA 9x14 (Retro bold)',
    cssStack: 'Px437 IBM VGA 9x14, monospace',
    category: 'web',
    description: 'Classic IBM VGA font - authentic retro terminal aesthetic',
    isBundled: false,
    fileSize: '~25KB'
  },
  {
    id: 'ibm-dos',
    name: 'Px437 IBM DOS ISO8',
    displayName: 'IBM DOS ISO8 (Retro thin)',
    cssStack: 'Px437 IBM DOS ISO8, monospace',
    category: 'web',
    description: 'Classic IBM DOS font with ISO-8859-1 extended characters',
    isBundled: false,
    fileSize: '~28KB'
  },
  {
    id: 'auto',
    name: 'Auto',
    displayName: 'Auto (Best Available)',
    cssStack: 'SF Mono, Monaco, Cascadia Code, Consolas, JetBrains Mono, Fira Code, Monaspace Neon, Geist Mono, Courier New, monospace',
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
