/**
 * Font-related TypeScript type definitions for ASCII Motion
 * Supports opentype.js integration for SVG text-to-outline conversion
 */

import type { Font } from 'opentype.js';

/**
 * Metadata for a bundled font file
 */
export interface FontMetadata {
  /** Unique identifier (e.g., 'roboto-mono', 'jetbrains-mono') */
  id: string;
  
  /** Display name (e.g., 'Roboto Mono') */
  name: string;
  
  /** Filename without path (e.g., 'RobotoMono-Regular.ttf') */
  fileName: string;
  
  /** Full path relative to public directory */
  path: string;
  
  /** License type (e.g., 'Apache-2.0', 'OFL-1.1') */
  license: string;
  
  /** Font weight */
  weight: 'regular' | 'bold' | 'light';
  
  /** Whether this font is recommended for ASCII art */
  recommended?: boolean;
}

/**
 * Options for loading fonts
 */
export interface FontLoadOptions {
  /** Whether to preload the font immediately */
  preload?: boolean;
  
  /** Whether to cache the loaded font */
  cache?: boolean;
  
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * A loaded font with metadata
 */
export interface LoadedFont {
  /** The opentype.js Font object */
  font: Font;
  
  /** Font family name */
  family: string;
  
  /** Original filename */
  fileName: string;
  
  /** Metadata */
  metadata: FontMetadata;
}

/**
 * Options for glyph-to-SVG-path conversion
 */
export interface GlyphExportOptions {
  /** Character to convert */
  char: string;
  
  /** Grid position */
  position: {
    x: number;
    y: number;
  };
  
  /** Cell dimensions in pixels */
  cellSize: {
    width: number;
    height: number;
  };
  
  /** Font size in pixels */
  fontSize: number;
  
  /** Fill color for the path */
  color: string;
  
  /** Optional background color */
  backgroundColor?: string;
}

/**
 * Result of glyph path conversion
 */
export interface GlyphPathResult {
  /** SVG path data string */
  pathData: string;
  
  /** Whether conversion was successful */
  success: boolean;
  
  /** Error message if conversion failed */
  error?: string;
  
  /** Whether a fallback method was used */
  usedFallback?: boolean;
}

/**
 * Font loader error types
 */
export type FontLoadError = 
  | 'network-error'
  | 'parse-error'
  | 'not-found'
  | 'timeout'
  | 'invalid-font'
  | 'unknown';

/**
 * Font loader error with details
 */
export interface FontLoadErrorDetail {
  type: FontLoadError;
  message: string;
  fontId?: string;
  originalError?: Error;
}
