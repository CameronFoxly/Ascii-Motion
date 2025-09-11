/**
 * Grid color utilities for dynamic opacity based on background color
 */

/**
 * Convert hex color to RGB values (supports both 3 and 6 character hex codes)
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  // Handle 6-character hex codes (e.g., #ff0000, #ffffff)
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  }
  
  // Handle 3-character hex codes (e.g., #f00, #fff)
  result = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1] + result[1], 16),
      g: parseInt(result[2] + result[2], 16),
      b: parseInt(result[3] + result[3], 16)
    };
  }
  
  return null;
};

/**
 * Calculate the luminance of a color (brightness)
 */
const getLuminance = (r: number, g: number, b: number): number => {
  // Convert RGB to linear RGB
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  // Calculate luminance
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Calculate optimal grid color with opacity based on background color
 * Returns a color that provides good contrast while maintaining visual harmony
 */
export const calculateGridColor = (backgroundColor: string, theme: 'light' | 'dark' = 'dark'): string => {
  // Handle transparent/default cases with theme awareness
  if (backgroundColor === 'transparent' || !backgroundColor) {
    if (theme === 'dark') {
      return 'rgba(255, 255, 255, 0.05)'; // Very subtle light for transparent backgrounds in dark mode - reduced from 0.1
    } else {
      return 'rgba(0, 0, 0, 0.05)'; // Very subtle dark for transparent backgrounds in light mode - reduced from 0.1
    }
  }

  const rgb = hexToRgb(backgroundColor);
  if (!rgb) {
    // Fallback for invalid colors
    return 'rgba(0, 0, 0, 0.05)'; // Reduced from 0.1
  }

  const { r, g, b } = rgb;
  const luminance = getLuminance(r, g, b);

  // Special handling for pure black and white for optimal appearance
  if (backgroundColor === '#000000' || backgroundColor === '#000') {
    return 'rgba(51, 51, 51, 0.5)'; // #333333 with half opacity - reduced from 1
  }
  
  if (backgroundColor === '#ffffff' || backgroundColor === '#fff') {
    return 'rgba(229, 231, 235, 0.5)'; // #E5E7EB with half opacity - reduced from 1
  }

  // For other colors, calculate optimal grid color based on luminance
  if (luminance > 0.5) {
    // Light background - use dark grid with reduced opacity
    return 'rgba(0, 0, 0, 0.075)'; // Reduced from 0.15
  } else {
    // Dark background - use light grid with reduced opacity
    return 'rgba(255, 255, 255, 0.075)'; // Reduced from 0.15
  }
};

/**
 * Calculate contrast-aware grid color that adapts to any background
 * Provides better visibility on colored backgrounds than fixed colors
 * 
 * EDGE CASE FIX: Transparent backgrounds now adapt to theme (light/dark mode)
 * for proper visibility in both light and dark themes
 */
export const calculateAdaptiveGridColor = (backgroundColor: string, theme: 'light' | 'dark' = 'dark'): string => {
  if (backgroundColor === 'transparent' || !backgroundColor) {
    // Adapt grid color to theme for transparent backgrounds
    if (theme === 'dark') {
      return 'rgba(255, 255, 255, 0.1)'; // Light grid on dark theme - reduced from 0.2
    } else {
      return 'rgba(0, 0, 0, 0.1)'; // Dark grid on light theme - reduced from 0.2
    }
  }

  const rgb = hexToRgb(backgroundColor);
  if (!rgb) {
    return 'rgba(0, 0, 0, 0.04)'; // Reduced from 0.08
  }

  const { r, g, b } = rgb;
  const luminance = getLuminance(r, g, b);

  // Pure black and white get special treatment for crispness - reduce opacity by half
  if (backgroundColor === '#000000' || backgroundColor === '#000') {
    return 'rgba(51, 51, 51, 0.5)'; // Half opacity dark gray - reduced from full opacity
  }
  
  if (backgroundColor === '#ffffff' || backgroundColor === '#fff') {
    return 'rgba(229, 231, 235, 0.5)'; // Half opacity light gray - reduced from full opacity
  }

  // For colored backgrounds, use adaptive opacity - all values reduced by half
  // Higher contrast colors get more opacity, muted colors get less
  const saturation = Math.max(Math.abs(r - 128), Math.abs(g - 128), Math.abs(b - 128)) / 128;
  const baseOpacity = 0.06; // Base opacity for subtle grid - reduced from 0.12
  const saturationBoost = saturation * 0.04; // Boost opacity for high-saturation colors - reduced from 0.08
  const finalOpacity = Math.min(baseOpacity + saturationBoost, 0.125); // Cap at 12.5% - reduced from 0.25

  if (luminance > 0.5) {
    // Light background - use dark grid
    return `rgba(0, 0, 0, ${finalOpacity})`;
  } else {
    // Dark background - use light grid
    return `rgba(255, 255, 255, ${finalOpacity})`;
  }
};
