import { useCanvasContext } from './useCanvasContext';

export const useCanvasDimensions = () => {
  const { cellWidth, cellHeight, zoom, panOffset } = useCanvasContext();

  return {
    cellWidth,
    cellHeight,
    getCanvasSize: (gridWidth: number, gridHeight: number) => ({
      width: gridWidth * cellWidth,
      height: gridHeight * cellHeight,
    }),
    getGridCoordinates: (
      mouseX: number,
      mouseY: number,
      canvasRect: DOMRect,
      gridWidth: number,
      gridHeight: number,
    ) => {
      const relativeX = mouseX - canvasRect.left;
      const relativeY = mouseY - canvasRect.top;

      const adjustedX = relativeX - panOffset.x;
      const adjustedY = relativeY - panOffset.y;

      const effectiveCellWidth = cellWidth * zoom;
      const effectiveCellHeight = cellHeight * zoom;
      const x = Math.floor(adjustedX / effectiveCellWidth);
      const y = Math.floor(adjustedY / effectiveCellHeight);

      return {
        x: Math.max(0, Math.min(x, gridWidth - 1)),
        y: Math.max(0, Math.min(y, gridHeight - 1)),
      };
    },
    getGridCoordinatesWithCenter: (
      mouseX: number,
      mouseY: number,
      canvasRect: DOMRect,
      gridWidth: number,
      gridHeight: number,
    ) => {
      const relativeX = mouseX - canvasRect.left;
      const relativeY = mouseY - canvasRect.top;

      const adjustedX = relativeX - panOffset.x;
      const adjustedY = relativeY - panOffset.y;

      const effectiveCellWidth = cellWidth * zoom;
      const effectiveCellHeight = cellHeight * zoom;
      const x = Math.floor(adjustedX / effectiveCellWidth);
      const y = Math.floor(adjustedY / effectiveCellHeight);

      return {
        x: Math.max(0.5, Math.min(x + 0.5, gridWidth - 0.5)),
        y: Math.max(0.5, Math.min(y + 0.5, gridHeight - 0.5)),
      };
    },
  };
};
