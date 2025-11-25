import { useCallback, useEffect, useMemo } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import { usePreviewStore } from '../stores/previewStore';
import { useEffectsStore } from '../stores/effectsStore';
import { useTimeEffectsStore } from '../stores/timeEffectsStore';
import { useAsciiTypeStore } from '../stores/asciiTypeStore';
import { useCanvasContext } from '../contexts/CanvasContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCanvasState } from './useCanvasState';
import { useMemoizedGrid } from './useMemoizedGrid';
import { useDrawingTool } from './useDrawingTool';
import { useOnionSkinRenderer } from './useOnionSkinRenderer';
import { measureCanvasRender, finishCanvasRender } from '../utils/performance';
import { 
  setupTextRendering
} from '../utils/canvasTextRendering';
import { getFontString } from '../utils/fontMetrics';
import { scheduleCanvasRender } from '../utils/renderScheduler';
import { markFullRedraw } from '../utils/dirtyTracker';
import { calculateAdaptiveGridColor } from '../utils/gridColor';
import type { Cell } from '../types';

/**
 * Setup high-DPI canvas for crisp text rendering
 * Returns scale factor for coordinate transformations
 */
const setupHighDPICanvas = (
  canvas: HTMLCanvasElement,
  displayWidth: number,
  displayHeight: number
): { ctx: CanvasRenderingContext2D; scale: number } => {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');

  // Use device pixel ratio for crisp rendering on high-DPI displays
  const devicePixelRatio = window.devicePixelRatio || 1;
  
  // Set canvas internal resolution to match device pixel ratio
  canvas.width = displayWidth * devicePixelRatio;
  canvas.height = displayHeight * devicePixelRatio;
  
  // Set CSS size to desired display size (no transform needed)
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  
  // Scale the drawing context to match the device pixel ratio
  ctx.scale(devicePixelRatio, devicePixelRatio);
  
  // Apply high-quality text rendering settings
  ctx.textBaseline = 'top';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  return { ctx, scale: devicePixelRatio };
};

/**
 * Hook for optimized canvas rendering with memoization
 * Implements Step 5.1 performance optimizations:
 * - Memoized font and style calculations
 * - Grid-level change detection
 * - Performance measurement
 */
