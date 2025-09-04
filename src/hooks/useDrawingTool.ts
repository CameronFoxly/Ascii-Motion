import { useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import type { Cell } from '../types';

/**
 * Custom hook for handling canvas drawing operations
 */
export const useDrawingTool = () => {
  const { setCell, clearCell, getCell, fillArea } = useCanvasStore();
  const { 
    activeTool, 
    selectedChar, 
    selectedColor, 
    selectedBgColor,
    rectangleFilled,
    pickFromCell 
  } = useToolStore();

  const drawAtPosition = useCallback((x: number, y: number) => {
    switch (activeTool) {
      case 'pencil': {
        const newCell: Cell = {
          char: selectedChar,
          color: selectedColor,
          bgColor: selectedBgColor
        };
        setCell(x, y, newCell);
        break;
      }
      case 'eraser': {
        clearCell(x, y);
        break;
      }
      case 'eyedropper': {
        const existingCell = getCell(x, y);
        if (existingCell) {
          pickFromCell(existingCell.char, existingCell.color, existingCell.bgColor);
        }
        break;
      }
      case 'paintbucket': {
        const newCell: Cell = {
          char: selectedChar,
          color: selectedColor,
          bgColor: selectedBgColor
        };
        fillArea(x, y, newCell);
        break;
      }
    }
  }, [
    activeTool, 
    selectedChar, 
    selectedColor, 
    selectedBgColor, 
    setCell, 
    clearCell, 
    getCell, 
    fillArea,
    pickFromCell
  ]);

  const drawRectangle = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);

    const newCell: Cell = {
      char: selectedChar,
      color: selectedColor,
      bgColor: selectedBgColor
    };

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        // For hollow rectangles, only draw border
        if (!rectangleFilled) {
          if (x === minX || x === maxX || y === minY || y === maxY) {
            setCell(x, y, newCell);
          }
        } else {
          // For filled rectangles, draw all cells
          setCell(x, y, newCell);
        }
      }
    }
  }, [selectedChar, selectedColor, selectedBgColor, rectangleFilled, setCell]);

  // Helper function to get ellipse points using a simpler approach
  const getEllipsePoints = useCallback((centerX: number, centerY: number, radiusX: number, radiusY: number, filled: boolean = false) => {
    const points: Array<{ x: number; y: number }> = [];
    
    // Calculate bounding box
    const minX = Math.floor(centerX - radiusX);
    const maxX = Math.ceil(centerX + radiusX);
    const minY = Math.floor(centerY - radiusY);
    const maxY = Math.ceil(centerY + radiusY);
    
    if (filled) {
      // For filled ellipse, check each point within bounding box
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          // Check if point is inside ellipse using ellipse equation
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);
          
          if (distance <= 1) {
            points.push({ x: Math.round(x), y: Math.round(y) });
          }
        }
      }
    } else {
      // For hollow ellipse, use a simple approach: check points around the perimeter
      const numPoints = Math.max(Math.ceil(2 * Math.PI * Math.max(radiusX, radiusY)), 20);
      
      for (let i = 0; i < numPoints; i++) {
        const angle = (2 * Math.PI * i) / numPoints;
        const x = centerX + radiusX * Math.cos(angle);
        const y = centerY + radiusY * Math.sin(angle);
        
        points.push({ x: Math.round(x), y: Math.round(y) });
      }
      
      // Remove duplicates by using a Set
      const uniquePoints = Array.from(
        new Set(points.map(p => `${p.x},${p.y}`))
      ).map(key => {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
      });
      
      return uniquePoints;
    }
    
    return points;
  }, []);

  const drawEllipse = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    const centerX = (startX + endX) / 2;
    const centerY = (startY + endY) / 2;
    const radiusX = Math.abs(endX - startX) / 2;
    const radiusY = Math.abs(endY - startY) / 2;

    const newCell: Cell = {
      char: selectedChar,
      color: selectedColor,
      bgColor: selectedBgColor
    };

    const points = getEllipsePoints(centerX, centerY, radiusX, radiusY, rectangleFilled);
    
    // Draw all the ellipse points
    points.forEach(({ x, y }) => {
      if (x >= 0 && y >= 0) { // Basic bounds checking
        setCell(x, y, newCell);
      }
    });
  }, [selectedChar, selectedColor, selectedBgColor, rectangleFilled, setCell, getEllipsePoints]);

  return {
    drawAtPosition,
    drawRectangle,
    drawEllipse,
    getEllipsePoints, // Export for preview rendering
    activeTool
  };
};
