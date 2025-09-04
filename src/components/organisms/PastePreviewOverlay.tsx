import React from 'react';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useCanvasStore } from '../../stores/canvasStore';

/**
 * Component that renders paste preview overlay on the canvas
 */
export const PastePreviewOverlay: React.FC = () => {
  const { pasteMode, cellSize } = useCanvasContext();
  const { width, height } = useCanvasStore();

  // Don't render if not in paste mode
  if (!pasteMode.isActive || !pasteMode.preview) {
    return null;
  }

  const { position, data, bounds } = pasteMode.preview;

  // Calculate preview rectangle dimensions
  const previewWidth = (bounds.maxX - bounds.minX + 1) * cellSize;
  const previewHeight = (bounds.maxY - bounds.minY + 1) * cellSize;
  const previewLeft = (position.x + bounds.minX) * cellSize;
  const previewTop = (position.y + bounds.minY) * cellSize;

  // Ensure preview stays within canvas bounds
  const canvasWidth = width * cellSize;
  const canvasHeight = height * cellSize;
  const isOutOfBounds = 
    previewLeft < 0 || 
    previewTop < 0 || 
    previewLeft + previewWidth > canvasWidth || 
    previewTop + previewHeight > canvasHeight;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Marquee border around paste preview */}
      <div
        className={`absolute border-2 border-dashed transition-colors duration-200 ${
          isOutOfBounds 
            ? 'border-red-500 bg-red-100/20' 
            : 'border-purple-500 bg-purple-100/20'
        }`}
        style={{
          left: previewLeft,
          top: previewTop,
          width: previewWidth,
          height: previewHeight,
        }}
      />
      
      {/* Content preview - render actual characters */}
      {Array.from(data.entries()).map(([key, cell]) => {
        const [relX, relY] = key.split(',').map(Number);
        const absoluteX = position.x + relX;
        const absoluteY = position.y + relY;
        
        // Skip cells that are outside canvas bounds
        if (absoluteX < 0 || absoluteY < 0 || absoluteX >= width || absoluteY >= height) {
          return null;
        }

        const cellLeft = absoluteX * cellSize;
        const cellTop = absoluteY * cellSize;

        return (
          <div
            key={`paste-preview-${key}`}
            className="absolute flex items-center justify-center text-center opacity-70 pointer-events-none"
            style={{
              left: cellLeft,
              top: cellTop,
              width: cellSize,
              height: cellSize,
              color: cell.color || '#000000',
              backgroundColor: cell.backgroundColor || 'transparent',
              fontSize: `${Math.max(8, cellSize * 0.8)}px`,
              fontFamily: 'monospace',
              lineHeight: 1,
            }}
          >
            {cell.character}
          </div>
        );
      })}
      
      {/* Position indicator */}
      <div
        className="absolute text-xs font-mono text-purple-700 bg-white/90 px-1 rounded shadow-sm pointer-events-none"
        style={{
          left: previewLeft,
          top: previewTop - 20,
        }}
      >
        ({position.x}, {position.y})
      </div>
    </div>
  );
};
