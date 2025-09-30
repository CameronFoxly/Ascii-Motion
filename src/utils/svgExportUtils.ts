/**
 * SVG Export Utilities for ASCII Motion
 * Provides functions to generate SVG elements and convert ASCII art to vector graphics
 */

import type { Font } from 'opentype.js';
import { convertGlyphToSvgPath, generateSvgPathElement } from './font/opentypePathConverter';

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
 * Convert character to SVG path outline using opentype.js
 * Falls back to pixel tracing if font is unavailable
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
  fontFamily: string,
  font?: Font // Optional opentype.js font for true vector conversion
): string {
  // Try opentype.js conversion first if font is provided
  if (font) {
    const result = convertGlyphToSvgPath(font, {
      char,
      position: { x, y },
      cellSize: { width: cellWidth, height: cellHeight },
      fontSize,
      color,
      backgroundColor: bgColor,
    });

    if (result.success && result.pathData) {
      return generateSvgPathElement(
        result.pathData,
        color,
        bgColor,
        x,
        y,
        cellWidth,
        cellHeight
      );
    }
    
    // If opentype conversion failed, log warning and fall through to pixel tracing
    if (result.error) {
      console.warn(`[SVG Export] OpenType conversion failed for "${char}": ${result.error}`);
    }
  } else {
    // Log once that we're using pixel tracing because no font was provided
    if (x === 0 && y === 0) {
      console.warn('[SVG Export] No font provided, using pixel tracing fallback');
    }
  }

  // Fallback to pixel tracing if no font or conversion failed
  return convertTextToPathPixelTracing(
    char,
    x,
    y,
    color,
    bgColor,
    cellWidth,
    cellHeight,
    fontSize,
    fontFamily
  );
}

/**
 * Convert character to SVG path using pixel tracing (fallback method)
 * Uses marching squares algorithm to trace rendered character
 */
function convertTextToPathPixelTracing(
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
 * Convert canvas content to SVG path using marching squares algorithm
 * Traces the actual pixel boundaries of rendered characters
 * 
 * For production use, consider:
 * - opentype.js for accurate font path extraction from font files
 * - This implementation provides good approximation from rendered pixels
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
    
    // Create binary grid of pixels (1 = filled, 0 = empty)
    const grid: number[][] = [];
    for (let y = 0; y < height; y++) {
      grid[y] = [];
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        grid[y][x] = alpha > 128 ? 1 : 0;
      }
    }
    
    // Find contours using marching squares
    const paths: string[] = [];
    const visited = new Set<string>();
    
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        
        // Check if this is a boundary pixel
        const tl = grid[y][x];
        const tr = grid[y][x + 1];
        const bl = grid[y + 1][x];
        const br = grid[y + 1][x + 1];
        
        // Calculate marching squares case
        const caseValue = tl * 8 + tr * 4 + br * 2 + bl * 1;
        
        // Skip if no boundary
        if (caseValue === 0 || caseValue === 15) continue;
        
        // Trace contour from this point
        const path = traceContour(grid, x, y, visited, offsetX, offsetY, scale);
        if (path) {
          paths.push(path);
        }
      }
    }
    
    if (paths.length === 0) return null;
    
    // Combine all paths
    return paths.join(' ');
  } catch (error) {
    console.error('Error converting canvas to SVG path:', error);
    return null;
  }
}

/**
 * Trace a contour starting from a boundary pixel
 */
function traceContour(
  grid: number[][],
  startX: number,
  startY: number,
  visited: Set<string>,
  offsetX: number,
  offsetY: number,
  scale: number
): string | null {
  const height = grid.length;
  const width = grid[0].length;
  const points: {x: number, y: number}[] = [];
  
  let x = startX;
  let y = startY;
  let direction = 0; // 0=right, 1=down, 2=left, 3=up
  const maxSteps = width * height; // Prevent infinite loops
  let steps = 0;
  
  do {
    visited.add(`${x},${y}`);
    
    // Add current point
    const px = offsetX + x * scale;
    const py = offsetY + y * scale;
    points.push({x: px, y: py});
    
    // Find next boundary pixel
    let found = false;
    for (let i = 0; i < 4; i++) {
      const newDir = (direction + i) % 4;
      let nx = x, ny = y;
      
      switch (newDir) {
        case 0: nx++; break; // right
        case 1: ny++; break; // down
        case 2: nx--; break; // left
        case 3: ny--; break; // up
      }
      
      if (nx < 0 || ny < 0 || nx >= width - 1 || ny >= height - 1) continue;
      
      const tl = grid[ny][nx];
      const tr = grid[ny][nx + 1];
      const bl = grid[ny + 1][nx];
      const br = grid[ny + 1][nx + 1];
      const caseValue = tl * 8 + tr * 4 + br * 2 + bl * 1;
      
      if (caseValue !== 0 && caseValue !== 15) {
        x = nx;
        y = ny;
        direction = newDir;
        found = true;
        break;
      }
    }
    
    if (!found || ++steps > maxSteps) break;
    
  } while (x !== startX || y !== startY);
  
  if (points.length < 3) return null;
  
  // Build SVG path from points with curve smoothing
  let path = `M${points[0].x},${points[0].y}`;
  
  if (points.length < 10) {
    // For simple shapes, use lines
    for (let i = 1; i < points.length; i++) {
      path += ` L${points[i].x},${points[i].y}`;
    }
  } else {
    // For complex shapes, use smooth curves
    for (let i = 1; i < points.length - 2; i += 2) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const cp = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
      };
      path += ` Q${p1.x},${p1.y} ${cp.x},${cp.y}`;
    }
    // Handle remaining points
    if (points.length % 2 === 0) {
      path += ` L${points[points.length - 1].x},${points[points.length - 1].y}`;
    }
  }
  
  path += ' Z';
  return path;
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
