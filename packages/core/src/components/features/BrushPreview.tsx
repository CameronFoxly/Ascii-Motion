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
  tool?: 'pencil' | 'eraser';
  className?: string;
}

export const BrushPreview: React.FC<BrushPreviewProps> = ({ tool = 'pencil', className = '' }) => {
  const brushSize = useToolStore((state) => state.brushSettings[tool].size);
  const brushShape = useToolStore((state) => state.brushSettings[tool].shape);
  const selectedChar = useToolStore((state) => state.selectedChar);
  const selectedColor = useToolStore((state) => state.selectedColor);
  const selectedBgColor = useToolStore((state) => state.selectedBgColor);
  const { fontMetrics, cellWidth, cellHeight } = useCanvasContext();
  const isEraserPreview = tool === 'eraser';
  
  // Fixed preview dimensions - use a grid size that accommodates largest brushes
  const previewGridWidth = 11; // 11 cells wide
  const previewGridHeight = 7; // 7 cells tall
  const centerX = Math.floor(previewGridWidth / 2);
  const centerY = Math.floor(previewGridHeight / 2);
  
  const brushCells = calculateBrushCells(
    centerX, 
    centerY, 
    brushSize, 
    brushShape, 
    fontMetrics.aspectRatio
  );
  
  // Calculate preview dimensions using actual cell dimensions
  const previewWidth = previewGridWidth * cellWidth;
  const previewHeight = previewGridHeight * cellHeight;
  
  // Create a set for quick lookup of brush cells
  const brushCellSet = new Set(brushCells.map(cell => `${cell.x},${cell.y}`));
  
  return (
    <div className={`w-full ${className}`}>
      <div 
        className="relative bg-background border border-border/30 mx-auto overflow-hidden"
        style={{
          width: '100%',
          aspectRatio: `${previewWidth} / ${previewHeight}`, // Use actual aspect ratio
          maxWidth: previewWidth,
          fontFamily: fontMetrics.fontFamily,
          fontSize: fontMetrics.fontSize,
        }}
      >
        {/* Grid lines */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={previewWidth}
          height={previewHeight}
          style={{ opacity: 0.2 }}
        >
          {/* Vertical grid lines */}
          {Array.from({ length: previewGridWidth + 1 }, (_, i) => (
            <line
              key={`v-${i}`}
              x1={i * cellWidth}
              y1={0}
              x2={i * cellWidth}
              y2={previewHeight}
              stroke="currentColor"
              strokeWidth={0.5}
            />
          ))}
          {/* Horizontal grid lines */}
          {Array.from({ length: previewGridHeight + 1 }, (_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={i * cellHeight}
              x2={previewWidth}
              y2={i * cellHeight}
              stroke="currentColor"
              strokeWidth={0.5}
            />
          ))}
        </svg>
        
        {/* Brush cells */}
        {Array.from({ length: previewGridHeight }, (_, y) =>
          Array.from({ length: previewGridWidth }, (_, x) => {
            const cellKey = `${x},${y}`;
            const isBrushCell = brushCellSet.has(cellKey);
            
            const backgroundColor = isBrushCell
              ? (isEraserPreview
                ? 'rgba(248, 250, 252, 0.25)'
                : (selectedBgColor === 'transparent' ? 'rgba(255,255,255,0.1)' : selectedBgColor))
              : 'transparent';

            const textColor = isBrushCell
              ? (isEraserPreview ? 'transparent' : selectedColor)
              : 'transparent';

            const borderStyle = isBrushCell
              ? (isEraserPreview ? '1px dashed rgba(226, 232, 240, 0.6)' : '1px solid rgba(255,255,255,0.3)')
              : 'none';

            return (
              <div
                key={cellKey}
                className="absolute flex items-center justify-center"
                style={{
                  left: x * cellWidth,
                  top: y * cellHeight,
                  width: cellWidth,
                  height: cellHeight,
                  backgroundColor,
                  color: textColor,
                  border: borderStyle,
                  fontFamily: fontMetrics.fontFamily,
                  fontSize: fontMetrics.fontSize,
                  lineHeight: 1,
                }}
              >
                {isBrushCell && !isEraserPreview && selectedChar}
                {isBrushCell && isEraserPreview && <span className="text-[0.6rem] leading-none text-foreground/40">×</span>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};