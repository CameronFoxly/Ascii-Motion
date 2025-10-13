/**
 * OpenType Glyph to SVG Path Converter
 * 
 * Converts font glyphs to SVG path data with proper coordinate transformation.
 * Handles the conversion from OpenType's bottom-up coordinate system to SVG's top-down system.
 */

import type { Font, Glyph, Path } from 'opentype.js';
import type { GlyphExportOptions, GlyphPathResult } from './types';

/**
 * Convert a glyph to SVG path data
 */
export function convertGlyphToSvgPath(
  font: Font,
  options: GlyphExportOptions
): GlyphPathResult {
  const { char, position, cellSize, fontSize } = options;

  try {
    // Get glyph for character
    const glyph = font.charToGlyph(char);
    
    if (!glyph || !glyph.path) {
      return {
        pathData: '',
        success: false,
        error: `No glyph found for character "${char}" (U+${char.charCodeAt(0).toString(16).toUpperCase()})`,
      };
    }

    // Check if glyph has actual path data
    if (!glyph.path.commands || glyph.path.commands.length === 0) {
      return {
        pathData: '',
        success: false,
        error: `Glyph for "${char}" has no path commands`,
      };
    }

    // Get glyph path at specified position and size
    const glyphPath = glyph.getPath(0, 0, fontSize);
    
    // Transform path to SVG coordinates
    const pathData = transformPathToSvg(
      glyphPath,
      glyph,
      font,
      position.x,
      position.y,
      cellSize.width,
      cellSize.height,
      fontSize
    );

    return {
      pathData,
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      pathData: '',
      success: false,
      error: `Failed to convert glyph: ${message}`,
    };
  }
}

/**
 * Transform OpenType path to SVG path with proper coordinate system conversion
 */
function transformPathToSvg(
  path: Path,
  glyph: Glyph,
  font: Font,
  cellX: number,
  cellY: number,
  cellWidth: number,
  cellHeight: number,
  fontSize: number
): string {
  // Note: glyph.getPath() already returns scaled coordinates, so we don't scale again
  // We just need to:
  // 1. Flip Y-axis (OpenType is bottom-up, SVG is top-down)
  // 2. Center the glyph in the cell
  
  // Calculate scale factor for glyph dimensions (to know the actual size)
  const scale = fontSize / font.unitsPerEm;
  
  // Calculate glyph dimensions
  const glyphWidth = (glyph.advanceWidth || 0) * scale;
  
  // Calculate positioning offsets for centering
  // X: Center horizontally in cell
  const offsetX = cellX * cellWidth + (cellWidth - glyphWidth) / 2;
  
  // Y: Calculate vertical position with baseline alignment
  // 
  // OpenType coordinates from getPath(x, y, fontSize):
  // - Returns path scaled to fontSize
  // - Baseline at specified y coordinate
  // - Positive Y goes UP (e.g., ascender at +ascender_pixels)
  // - Negative Y goes DOWN (e.g., descender at -descender_pixels)
  // 
  // SVG coordinates:
  // - Y=0 at top
  // - Positive Y goes DOWN
  // 
  // Transformation:
  // 1. Negate Y to flip axis: svg_y = y_baseline - opentype_y
  // 2. Position baseline in cell
  
  const ascenderHeight = font.ascender * scale;
  const descenderDepth = Math.abs(font.descender) * scale; 
  const fontHeight = ascenderHeight + descenderDepth;
  
  // Center the font vertically in the cell
  const verticalCenter = cellY * cellHeight + cellHeight / 2;
  
  // Calculate baseline position
  // We're ADDING opentype Y to baseline, so:
  // - Top of font will be at: baseline + ascenderHeight
  // - Bottom of font will be at: baseline - descenderDepth
  // For centering: baseline + ascenderHeight = center - fontHeight/2
  // Therefore: baseline = center - fontHeight/2 - ascenderHeight
  const baselineY = verticalCenter - fontHeight / 2 - ascenderHeight;
  
  // Convert path commands to SVG
  const commands: string[] = [];
  
  path.commands.forEach((cmd) => {
    switch (cmd.type) {
      case 'M': // Move to
        {
          const x = offsetX + (cmd.x || 0);
          const y = baselineY + (cmd.y || 0); // ADD to flip Y-axis (OpenType up is SVG down)
          commands.push(`M${x.toFixed(2)},${y.toFixed(2)}`);
        }
        break;
        
      case 'L': // Line to
        {
          const x = offsetX + (cmd.x || 0);
          const y = baselineY + (cmd.y || 0); // ADD to flip Y-axis
          commands.push(`L${x.toFixed(2)},${y.toFixed(2)}`);
        }
        break;
        
      case 'Q': // Quadratic curve
        {
          const x1 = offsetX + (cmd.x1 || 0);
          const y1 = baselineY + (cmd.y1 || 0); // ADD to flip Y-axis
          const x = offsetX + (cmd.x || 0);
          const y = baselineY + (cmd.y || 0); // ADD to flip Y-axis
          commands.push(`Q${x1.toFixed(2)},${y1.toFixed(2)} ${x.toFixed(2)},${y.toFixed(2)}`);
        }
        break;
        
      case 'C': // Cubic curve
        {
          const x1 = offsetX + (cmd.x1 || 0);
          const y1 = baselineY + (cmd.y1 || 0); // ADD to flip Y-axis
          const x2 = offsetX + (cmd.x2 || 0);
          const y2 = baselineY + (cmd.y2 || 0); // ADD to flip Y-axis
          const x = offsetX + (cmd.x || 0);
          const y = baselineY + (cmd.y || 0); // ADD to flip Y-axis
          commands.push(`C${x1.toFixed(2)},${y1.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)} ${x.toFixed(2)},${y.toFixed(2)}`);
        }
        break;
        
      case 'Z': // Close path
        commands.push('Z');
        break;
    }
  });
  
  return commands.join(' ');
}

/**
 * Generate complete SVG path element with fill and optional background
 */
export function generateSvgPathElement(
  pathData: string,
  color: string,
  backgroundColor: string | undefined,
  cellX: number,
  cellY: number,
  cellWidth: number,
  cellHeight: number
): string {
  let elements = '';
  
  // Background rect if specified
  if (backgroundColor && backgroundColor !== 'transparent') {
    const rectX = cellX * cellWidth;
    const rectY = cellY * cellHeight;
    elements += `    <rect x="${rectX.toFixed(2)}" y="${rectY.toFixed(2)}" width="${cellWidth.toFixed(2)}" height="${cellHeight.toFixed(2)}" fill="${backgroundColor}"/>\n`;
  }
  
  // Path element
  if (pathData) {
    elements += `    <path d="${pathData}" fill="${color}"/>\n`;
  }
  
  return elements;
}

/**
 * Check if a font has a glyph for a character
 */
export function hasGlyph(font: Font, char: string): boolean {
  try {
    const glyph = font.charToGlyph(char);
    return glyph && glyph.unicode !== undefined;
  } catch {
    return false;
  }
}

/**
 * Get missing characters from a string that aren't in the font
 */
export function getMissingGlyphs(font: Font, text: string): string[] {
  const missing: string[] = [];
  const unique = new Set(text.split(''));
  
  unique.forEach(char => {
    if (!hasGlyph(font, char)) {
      missing.push(char);
    }
  });
  
  return missing;
}
