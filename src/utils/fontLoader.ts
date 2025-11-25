/**
 * Font Loader Utility
 * Handles lazy loading of bundled web fonts using the CSS Font Loading API
 */

// Track which fonts have been loaded
const loadedFonts = new Set<string>();

// Track fonts currently being loaded
const loadingPromises = new Map<string, Promise<void>>();

/**
 * Font file definitions for bundled fonts
 */
const BUNDLED_FONT_FILES: Record<string, { url: string; weight?: number; style?: string; format?: string }[]> = {
  'JetBrains Mono': [
    { url: '/fonts/JetBrainsMono-Regular.woff2', weight: 400, style: 'normal' }
  ],
  'Fira Code': [
    { url: '/fonts/FiraCode-Regular.woff2', weight: 400, style: 'normal' }
  ],
  'Monaspace Neon': [
    { url: '/fonts/MonaspaceNeon-Regular.woff2', weight: 400, style: 'normal' }
  ],
  'Geist Mono': [
    { url: '/fonts/GeistMono-Regular.woff2', weight: 400, style: 'normal' }
  ]
};

/**
 * Load a bundled font using the CSS Font Loading API
 * Returns a promise that resolves when the font is loaded
 */
export async function loadBundledFont(fontName: string): Promise<void> {
  // Check if already loaded
  if (loadedFonts.has(fontName)) {
    return;
  }

  // Check if currently loading
  if (loadingPromises.has(fontName)) {
    return loadingPromises.get(fontName)!;
  }

  // Get font file definitions
  const fontFiles = BUNDLED_FONT_FILES[fontName];
  if (!fontFiles) {
    throw new Error(`No bundled font definition found for "${fontName}"`);
  }

  // Create loading promise
  const loadingPromise = (async () => {
    try {
      // Load all variants of the font
      const loadPromises = fontFiles.map(async (file) => {
        const format = file.format || 'woff2';
        const fontFace = new FontFace(
          fontName,
          `url(${file.url}) format('${format}')`,
          {
            weight: file.weight?.toString() || '400',
            style: file.style || 'normal'
          }
        );

        // Load the font
        await fontFace.load();
        
        // Add to document fonts
        document.fonts.add(fontFace);
      });

      await Promise.all(loadPromises);
      
      // Mark as loaded
      loadedFonts.add(fontName);
    } catch (error) {
      console.error(`[Font Loader] Failed to load font "${fontName}":`, error);
      throw error;
    } finally {
      // Clean up loading promise
      loadingPromises.delete(fontName);
    }
  })();

  // Store loading promise
  loadingPromises.set(fontName, loadingPromise);

  return loadingPromise;
}

/**
 * Check if a bundled font is currently loaded
 */
export function isFontLoaded(fontName: string): boolean {
  return loadedFonts.has(fontName);
}

/**
 * Check if a bundled font is currently loading
 */
export function isFontLoading(fontName: string): boolean {
  return loadingPromises.has(fontName);
}

/**
 * Preload bundled fonts during idle time
 * Call this to warm up the font cache
 */
export function preloadBundledFonts(): void {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      Object.keys(BUNDLED_FONT_FILES).forEach(fontName => {
        if (!loadedFonts.has(fontName)) {
          loadBundledFont(fontName).catch(err => {
            console.warn(`[Font Loader] Preload failed for ${fontName}:`, err);
          });
        }
      });
    });
  }
}

/**
 * Get list of all bundled font names
 */
export function getBundledFontNames(): string[] {
  return Object.keys(BUNDLED_FONT_FILES);
}
