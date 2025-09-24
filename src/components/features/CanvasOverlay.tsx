import React, { useCallback, useEffect, useRef } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useGradientStore } from '../../stores/gradientStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useCanvasState } from '../../hooks/useCanvasState';

export const CanvasOverlay: React.FC = () => {
  // Create a separate canvas ref for overlay
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Canvas context and state  
  const { canvasRef, pasteMode, cellWidth, cellHeight, zoom, panOffset } = useCanvasContext();
  const {
    moveState,
    getTotalOffset,
  } = useCanvasState();

  const { selection, lassoSelection, linePreview, activeTool } = useToolStore();
  const { 
    isApplying: gradientApplying, 
    startPoint: gradientStart, 
    endPoint: gradientEnd,
    definition: gradientDefinition,
    previewData: gradientPreview
  } = useGradientStore();

  // Calculate effective dimensions with zoom and aspect ratio
  const effectiveCellWidth = cellWidth * zoom;
  const effectiveCellHeight = cellHeight * zoom;

  // Render selection overlay
  const renderOverlay = useCallback(() => {
    const overlayCanvas = overlayCanvasRef.current;
    const mainCanvas = canvasRef.current;
    if (!overlayCanvas || !mainCanvas) return;

    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;

    // Match the overlay canvas size to the main canvas
    if (overlayCanvas.width !== mainCanvas.width || overlayCanvas.height !== mainCanvas.height) {
      overlayCanvas.width = mainCanvas.width;
      overlayCanvas.height = mainCanvas.height;
      overlayCanvas.style.width = mainCanvas.style.width;
      overlayCanvas.style.height = mainCanvas.style.height;
      
      // Apply the same high-DPI scaling as the main canvas
      const devicePixelRatio = window.devicePixelRatio || 1;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }

    // Clear previous overlay
    ctx.clearRect(0, 0, overlayCanvas.width / (window.devicePixelRatio || 1), overlayCanvas.height / (window.devicePixelRatio || 1));

    // Draw selection overlay
    if (selection.active) {
      let startX = Math.min(selection.start.x, selection.end.x);
      let startY = Math.min(selection.start.y, selection.end.y);
      let endX = Math.max(selection.start.x, selection.end.x);
      let endY = Math.max(selection.start.y, selection.end.y);

      // If moving, adjust the marquee position by the move offset
      if (moveState) {
        const totalOffset = getTotalOffset(moveState);
        startX += totalOffset.x;
        startY += totalOffset.y;
        endX += totalOffset.x;
        endY += totalOffset.y;
      }

      // Draw selection rectangle with dashed border
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        startX * effectiveCellWidth + panOffset.x,
        startY * effectiveCellHeight + panOffset.y,
        (endX - startX + 1) * effectiveCellWidth,
        (endY - startY + 1) * effectiveCellHeight
      );
      ctx.setLineDash([]);
    }

    // Draw lasso selection overlay
    if (lassoSelection.active && lassoSelection.selectedCells.size > 0) {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      // Draw individual cell highlights for lasso selection
      lassoSelection.selectedCells.forEach(cellKey => {
        const [x, y] = cellKey.split(',').map(Number);
        
        let cellX = x;
        let cellY = y;
        
        // If moving, adjust the cell position by the move offset
        if (moveState) {
          const totalOffset = getTotalOffset(moveState);
          cellX += totalOffset.x;
          cellY += totalOffset.y;
        }
        
        ctx.strokeRect(
          cellX * effectiveCellWidth + panOffset.x,
          cellY * effectiveCellHeight + panOffset.y,
          effectiveCellWidth,
          effectiveCellHeight
        );
      });
      
      ctx.setLineDash([]);
    }

    // Draw shift+click line preview
    if (linePreview.active && linePreview.points.length > 0) {
      console.log('Rendering line preview:', linePreview.points.length, 'points, effectiveCellWidth:', effectiveCellWidth, 'effectiveCellHeight:', effectiveCellHeight);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.1)'; // Same purple as lasso selection
      
      linePreview.points.forEach(({ x, y }, index) => {
        if (index < 3) { // Log first few points for debugging
          console.log(`Rendering point ${index}:`, { x, y }, 'at pixel:', x * effectiveCellWidth + panOffset.x, y * effectiveCellHeight + panOffset.y);
        }
        ctx.fillRect(
          x * effectiveCellWidth + panOffset.x,
          y * effectiveCellHeight + panOffset.y,
          effectiveCellWidth,
          effectiveCellHeight
        );
      });
    }

    // Draw paste preview overlay
    if (pasteMode.isActive && pasteMode.preview) {
      const { position, data, bounds } = pasteMode.preview;
      
      // Calculate preview rectangle
      const previewStartX = position.x + bounds.minX;
      const previewStartY = position.y + bounds.minY;
      const previewWidth = bounds.maxX - bounds.minX + 1;
      const previewHeight = bounds.maxY - bounds.minY + 1;

      // Draw paste preview marquee
      ctx.strokeStyle = '#A855F7'; // Purple color
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(
        previewStartX * effectiveCellWidth + panOffset.x,
        previewStartY * effectiveCellHeight + panOffset.y,
        previewWidth * effectiveCellWidth,
        previewHeight * effectiveCellHeight
      );

      // Add semi-transparent background
      ctx.fillStyle = 'rgba(168, 85, 247, 0.1)';
      ctx.fillRect(
        previewStartX * effectiveCellWidth + panOffset.x,
        previewStartY * effectiveCellHeight + panOffset.y,
        previewWidth * effectiveCellWidth,
        previewHeight * effectiveCellHeight
      );

      ctx.setLineDash([]);

      // Draw paste content preview with transparency
      ctx.globalAlpha = 0.7;
      data.forEach((cell, key) => {
        const [relX, relY] = key.split(',').map(Number);
        const absoluteX = position.x + relX;
        const absoluteY = position.y + relY;
        
        const pixelX = absoluteX * effectiveCellWidth + panOffset.x;
        const pixelY = absoluteY * effectiveCellHeight + panOffset.y;

        // Draw cell background
        if (cell.backgroundColor && cell.backgroundColor !== 'transparent') {
          ctx.fillStyle = cell.backgroundColor;
          ctx.fillRect(pixelX, pixelY, effectiveCellWidth, effectiveCellHeight);
        }

        // Draw character
        if (cell.character && cell.character !== ' ') {
          ctx.fillStyle = cell.color || '#000000';
          ctx.font = `${Math.floor(effectiveCellHeight - 2)}px 'Courier New', monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            cell.character, 
            pixelX + effectiveCellWidth / 2, 
            pixelY + effectiveCellHeight / 2
          );
        }
      });
      ctx.globalAlpha = 1.0;
    }
    
    // Draw gradient fill overlay
    if (activeTool === 'gradientfill' && gradientApplying) {
      console.log('Drawing gradient overlay:', { 
        gradientStart, 
        gradientEnd, 
        gradientApplying,
        effectiveCellWidth,
        effectiveCellHeight,
        panOffset,
        zoom: zoom
      });
      
      // Draw gradient start point
      if (gradientStart) {
        ctx.strokeStyle = '#22c55e'; // Green for start
        ctx.fillStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        
        const startPixelX = gradientStart.x * effectiveCellWidth + panOffset.x + effectiveCellWidth / 2;
        const startPixelY = gradientStart.y * effectiveCellHeight + panOffset.y + effectiveCellHeight / 2;
        
        // Draw start point circle
        ctx.beginPath();
        ctx.arc(startPixelX, startPixelY, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw "START" label
        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('START', startPixelX, startPixelY - 18);
      }
      
      // Draw gradient end point and line
      if (gradientStart && gradientEnd) {
        const startPixelX = gradientStart.x * effectiveCellWidth + panOffset.x + effectiveCellWidth / 2;
        const startPixelY = gradientStart.y * effectiveCellHeight + panOffset.y + effectiveCellHeight / 2;
        const endPixelX = gradientEnd.x * effectiveCellWidth + panOffset.x + effectiveCellWidth / 2;
        const endPixelY = gradientEnd.y * effectiveCellHeight + panOffset.y + effectiveCellHeight / 2;
        
        // Draw gradient line
        ctx.strokeStyle = '#6b7280'; // Gray
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(startPixelX, startPixelY);
        ctx.lineTo(endPixelX, endPixelY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw end point circle
        ctx.fillStyle = '#ef4444'; // Red for end
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(endPixelX, endPixelY, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Draw "END" label
        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('END', endPixelX, endPixelY - 18);
        
        // Draw gradient stops along the line
        const enabledProperties = [];
        if (gradientDefinition.character.enabled) enabledProperties.push('character');
        if (gradientDefinition.textColor.enabled) enabledProperties.push('textColor');
        if (gradientDefinition.backgroundColor.enabled) enabledProperties.push('backgroundColor');
        
        enabledProperties.forEach((property, propIndex) => {
          const gradientProp = gradientDefinition[property as keyof typeof gradientDefinition] as any;
          if (gradientProp.stops) {
            gradientProp.stops.forEach((stop: any) => {
              if (stop.position >= 0 && stop.position <= 1) {
                // Calculate position along the line
                const lineX = startPixelX + (endPixelX - startPixelX) * stop.position;
                const lineY = startPixelY + (endPixelY - startPixelY) * stop.position;
                
                // Offset perpendicular to line based on property type
                const lineAngle = Math.atan2(endPixelY - startPixelY, endPixelX - startPixelX);
                const perpAngle = lineAngle + Math.PI / 2;
                const offsetDistance = propIndex * 20; // Stack properties
                
                const stopX = lineX + Math.cos(perpAngle) * offsetDistance;
                const stopY = lineY + Math.sin(perpAngle) * offsetDistance;
                
                // Draw connection line to main line
                if (offsetDistance > 0) {
                  ctx.strokeStyle = '#9ca3af';
                  ctx.lineWidth = 1;
                  ctx.setLineDash([2, 2]);
                  ctx.beginPath();
                  ctx.moveTo(lineX, lineY);
                  ctx.lineTo(stopX, stopY);
                  ctx.stroke();
                  ctx.setLineDash([]);
                }
                
                // Draw stop marker
                const stopColor = property === 'character' ? '#8b5cf6' : 
                                property === 'textColor' ? '#3b82f6' : '#f59e0b';
                ctx.fillStyle = stopColor;
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1;
                
                ctx.beginPath();
                ctx.rect(stopX - 6, stopY - 6, 12, 12);
                ctx.fill();
                ctx.stroke();
                
                // Draw stop value
                ctx.fillStyle = 'white';
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                const displayValue = property === 'character' ? stop.value : 
                                   property === 'textColor' ? '●' : '■';
                if (property !== 'character') {
                  ctx.fillStyle = stop.value;
                }
                ctx.fillText(displayValue, stopX, stopY);
              }
            });
          }
        });
      }
      
      // Draw gradient preview overlay with transparency
      if (gradientPreview && gradientPreview.size > 0) {
        ctx.globalAlpha = 0.7;
        
        gradientPreview.forEach((cell, key) => {
          const [x, y] = key.split(',').map(Number);
          const pixelX = x * effectiveCellWidth + panOffset.x;
          const pixelY = y * effectiveCellHeight + panOffset.y;

          // Draw cell background
          if (cell.bgColor && cell.bgColor !== 'transparent') {
            ctx.fillStyle = cell.bgColor;
            ctx.fillRect(pixelX, pixelY, effectiveCellWidth, effectiveCellHeight);
          }

          // Draw character
          if (cell.char && cell.char !== ' ') {
            ctx.fillStyle = cell.color || '#000000';
            ctx.font = `${Math.floor(effectiveCellHeight - 2)}px 'Courier New', monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              cell.char, 
              pixelX + effectiveCellWidth / 2, 
              pixelY + effectiveCellHeight / 2
            );
          }
        });
        
        ctx.globalAlpha = 1.0;
      }
    }
  }, [selection, lassoSelection, linePreview, effectiveCellWidth, effectiveCellHeight, panOffset, moveState, getTotalOffset, canvasRef, pasteMode, activeTool, gradientApplying, gradientStart, gradientEnd, gradientDefinition, gradientPreview]);

  // Re-render overlay when dependencies change
  useEffect(() => {
    renderOverlay();
  }, [renderOverlay]);

  return (
    <canvas
      ref={overlayCanvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        zIndex: 10, // Ensure overlay appears above main canvas
      }}
    />
  );
};
