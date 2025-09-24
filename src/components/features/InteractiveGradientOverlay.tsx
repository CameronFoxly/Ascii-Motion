import React, { useCallback, useRef, useEffect } from 'react';
import { useGradientStore } from '../../stores/gradientStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useToolStore } from '../../stores/toolStore';

export const InteractiveGradientOverlay: React.FC = () => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const { activeTool } = useToolStore();
  const { cellWidth, cellHeight, zoom, panOffset } = useCanvasContext();
  const { 
    isApplying, 
    startPoint, 
    endPoint, 
    definition,
    dragState,
    startDrag,
    updateDrag,
    endDrag
  } = useGradientStore();

  const effectiveCellWidth = cellWidth * zoom;
  const effectiveCellHeight = cellHeight * zoom;

  // Hit testing function to determine what element is clicked
  const hitTest = useCallback((mouseX: number, mouseY: number) => {
    if (!startPoint) return null;

    const startPixelX = startPoint.x * effectiveCellWidth + panOffset.x + effectiveCellWidth / 2;
    const startPixelY = startPoint.y * effectiveCellHeight + panOffset.y + effectiveCellHeight / 2;

    // Test start point (6px radius)
    const startDist = Math.sqrt(Math.pow(mouseX - startPixelX, 2) + Math.pow(mouseY - startPixelY, 2));
    
    if (endPoint) {
      const endPixelX = endPoint.x * effectiveCellWidth + panOffset.x + effectiveCellWidth / 2;
      const endPixelY = endPoint.y * effectiveCellHeight + panOffset.y + effectiveCellHeight / 2;

      // Test end point (6px radius)
      const endDist = Math.sqrt(Math.pow(mouseX - endPixelX, 2) + Math.pow(mouseY - endPixelY, 2));

      // Check stops first (they take precedence)
      const enabledProperties: Array<'character' | 'textColor' | 'backgroundColor'> = [];
      if (definition.character.enabled) enabledProperties.push('character');
      if (definition.textColor.enabled) enabledProperties.push('textColor');
      if (definition.backgroundColor.enabled) enabledProperties.push('backgroundColor');

      for (let propIndex = 0; propIndex < enabledProperties.length; propIndex++) {
        const property = enabledProperties[propIndex];
        const stops = definition[property].stops;

        for (let stopIndex = 0; stopIndex < stops.length; stopIndex++) {
          const stop = stops[stopIndex];
          if (stop.position < 0 || stop.position > 1) continue;

          // Calculate stop position
          const lineX = startPixelX + (endPixelX - startPixelX) * stop.position;
          const lineY = startPixelY + (endPixelY - startPixelY) * stop.position;

          // Apply perpendicular offset
          const lineAngle = Math.atan2(endPixelY - startPixelY, endPixelX - startPixelX);
          const perpAngle = lineAngle + Math.PI / 2;
          const offsetDistance = propIndex * 20;

          const stopX = lineX + Math.cos(perpAngle) * offsetDistance;
          const stopY = lineY + Math.sin(perpAngle) * offsetDistance;

          // Test stop hit (6px radius)
          const stopDist = Math.sqrt(Math.pow(mouseX - stopX, 2) + Math.pow(mouseY - stopY, 2));
          if (stopDist <= 8) { // Slightly larger hit area for stops
            return {
              type: 'stop' as const,
              property,
              stopIndex
            };
          }
        }
      }

      // Test end point after stops (stops have precedence)
      if (endDist <= 8) {
        return { type: 'end' as const };
      }
    }

    // Test start point last
    if (startDist <= 8) {
      return { type: 'start' as const };
    }

    return null;
  }, [startPoint, endPoint, definition, effectiveCellWidth, effectiveCellHeight, panOffset]);

  // Mouse event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const hit = hitTest(mouseX, mouseY);
    
    console.log('InteractiveGradientOverlay handleMouseDown:', { 
      mouseX, 
      mouseY, 
      hit, 
      startPoint, 
      endPoint 
    });
    
    if (!hit) {
      // No control hit - let the event bubble to canvas for end point placement
      console.log('No control hit, letting event bubble through');
      return;
    }

    // We hit a control - prevent default and handle drag
    console.log('Control hit, preventing default and handling drag');
    event.preventDefault();
    event.stopPropagation();

    if (hit.type === 'start' || hit.type === 'end') {
      startDrag(hit.type, { x: mouseX, y: mouseY });
    } else if (hit.type === 'stop') {
      startDrag('stop', { x: mouseX, y: mouseY }, {
        property: hit.property,
        stopIndex: hit.stopIndex
      });
    }
  }, [hitTest, startDrag, startPoint, endPoint]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!dragState?.isDragging) return;

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Pass canvas context for accurate coordinate conversion
    updateDrag({ x: mouseX, y: mouseY }, {
      cellWidth,
      cellHeight,
      zoom,
      panOffset
    });
  }, [dragState?.isDragging, updateDrag, cellWidth, cellHeight, zoom, panOffset]);

  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (dragState?.isDragging) {
      endDrag();
    }
  }, [dragState?.isDragging, endDrag]);

  // Global mouse up handler for when mouse leaves the overlay
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState?.isDragging) {
        endDrag();
      }
    };

    if (dragState?.isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [dragState?.isDragging, endDrag]);

  // Don't render if not in gradient tool mode or not applying
  if (activeTool !== 'gradientfill' || !isApplying) return null;

  // Render interactive controls
  const renderControls = () => {
    if (!startPoint) return null;

    const startPixelX = startPoint.x * effectiveCellWidth + panOffset.x + effectiveCellWidth / 2;
    const startPixelY = startPoint.y * effectiveCellHeight + panOffset.y + effectiveCellHeight / 2;

    const elements: React.ReactNode[] = [];

    // Start point
    elements.push(
      <div
        key="start-point"
        className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white cursor-move"
        style={{
          left: startPixelX,
          top: startPixelY,
          backgroundColor: '#22c55e',
          pointerEvents: dragState?.isDragging ? 'none' : 'auto'
        }}
        onMouseDown={(e) => {
          // Handle start point dragging even when container has pointer-events: none
          e.preventDefault();
          e.stopPropagation();
          startDrag('start', { 
            x: e.clientX - (overlayRef.current?.getBoundingClientRect()?.left || 0), 
            y: e.clientY - (overlayRef.current?.getBoundingClientRect()?.top || 0)
          });
        }}
      />
    );

    // Start label  
    elements.push(
      <div
        key="start-label"
        className="absolute text-white text-xs font-mono -translate-x-1/2 pointer-events-none select-none"
        style={{
          left: startPixelX,
          top: startPixelY - 18
        }}
      >
        START
      </div>
    );

    if (endPoint) {
      const endPixelX = endPoint.x * effectiveCellWidth + panOffset.x + effectiveCellWidth / 2;
      const endPixelY = endPoint.y * effectiveCellHeight + panOffset.y + effectiveCellHeight / 2;

      // Gradient line
      elements.push(
        <svg
          key="gradient-line"
          className="absolute inset-0 pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          <line
            x1={startPixelX}
            y1={startPixelY}
            x2={endPixelX}
            y2={endPixelY}
            stroke="#6b7280"
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        </svg>
      );

      // End point
      elements.push(
        <div
          key="end-point"
          className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white cursor-move"
          style={{
            left: endPixelX,
            top: endPixelY,
            backgroundColor: '#ef4444',
            pointerEvents: dragState?.isDragging ? 'none' : 'auto'
          }}
        />
      );

      // End label
      elements.push(
        <div
          key="end-label"
          className="absolute text-white text-xs font-mono -translate-x-1/2 pointer-events-none select-none"
          style={{
            left: endPixelX,
            top: endPixelY - 18
          }}
        >
          END
        </div>
      );

      // Stop controls
      const enabledProperties: Array<'character' | 'textColor' | 'backgroundColor'> = [];
      if (definition.character.enabled) enabledProperties.push('character');
      if (definition.textColor.enabled) enabledProperties.push('textColor');
      if (definition.backgroundColor.enabled) enabledProperties.push('backgroundColor');

      enabledProperties.forEach((property, propIndex) => {
        const stops = definition[property].stops;

        stops.forEach((stop, stopIndex) => {
          if (stop.position < 0 || stop.position > 1) return;

          // Calculate stop position
          const lineX = startPixelX + (endPixelX - startPixelX) * stop.position;
          const lineY = startPixelY + (endPixelY - startPixelY) * stop.position;

          // Apply perpendicular offset
          const lineAngle = Math.atan2(endPixelY - startPixelY, endPixelX - startPixelX);
          const perpAngle = lineAngle + Math.PI / 2;
          const offsetDistance = propIndex * 20;

          const stopX = lineX + Math.cos(perpAngle) * offsetDistance;
          const stopY = lineY + Math.sin(perpAngle) * offsetDistance;

          // Connection line to main gradient line (if offset)
          if (offsetDistance > 0) {
            elements.push(
              <svg
                key={`connection-${property}-${stopIndex}`}
                className="absolute inset-0 pointer-events-none"
                style={{ overflow: 'visible' }}
              >
                <line
                  x1={lineX}
                  y1={lineY}
                  x2={stopX}
                  y2={stopY}
                  stroke="#9ca3af"
                  strokeWidth={1}
                  strokeDasharray="2,2"
                />
              </svg>
            );
          }

          // Stop marker
          const stopColor = property === 'character' ? '#8b5cf6' : 
                           property === 'textColor' ? '#3b82f6' : '#f59e0b';

          elements.push(
            <div
              key={`stop-${property}-${stopIndex}`}
              className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 border border-white cursor-move"
              style={{
                left: stopX,
                top: stopY,
                backgroundColor: stopColor,
                pointerEvents: dragState?.isDragging ? 'none' : 'auto'
              }}
            />
          );

          // Stop value display
          const displayValue = property === 'character' ? stop.value : '●';
          const textColor = property === 'character' ? 'white' : stop.value;

          elements.push(
            <div
              key={`stop-value-${property}-${stopIndex}`}
              className="absolute text-xs font-mono -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
              style={{
                left: stopX,
                top: stopY,
                color: textColor
              }}
            >
              {displayValue}
            </div>
          );
        });
      });
    }

    return elements;
  };

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0"
      style={{ 
        zIndex: 10,
        cursor: dragState?.isDragging ? 'grabbing' : 'auto',
        // Only enable pointer events when we have both points
        // When we only have start point, disable pointer events on container
        pointerEvents: (startPoint && endPoint) ? 'auto' : 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {renderControls()}
    </div>
  );
};