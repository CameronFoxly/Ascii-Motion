import React, { useCallback, useEffect, useRef } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useGradientStore } from '../../stores/gradientStore';
import { useAsciiBoxStore } from '../../stores/asciiBoxStore';
import { useBezierStore } from '../../stores/bezierStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useCanvasStore } from '../../stores/canvasStore';
import { useImportStore } from '../../stores/importStore';
import { usePreviewStore } from '../../stores/previewStore';
import { useTheme } from '../../contexts/ThemeContext';
import { useCanvasState } from '../../hooks/useCanvasState';
import { getFontString } from '../../utils/fontMetrics';
import { InteractiveGradientOverlay } from './InteractiveGradientOverlay';
import { InteractiveBezierOverlay } from './InteractiveBezierOverlay';
import { InteractiveVectorShapeOverlay } from './InteractiveVectorShapeOverlay';
import { AnchorPointOverlay } from './AnchorPointOverlay';
import { LayerTransformOverlay } from './LayerTransformOverlay';
import { ImportTransformOverlay } from './ImportTransformOverlay';
import { transformCellMapToScreen } from '../../utils/layerTransformUtils';

type GradientPropertyKey = 'character' | 'textColor' | 'backgroundColor';

export const CanvasOverlay: React.FC = React.memo(() => {
  // Create a separate canvas ref for overlay
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  // Dedicated canvas for hover preview (decoupled from main overlay for performance)
  const hoverCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Canvas context and state  
  const { canvasRef, pasteMode, cellWidth, cellHeight, zoom, panOffset, fontMetrics, selectionPreview, hoveredCellRef, hoverPreviewRef, registerHoverRender } = useCanvasContext();
  const {
    moveState,
    getTotalOffset,
  } = useCanvasState();

  // PERF FIX: Use targeted selectors instead of broad useToolStore().
  // Previously: `const { selection, lassoSelection, ... } = useToolStore();`
  // Broad subscriptions bypass React.memo, causing re-renders on any tool change.
  const selection = useToolStore((s) => s.selection);
  const lassoSelection = useToolStore((s) => s.lassoSelection);
  const magicWandSelection = useToolStore((s) => s.magicWandSelection);
  const linePreview = useToolStore((s) => s.linePreview);
  const activeTool = useToolStore((s) => s.activeTool);
  const importModalOpen = useImportStore((s) => s.isImportModalOpen);
  const importFileSelected = useImportStore((s) => s.selectedFile !== null);
  const importPreviewMode = useImportStore((s) => s.isPreviewMode);
  const importLivePreview = useImportStore(
    (s) => s.uiState.livePreviewEnabled,
  );
  const importPreviewActive = usePreviewStore((s) => s.isPreviewActive);
  const importTransformActive =
    importModalOpen &&
    importFileSelected &&
    importPreviewMode &&
    importLivePreview &&
    importPreviewActive;
  // PERF FIX: Use targeted selectors for gradientStore and asciiBoxStore.
  const gradientApplying = useGradientStore((s) => s.isApplying);
  const gradientStart = useGradientStore((s) => s.startPoint);
  const gradientEnd = useGradientStore((s) => s.endPoint);
  const gradientDefinition = useGradientStore((s) => s.definition);
  const gradientPreview = useGradientStore((s) => s.previewData);
  const boxApplying = useAsciiBoxStore((s) => s.isApplying);
  const boxPreview = useAsciiBoxStore((s) => s.previewData);
  const boxDrawnCells = useAsciiBoxStore((s) => s.drawnCells);
  const boxRectanglePreview = useAsciiBoxStore((s) => s.rectanglePreview);
  // Only subscribe to bezier preview cells, not the entire store
  const bezierPreview = useBezierStore((state) => state.previewCells);
  const bezierRemountKey = useBezierStore((state) => state.remountKey);
  // Only subscribe to the specific values needed — NOT the entire store,
  // since subscribing to the full store causes re-renders on every cell edit during drawing
  const canvasBackgroundColor = useCanvasStore((s) => s.canvasBackgroundColor);
  const width = useCanvasStore((s) => s.width);
  const height = useCanvasStore((s) => s.height);
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
    // Apply reduced opacity when a non-selection tool is active (persistent selection feature)
    const isSelectionToolActive = activeTool === 'select' || activeTool === 'lasso' || activeTool === 'magicwand';
    const selectionOverlayOpacity = isSelectionToolActive ? 1.0 : 0.5;
    
    const hasAnySelection = 
      (selection.active && selection.selectedCells.size > 0) ||
      (lassoSelection.active && lassoSelection.selectedCells.size > 0) ||
      (magicWandSelection.active && magicWandSelection.selectedCells.size > 0);
    
    if (hasAnySelection) {
      ctx.globalAlpha = selectionOverlayOpacity;
      
      if (selection.active && selection.selectedCells.size > 0) {
        drawSelectionIslands(selection.selectedCells);
      }

      if (lassoSelection.active && lassoSelection.selectedCells.size > 0) {
        drawSelectionIslands(lassoSelection.selectedCells);
      }

      if (magicWandSelection.active && magicWandSelection.selectedCells.size > 0) {
        drawSelectionIslands(magicWandSelection.selectedCells);
      }
      
      ctx.globalAlpha = 1.0; // Reset opacity
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
        
        // Preview data is in local space — forward-transform to screen for display
        const screenPreview = transformCellMapToScreen(gradientPreview);
        screenPreview.forEach((cell, key) => {
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
    
    // Hover preview rendering moved to separate canvas (hoverCanvasRef) for performance
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
    // hoverPreview and hoveredCell removed — rendered on separate canvas for performance
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

  // ─── Zero-latency hover preview rendering ───
  // Renders directly via callback from CanvasContext (bypasses React render cycle).
  // The useHoverPreview hook writes to hoverPreviewRef and calls the registered
  // render callback immediately — no useState, no re-render, no useEffect delay.
  
  // Store current render params in refs so the render callback can access them
  const renderParamsRef = useRef({ effectiveCellWidth, effectiveCellHeight, panOffset, width, height });
  renderParamsRef.current = { effectiveCellWidth, effectiveCellHeight, panOffset, width, height };
  // hoveredCellRef comes directly from context now (ref-based)
  
  useEffect(() => {
    const renderHover = () => {
      const hoverCanvas = hoverCanvasRef.current;
      const mainCanvas = canvasRef.current;
      if (!hoverCanvas || !mainCanvas) return;

      const ctx = hoverCanvas.getContext('2d');
      if (!ctx) return;

      // Match canvas size
      if (hoverCanvas.width !== mainCanvas.width || hoverCanvas.height !== mainCanvas.height) {
        hoverCanvas.width = mainCanvas.width;
        hoverCanvas.height = mainCanvas.height;
        hoverCanvas.style.width = mainCanvas.style.width;
        hoverCanvas.style.height = mainCanvas.style.height;
        const dpr = window.devicePixelRatio || 1;
        ctx.scale(dpr, dpr);
      }

      const { effectiveCellWidth: ecw, effectiveCellHeight: ech, panOffset: po, width: w, height: h } = renderParamsRef.current;
      const hc = hoveredCellRef.current;
      const hp = hoverPreviewRef.current;

      // Clear
      ctx.clearRect(0, 0, hoverCanvas.width / (window.devicePixelRatio || 1), hoverCanvas.height / (window.devicePixelRatio || 1));

      // Draw hover cell outline — only when brush preview is NOT active
      const hasBrushPreview = hp.active && hp.cells.length > 0;
      if (!hasBrushPreview && hc && hc.x >= 0 && hc.x < w && hc.y >= 0 && hc.y < h) {
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(hc.x * ecw + po.x, hc.y * ech + po.y, ecw, ech);
      }

      // Draw brush/tool hover preview
      if (hp.active && hp.cells.length > 0) {
        const getStyle = (mode: string) => {
          switch (mode) {
            case 'brush':
              return { fill: 'rgba(168, 85, 247, 0.15)', stroke: 'rgba(168, 85, 247, 0.5)', lw: 1, dash: [] as number[] };
            case 'eraser-brush':
              return { fill: 'rgba(248, 250, 252, 0.15)', stroke: 'rgba(226, 232, 240, 0.1)', lw: 1, dash: [4, 2] };
            case 'eraser-brush-active':
              return { fill: 'rgba(248, 250, 252, 0.01)', stroke: 'rgba(226, 232, 240, 0.05)', lw: 1, dash: [4, 2] };
            case 'rectangle': case 'ellipse':
              return { fill: 'rgba(59, 130, 246, 0.15)', stroke: 'rgba(59, 130, 246, 0.5)', lw: 1, dash: [] as number[] };
            default:
              return { fill: 'rgba(255, 255, 255, 0.1)', stroke: 'rgba(255, 255, 255, 0.3)', lw: 1, dash: [] as number[] };
          }
        };
        const s = getStyle(hp.mode);
        ctx.fillStyle = s.fill;
        ctx.strokeStyle = s.stroke;
        ctx.lineWidth = s.lw;
        ctx.setLineDash(s.dash);
        for (const { x, y } of hp.cells) {
          const px = x * ecw + po.x;
          const py = y * ech + po.y;
          ctx.fillRect(px, py, ecw, ech);
          ctx.strokeRect(px, py, ecw, ech);
        }
      }
    };
    
    // Register the render callback — useHoverPreview will call this directly
    registerHoverRender(renderHover);
    hoverRenderFnRef.current = renderHover;
    
    // Initial render
    renderHover();
    
    return () => {
      registerHoverRender(null);
      hoverRenderFnRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- hoveredCellRef is a stable ref that doesn't change
  }, [canvasRef, registerHoverRender, hoverPreviewRef]);
  
  // Re-render hover canvas when hoveredCell changes (registered via ref-based callback)
  const hoverRenderFnRef = useRef<(() => void) | null>(null);
  
  // Register for hoveredCell change notifications (bypasses React re-render)
  const { registerHoveredCellRender } = useCanvasContext();
  useEffect(() => {
    const cleanup = registerHoveredCellRender(() => hoverRenderFnRef.current?.());
    return cleanup;
  }, [registerHoveredCellRender]);

  return (
    <>
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 10, // Ensure overlay appears above main canvas
        }}
      />
      <canvas
        ref={hoverCanvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 11, // Above main overlay
        }}
      />
      {!importTransformActive && <InteractiveGradientOverlay />}
      {!importTransformActive && activeTool === 'beziershape' && (
        <InteractiveBezierOverlay key={bezierRemountKey} />
      )}
      {!importTransformActive &&
        (activeTool === 'rectangle' || activeTool === 'ellipse') && (
          <InteractiveVectorShapeOverlay key={`vs-${bezierRemountKey}`} />
        )}
      {importTransformActive ? (
        <ImportTransformOverlay />
      ) : activeTool === 'layertransform' ? (
        <LayerTransformOverlay />
      ) : (
        <AnchorPointOverlay />
      )}
    </>
  );
});

CanvasOverlay.displayName = 'CanvasOverlay';
