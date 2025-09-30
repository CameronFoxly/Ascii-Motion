/**
 * SVG Export Utilities for ASCII Motion
 * Provides functions to generate SVG elements and convert ASCII art to vector graphics
 */

/**
 * Generate SVG header with proper namespaces and viewBox
 */
export function generateSvgHeader(
  width: number,
  height: number,
  backgroundColor?: string
): string {
  const bgRect = backgroundColor
    ? `  <rect width="100%" height="100%" fill="${backgroundColor}"/>\n`
    : '';
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${bgRect}`;
}

/**
 * Generate SVG grid lines
 */
export function generateSvgGrid(
  gridWidth: number,
  gridHeight: number,
  cellWidth: number,
  cellHeight: number,
  gridColor: string
): string {
  let lines = '  <g id="grid" stroke="' + gridColor + '" stroke-width="1" opacity="0.3">\n';
  
  // Vertical lines
  for (let x = 0; x <= gridWidth; x++) {
    const xPos = x * cellWidth;
    lines += `    <line x1="${xPos}" y1="0" x2="${xPos}" y2="${gridHeight * cellHeight}"/>\n`;
  }
  
  // Horizontal lines
  for (let y = 0; y <= gridHeight; y++) {
    const yPos = y * cellHeight;
    lines += `    <line x1="0" y1="${yPos}" x2="${gridWidth * cellWidth}" y2="${yPos}"/>\n`;
  }
  
  lines += '  </g>\n';
  return lines;
}

/**
 * Generate SVG text element for a character
 */
export function generateSvgTextElement(
  char: string,
  x: number,
  y: number,
  color: string,
  bgColor: string | undefined,
  cellWidth: number,
  cellHeight: number,
  fontSize: number,
  fontFamily: string
): string {
  let elements = '';
  
  // Background rect if specified
  if (bgColor && bgColor !== 'transparent') {
    const rectX = x * cellWidth;
    const rectY = y * cellHeight;
    elements += `    <rect x="${rectX}" y="${rectY}" width="${cellWidth}" height="${cellHeight}" fill="${bgColor}"/>\n`;
  }
  
  // Text element centered in cell
  const textX = x * cellWidth + cellWidth / 2;
  const textY = y * cellHeight + cellHeight / 2;
  
  // Escape special XML characters
  const escapedChar = escapeXml(char);
  
  // Escape quotes in font-family for XML attribute
  const escapedFontFamily = fontFamily.replace(/"/g, '&quot;');
  
  elements += `    <text x="${textX}" y="${textY}" fill="${color}" font-family="${escapedFontFamily}, monospace" font-size="${fontSize}px" text-anchor="middle" dominant-baseline="central">${escapedChar}</text>\n`;
  
  return elements;
}

/**
 * Convert character to SVG path outline
 * Uses canvas to render character and extract approximate path
 * 
 * Note: This is a simplified implementation. For production-quality path conversion,
 * consider using a library like opentype.js for accurate glyph path extraction.
 */
export function convertTextToPath(
  char: string,
  x: number,
  y: number,
  color: string,
  bgColor: string | undefined,
  cellWidth: number,
  cellHeight: number,
  fontSize: number,
  fontFamily: string
): string {
  let elements = '';
  
  // Background rect if specified
  if (bgColor && bgColor !== 'transparent') {
    const rectX = x * cellWidth;
    const rectY = y * cellHeight;
    elements += `    <rect x="${rectX}" y="${rectY}" width="${cellWidth}" height="${cellHeight}" fill="${bgColor}"/>\n`;
  }
  
  // Create a temporary canvas for text measurement
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    // Fallback to text element if canvas context unavailable
    const textX = x * cellWidth + cellWidth / 2;
    const textY = y * cellHeight + cellHeight / 2;
    const escapedChar = escapeXml(char);
    const escapedFontFamily = fontFamily.replace(/"/g, '&quot;');
    elements += `    <text x="${textX}" y="${textY}" fill="${color}" font-family="${escapedFontFamily}, monospace" font-size="${fontSize}px" text-anchor="middle" dominant-baseline="central">${escapedChar}</text>\n`;
    return elements;
  }
  
  // Set up canvas for text rendering
  const scale = 2; // Higher resolution for better path extraction
  canvas.width = cellWidth * scale;
  canvas.height = cellHeight * scale;
  
  ctx.font = `${fontSize * scale}px ${fontFamily}, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw character
  ctx.fillText(char, canvas.width / 2, canvas.height / 2);
  
  // Get image data and convert to path
  // This is a simplified approach - for better results, use opentype.js or similar
  const pathData = canvasToSvgPath(ctx, canvas.width, canvas.height, x * cellWidth, y * cellHeight, 1 / scale);
  
  if (pathData) {
    elements += `    <path d="${pathData}" fill="${color}"/>\n`;
  } else {
    // Fallback to text element if path extraction fails
    const textX = x * cellWidth + cellWidth / 2;
    const textY = y * cellHeight + cellHeight / 2;
    const escapedChar = escapeXml(char);
    const escapedFontFamily = fontFamily.replace(/"/g, '&quot;');
    elements += `    <text x="${textX}" y="${textY}" fill="${color}" font-family="${escapedFontFamily}, monospace" font-size="${fontSize}px" text-anchor="middle" dominant-baseline="central">${escapedChar}</text>\n`;
  }
  
  return elements;
}

/**
 * Convert canvas content to SVG path
 * Simplified implementation - traces pixel boundaries
 * 
 * For production use, consider:
 * - opentype.js for accurate font path extraction
 * - potrace algorithm for better vectorization
 * - Font-specific path data lookup tables
 */
function canvasToSvgPath(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
  scale: number
): string | null {
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Simple approach: Find bounding box of non-transparent pixels
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let hasPixels = false;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 128) {
          hasPixels = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    if (!hasPixels) return null;
    
    // Create a simple rectangle path as approximation
    // In production, use proper vectorization algorithm
    const x1 = offsetX + minX * scale;
    const y1 = offsetY + minY * scale;
    const x2 = offsetX + maxX * scale;
    const y2 = offsetY + maxY * scale;
    
    // Return a rectangle path (simplified - not actual character outline)
    // For better results, implement marching squares or use opentype.js
    return `M${x1},${y1} L${x2},${y1} L${x2},${y2} L${x1},${y2} Z`;
  } catch (error) {
    console.error('Error converting canvas to SVG path:', error);
    return null;
  }
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Prettify SVG output with proper indentation
 * Already formatted during generation, this is for any additional cleanup
 */
export function prettifySvg(svg: string): string {
  // The SVG is already prettified during generation with proper newlines
  // This function can do additional cleanup if needed
  return svg;
}

/**
 * Minify SVG output by removing whitespace
 */
export function minifySvg(svg: string): string {
  return svg
    .replace(/>\s+</g, '><')       // Remove whitespace between tags
    .replace(/\s{2,}/g, ' ')       // Collapse multiple spaces
    .replace(/\n/g, '')            // Remove newlines
    .trim();
}
