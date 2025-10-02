/**
 * BrushPreview Component
 * 
 * Shows a 1:1 size preview of the current brush shape and size
 * with grid styling that matches the canvas appearance
 */

import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { calculateBrushCells } from '../../utils/brushUtils';

interface BrushPreviewProps {
  className?: string;
}

export const BrushPreview: React.FC<BrushPreviewProps> = ({ className = '' }) => {
  const { brushSize, brushShape, selectedChar, selectedColor, selectedBgColor } = useToolStore();
  const { fontMetrics } = useCanvasContext();
  
  // Fixed preview dimensions - use a consistent square size
  const previewGridSize = 9; // 9x9 grid for consistent layout
  const centerX = Math.floor(previewGridSize / 2);
  const centerY = Math.floor(previewGridSize / 2);
  
  const brushCells = calculateBrushCells(
    centerX, 
    centerY, 
    brushSize, 
    brushShape, 
    fontMetrics.aspectRatio
  );
  
  // Create a set for quick lookup of brush cells
  const brushCellSet = new Set(brushCells.map(cell => `${cell.x},${cell.y}`));
  
  return (
    <div className={`w-full ${className}`}>
      <div 
        className="relative bg-background border border-border/30 mx-auto overflow-hidden"
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          fontFamily: fontMetrics.fontFamily,
          fontSize: fontMetrics.fontSize,
        }}
      >
        {/* Grid lines */}
        <svg
          className="absolute inset-0 pointer-events-none w-full h-full"
          style={{ opacity: 0.2 }}
        >
          {/* Vertical grid lines */}
          {Array.from({ length: previewGridSize + 1 }, (_, i) => (
            <line
              key={`v-${i}`}
              x1={`${(i / previewGridSize) * 100}%`}
              y1="0%"
              x2={`${(i / previewGridSize) * 100}%`}
              y2="100%"
              stroke="currentColor"
              strokeWidth={0.5}
            />
          ))}
          {/* Horizontal grid lines */}
          {Array.from({ length: previewGridSize + 1 }, (_, i) => (
            <line
              key={`h-${i}`}
              x1="0%"
              y1={`${(i / previewGridSize) * 100}%`}
              x2="100%"
              y2={`${(i / previewGridSize) * 100}%`}
              stroke="currentColor"
              strokeWidth={0.5}
            />
          ))}
        </svg>
        
        {/* Brush cells */}
        {Array.from({ length: previewGridSize }, (_, y) =>
          Array.from({ length: previewGridSize }, (_, x) => {
            const cellKey = `${x},${y}`;
            const isBrushCell = brushCellSet.has(cellKey);
            
            return (
              <div
                key={cellKey}
                className="absolute flex items-center justify-center"
                style={{
                  left: `${(x / previewGridSize) * 100}%`,
                  top: `${(y / previewGridSize) * 100}%`,
                  width: `${(1 / previewGridSize) * 100}%`,
                  height: `${(1 / previewGridSize) * 100}%`,
                  backgroundColor: isBrushCell 
                    ? (selectedBgColor === 'transparent' ? 'rgba(255,255,255,0.1)' : selectedBgColor)
                    : 'transparent',
                  color: isBrushCell ? selectedColor : 'transparent',
                  border: isBrushCell ? '1px solid rgba(255,255,255,0.3)' : 'none',
                  fontFamily: fontMetrics.fontFamily,
                  fontSize: `${fontMetrics.fontSize * 0.6}px`,
                  lineHeight: 1,
                }}
              >
                {isBrushCell && selectedChar}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};