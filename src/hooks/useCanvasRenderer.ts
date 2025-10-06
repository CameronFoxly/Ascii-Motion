import { useCallback, useEffect, useMemo } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import { usePreviewStore } from '../stores/previewStore';
import { useEffectsStore } from '../stores/effectsStore';
import { useTimeEffectsStore } from '../stores/timeEffectsStore';
import { useAsciiTypeStore } from '../stores/asciiTypeStore';
import { useAnimationStore } from '../stores/animationStore';
import { useFrameCacheStore } from '../stores/frameCacheStore';
import { useCanvasContext } from '../contexts/CanvasContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCanvasState } from './useCanvasState';
import { useMemoizedGrid } from './useMemoizedGrid';
import { useDrawingTool } from './useDrawingTool';
import { useOnionSkinRenderer } from './useOnionSkinRenderer';
import { measureCanvasRender, finishCanvasRender } from '../utils/performance';
import { generateFrameHash } from '../utils/frameCache';
import { 
  setupTextRendering
} from '../utils/canvasTextRendering';
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
  const { canvasRef, pasteMode, panOffset, hoveredCell, fontMetrics } = useCanvasContext();
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
    cells,
    canvasBackgroundColor,
    showGrid,
    getCell
  } = useCanvasStore();

  const { activeTool, rectangleFilled, lassoSelection, magicWandSelection, textToolState, linePreview, isPlaybackMode } = useToolStore();
  const { previewData, isPreviewActive } = usePreviewStore();
  const { isPreviewActive: isEffectPreviewActive } = useEffectsStore();
  const { isPreviewActive: isTimeEffectPreviewActive } = useTimeEffectsStore();
  const { previewOrigin, previewDimensions } = useAsciiTypeStore();
  
  // PHASE 2: Frame caching for playback performance
  const { getCurrentFrame } = useAnimationStore();
  const { getCachedFrame, setCachedFrame } = useFrameCacheStore();
  
  // Debug: Log preview state changes
  useEffect(() => {
    console.log('[Canvas Renderer] Preview state changed:', {
      isPreviewActive,
      previewDataSize: previewData.size,
      isEffectPreviewActive,  
      isTimeEffectPreviewActive
    });
  }, [isPreviewActive, previewData, isEffectPreviewActive, isTimeEffectPreviewActive]);
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
    hoveredCell,
    pasteMode
  }), [moveState, selectionData, hoveredCell, pasteMode]);

  // Memoize font and style calculations
  const drawingStyles = useMemo(() => {
    // Scale font size with zoom - keep original logic
    const scaledFontSize = fontMetrics.fontSize * zoom;
    const scaledFontString = `${scaledFontSize}px '${fontMetrics.fontFamily}', monospace`;
    
    return {
      font: scaledFontString,
      gridLineColor: calculateAdaptiveGridColor(canvasBackgroundColor, theme),
      gridLineWidth: 1, // Use 1 pixel for crisp grid lines
      textAlign: 'center' as CanvasTextAlign,
      textBaseline: 'middle' as CanvasTextBaseline,
      defaultTextColor: '#FFFFFF',
      defaultBgColor: '#000000'
    };
  }, [fontMetrics, zoom, canvasBackgroundColor, theme]);

    // PHASE 1 OPTIMIZATION: Optimized drawCell function with pixel-aligned rendering
    // Font context is set once before the render loop, so we don't repeat it here
  // PHASE 2.75 OPTIMIZATION: Fast coordinate parser (avoids split + map overhead)
  const parseCoords = useCallback((key: string): [number, number] => {
    const commaIndex = key.indexOf(',');
    return [
      parseInt(key.substring(0, commaIndex), 10),
      parseInt(key.substring(commaIndex + 1), 10)
    ];
  }, []);

  // PHASE 2.5 OPTIMIZATION: Pre-calculate cell dimensions once
  const cellWidth = Math.round(effectiveCellWidth);
  const cellHeight = Math.round(effectiveCellHeight);
  const halfCellWidth = Math.round(cellWidth / 2);
  const halfCellHeight = Math.round(cellHeight / 2);

  const drawCell = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, cell: Cell) => {
    // PHASE 2.5 OPTIMIZATION: Reduce Math.round calls by pre-calculating base position
    const pixelX = Math.round(x * effectiveCellWidth + panOffset.x);
    const pixelY = Math.round(y * effectiveCellHeight + panOffset.y);

    // Draw background (only if different from canvas background)
    if (cell.bgColor && cell.bgColor !== 'transparent' && cell.bgColor !== canvasBackgroundColor) {
      ctx.fillStyle = cell.bgColor;
      ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
    }

    // Draw character with pixel-perfect positioning
    if (cell.char && cell.char !== ' ') {
      ctx.fillStyle = cell.color || drawingStyles.defaultTextColor;
      // Note: font, textAlign, textBaseline already set once before render loop (line ~252)
      
      // PHASE 2.5 OPTIMIZATION: Use pre-calculated half dimensions
      const centerX = pixelX + halfCellWidth;
      const centerY = pixelY + halfCellHeight;
      
      ctx.fillText(cell.char, centerX, centerY);
    }
  }, [effectiveCellWidth, effectiveCellHeight, panOffset, canvasBackgroundColor, drawingStyles, cellWidth, cellHeight, halfCellWidth, halfCellHeight]);

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

    // PHASE 2 OPTIMIZATION: Check frame cache during playback
    if (isPlaybackMode && !isPreviewActive && !isEffectPreviewActive && !isTimeEffectPreviewActive) {
      const currentFrame = getCurrentFrame();
      
      if (currentFrame && currentFrame.data) {
        // Generate hash of current frame data
        const frameHash = generateFrameHash(currentFrame.data);
        
        // Check cache
        const cachedCanvas = getCachedFrame(
          currentFrame.id,
          frameHash,
          { width: canvasConfig.canvasWidth, height: canvasConfig.canvasHeight },
          zoom
        );
        
        if (cachedCanvas) {
          // Cache hit! Copy cached frame to display canvas (super fast)
          // IMPORTANT: Reset transform before clearing to avoid scaling issues
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Copy the cached canvas at the correct scale
          // The cached canvas already has the correct high-DPI scaling applied
          ctx.drawImage(cachedCanvas, 0, 0, canvas.width, canvas.height);
          
          // Restore the device pixel ratio scaling for any future operations
          const devicePixelRatio = window.devicePixelRatio || 1;
          ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
          
          // Finish performance measurement
          const totalCells = width * height;
          finishCanvasRender(totalCells);
          return; // Skip full render
        }
        // Cache miss - continue with full render and cache the result at the end
      }
    }

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

    // PHASE 2.75 OPTIMIZATION: Skip grid and onion skins during playback
    if (!isPlaybackMode) {
      // Render grid background layer first (behind content)
      drawGridBackground(ctx);

      // Render onion skin layers (previous and next frames)
      renderOnionSkins();
    }

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

    // PHASE 1 OPTIMIZATION: Draw static cells (excluding cells being moved)
    // Skip drawing original cells if time effects preview is active (preview will render all cells)
    if (!isTimeEffectPreviewActive) {
      // PHASE 2.5 OPTIMIZATION: Batch cells by background color to reduce context switches
      const bgColorBatches = new Map<string, Array<{ x: number; y: number; cell: Cell }>>();
      const noBgCells: Array<{ x: number; y: number; cell: Cell }> = [];
      
      // Group cells by background color
      cells.forEach((cell, key) => {
        if (movingCells.has(key)) {
          // Draw empty cell in original position during move
          const [x, y] = parseCoords(key);
          noBgCells.push({ x, y, cell: { 
            char: ' ', 
            color: drawingStyles.defaultTextColor, 
            bgColor: drawingStyles.defaultBgColor 
          }});
        } else {
          // Cell exists and is not being moved - group by bg color
          const [x, y] = parseCoords(key);
          
          if (cell.bgColor && cell.bgColor !== 'transparent' && cell.bgColor !== canvasBackgroundColor) {
            if (!bgColorBatches.has(cell.bgColor)) {
              bgColorBatches.set(cell.bgColor, []);
            }
            bgColorBatches.get(cell.bgColor)!.push({ x, y, cell });
          } else {
            noBgCells.push({ x, y, cell });
          }
        }
      });
      
      // PHASE 2.5 OPTIMIZATION: Draw all backgrounds first, batched by color
      bgColorBatches.forEach((batch, bgColor) => {
        ctx.fillStyle = bgColor;
        batch.forEach(({ x, y }) => {
          const pixelX = Math.round(x * effectiveCellWidth + panOffset.x);
          const pixelY = Math.round(y * effectiveCellHeight + panOffset.y);
          ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
        });
      });
      
      // PHASE 2.5 OPTIMIZATION: Draw all text second, batched by color
      const textColorBatches = new Map<string, Array<{ x: number; y: number; char: string }>>();
      
      // Collect all cells with text
      [...bgColorBatches.values()].flat().concat(noBgCells).forEach(({ x, y, cell }) => {
        if (cell.char && cell.char !== ' ') {
          const color = cell.color || drawingStyles.defaultTextColor;
          if (!textColorBatches.has(color)) {
            textColorBatches.set(color, []);
          }
          textColorBatches.get(color)!.push({ x, y, char: cell.char });
        }
      });
      
      // Draw all text batched by color
      textColorBatches.forEach((batch, color) => {
        ctx.fillStyle = color;
        batch.forEach(({ x, y, char }) => {
          const pixelX = Math.round(x * effectiveCellWidth + panOffset.x);
          const pixelY = Math.round(y * effectiveCellHeight + panOffset.y);
          const centerX = pixelX + halfCellWidth;
          const centerY = pixelY + halfCellHeight;
          ctx.fillText(char, centerX, centerY);
        });
      });
    }

    // Draw moved cells at their new positions
    if (overlayState.moveState && overlayState.moveState.originalData.size > 0) {
      const totalOffset = getTotalOffset(overlayState.moveState);
      
      // PHASE 2.5 OPTIMIZATION: Batch moved cells by color too
      const movedBgBatches = new Map<string, Array<{ x: number; y: number }>>();
      const movedTextBatches = new Map<string, Array<{ x: number; y: number; char: string }>>();
      
      overlayState.moveState.originalData.forEach((cell: Cell, key: string) => {
        const [origX, origY] = parseCoords(key);
        const newX = origX + totalOffset.x;
        const newY = origY + totalOffset.y;
        
        // Only process if within bounds
        if (newX >= 0 && newX < canvasConfig.width && newY >= 0 && newY < canvasConfig.height) {
          // Batch backgrounds
          if (cell.bgColor && cell.bgColor !== 'transparent' && cell.bgColor !== canvasBackgroundColor) {
            if (!movedBgBatches.has(cell.bgColor)) {
              movedBgBatches.set(cell.bgColor, []);
            }
            movedBgBatches.get(cell.bgColor)!.push({ x: newX, y: newY });
          }
          
          // Batch text
          if (cell.char && cell.char !== ' ') {
            const color = cell.color || drawingStyles.defaultTextColor;
            if (!movedTextBatches.has(color)) {
              movedTextBatches.set(color, []);
            }
            movedTextBatches.get(color)!.push({ x: newX, y: newY, char: cell.char });
          }
        }
      });
      
      // Draw batched backgrounds
      movedBgBatches.forEach((batch, bgColor) => {
        ctx.fillStyle = bgColor;
        batch.forEach(({ x, y }) => {
          const pixelX = Math.round(x * effectiveCellWidth + panOffset.x);
          const pixelY = Math.round(y * effectiveCellHeight + panOffset.y);
          ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
        });
      });
      
      // Draw batched text
      movedTextBatches.forEach((batch, color) => {
        ctx.fillStyle = color;
        batch.forEach(({ x, y, char }) => {
          const pixelX = Math.round(x * effectiveCellWidth + panOffset.x);
          const pixelY = Math.round(y * effectiveCellHeight + panOffset.y);
          const centerX = pixelX + halfCellWidth;
          const centerY = pixelY + halfCellHeight;
          ctx.fillText(char, centerX, centerY);
        });
      });
    }

    // PHASE 1 OPTIMIZATION: Skip overlays during playback for better performance
    if (!isPlaybackMode) {
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

    // Draw hover cell outline (subtle outline for current cell under cursor)
    if (hoveredCell && hoveredCell.x >= 0 && hoveredCell.x < width && hoveredCell.y >= 0 && hoveredCell.y < height) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'; // 50% opacity blue outline for screenshots
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(
        Math.round(hoveredCell.x * effectiveCellWidth + panOffset.x),
        Math.round(hoveredCell.y * effectiveCellHeight + panOffset.y),
        Math.round(effectiveCellWidth),
        Math.round(effectiveCellHeight)
      );
    }

    // Draw preview overlay 
    if (isPreviewActive && previewData.size > 0) {
      // Check if this is an effects preview (should be fully opaque) or other preview (semi-transparent)
      const isEffectsPreview = isEffectPreviewActive || isTimeEffectPreviewActive;
      const previewAlpha = isEffectsPreview ? 1.0 : 0.8; // Effects: full opacity, others: semi-transparent
      
      previewData.forEach((cell, key) => {
        const [x, y] = key.split(',').map(Number);
        
        // Only draw if within canvas bounds
        if (x >= 0 && x < canvasConfig.width && y >= 0 && y < canvasConfig.height) {
          ctx.save();
          ctx.globalAlpha = previewAlpha;
          
          // For effects previews, clear the cell area first to ensure complete replacement
          if (isEffectsPreview) {
            const pixelX = Math.round(x * effectiveCellWidth + panOffset.x);
            const pixelY = Math.round(y * effectiveCellHeight + panOffset.y);
            const cellWidth = Math.round(effectiveCellWidth);
            const cellHeight = Math.round(effectiveCellHeight);
            
            // Clear the cell area with canvas background
            ctx.fillStyle = canvasBackgroundColor;
            ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
          }
          
          drawCell(ctx, x, y, cell);
          
          ctx.restore();
        }
      });

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
    } // End: Skip overlays during playback

    // PHASE 2 OPTIMIZATION: Cache the rendered frame during playback
    if (isPlaybackMode && !isPreviewActive && !isEffectPreviewActive && !isTimeEffectPreviewActive) {
      const currentFrame = getCurrentFrame();
      
      if (currentFrame && currentFrame.data) {
        const frameHash = generateFrameHash(currentFrame.data);
        
        // Cache the rendered frame for future playback loops
        setCachedFrame(
          currentFrame.id,
          frameHash,
          canvas,
          { width: canvasConfig.canvasWidth, height: canvasConfig.canvasHeight },
          zoom
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
    cells, 
    getCell, 
    drawCell, 
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
    // PHASE 2: Frame caching dependencies
    isPlaybackMode,
    getCurrentFrame,
    getCachedFrame,
    setCachedFrame,
    zoom,
    width,
    height
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
  }, [canvasWidth, canvasHeight, renderCanvas]);

  return {
    renderCanvas,
    scheduleRender,
    triggerRender
  };
};
