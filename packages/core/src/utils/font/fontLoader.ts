/**
 * Font Loader for ASCII Motion
 * 
 * Handles loading, caching, and managing opentype.js fonts for SVG export.
 * Provides robust error handling and fallback mechanisms.
 */

import { load } from 'opentype.js';
import type { Font } from 'opentype.js';
import type { LoadedFont, FontLoadOptions, FontLoadErrorDetail } from './types';
import { FONT_REGISTRY, getFontMetadata } from './fontRegistry';

/**
 * Singleton font loader class
 */
class FontLoader {
  private fontCache: Map<string, LoadedFont> = new Map();
  private loadingPromises: Map<string, Promise<LoadedFont>> = new Map();
  private initialized = false;

  /**
   * Load a font by ID from the registry
   */
  async loadFont(
    fontId: string,
    options: FontLoadOptions = {}
  ): Promise<LoadedFont> {
    const { cache = true, timeout = 10000 } = options;

    // Check cache first
    if (cache && this.fontCache.has(fontId)) {
      return this.fontCache.get(fontId)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(fontId)) {
      return this.loadingPromises.get(fontId)!;
    }

    // Get font metadata
    const metadata = getFontMetadata(fontId);
    if (!metadata) {
      throw this.createError('not-found', `Font ID "${fontId}" not found in registry`, fontId);
    }

    // Start loading with timeout
    const loadPromise = this.loadFontFile(metadata.path, fontId, timeout);
    this.loadingPromises.set(fontId, loadPromise);

    try {
      const loadedFont = await loadPromise;

      // Cache if requested
      if (cache) {
        this.fontCache.set(fontId, loadedFont);
      }

      return loadedFont;
    } catch (error) {
      throw this.handleLoadError(error, fontId);
    } finally {
      this.loadingPromises.delete(fontId);
    }
  }

  /**
   * Load a font file from a path
   */
  private async loadFontFile(
    path: string,
    fontId: string,
    timeout: number
  ): Promise<LoadedFont> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(this.createError('timeout', `Font loading timed out after ${timeout}ms`, fontId));
      }, timeout);

      load(path, (err, font) => {
        clearTimeout(timeoutId);

        if (err) {
          reject(this.createError('parse-error', `Failed to parse font: ${err.message}`, fontId, err));
          return;
        }

        if (!font) {
          reject(this.createError('invalid-font', 'Font loaded but is invalid', fontId));
          return;
        }

        const metadata = getFontMetadata(fontId)!;
        const loadedFont: LoadedFont = {
          font,
          family: font.names.fontFamily.en || metadata.name,
          fileName: metadata.fileName,
          metadata,
        };

        resolve(loadedFont);
      });
    });
  }

  /**
   * Preload all bundled fonts
   */
  async preloadBundledFonts(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const loadPromises = FONT_REGISTRY.map(async (metadata) => {
      try {
        await this.loadFont(metadata.id, { cache: true, timeout: 15000 });
      } catch (error) {
        // Font loading failed, but we'll continue with other fonts
        console.error(`Failed to load ${metadata.name}:`, error);
      }
    });

    await Promise.allSettled(loadPromises);
    this.initialized = true;
  }

  /**
   * Get a font by family name (with fuzzy matching)
   */
  async getFontForFamily(familyName: string): Promise<Font | null> {
    const normalizedFamily = familyName.toLowerCase().trim();

    // Check cache for exact or fuzzy match
    for (const loadedFont of this.fontCache.values()) {
      const fontFamilyLower = loadedFont.family.toLowerCase();
      const metadataNameLower = loadedFont.metadata.name.toLowerCase();

      if (
        fontFamilyLower.includes(normalizedFamily) ||
        normalizedFamily.includes(fontFamilyLower) ||
        metadataNameLower.includes(normalizedFamily) ||
        normalizedFamily.includes(metadataNameLower)
      ) {
        return loadedFont.font;
      }
    }

    // Try to load fonts that might match
    for (const metadata of FONT_REGISTRY) {
      const metadataNameLower = metadata.name.toLowerCase();
      
      if (
        metadataNameLower.includes(normalizedFamily) ||
        normalizedFamily.includes(metadataNameLower)
      ) {
        try {
          const loadedFont = await this.loadFont(metadata.id);
          return loadedFont.font;
        } catch {
          // Font loading failed, continue to next candidate
        }
      }
    }

    return null;
  }

  /**
   * Get a loaded font by ID
   */
  getLoadedFont(fontId: string): LoadedFont | null {
    return this.fontCache.get(fontId) || null;
  }

  /**
   * Check if a font is loaded
   */
  isFontLoaded(fontId: string): boolean {
    return this.fontCache.has(fontId);
  }

  /**
   * Clear font cache
   */
  clearCache(): void {
    this.fontCache.clear();
    this.loadingPromises.clear();
    this.initialized = false;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedFonts: this.fontCache.size,
      loadingFonts: this.loadingPromises.size,
      initialized: this.initialized,
      availableFonts: FONT_REGISTRY.length,
    };
  }

  /**
   * Create a standardized error object
   */
  private createError(
    type: FontLoadErrorDetail['type'],
    message: string,
    fontId?: string,
    originalError?: Error
  ): FontLoadErrorDetail {
    return {
      type,
      message,
      fontId,
      originalError,
    };
  }

  /**
   * Handle and normalize load errors
   */
  private handleLoadError(error: unknown, fontId: string): FontLoadErrorDetail {
    if (error && typeof error === 'object' && 'type' in error) {
      return error as FontLoadErrorDetail;
    }

    if (error instanceof Error) {
      if (error.message.includes('network')) {
        return this.createError('network-error', error.message, fontId, error);
      }
      if (error.message.includes('timeout')) {
        return this.createError('timeout', error.message, fontId, error);
      }
      return this.createError('unknown', error.message, fontId, error);
    }

    return this.createError('unknown', 'Unknown error occurred', fontId);
  }
}

// Export singleton instance
export const fontLoader = new FontLoader();

// Export class for testing
export { FontLoader };
