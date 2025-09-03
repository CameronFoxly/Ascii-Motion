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

  return {
    drawAtPosition,
    drawRectangle,
    activeTool
  };
};
