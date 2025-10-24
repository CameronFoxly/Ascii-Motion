/**
 * Font Detection Utility
 * Detects which fonts are actually available on the user's system
 * Uses canvas text measurement technique to determine font availability
 */

// Cache font availability results to avoid repeated checks
const fontAvailabilityCache = new Map<string, boolean>();
const detectedFontCache = new Map<string, string>();

/**
 * Check if a specific font is available on the system
 * Uses canvas text measurement - if a font isn't available, the browser
 * will use a fallback font which will have different measurements
 */
export async function isFontAvailable(fontName: string): Promise<boolean> {
  // Check cache first
  if (fontAvailabilityCache.has(fontName)) {
    return fontAvailabilityCache.get(fontName)!;
  }

  // Create a canvas for measurement
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    // Can't detect without canvas context - assume not available
    fontAvailabilityCache.set(fontName, false);
    return false;
  }

  // Test string with varied characters
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';

  // Measure with a known fallback font (monospace)
  context.font = `${testSize} monospace`;
  const fallbackWidth = context.measureText(testString).width;

  // Measure with the test font, falling back to monospace
  context.font = `${testSize} "${fontName}", monospace`;
  const testWidth = context.measureText(testString).width;

  // If widths are different, the font is available
  // (because it rendered instead of falling back to monospace)
  const isAvailable = testWidth !== fallbackWidth;

  // Cache the result
  fontAvailabilityCache.set(fontName, isAvailable);

  return isAvailable;
}

/**
 * Parse a font stack string into individual font names
 * Handles quoted font names and removes 'monospace' generic
 */
function parseFontStack(fontStack: string): string[] {
  return fontStack
    .split(',')
    .map(font => font.trim())
    .filter(font => font !== 'monospace' && font !== 'sans-serif' && font !== 'serif');
}

/**
 * Detect which font from a font stack is actually being used
 * Returns the first available font name
 */
export async function detectAvailableFont(fontStack: string): Promise<string> {
  // Check cache first
  if (detectedFontCache.has(fontStack)) {
    return detectedFontCache.get(fontStack)!;
  }

  const fonts = parseFontStack(fontStack);

  // Test each font in order
  for (const font of fonts) {
    const isAvailable = await isFontAvailable(font);
    if (isAvailable) {
      detectedFontCache.set(fontStack, font);
      return font;
    }
  }

  // If no fonts are available, return 'monospace' as ultimate fallback
  const fallback = 'monospace';
  detectedFontCache.set(fontStack, fallback);
  return fallback;
}

/**
 * Check if a font stack is using a fallback (requested font not available)
 */
export async function isFallbackActive(
  requestedFontName: string,
  fontStack: string
): Promise<boolean> {
  const actualFont = await detectAvailableFont(fontStack);
  return actualFont !== requestedFontName;
}

/**
 * Clear the font detection cache
 * Useful for testing or if fonts are installed during runtime
 */
export function clearFontCache(): void {
  fontAvailabilityCache.clear();
  detectedFontCache.clear();
}

/**
 * Get a user-friendly message about font availability
 */
export function getFontFallbackMessage(
  requestedFont: string,
  actualFont: string
): string {
  if (requestedFont === actualFont) {
    return `Using ${actualFont}`;
  }

  // Provide OS-specific hints
  let hint = '';
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (requestedFont === 'Consolas' && userAgent.includes('mac')) {
    hint = ' Consolas is a Windows font.';
  } else if (requestedFont === 'SF Mono' && userAgent.includes('win')) {
    hint = ' SF Mono is a macOS/iOS font.';
  } else if (requestedFont === 'Cascadia Code') {
    hint = ' Install Cascadia Code from Microsoft.';
  }

  return `${requestedFont} not available.${hint} Using ${actualFont} instead.`;
}
