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
 * Get all grid cells that are inside or intersected by a polygon
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
      // Check if the cell center is inside the polygon
      const cellCenter = { x: x + 0.5, y: y + 0.5 };
      
      if (isPointInPolygon(cellCenter, polygon)) {
        selectedCells.add(`${x},${y}`);
      } else {
        // Also check if any cell corner is inside the polygon
        // or if any polygon edge intersects the cell
        const cellCorners = [
          { x, y },
          { x: x + 1, y },
          { x: x + 1, y: y + 1 },
          { x, y: y + 1 }
        ];

        const hasCornerInside = cellCorners.some(corner => 
          isPointInPolygon(corner, polygon)
        );

        if (hasCornerInside) {
          selectedCells.add(`${x},${y}`);
        } else {
          // Check if any polygon edge intersects the cell
          if (polygonIntersectsCell(polygon, x, y)) {
            selectedCells.add(`${x},${y}`);
          }
        }
      }
    }
  }

  return selectedCells;
}

/**
 * Check if a polygon intersects with a grid cell
 * @param polygon Array of points defining the polygon vertices
 * @param cellX Cell x coordinate
 * @param cellY Cell y coordinate
 * @returns true if polygon intersects the cell
 */
function polygonIntersectsCell(polygon: Point[], cellX: number, cellY: number): boolean {
  const cellLeft = cellX;
  const cellRight = cellX + 1;
  const cellTop = cellY;
  const cellBottom = cellY + 1;

  // Check if any polygon edge intersects any cell edge
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const p1 = polygon[i];
    const p2 = polygon[j];

    // Check intersection with each cell edge
    if (
      lineIntersectsLine(p1, p2, { x: cellLeft, y: cellTop }, { x: cellRight, y: cellTop }) ||
      lineIntersectsLine(p1, p2, { x: cellRight, y: cellTop }, { x: cellRight, y: cellBottom }) ||
      lineIntersectsLine(p1, p2, { x: cellRight, y: cellBottom }, { x: cellLeft, y: cellBottom }) ||
      lineIntersectsLine(p1, p2, { x: cellLeft, y: cellBottom }, { x: cellLeft, y: cellTop })
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Check if two line segments intersect
 * @param p1 First point of first line
 * @param p2 Second point of first line
 * @param p3 First point of second line
 * @param p4 Second point of second line
 * @returns true if lines intersect
 */
function lineIntersectsLine(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  
  if (denom === 0) return false; // Lines are parallel

  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
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
