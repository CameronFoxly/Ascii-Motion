/**
 * Canvas Text Rendering Utilities for ASCII Motion
 * 
 * This module provides optimized text rendering for crisp, smooth ASCII art display.
 * 
 * ## Final Implementation Summary:
 * After testing multiple approaches (high-DPI scaling, pixel-perfect rendering, etc.),
 * the optimal solution combines:
 * 
 * 1. **Smooth Text Rendering**: High-quality canvas antialiasing for readable text
 * 2. **CSS Font Smoothing**: Browser's native font smoothing capabilities
 * 3. **Layered Grid Rendering**: Grid drawn as background, content on top
 * 4. **Pixel-Aligned Coordinates**: Rounded positions prevent sub-pixel blur
 * 5. **Modern Font Stack**: Professional monospace fonts (SF Mono, Monaco, etc.)
 * 
 * ## Key Features:
 * - Professional text editor appearance similar to VS Code
 * - Smooth, readable text without chunky pixelation
 * - Subtle background grid that enhances rather than competes
 * - Accurate mouse coordinate handling
 * - Excellent cross-browser compatibility
 * - Optimal performance with layered rendering
 * 
 * ## Rendering Layers:
 * 1. Canvas background color
 * 2. Grid lines (background layer)
 * 3. Onion skin layers
 * 4. Cell content (text and backgrounds)
 * 5. Overlays (selection, cursor, etc.)
 */

type ExtendedCanvasRenderingContext2D = CanvasRenderingContext2D & {
  textRendering?: 'auto' | 'optimizeSpeed' | 'optimizeLegibility' | 'geometricPrecision';
  fontKerning?: CanvasFontKerning;
  mozImageSmoothingEnabled?: boolean;
  webkitImageSmoothingEnabled?: boolean;
  msImageSmoothingEnabled?: boolean;
};

/**
 * Setup optimal text rendering settings for a canvas context
 * 
 * Configures the canvas for smooth, high-quality text rendering that looks
 * professional and readable without chunky pixelation.
 */
export const setupTextRendering = (ctx: CanvasRenderingContext2D): void => {
  // Enable high-quality image smoothing for smooth text
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Set text baseline for consistent positioning
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  
  // Enable font optimization for smooth text
  const extendedCtx = ctx as ExtendedCanvasRenderingContext2D;
  if ('textRendering' in extendedCtx) {
    extendedCtx.textRendering = 'optimizeLegibility';
  }
  
  // Set better text rendering where available
  if ('fontKerning' in extendedCtx) {
    extendedCtx.fontKerning = 'normal';
  }
  
  // Enable high-quality smoothing across browsers
  if ('mozImageSmoothingEnabled' in extendedCtx) {
    extendedCtx.mozImageSmoothingEnabled = true;
  }
  
  if ('webkitImageSmoothingEnabled' in extendedCtx) {
    extendedCtx.webkitImageSmoothingEnabled = true;
  }
  
  if ('msImageSmoothingEnabled' in extendedCtx) {
    extendedCtx.msImageSmoothingEnabled = true;
  }
};

/**
 * Round coordinates to pixel boundaries for crisp rendering
 * 
 * Used for drawing sharp lines and preventing sub-pixel positioning blur.
 * For 1-pixel lines, add 0.5 to coordinates.
 */
export const pixelAlign = (value: number): number => {
  return Math.round(value) + 0.5;
};

/**
 * Calculate optimal font size for crisp rendering
 * Ensures font size aligns well with pixel boundaries
 */
export const getOptimalFontSize = (
  desiredSize: number,
  devicePixelRatio: number = window.devicePixelRatio || 1
): number => {
  // Round to ensure crisp rendering at the device pixel level
  return Math.round(desiredSize * devicePixelRatio) / devicePixelRatio;
};
