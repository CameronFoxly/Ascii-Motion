import React, { useCallback, useEffect, useRef } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useGradientStore } from '../../stores/gradientStore';
import { useAsciiBoxStore } from '../../stores/asciiBoxStore';
import { useBezierStore } from '../../stores/bezierStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useCanvasStore } from '../../stores/canvasStore';
import { useTheme } from '../../contexts/ThemeContext';
import { useCanvasState } from '../../hooks/useCanvasState';
import { getFontString } from '../../utils/fontMetrics';
import { InteractiveGradientOverlay } from './InteractiveGradientOverlay';
import { InteractiveBezierOverlay } from './InteractiveBezierOverlay';

type GradientPropertyKey = 'character' | 'textColor' | 'backgroundColor';

export const CanvasOverlay: React.FC = () => {
  // Create a separate canvas ref for overlay
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Canvas context and state  
  const { canvasRef, pasteMode, cellWidth, cellHeight, zoom, panOffset, fontMetrics, hoverPreview, selectionPreview, hoveredCell } = useCanvasContext();
  const {
    moveState,
    getTotalOffset,
  } = useCanvasState();

  const { selection, lassoSelection, magicWandSelection, linePreview, activeTool } = useToolStore();
  const { 
    isApplying: gradientApplying, 
    startPoint: gradientStart, 
    endPoint: gradientEnd,
    definition: gradientDefinition,
    previewData: gradientPreview
  } = useGradientStore();
  const {
    isApplying: boxApplying,
    previewData: boxPreview,
    drawnCells: boxDrawnCells,
    rectanglePreview: boxRectanglePreview
  } = useAsciiBoxStore();
  // Only subscribe to bezier preview cells, not the entire store
  const bezierPreview = useBezierStore((state) => state.previewCells);
  const bezierRemountKey = useBezierStore((state) => state.remountKey);
  const { canvasBackgroundColor, width, height } = useCanvasStore();
  const { theme } = useTheme();

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

    const totalOffset = moveState ? getTotalOffset(moveState) : { x: 0, y: 0 };

    const drawCells = (cells: Set<string>, options: { fillStyle?: string; strokeStyle?: string; lineDash?: number[] }) => {
      if (!cells || cells.size === 0) return;

      const { fillStyle, strokeStyle, lineDash } = options;
      if (lineDash) {
        ctx.setLineDash(lineDash);
      }

      cells.forEach((cellKey) => {
        const [rawX, rawY] = cellKey.split(',').map(Number);
        const cellX = rawX + totalOffset.x;
        const cellY = rawY + totalOffset.y;

        if (cellX < 0 || cellY < 0 || cellX >= width || cellY >= height) {
          return;
        }

        const pixelX = cellX * effectiveCellWidth + panOffset.x;
        const pixelY = cellY * effectiveCellHeight + panOffset.y;

        if (fillStyle) {
          ctx.fillStyle = fillStyle;
          ctx.fillRect(pixelX, pixelY, effectiveCellWidth, effectiveCellHeight);
        }

        if (strokeStyle) {
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = 2;
          ctx.strokeRect(pixelX, pixelY, effectiveCellWidth, effectiveCellHeight);
        }
      });

      if (lineDash) {
        ctx.setLineDash([]);
      }
    };

    const selectionFillColor = 'rgba(192, 132, 252, 0.18)';
    const selectionOutlineColor = '#C084FC';
    const selectionLineDash: [number, number] = [6, 4];

    const adjustCellsForOffset = (cells: Set<string>): Set<string> => {
      const adjusted = new Set<string>();
      cells.forEach((cellKey) => {
        const [rawX, rawY] = cellKey.split(',').map(Number);
        const adjX = rawX + totalOffset.x;
        const adjY = rawY + totalOffset.y;

        if (adjX < 0 || adjY < 0 || adjX >= width || adjY >= height) {
          return;
        }

        adjusted.add(`${adjX},${adjY}`);
      });
      return adjusted;
    };

    const buildIslands = (cells: Set<string>): Set<string>[] => {
      const visited = new Set<string>();
      const islands: Set<string>[] = [];
      const neighborOffsets = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ];

      cells.forEach((cellKey) => {
        if (visited.has(cellKey)) {
          return;
        }

        const island = new Set<string>();
        const stack: string[] = [cellKey];
        visited.add(cellKey);

        while (stack.length > 0) {
          const currentKey = stack.pop()!;
          island.add(currentKey);
          const [cx, cy] = currentKey.split(',').map(Number);

          neighborOffsets.forEach(([dx, dy]) => {
            const neighborKey = `${cx + dx},${cy + dy}`;
            if (!visited.has(neighborKey) && cells.has(neighborKey)) {
              visited.add(neighborKey);
              stack.push(neighborKey);
            }
          });
        }

        islands.push(island);
      });

      return islands;
    };

    const buildOutlineLoops = (island: Set<string>): { x: number; y: number }[][] => {
      const edgeMap = new Map<string, Map<string, { x: number; y: number }>>();
      const edgeKeys = new Set<string>();

      const pointKey = (point: { x: number; y: number }) => `${point.x},${point.y}`;

      const addEdge = (from: { x: number; y: number }, to: { x: number; y: number }) => {
        const fromKey = pointKey(from);
        const toKey = pointKey(to);

        if (!edgeMap.has(fromKey)) {
          edgeMap.set(fromKey, new Map());
        }

        const fromEdges = edgeMap.get(fromKey)!;
        if (!fromEdges.has(toKey)) {
          fromEdges.set(toKey, to);
          edgeKeys.add(`${fromKey}|${toKey}`);
        }
      };

      island.forEach((cellKey) => {
        const [x, y] = cellKey.split(',').map(Number);

        const neighbors = [
          { dx: 0, dy: -1, from: { x, y }, to: { x: x + 1, y } }, // top edge
          { dx: 1, dy: 0, from: { x: x + 1, y }, to: { x: x + 1, y: y + 1 } }, // right edge
          { dx: 0, dy: 1, from: { x: x + 1, y: y + 1 }, to: { x, y: y + 1 } }, // bottom edge
          { dx: -1, dy: 0, from: { x, y: y + 1 }, to: { x, y } } // left edge
        ];

        neighbors.forEach(({ dx, dy, from, to }) => {
          const neighborKey = `${x + dx},${y + dy}`;
          if (!island.has(neighborKey)) {
            addEdge(from, to);
          }
        });
      });

      const parsePoint = (key: string): { x: number; y: number } => {
        const [px, py] = key.split(',').map(Number);
        return { x: px, y: py };
      };

      const loops: { x: number; y: number }[][] = [];

      while (edgeKeys.size > 0) {
        const firstKey = edgeKeys.values().next().value as string;
        const [startFromKey, startToKey] = firstKey.split('|');
        const loop: { x: number; y: number }[] = [];

        let currentFromKey = startFromKey;
        let currentToKey = startToKey;
        loop.push(parsePoint(currentFromKey));

        while (true) {
          const fromEdges = edgeMap.get(currentFromKey);
          if (!fromEdges) {
            break;
          }

          const nextPoint = fromEdges.get(currentToKey);
          if (!nextPoint) {
            break;
          }

          loop.push(nextPoint);

          fromEdges.delete(currentToKey);
          edgeKeys.delete(`${currentFromKey}|${currentToKey}`);
          if (fromEdges.size === 0) {
            edgeMap.delete(currentFromKey);
          }

          if (currentToKey === startFromKey) {
            break;
          }

          const nextEdges = edgeMap.get(currentToKey);
          if (!nextEdges || nextEdges.size === 0) {
            break;
          }

          const nextToEntry = nextEdges.entries().next().value as [string, { x: number; y: number }];
          currentFromKey = currentToKey;
          currentToKey = nextToEntry[0];
        }

        loops.push(loop);
      }

      return loops;
    };

    const drawSelectionIslands = (cells: Set<string>) => {
      if (!cells || cells.size === 0) {
        return;
      }

      const adjustedCells = adjustCellsForOffset(cells);
      if (adjustedCells.size === 0) {
        return;
      }

      ctx.fillStyle = selectionFillColor;
      adjustedCells.forEach((cellKey) => {
        const [x, y] = cellKey.split(',').map(Number);
        const pixelX = x * effectiveCellWidth + panOffset.x;
        const pixelY = y * effectiveCellHeight + panOffset.y;
        ctx.fillRect(pixelX, pixelY, effectiveCellWidth, effectiveCellHeight);
      });

      const islands = buildIslands(adjustedCells);

      ctx.strokeStyle = selectionOutlineColor;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash(selectionLineDash);

      islands.forEach((island) => {
        const loops = buildOutlineLoops(island);
        loops.forEach((loop) => {
          if (loop.length < 2) {
            return;
          }

          ctx.beginPath();
          loop.forEach((point, index) => {
            const pixelX = point.x * effectiveCellWidth + panOffset.x;
            const pixelY = point.y * effectiveCellHeight + panOffset.y;
            if (index === 0) {
              ctx.moveTo(pixelX, pixelY);
            } else {
              ctx.lineTo(pixelX, pixelY);
            }
          });
          ctx.closePath();
          ctx.stroke();
        });
      });

      ctx.setLineDash([]);
    };

    const previewActive = selectionPreview.active && selectionPreview.tool !== null && selectionPreview.modifier !== 'replace';
    if (previewActive) {
      const baseCells = new Set(selectionPreview.baseCells);
      const gestureCells = new Set(selectionPreview.gestureCells);
      const modifier = selectionPreview.modifier;
      const toolKey = selectionPreview.tool ?? 'select';

      const previewStyleMap = {
        select: {
          baseFill: 'rgba(59, 130, 246, 0.2)',
          addFill: 'rgba(34, 197, 94, 0.25)',
          addStroke: undefined,
          subtractFill: 'rgba(239, 68, 68, 0.22)',
          subtractStroke: '#EF4444'
        },
        lasso: {
          baseFill: 'rgba(168, 85, 247, 0.25)',
          addFill: 'rgba(34, 197, 94, 0.25)',
          addStroke: undefined,
          subtractFill: 'rgba(239, 68, 68, 0.22)',
          subtractStroke: '#EF4444'
        },
        magicwand: {
          baseFill: 'rgba(255, 165, 0, 0.28)',
          addFill: 'rgba(56, 189, 248, 0.25)',
          addStroke: undefined,
          subtractFill: 'rgba(239, 68, 68, 0.22)',
          subtractStroke: undefined
        }
      } as const;

      const styles = previewStyleMap[toolKey as keyof typeof previewStyleMap] ?? previewStyleMap.select;

      if (modifier === 'add') {
        drawCells(baseCells, { fillStyle: styles.baseFill });
        drawCells(gestureCells, { fillStyle: styles.addFill, strokeStyle: styles.addStroke });
      } else if (modifier === 'subtract') {
        const remainingCells = new Set<string>();
        baseCells.forEach((cell) => {
          if (!gestureCells.has(cell)) {
            remainingCells.add(cell);
          }
        });

        drawCells(remainingCells, { fillStyle: styles.baseFill });
        if (gestureCells.size > 0) {
          drawCells(gestureCells, { fillStyle: styles.subtractFill, strokeStyle: styles.subtractStroke, lineDash: styles.subtractStroke ? [4, 3] : undefined });
        }
      }
    }

    // Draw selection overlay
    if (selection.active && selection.selectedCells.size > 0) {
      drawSelectionIslands(selection.selectedCells);
    }

    if (lassoSelection.active && lassoSelection.selectedCells.size > 0) {
      drawSelectionIslands(lassoSelection.selectedCells);
    }

    if (magicWandSelection.active && magicWandSelection.selectedCells.size > 0) {
      drawSelectionIslands(magicWandSelection.selectedCells);
    }

    // Draw shift+click line preview
    if (linePreview.active && linePreview.points.length > 0) {
      ctx.fillStyle = 'rgba(168, 85, 247, 0.1)'; // Same purple as lasso selection
      
      linePreview.points.forEach(({ x, y }) => {
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
    
    // Draw gradient fill overlay
    if (activeTool === 'gradientfill' && gradientApplying) {
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
        const enabledProperties: GradientPropertyKey[] = [];
        if (gradientDefinition.character.enabled) enabledProperties.push('character');
        if (gradientDefinition.textColor.enabled) enabledProperties.push('textColor');
        if (gradientDefinition.backgroundColor.enabled) enabledProperties.push('backgroundColor');
        
        enabledProperties.forEach((property, propIndex) => {
          const gradientProp = gradientDefinition[property];
          if (gradientProp.stops) {
            gradientProp.stops.forEach((stop) => {
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
      
      // Draw gradient preview overlay with full opacity (shows exactly what the final result will be)
      if (gradientPreview && gradientPreview.size > 0) {
        ctx.globalAlpha = 1.0;
        
        gradientPreview.forEach((cell, key) => {
          const [x, y] = key.split(',').map(Number);
          const pixelX = x * effectiveCellWidth + panOffset.x;
          const pixelY = y * effectiveCellHeight + panOffset.y;

          // First, clear the background to hide original canvas content
          // Use actual canvas background, or app background when canvas is transparent
          if (canvasBackgroundColor === 'transparent') {
            ctx.fillStyle = theme === 'dark' ? '#000000' : '#ffffff';
          } else {
            ctx.fillStyle = canvasBackgroundColor;
          }
          ctx.fillRect(pixelX, pixelY, effectiveCellWidth, effectiveCellHeight);

          // Draw cell background (gradient background color)
          if (cell.bgColor && cell.bgColor !== 'transparent') {
            ctx.fillStyle = cell.bgColor;
            ctx.fillRect(pixelX, pixelY, effectiveCellWidth, effectiveCellHeight);
          }

          // Draw character
          if (cell.char && cell.char !== ' ') {
            ctx.fillStyle = cell.color || '#000000';
            // Use helper to properly quote font names with spaces
            const scaledFontMetrics = { ...fontMetrics, fontSize: fontMetrics.fontSize * zoom };
            ctx.font = getFontString(scaledFontMetrics);
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

    // Draw ASCII Box preview
    if (boxApplying) {
      // Draw purple highlight for drawn cells
      if (boxDrawnCells.size > 0) {
        ctx.fillStyle = 'rgba(168, 85, 247, 0.2)'; // Purple highlight
        boxDrawnCells.forEach(cellKey => {
          const [x, y] = cellKey.split(',').map(Number);
          const pixelX = x * effectiveCellWidth + panOffset.x;
          const pixelY = y * effectiveCellHeight + panOffset.y;
          ctx.fillRect(pixelX, pixelY, effectiveCellWidth, effectiveCellHeight);
        });
      }

      // Draw characters from preview data
      if (boxPreview && boxPreview.size > 0) {
        ctx.globalAlpha = 1.0;
        
        boxPreview.forEach((cell, key) => {
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
            const scaledFontMetrics = { ...fontMetrics, fontSize: fontMetrics.fontSize * zoom };
            ctx.font = getFontString(scaledFontMetrics);
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
    
    // Draw rectangle preview (faint overlay while positioning second corner)
    if (boxRectanglePreview && boxRectanglePreview.size > 0) {
      // Draw purple highlight fill (same as shift+click line preview)
      ctx.fillStyle = 'rgba(168, 85, 247, 0.2)'; // Purple highlight
      
      boxRectanglePreview.forEach((_cell, key) => {
        const [x, y] = key.split(',').map(Number);
        const pixelX = x * effectiveCellWidth + panOffset.x;
        const pixelY = y * effectiveCellHeight + panOffset.y;
        ctx.fillRect(pixelX, pixelY, effectiveCellWidth, effectiveCellHeight);
      });
      
      // Draw faint characters
      ctx.globalAlpha = 0.5;
      boxRectanglePreview.forEach((cell, key) => {
        const [x, y] = key.split(',').map(Number);
        const pixelX = x * effectiveCellWidth + panOffset.x;
        const pixelY = y * effectiveCellHeight + panOffset.y;
        
        // Draw character
        if (cell.char && cell.char !== ' ') {
          ctx.fillStyle = cell.color || '#ffffff';
          const scaledFontMetrics = { ...fontMetrics, fontSize: fontMetrics.fontSize * zoom };
          ctx.font = getFontString(scaledFontMetrics);
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
    
    // Draw Bezier preview overlay (shows filled ASCII in real-time as shape is edited)
    // Show preview whenever there are preview cells, regardless of drawing state
    if (bezierPreview && bezierPreview.size > 0) {
      ctx.globalAlpha = 0.85; // Slightly transparent to distinguish from committed content
      
      bezierPreview.forEach((cell, key) => {
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
          const scaledFontMetrics = { ...fontMetrics, fontSize: fontMetrics.fontSize * zoom };
          ctx.font = getFontString(scaledFontMetrics);
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
    
    // Draw hover cell outline (subtle outline for current cell under cursor)
    if (hoveredCell && hoveredCell.x >= 0 && hoveredCell.x < width && hoveredCell.y >= 0 && hoveredCell.y < height) {
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)'; // 50% opacity purple outline
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(
        hoveredCell.x * effectiveCellWidth + panOffset.x,
        hoveredCell.y * effectiveCellHeight + panOffset.y,
        effectiveCellWidth,
        effectiveCellHeight
      );
    }
    
    // Draw hover preview (for brush and other tool-specific previews)
    // Rendered last so it appears on top of all other overlays
    if (hoverPreview.active && hoverPreview.cells.length > 0) {
      // Visual style based on preview mode
      const getPreviewStyle = (mode: string) => {
        switch (mode) {
          case 'brush':
            return {
              fillStyle: 'rgba(168, 85, 247, 0.15)', // Subtle purple fill
              strokeStyle: 'rgba(168, 85, 247, 0.5)', // Purple outline
              lineWidth: 1
            };
          case 'eraser-brush':
            return {
              fillStyle: 'rgba(248, 250, 252, 0.15)', // Soft neutral fill
              strokeStyle: 'rgba(226, 232, 240, 0.1)', // Light gray outline
              lineWidth: 1,
              lineDash: [4, 2] as [number, number]
            };
          case 'eraser-brush-active':
            return {
              fillStyle: 'rgba(248, 250, 252, 0.01)', // Much dimmer fill while erasing
              strokeStyle: 'rgba(226, 232, 240, 0.05)', // Much dimmer outline while erasing
              lineWidth: 1,
              lineDash: [4, 2] as [number, number]
            };
          // Future modes can have different visual styles
          case 'rectangle':
          case 'ellipse':
            return {
              fillStyle: 'rgba(59, 130, 246, 0.15)', // Blue fill
              strokeStyle: 'rgba(59, 130, 246, 0.5)', // Blue outline
              lineWidth: 1
            };
          default:
            return {
              fillStyle: 'rgba(255, 255, 255, 0.1)', // White fill
              strokeStyle: 'rgba(255, 255, 255, 0.3)', // White outline
              lineWidth: 1
            };
        }
      };
      
      const style = getPreviewStyle(hoverPreview.mode);
      ctx.fillStyle = style.fillStyle;
      ctx.strokeStyle = style.strokeStyle;
      ctx.lineWidth = style.lineWidth;
      if ('lineDash' in style && style.lineDash) {
        ctx.setLineDash(style.lineDash);
      } else {
        ctx.setLineDash([]);
      }
      
      // Draw each cell in the preview pattern
      hoverPreview.cells.forEach(({ x, y }) => {
        const pixelX = x * effectiveCellWidth + panOffset.x;
        const pixelY = y * effectiveCellHeight + panOffset.y;
        
        // Fill cell with semi-transparent color
        ctx.fillRect(
          pixelX,
          pixelY,
          effectiveCellWidth,
          effectiveCellHeight
        );
        
        // Outline cell for better visibility
        ctx.strokeRect(
          pixelX,
          pixelY,
          effectiveCellWidth,
          effectiveCellHeight
        );
      });
    }
  }, [
    selection,
    lassoSelection,
    magicWandSelection,
    selectionPreview,
    linePreview,
    effectiveCellWidth,
    effectiveCellHeight,
    panOffset,
    moveState,
    getTotalOffset,
    canvasRef,
    pasteMode,
    activeTool,
    gradientApplying,
    gradientStart,
    gradientEnd,
    gradientDefinition,
    gradientPreview,
    boxApplying,
    boxPreview,
    boxDrawnCells,
    boxRectanglePreview,
    bezierPreview,
    hoverPreview,
    hoveredCell,
    canvasBackgroundColor,
    fontMetrics,
    width,
    height,
    theme,
    zoom
  ]);

  // Re-render overlay when dependencies change, throttled with RAF
  useEffect(() => {
    let rafId: number | null = null;
    
    const scheduleRender = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      
      rafId = requestAnimationFrame(() => {
        renderOverlay();
        rafId = null;
      });
    };
    
    scheduleRender();
    
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [renderOverlay]);

  return (
    <>
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 10, // Ensure overlay appears above main canvas
        }}
      />
      <InteractiveGradientOverlay />
      {activeTool === 'beziershape' && <InteractiveBezierOverlay key={bezierRemountKey} />}
    </>
  );
};