export const useCanvasRenderer = () => {
  const { canvasRef, pasteMode, panOffset, fontMetrics, isFontLoading } = useCanvasContext();
  const { theme } = useTheme();
  const {
    effectiveCellWidth,
    effectiveCellHeight,
    zoom,
    moveState,
    canvasWidth,
    canvasHeight,
    getTotalOffset,
  } = useCanvasState();

  const { 
    width, 
    height, 
    canvasBackgroundColor,
    showGrid,
    getCell
  } = useCanvasStore();

  const { activeTool, rectangleFilled, lassoSelection, magicWandSelection, textToolState, linePreview } = useToolStore();
  const { previewData, isPreviewActive } = usePreviewStore();
  const { isPreviewActive: isEffectPreviewActive } = useEffectsStore();
  const { isPreviewActive: isTimeEffectPreviewActive } = useTimeEffectsStore();
  const { previewOrigin, previewDimensions } = useAsciiTypeStore();
  

  const { getEllipsePoints } = useDrawingTool();

  // Use onion skin renderer for frame overlays
  const { renderOnionSkins } = useOnionSkinRenderer();

  // Use memoized grid for optimized rendering  
  const { selectionData } = useMemoizedGrid(
    moveState,
    getTotalOffset
  );

  // Memoize canvas dimensions and styling to reduce re-renders
  const canvasConfig = useMemo(() => ({
    width,
    height,
    canvasWidth,
    canvasHeight,
    effectiveCellWidth,
    effectiveCellHeight,
    panOffset,
    showGrid,
    canvasBackgroundColor
  }), [width, height, canvasWidth, canvasHeight, effectiveCellWidth, effectiveCellHeight, panOffset, showGrid, canvasBackgroundColor]);

  // Memoize tool state to reduce re-renders
  const toolState = useMemo(() => ({
    activeTool,
    rectangleFilled,
    lassoSelection,
    magicWandSelection,
    textToolState,
    linePreview
  }), [activeTool, rectangleFilled, lassoSelection, magicWandSelection, textToolState, linePreview]);

  // Memoize overlay state
  const overlayState = useMemo(() => ({
    moveState,
    selectionData,
    pasteMode
  }), [moveState, selectionData, pasteMode]);

  // Memoize font and style calculations
  const drawingStyles = useMemo(() => {
    // Scale font size with zoom
    const scaledFontSize = fontMetrics.fontSize * zoom;
    // Use helper to properly quote font names with spaces
    const scaledFontMetrics = { ...fontMetrics, fontSize: scaledFontSize };
    const scaledFontString = getFontString(scaledFontMetrics);
    
    return {
      font: scaledFontString,
      gridLineColor: calculateAdaptiveGridColor(canvasBackgroundColor, theme),
      gridLineWidth: 1, // Use 1 pixel for crisp grid lines
      textAlign: 'center' as CanvasTextAlign,
      textBaseline: 'middle' as CanvasTextBaseline,
      defaultTextColor: '#FFFFFF',
      defaultBgColor: '#000000'
    };
    // Include isFontLoading to trigger re-render after font loads
  }, [fontMetrics, zoom, canvasBackgroundColor, theme, isFontLoading]);

    // Optimized drawCell function with pixel-aligned rendering (but no coordinate changes)
  const drawCell = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, cell: Cell) => {
    // Round pixel positions to ensure crisp rendering
    const pixelX = Math.round(x * effectiveCellWidth + panOffset.x);
    const pixelY = Math.round(y * effectiveCellHeight + panOffset.y);
    const cellWidth = Math.round(effectiveCellWidth);
    const cellHeight = Math.round(effectiveCellHeight);

    // Draw background (only if different from canvas background)
    if (cell.bgColor && cell.bgColor !== 'transparent' && cell.bgColor !== canvasBackgroundColor) {
      ctx.fillStyle = cell.bgColor;
      ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
    }

    // Draw character with pixel-perfect positioning
    if (cell.char && cell.char !== ' ') {
      ctx.fillStyle = cell.color || drawingStyles.defaultTextColor;
      ctx.font = drawingStyles.font;
      ctx.textAlign = drawingStyles.textAlign;
      ctx.textBaseline = drawingStyles.textBaseline;
      
      // Center text with rounded positions for crisp rendering
      const centerX = Math.round(pixelX + cellWidth / 2);
      const centerY = Math.round(pixelY + cellHeight / 2);
      
      ctx.fillText(cell.char, centerX, centerY);
    }
  }, [effectiveCellWidth, effectiveCellHeight, panOffset, canvasBackgroundColor, drawingStyles]);

  // Separate function to render grid background
  const drawGridBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!showGrid) return;
    
    ctx.strokeStyle = drawingStyles.gridLineColor;
    ctx.lineWidth = drawingStyles.gridLineWidth;
    
    // Draw vertical lines
    for (let x = 0; x <= width; x++) {
      const lineX = Math.round(x * effectiveCellWidth + panOffset.x) + 0.5;
      ctx.beginPath();
      ctx.moveTo(lineX, panOffset.y);
      ctx.lineTo(lineX, height * effectiveCellHeight + panOffset.y);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= height; y++) {
      const lineY = Math.round(y * effectiveCellHeight + panOffset.y) + 0.5;
      ctx.beginPath();
      ctx.moveTo(panOffset.x, lineY);
      ctx.lineTo(width * effectiveCellWidth + panOffset.x, lineY);
      ctx.stroke();
    }
  }, [width, height, effectiveCellWidth, effectiveCellHeight, panOffset, drawingStyles, showGrid]);

  // Optimized render function with performance measurement and subtle DPI improvements
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply only text rendering optimizations without affecting canvas size/coordinates
    setupTextRendering(ctx);

    // Start performance measurement
    measureCanvasRender();

    // Clear canvas and fill with background color
    if (canvasConfig.canvasBackgroundColor === 'transparent') {
      // For transparent backgrounds, clear the canvas completely
      ctx.clearRect(0, 0, canvasConfig.canvasWidth, canvasConfig.canvasHeight);
    } else {
      // For solid backgrounds, fill with the background color
      ctx.fillStyle = canvasConfig.canvasBackgroundColor;
      ctx.fillRect(0, 0, canvasConfig.canvasWidth, canvasConfig.canvasHeight);
    }

    // Render grid background layer first (behind content)
    drawGridBackground(ctx);

    // Render onion skin layers (previous and next frames)
    renderOnionSkins();

    // Set font context once for the entire render batch
    ctx.font = drawingStyles.font;
    ctx.textAlign = drawingStyles.textAlign;
    ctx.textBaseline = drawingStyles.textBaseline;

    // Create a set of coordinates that are being moved (optimized)
    const movingCells = new Set<string>();
    if (moveState) {
      const originalKeys = moveState.originalPositions ?? new Set(moveState.originalData.keys());
      originalKeys.forEach((key: string) => {
        movingCells.add(key);
      });
    }

    // Draw static cells (excluding cells being moved)
    // Skip drawing original cells if time effects preview OR effects preview is active (preview will render all cells)
    if (!isTimeEffectPreviewActive && !isEffectPreviewActive) {
      for (let y = 0; y < canvasConfig.height; y++) {
        for (let x = 0; x < canvasConfig.width; x++) {
          const key = `${x},${y}`;
          
          if (movingCells.has(key)) {
            // Draw empty cell in original position during move
            drawCell(ctx, x, y, { 
              char: ' ', 
              color: drawingStyles.defaultTextColor, 
              bgColor: drawingStyles.defaultBgColor 
            });
          } else {
            const cell = getCell(x, y);
            if (cell) {
              drawCell(ctx, x, y, cell);
            }
          }
        }
      }
    }

    // Draw moved cells at their new positions
    if (overlayState.moveState && overlayState.moveState.originalData.size > 0) {
      const totalOffset = getTotalOffset(overlayState.moveState);
      overlayState.moveState.originalData.forEach((cell: Cell, key: string) => {
        const [origX, origY] = key.split(',').map(Number);
        const newX = origX + totalOffset.x;
        const newY = origY + totalOffset.y;
        
        // Only draw if within bounds
        if (newX >= 0 && newX < canvasConfig.width && newY >= 0 && newY < canvasConfig.height) {
          drawCell(ctx, newX, newY, cell);
        }
      });
    }

    // Draw selection overlay
    if (overlayState.selectionData) {
      if (toolState.activeTool === 'ellipse') {
        // Draw ellipse preview with highlighted cells
        const centerX = (overlayState.selectionData.startX + overlayState.selectionData.startX + overlayState.selectionData.width - 1) / 2;
        const centerY = (overlayState.selectionData.startY + overlayState.selectionData.startY + overlayState.selectionData.height - 1) / 2;
        const radiusX = (overlayState.selectionData.width - 1) / 2;
        const radiusY = (overlayState.selectionData.height - 1) / 2;

        // Get ellipse points to highlight exactly which cells will be affected
        const ellipsePoints = getEllipsePoints(centerX, centerY, radiusX, radiusY, toolState.rectangleFilled);
        
        // Highlight each cell that will be part of the ellipse
        ctx.fillStyle = 'rgba(168, 85, 247, 0.3)'; // Purple highlight
        ellipsePoints.forEach(({ x, y }) => {
          if (x >= 0 && y >= 0 && x < canvasConfig.width && y < canvasConfig.height) {
            ctx.fillRect(
              Math.round(x * canvasConfig.effectiveCellWidth + canvasConfig.panOffset.x),
              Math.round(y * canvasConfig.effectiveCellHeight + canvasConfig.panOffset.y),
              Math.round(canvasConfig.effectiveCellWidth),
              Math.round(canvasConfig.effectiveCellHeight)
            );
          }
        });

        // Draw ellipse outline
        ctx.strokeStyle = '#A855F7'; // Purple border
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        // Draw ellipse path using HTML5 Canvas ellipse method
        ctx.beginPath();
        ctx.ellipse(
          (centerX + 0.5) * canvasConfig.effectiveCellWidth + canvasConfig.panOffset.x,  // center x
          (centerY + 0.5) * canvasConfig.effectiveCellHeight + canvasConfig.panOffset.y,  // center y  
          (radiusX + 0.5) * canvasConfig.effectiveCellWidth,  // radius x
          (radiusY + 0.5) * canvasConfig.effectiveCellHeight,  // radius y
          0,                           // rotation
          0,                           // start angle
          2 * Math.PI                  // end angle
        );
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Default rectangle preview for rectangle tool and selection tool
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          Math.round(overlayState.selectionData.startX * canvasConfig.effectiveCellWidth + canvasConfig.panOffset.x),
          Math.round(overlayState.selectionData.startY * canvasConfig.effectiveCellHeight + canvasConfig.panOffset.y),
          Math.round(overlayState.selectionData.width * canvasConfig.effectiveCellWidth),
          Math.round(overlayState.selectionData.height * canvasConfig.effectiveCellHeight)
        );
        ctx.setLineDash([]);
      }
    }

    // Draw lasso selection overlay
    if (toolState.lassoSelection.active) {
      // Note: Lasso path drawing removed for cleaner UX - only show filled selection
      
      // Highlight selected cells
      if (lassoSelection.selectedCells.size > 0) {
        ctx.fillStyle = 'rgba(168, 85, 247, 0.2)'; // Purple highlight with transparency
        
        lassoSelection.selectedCells.forEach(cellKey => {
          const [x, y] = cellKey.split(',').map(Number);
          
          // Apply move offset if in move mode
          let displayX = x;
          let displayY = y;
          if (moveState) {
            const totalOffset = getTotalOffset(moveState);
            displayX = x + totalOffset.x;
            displayY = y + totalOffset.y;
          }
          
          // Only draw if within canvas bounds
          if (displayX >= 0 && displayY >= 0 && displayX < width && displayY < height) {
            ctx.fillRect(
              Math.round(displayX * effectiveCellWidth + panOffset.x),
              Math.round(displayY * effectiveCellHeight + panOffset.y),
              Math.round(effectiveCellWidth),
              Math.round(effectiveCellHeight)
            );
          }
        });

        // Note: Lasso path border removed for cleaner UX - only show filled selection
      }
    }

    // Draw shift+click line preview
    if (toolState.linePreview.active && toolState.linePreview.points.length > 0) {
      ctx.fillStyle = 'rgba(168, 85, 247, 0.2)'; // Same purple as lasso selection, doubled opacity
      
      toolState.linePreview.points.forEach(({ x, y }) => {
        // Only draw if within canvas bounds
        if (x >= 0 && y >= 0 && x < canvasConfig.width && y < canvasConfig.height) {
          ctx.fillRect(
            Math.round(x * canvasConfig.effectiveCellWidth + canvasConfig.panOffset.x),
            Math.round(y * canvasConfig.effectiveCellHeight + canvasConfig.panOffset.y),
            Math.round(canvasConfig.effectiveCellWidth),
            Math.round(canvasConfig.effectiveCellHeight)
          );
        }
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
        Math.round(previewStartX * effectiveCellWidth + panOffset.x),
        Math.round(previewStartY * effectiveCellHeight + panOffset.y),
        Math.round(previewWidth * effectiveCellWidth),
        Math.round(previewHeight * effectiveCellHeight)
      );

      // Add semi-transparent background
      ctx.fillStyle = 'rgba(168, 85, 247, 0.1)';
      ctx.fillRect(
        Math.round(previewStartX * effectiveCellWidth + panOffset.x),
        Math.round(previewStartY * effectiveCellHeight + panOffset.y),
        Math.round(previewWidth * effectiveCellWidth),
        Math.round(previewHeight * effectiveCellHeight)
      );

      ctx.setLineDash([]);

      // Draw paste content preview with transparency
      ctx.globalAlpha = 0.85; // Make preview more visible
      data.forEach((cell, key) => {
        const [relX, relY] = key.split(',').map(Number);
        const absoluteX = position.x + relX;
        const absoluteY = position.y + relY;
        
        // Only draw if within canvas bounds
        if (absoluteX >= 0 && absoluteX < width && absoluteY >= 0 && absoluteY < height) {
          // Draw the actual cell content
          drawCell(ctx, absoluteX, absoluteY, {
            char: cell.char || ' ',
            color: cell.color || drawingStyles.defaultTextColor,
            bgColor: cell.bgColor || 'transparent'
          });
          
          // Add a subtle highlight border around preview cells
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(
            Math.round(absoluteX * effectiveCellWidth + panOffset.x), 
            Math.round(absoluteY * effectiveCellHeight + panOffset.y), 
            Math.round(effectiveCellWidth), 
            Math.round(effectiveCellHeight)
          );
        }
      });
      ctx.globalAlpha = 1.0;
    }

    // Draw text cursor overlay 
    if (isPreviewActive && previewData.size > 0) {
      // Check if this is an effects preview (should be fully opaque) or other preview (semi-transparent)
      const isEffectsPreview = isEffectPreviewActive || isTimeEffectPreviewActive;
      const previewAlpha = isEffectsPreview ? 1.0 : 0.8; // Effects: full opacity, others: semi-transparent
      
      if (isEffectsPreview) {
        // For effects previews, render the ENTIRE canvas using preview data
        // This ensures we show empty cells where content was removed (like scatter effect)
        ctx.save();
        ctx.globalAlpha = previewAlpha;
        
        for (let y = 0; y < canvasConfig.height; y++) {
          for (let x = 0; x < canvasConfig.width; x++) {
            const key = `${x},${y}`;
            const previewCell = previewData.get(key);
            
            if (previewCell) {
              // Draw the preview cell
              drawCell(ctx, x, y, previewCell);
            } else {
              // Draw empty cell with canvas background (shows where cells were removed)
              const pixelX = Math.round(x * effectiveCellWidth + panOffset.x);
              const pixelY = Math.round(y * effectiveCellHeight + panOffset.y);
              const cellWidth = Math.round(effectiveCellWidth);
              const cellHeight = Math.round(effectiveCellHeight);
              
              ctx.fillStyle = canvasBackgroundColor;
              ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
            }
          }
        }
        
        ctx.restore();
      } else {
        // For non-effects previews, only draw the preview cells (existing behavior)
        previewData.forEach((cell, key) => {
          const [x, y] = key.split(',').map(Number);
          
          // Only draw if within canvas bounds
          if (x >= 0 && x < canvasConfig.width && y >= 0 && y < canvasConfig.height) {
            ctx.save();
            ctx.globalAlpha = previewAlpha;
            drawCell(ctx, x, y, cell);
            ctx.restore();
          }
        });
      }

      // Draw purple dotted outline for ASCII Type preview
      if (activeTool === 'asciitype' && previewOrigin && previewDimensions) {
        ctx.strokeStyle = '#A855F7'; // Purple color matching other tool overlays
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]); // Dotted pattern matching paste/selection overlays
        
        const outlineX = Math.round(previewOrigin.x * effectiveCellWidth + panOffset.x);
        const outlineY = Math.round(previewOrigin.y * effectiveCellHeight + panOffset.y);
        const outlineWidth = Math.round(previewDimensions.width * effectiveCellWidth);
        const outlineHeight = Math.round(previewDimensions.height * effectiveCellHeight);
        
        ctx.strokeRect(outlineX, outlineY, outlineWidth, outlineHeight);
        ctx.setLineDash([]); // Reset line dash
      }
    }

    // Draw text cursor overlay
    if (textToolState.isTyping && textToolState.cursorVisible && textToolState.cursorPosition) {
      const { x, y } = textToolState.cursorPosition;
      
      // Only draw cursor if within canvas bounds
      if (x >= 0 && x < width && y >= 0 && y < height) {
        ctx.fillStyle = '#A855F7'; // Purple color to match other overlays
        ctx.fillRect(
          Math.round(x * effectiveCellWidth + panOffset.x),
          Math.round(y * effectiveCellHeight + panOffset.y),
          Math.round(effectiveCellWidth),
          Math.round(effectiveCellHeight)
        );
      }
    }

    // Finish performance measurement
    const totalCells = width * height;
    finishCanvasRender(totalCells);

  }, [
    // Use memoized objects to reduce re-renders
    canvasConfig,
    toolState,
    overlayState,
  // Keep these individual dependencies for now
  getCell,
  drawCell,
  drawGridBackground,
    getTotalOffset,
    canvasRef,
    drawingStyles,
    getEllipsePoints,
    renderOnionSkins,
    // Preview store values
    previewData,
    isPreviewActive,
    // Effects preview state
    isEffectPreviewActive,
    isTimeEffectPreviewActive,
    // ASCII Type preview outline state
    previewOrigin,
    previewDimensions,
    // Additional direct dependencies referenced in the callback
    activeTool,
    canvasBackgroundColor,
    effectiveCellWidth,
    effectiveCellHeight,
    width,
    height,
    panOffset,
    moveState,
    pasteMode,
    textToolState,
    lassoSelection
  ]);

  // Throttled render function that uses requestAnimationFrame
  const scheduleRender = useCallback(() => {
    scheduleCanvasRender(renderCanvas);
  }, [renderCanvas]);

  // Optimized render trigger - use scheduled rendering for better performance
  const triggerRender = useCallback(() => {
    // Mark that we need a full redraw for now (we can optimize this later)
    markFullRedraw();
    scheduleRender();
  }, [scheduleRender]);

  // Re-render when dependencies change (now throttled)
  useEffect(() => {
    triggerRender();
  }, [triggerRender]);

  // Handle canvas resize with high-DPI setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Setup high-DPI canvas for crisp text rendering
    setupHighDPICanvas(canvas, canvasWidth, canvasHeight);
    
    // Re-render after resize (immediate for resize)
    renderCanvas();
  }, [canvasWidth, canvasHeight, renderCanvas, canvasRef]);

  return {
    renderCanvas,
    scheduleRender,
    triggerRender
  };
};
