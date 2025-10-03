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
 * Check if a line segment intersects with a cell (grid square)
 * @param p1 First point of line segment
 * @param p2 Second point of line segment
 * @param cellX Cell x coordinate (integer)
 * @param cellY Cell y coordinate (integer)
 * @returns true if line segment crosses through or touches the cell
 */
function lineIntersectsCell(p1: Point, p2: Point, cellX: number, cellY: number): boolean {
  // Cell boundaries
  const left = cellX;
  const right = cellX + 1;
  const top = cellY;
  const bottom = cellY + 1;

  // Check if either endpoint is inside the cell
  if ((p1.x >= left && p1.x <= right && p1.y >= top && p1.y <= bottom) ||
      (p2.x >= left && p2.x <= right && p2.y >= top && p2.y <= bottom)) {
    return true;
  }

  // Check intersection with each edge of the cell
  // Line segment parametric form: P = p1 + t * (p2 - p1), where 0 <= t <= 1
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  // Check left edge (x = left)
  if (dx !== 0) {
    const t = (left - p1.x) / dx;
    if (t >= 0 && t <= 1) {
      const y = p1.y + t * dy;
      if (y >= top && y <= bottom) return true;
    }
  }

  // Check right edge (x = right)
  if (dx !== 0) {
    const t = (right - p1.x) / dx;
    if (t >= 0 && t <= 1) {
      const y = p1.y + t * dy;
      if (y >= top && y <= bottom) return true;
    }
  }

  // Check top edge (y = top)
  if (dy !== 0) {
    const t = (top - p1.y) / dy;
    if (t >= 0 && t <= 1) {
      const x = p1.x + t * dx;
      if (x >= left && x <= right) return true;
    }
  }

  // Check bottom edge (y = bottom)
  if (dy !== 0) {
    const t = (bottom - p1.y) / dy;
    if (t >= 0 && t <= 1) {
      const x = p1.x + t * dx;
      if (x >= left && x <= right) return true;
    }
  }

  return false;
}

/**
 * Get all grid cells that are inside a polygon or crossed by polygon edges
 * @param polygon Array of points defining the polygon vertices
 * @param width Canvas width
 * @param height Canvas height
 * @returns Set of cell keys "x,y" that are inside the polygon or crossed by its edges
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
      // Check if cell center is inside the polygon
      const cellCenter = { x: x + 0.5, y: y + 0.5 };
      
      if (isPointInPolygon(cellCenter, polygon)) {
        selectedCells.add(`${x},${y}`);
        continue;
      }

      // Check if any polygon edge crosses through this cell
      for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];
        
        if (lineIntersectsCell(p1, p2, x, y)) {
          selectedCells.add(`${x},${y}`);
          break;
        }
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
