import React, { useCallback, useRef, useEffect } from 'react';
import { useGradientStore } from '../../stores/gradientStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useToolStore } from '../../stores/toolStore';
import { GradientStopPicker } from './GradientStopPicker';

export const InteractiveGradientOverlay: React.FC = () => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const { activeTool } = useToolStore();
  const { cellWidth, cellHeight, zoom, panOffset, altKeyDown } = useCanvasContext();
  const { 
    isApplying, 
    startPoint, 
    endPoint, 
    ellipsePoint,
    hoverEndPoint,
    definition,
    dragState,
    editingStop,
    startDrag,
    updateDrag,
    endDrag,
    startEditingStop,
    updateEditingStopValue,
    closeStopEditor,
    cancelStopEdit,
    duplicateStop
  } = useGradientStore();

  const stopOffsetBase = 24;
  const stopSize = 18;
  const stopHitRadius = stopSize / 2 + 2;
  const controlBorderColor = '#1f2937';
  const controlOuterStrokeColor = '#ffffff';
  const displayEndPoint = endPoint ?? hoverEndPoint;

  const effectiveCellWidth = cellWidth * zoom;
  const effectiveCellHeight = cellHeight * zoom;

  // Hit testing function to determine what element is clicked
  const hitTest = useCallback((mouseX: number, mouseY: number) => {
    if (!startPoint) return null;

    const startPixelX = startPoint.x * effectiveCellWidth + panOffset.x + effectiveCellWidth / 2;
    const startPixelY = startPoint.y * effectiveCellHeight + panOffset.y + effectiveCellHeight / 2;

    // Test start point (6px radius)
    const startDist = Math.sqrt(Math.pow(mouseX - startPixelX, 2) + Math.pow(mouseY - startPixelY, 2));
    
    if (displayEndPoint) {
      const endPixelX = displayEndPoint.x * effectiveCellWidth + panOffset.x + effectiveCellWidth / 2;
      const endPixelY = displayEndPoint.y * effectiveCellHeight + panOffset.y + effectiveCellHeight / 2;

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
          const offsetDistance = (propIndex + 1) * stopOffsetBase;

          const stopX = lineX + Math.cos(perpAngle) * offsetDistance;
          const stopY = lineY + Math.sin(perpAngle) * offsetDistance;

          // Test stop hit (6px radius)
          const stopDist = Math.sqrt(Math.pow(mouseX - stopX, 2) + Math.pow(mouseY - stopY, 2));
          if (stopDist <= stopHitRadius) {
            return {
              type: 'stop' as const,
              property,
              stopIndex
            };
          }
        }
      }

      // Test end point after stops (stops have precedence)
      if (endDist <= 8 && endPoint) {
        return { type: 'end' as const };
      }
      
      // Test ellipse point for radial gradients
      if (definition.type === 'radial' && ellipsePoint) {
        const ellipsePixelX = ellipsePoint.x * effectiveCellWidth + panOffset.x + effectiveCellWidth / 2;
        const ellipsePixelY = ellipsePoint.y * effectiveCellHeight + panOffset.y + effectiveCellHeight / 2;
        const ellipseDist = Math.sqrt(Math.pow(mouseX - ellipsePixelX, 2) + Math.pow(mouseY - ellipsePixelY, 2));
        
        if (ellipseDist <= 8) {
          return { type: 'ellipse' as const };
        }
      }
    }

    // Test start point last
    if (startDist <= 8) {
      return { type: 'start' as const };
    }

    return null;
  }, [startPoint, endPoint, ellipsePoint, hoverEndPoint, definition, effectiveCellWidth, effectiveCellHeight, panOffset]);

  // Mouse event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const hit = hitTest(mouseX, mouseY);
    
    if (!hit) {
      // No control hit - let the event bubble to canvas for end point placement
      return;
    }

    // We hit a control - prevent default and handle drag
    event.preventDefault();
    event.stopPropagation();

    if (hit.type === 'start' || hit.type === 'end' || hit.type === 'ellipse') {
      startDrag(hit.type, { x: mouseX, y: mouseY });
    } else if (hit.type === 'stop') {
      // Check for alt+click to duplicate stop (use event.altKey for immediate detection)
      if (event.altKey) {
        // Duplicate the stop and start dragging the new one
        const newStopIndex = duplicateStop(hit.property, hit.stopIndex);
        startDrag('stop', { x: mouseX, y: mouseY }, {
          property: hit.property,
          stopIndex: newStopIndex
        });
      } else {
        // Normal drag
        startDrag('stop', { x: mouseX, y: mouseY }, {
          property: hit.property,
          stopIndex: hit.stopIndex
        });
      }
    }
  }, [hitTest, startDrag, altKeyDown, duplicateStop]);
  
  // Handle double-click on overlay to detect stop clicks
  const handleOverlayDoubleClick = useCallback((event: React.MouseEvent) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const hit = hitTest(mouseX, mouseY);
    
    if (hit && hit.type === 'stop') {
      event.preventDefault();
      event.stopPropagation();
      startEditingStop(hit.property, hit.stopIndex);
    }
  }, [hitTest, startEditingStop]);

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
        className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 cursor-move"
        style={{
          left: startPixelX,
          top: startPixelY,
          backgroundColor: '#ffffff',
          borderColor: controlBorderColor,
          boxShadow: `0 0 0 1px ${controlOuterStrokeColor}`,
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

    const enabledProperties: Array<'character' | 'textColor' | 'backgroundColor'> = [];
    if (definition.character.enabled) enabledProperties.push('character');
    if (definition.textColor.enabled) enabledProperties.push('textColor');
    if (definition.backgroundColor.enabled) enabledProperties.push('backgroundColor');

    const hasDisplayEndPoint = Boolean(displayEndPoint);
    let endPixelX = 0;
    let endPixelY = 0;

    if (hasDisplayEndPoint) {
      endPixelX = displayEndPoint!.x * effectiveCellWidth + panOffset.x + effectiveCellWidth / 2;
      endPixelY = displayEndPoint!.y * effectiveCellHeight + panOffset.y + effectiveCellHeight / 2;

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

      elements.push(
        <div
          key="end-point"
          className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 cursor-move"
          style={{
            left: endPixelX,
            top: endPixelY,
            backgroundColor: '#ffffff',
            borderColor: controlBorderColor,
            boxShadow: `0 0 0 1px ${controlOuterStrokeColor}`,
            pointerEvents: dragState?.isDragging || !endPoint ? 'none' : 'auto'
          }}
        />
      );
    }

    // Ellipse point for radial gradients
    if (definition.type === 'radial' && ellipsePoint) {
      const ellipsePixelX = ellipsePoint.x * effectiveCellWidth + panOffset.x + effectiveCellWidth / 2;
      const ellipsePixelY = ellipsePoint.y * effectiveCellHeight + panOffset.y + effectiveCellHeight / 2;

      elements.push(
        <div
          key="ellipse-point"
          className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 cursor-move"
          style={{
            left: ellipsePixelX,
            top: ellipsePixelY,
            backgroundColor: '#ffffff',
            borderColor: '#dc2626', // Different color to distinguish from end point
            boxShadow: `0 0 0 1px ${controlOuterStrokeColor}`,
            pointerEvents: dragState?.isDragging ? 'none' : 'auto'
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startDrag('ellipse', {
              x: e.clientX - (overlayRef.current?.getBoundingClientRect()?.left || 0),
              y: e.clientY - (overlayRef.current?.getBoundingClientRect()?.top || 0)
            });
          }}
        />
      );
    }

    enabledProperties.forEach((property, propIndex) => {
      const stops = definition[property].stops;

      stops.forEach((stop, stopIndex) => {
        if (stop.position < 0 || stop.position > 1) return;

        let stopX: number;
        let stopY: number;

        if (hasDisplayEndPoint) {
          const lineX = startPixelX + (endPixelX - startPixelX) * stop.position;
          const lineY = startPixelY + (endPixelY - startPixelY) * stop.position;

          const lineAngle = Math.atan2(endPixelY - startPixelY, endPixelX - startPixelX);
          const perpAngle = lineAngle + Math.PI / 2;
          const offsetDistance = (propIndex + 1) * stopOffsetBase;

          stopX = lineX + Math.cos(perpAngle) * offsetDistance;
          stopY = lineY + Math.sin(perpAngle) * offsetDistance;

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
        } else {
          stopX = startPixelX + propIndex * 25 - (enabledProperties.length - 1) * 12.5;
          stopY = startPixelY + 40 + stopIndex * 25;
        }

        const isColorStop = property === 'textColor' || property === 'backgroundColor';
        const markerBackground = isColorStop ? stop.value : '#111827';
        
        // Check if this stop is being edited
        const isEditing = editingStop?.property === property && editingStop?.stopIndex === stopIndex;

        elements.push(
          <div
            key={`stop-${property}-${stopIndex}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 border cursor-move"
            style={{
              left: stopX,
              top: stopY,
              width: stopSize,
              height: stopSize,
              backgroundColor: markerBackground,
              borderColor: isEditing ? '#3b82f6' : controlBorderColor, // Blue border when editing
              borderRadius: 4,
              borderWidth: isEditing ? 3 : 2, // Thicker border when editing
              boxShadow: isEditing 
                ? `0 0 0 2px #3b82f6, 0 0 12px rgba(59, 130, 246, 0.5)` // Blue glow when editing
                : `0 0 0 1px ${controlOuterStrokeColor}`,
              pointerEvents: dragState?.isDragging || editingStop ? 'none' : 'auto',
              transition: 'border-color 0.2s ease, border-width 0.2s ease, box-shadow 0.2s ease' // Only transition visual properties, not position
            }}
          />
        );

        if (property === 'character') {
          elements.push(
            <div
              key={`stop-value-${property}-${stopIndex}`}
              className="absolute font-mono text-sm -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
              style={{
                left: stopX,
                top: stopY,
                color: '#f9fafb'
              }}
            >
              {stop.value}
            </div>
          );
        }
      });
    });

    return elements;
  };

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0"
      style={{ 
        zIndex: 10,
        cursor: dragState?.isDragging ? 'grabbing' : 'auto',
        // Disable pointer events when:
        // 1. Only have start point (no end point yet)
        // 2. Stop editor is open (picker is showing)
        pointerEvents: (startPoint && endPoint && !editingStop) ? 'auto' : 'none'
      }}
      onMouseDown={!editingStop ? handleMouseDown : undefined}
      onMouseMove={!editingStop ? handleMouseMove : undefined}
      onMouseUp={!editingStop ? handleMouseUp : undefined}
      onDoubleClick={!editingStop ? handleOverlayDoubleClick : undefined}
    >
      {renderControls()}
      
      {/* Gradient Stop Picker */}
      {editingStop && (
        <GradientStopPicker
          isOpen={true}
          onOpenChange={(open) => {
            if (!open) {
              // User closed picker without selecting - revert changes
              cancelStopEdit();
            }
          }}
          onValueSelect={(value) => {
            // User confirmed selection - keep changes and close
            updateEditingStopValue(value);
            closeStopEditor();
          }}
          onValueChange={(value) => {
            // Live preview - temporarily update stop value
            updateEditingStopValue(value);
          }}
          initialValue={editingStop.originalValue}
          type={editingStop.property}
        />
      )}
    </div>
  );
};