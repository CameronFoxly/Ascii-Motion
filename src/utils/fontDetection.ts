/**
 * Font Detection Utility
 * Detects which fonts are actually available on the user's system
 * Uses canvas text measurement technique to determine font availability
 */

// Cache font availability results to avoid repeated checks
const fontAvailabilityCache = new Map<string, boolean>();
const detectedFontCache = new Map<string, string>();

// Cache for the actual font used by the browser
const actualUsedFontCache = new Map<string, string>();

/**
 * Check if a specific font is available on the system
 * Uses canvas measurement with serif AND sans-serif baselines for better accuracy
 */
export async function isFontAvailable(fontName: string): Promise<boolean> {
  // Check cache first
  if (fontAvailabilityCache.has(fontName)) {
    return fontAvailabilityCache.get(fontName)!;
  }

  // First, check if the font is available via CSS Font Loading API
  // This catches fonts loaded via @font-face declarations
  if (document.fonts) {
    try {
      // Try with quotes (for fonts with spaces)
      const fontWithQuotes = fontName.includes(' ') ? `"${fontName}"` : fontName;
      const isAvailableViaCSS = document.fonts.check(`12px ${fontWithQuotes}`);
      if (isAvailableViaCSS) {
        fontAvailabilityCache.set(fontName, true);
        return true;
      }
    } catch (e) {
      // If check() throws, fall through to canvas measurement
    }
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    fontAvailabilityCache.set(fontName, false);
    return false;
  }

  // Use multiple test strings and baseline fonts
  const testStrings = ['mmmmmmmmmmlli', 'iIl1O0'];
  const baselineFonts = ['monospace', 'sans-serif', 'serif'];
  const testSize = '72px';
  
  // Collect baseline measurements
  const baselines = new Map<string, number[]>();
  for (const baselineFont of baselineFonts) {
    const widths: number[] = [];
    for (const testString of testStrings) {
      context.font = `${testSize} ${baselineFont}`;
      widths.push(context.measureText(testString).width);
    }
    baselines.set(baselineFont, widths);
  }

  // Test the font both with and without quotes (SF Mono behaves differently)
  const fontVariations = [
    `"${fontName}"`,
    fontName
  ];

  for (const fontVariation of fontVariations) {
    // Test against each baseline
    for (const baselineFont of baselineFonts) {
      const baselineWidths = baselines.get(baselineFont)!;
      
      for (let i = 0; i < testStrings.length; i++) {
        const testString = testStrings[i];
        context.font = `${testSize} ${fontVariation}, ${baselineFont}`;
        const testWidth = context.measureText(testString).width;
        
        // If this width differs from the baseline, the font is available
        if (testWidth !== baselineWidths[i]) {
          fontAvailabilityCache.set(fontName, true);
          return true;
        }
      }
    }
  }

  fontAvailabilityCache.set(fontName, false);
  return false;
}

/**
 * Parse a font stack string into individual font names
 * Handles quoted font names and removes generic families
 */
function parseFontStack(fontStack: string): string[] {
  return fontStack
    .split(',')
    .map(font => font.trim())
    .filter(font => 
      font !== 'monospace' && 
      font !== 'sans-serif' && 
      font !== 'serif' &&
      font !== 'ui-monospace' // Generic CSS keyword for system monospace
    );
}

/**
 * Get the actual font being used by the browser for a given font stack
 * Tests each font in order and returns the first available one
 */
async function getActualUsedFont(fontStack: string): Promise<string> {
  // Check cache first
  if (actualUsedFontCache.has(fontStack)) {
    return actualUsedFontCache.get(fontStack)!;
  }

  const fonts = parseFontStack(fontStack);

  // Test each font in order
  for (const font of fonts) {
    const isAvailable = await isFontAvailable(font);
    if (isAvailable) {
      actualUsedFontCache.set(fontStack, font);
      return font;
    }
  }
  
  // Special case: Some fonts (like SF Mono on macOS) have identical metrics to generic monospace
  // and can't be detected via measurement, but ARE available. Check if we should trust the first font.
  if (fonts.length > 0 && fonts.length <= 2) { // Only for specific font selections (not auto)
    const firstFont = fonts[0];
    
    // List of fonts known to have identical metrics to system defaults on certain platforms
    const platformIdenticalFonts = [
      { font: 'SF Mono', platform: 'mac' },
      { font: 'SFMono-Regular', platform: 'mac' }
    ];
    
    const userAgent = navigator.userAgent.toLowerCase();
    const isMac = userAgent.includes('mac');
    
    // Check if this font is known to be identical to system default on this platform
    const isKnownIdentical = platformIdenticalFonts.some(
      item => item.font === firstFont && 
              ((item.platform === 'mac' && isMac))
    );
    
    if (isKnownIdentical) {
      actualUsedFontCache.set(fontStack, firstFont);
      return firstFont;
    }
  }
  
  // For "auto" mode or if detection failed, try to detect the system's default
  
  const commonSystemFonts = [
    'Menlo',
    'SF Mono',
    'Monaco', 
    'Consolas',
    'Courier New',
    'Courier'
  ];
  
  for (const systemFont of commonSystemFonts) {
    // Skip if already tested
    if (fonts.includes(systemFont)) continue;
    
    const isAvailable = await isFontAvailable(systemFont);
    if (isAvailable) {
      actualUsedFontCache.set(fontStack, systemFont);
      return systemFont;
    }
  }
  
  // Ultimate fallback - couldn't detect specific font
  actualUsedFontCache.set(fontStack, 'monospace');
  return 'monospace';
}

/**
 * Detect which font from a font stack is actually being used
 * Returns the actual font name being rendered by the browser
 */
export async function detectAvailableFont(fontStack: string): Promise<string> {
  // Check cache first
  if (detectedFontCache.has(fontStack)) {
    return detectedFontCache.get(fontStack)!;
  }

  // Get the actual font being used (await the promise)
  const actualFont = await getActualUsedFont(fontStack);
  
  // Cache the result
  detectedFontCache.set(fontStack, actualFont);
  
  return actualFont;
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
  actualUsedFontCache.clear();
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

  // If actualFont is generic or empty, try to be more helpful
  if (!actualFont || actualFont === 'monospace') {
    return `${requestedFont} not available. Using system default monospace font.`;
  }

  // Provide OS-specific hints
  let hint = '';
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (requestedFont === 'Consolas' && userAgent.includes('mac')) {
    hint = ' (Windows font)';
  } else if (requestedFont === 'SF Mono' && userAgent.includes('win')) {
    hint = ' (macOS font)';
  } else if (requestedFont === 'Cascadia Code') {
    hint = ' (install from Microsoft)';
  }

  return `${requestedFont} not available${hint}. Using ${actualFont}.`;
}
