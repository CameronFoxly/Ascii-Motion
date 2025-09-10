// Onion skin configuration constants

/**
 * Onion skin color configuration
 * Centralized to make style changes easy
 */
export const ONION_SKIN_COLORS = {
  // Previous frames (purple tint)
  PREVIOUS: {
    hex: '#A855F7',      // Purple-500
    rgb: [168, 85, 247],  // RGB values for opacity calculations
  },
  
  // Next frames (red tint)
  NEXT: {
    hex: '#EF4444',      // Red-500 
    rgb: [239, 68, 68],   // RGB values for opacity calculations
  }
} as const;

/**
 * Onion skin opacity configuration
 */
export const ONION_SKIN_OPACITY = {
  BASE: 0.6,    // 60% - closest frames
  MIN: 0.2,     // 20% - furthest frames
  MAX_DISTANCE: 10, // Maximum frames in each direction
} as const;

/**
 * Calculate opacity for onion skin frame based on distance from current frame
 * @param distance - Distance from current frame (1, 2, 3, etc.)
 * @param maxDistance - Maximum distance being rendered
 * @returns Opacity value between MIN and BASE
 */
export const calculateOnionSkinOpacity = (distance: number, maxDistance: number): number => {
  if (distance === 0) return 1.0; // Current frame is fully opaque
  if (distance > maxDistance) return 0; // Beyond max distance
  
  const falloff = (ONION_SKIN_OPACITY.BASE - ONION_SKIN_OPACITY.MIN) * (distance / maxDistance);
  return Math.max(ONION_SKIN_OPACITY.MIN, ONION_SKIN_OPACITY.BASE - falloff);
};

/**
 * Get RGBA color string for onion skin frame
 * @param isPrevious - Whether this is a previous frame (blue) or next frame (red)
 * @param opacity - Opacity value (0-1)
 * @returns RGBA color string
 */
export const getOnionSkinColor = (isPrevious: boolean, opacity: number): string => {
  const color = isPrevious ? ONION_SKIN_COLORS.PREVIOUS : ONION_SKIN_COLORS.NEXT;
  return `rgba(${color.rgb[0]}, ${color.rgb[1]}, ${color.rgb[2]}, ${opacity})`;
};
