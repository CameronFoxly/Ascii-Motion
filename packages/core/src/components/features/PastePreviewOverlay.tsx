import React from 'react';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useCanvasStore } from '../../stores/canvasStore';

/**
 * Component that renders paste preview overlay on the canvas
 */
export const PastePreviewOverlay: React.FC = () => {
  const { pasteMode, cellWidth, cellHeight, fontMetrics } = useCanvasContext();
  const { width, height } = useCanvasStore();

  // Don't render if not in paste mode
  if (!pasteMode.isActive || !pasteMode.preview) {
    return null;
  }

  const { position, data, bounds } = pasteMode.preview;

  // Calculate preview rectangle dimensions
  const previewWidth = (bounds.maxX - bounds.minX + 1) * cellWidth;
  const previewHeight = (bounds.maxY - bounds.minY + 1) * cellHeight;
  const previewLeft = (position.x + bounds.minX) * cellWidth;
  const previewTop = (position.y + bounds.minY) * cellHeight;

  // Ensure preview stays within canvas bounds
  const canvasWidth = width * cellWidth;
  const canvasHeight = height * cellHeight;
  const isOutOfBounds = 
    previewLeft < 0 || 
    previewTop < 0 || 
    previewLeft + previewWidth > canvasWidth || 
    previewTop + previewHeight > canvasHeight;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Marquee border around paste preview */}
      <div
        className={`absolute border-2 transition-all duration-200 ${
          pasteMode.isDragging
            ? 'border-solid border-purple-600 bg-purple-200/30 shadow-lg'
            : 'border-dashed border-purple-500 bg-purple-100/20'
        } ${
          isOutOfBounds 
            ? '!border-red-500 !bg-red-100/20' 
            : ''
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

        const cellLeft = absoluteX * cellWidth;
        const cellTop = absoluteY * cellHeight;

        return (
          <div
            key={`paste-preview-${key}`}
            className="absolute flex items-center justify-center text-center opacity-70 pointer-events-none"
            style={{
              left: cellLeft,
              top: cellTop,
              width: cellWidth,
              height: cellHeight,
              color: cell.color || '#000000',
              backgroundColor: cell.bgColor || 'transparent',
              fontSize: `${fontMetrics.fontSize}px`,
              fontFamily: fontMetrics.fontFamily,
              lineHeight: 1,
            }}
          >
            {cell.char}
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
      
      {/* Instructions */}
      {!pasteMode.isDragging && (
        <div
          className="absolute text-xs font-mono text-purple-700 bg-white/90 px-2 py-1 rounded shadow-sm pointer-events-none whitespace-nowrap"
          style={{
            left: previewLeft,
            top: previewTop + previewHeight + 5,
          }}
        >
          Click inside to drag • Click outside to paste • Right-click to cancel
        </div>
      )}
    </div>
  );
};
