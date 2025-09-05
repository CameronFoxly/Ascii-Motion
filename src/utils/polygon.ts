/**
 * Polygon utility functions for lasso selection
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Check if a point is inside a polygon using the ray casting algorithm
 * @param point The point to test
 * @param polygon Array of points defining the polygon vertices
 * @returns true if point is inside polygon, false otherwise
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const x = point.x;
  const y = point.y;

  let j = polygon.length - 1;
  for (let i = 0; i < polygon.length; i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
    j = i;
  }

  return inside;
}

/**
 * Get all grid cells that are inside a polygon (center-based selection)
 * @param polygon Array of points defining the polygon vertices
 * @param width Canvas width
 * @param height Canvas height
 * @returns Set of cell keys "x,y" that are inside the polygon
 */
export function getCellsInPolygon(polygon: Point[], width: number, height: number): Set<string> {
  const selectedCells = new Set<string>();
  
  if (polygon.length < 3) return selectedCells;

  // Find bounding box to limit our search area
  const minX = Math.max(0, Math.floor(Math.min(...polygon.map(p => p.x))));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(...polygon.map(p => p.x))));
  const minY = Math.max(0, Math.floor(Math.min(...polygon.map(p => p.y))));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(...polygon.map(p => p.y))));

  // Check each cell in the bounding box
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      // Only check if the cell center is inside the polygon for precise selection
      const cellCenter = { x: x + 0.5, y: y + 0.5 };
      
      if (isPointInPolygon(cellCenter, polygon)) {
        selectedCells.add(`${x},${y}`);
      }
    }
  }

  return selectedCells;
}

/**
 * Smooth a polygon path to reduce noise from freehand drawing
 * @param points Array of points to smooth
 * @param tolerance Distance tolerance for simplification
 * @returns Simplified array of points
 */
export function smoothPolygonPath(points: Point[], tolerance: number = 2): Point[] {
  if (points.length <= 2) return points;

  const smoothed: Point[] = [points[0]];
  
  for (let i = 1; i < points.length - 1; i++) {
    const prev = smoothed[smoothed.length - 1];
    const curr = points[i];
    
    // Only add point if it's far enough from the previous point
    const distance = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2);
    if (distance >= tolerance) {
      smoothed.push(curr);
    }
  }
  
  // Always add the last point
  if (points.length > 0) {
    smoothed.push(points[points.length - 1]);
  }
  
  return smoothed;
}
