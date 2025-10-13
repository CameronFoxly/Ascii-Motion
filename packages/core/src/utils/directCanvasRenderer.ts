import type { Frame, Cell } from '../types';
import { useCanvasStore } from '../stores/canvasStore';
import { setupTextRendering } from './canvasTextRendering';
import { calculateAdaptiveGridColor } from './gridColor';

/**
 * Direct canvas renderer for optimized playback
 * Bypasses React component pipeline and renders frames directly to canvas
 * Reuses existing optimized rendering logic without triggering component re-renders
 */

export interface DirectRenderSettings {
  effectiveCellWidth: number;
  effectiveCellHeight: number;
  panOffset: { x: number; y: number };
  fontMetrics: { fontSize: number; fontFamily: string };
  zoom: number;
  theme: 'light' | 'dark';
  showGrid?: boolean;
}

/**
 * Get current canvas settings without subscribing to state changes
 * This avoids triggering React re-renders during playback
 */
const getCanvasSettings = () => {
  const canvasState = useCanvasStore.getState();
  
  return {
    width: canvasState.width,
    height: canvasState.height,
    canvasBackgroundColor: canvasState.canvasBackgroundColor,
    showGrid: canvasState.showGrid,
  };
};

/**
 * Optimized drawCell function for direct canvas rendering
 * Reuses the same logic as useCanvasRenderer but without React hooks
 */
const drawCellDirect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: Cell,
  settings: {
    effectiveCellWidth: number;
    effectiveCellHeight: number;
    panOffset: { x: number; y: number };
    canvasBackgroundColor: string;
    font: string;
    defaultTextColor: string;
  }
) => {
  // Round pixel positions to ensure crisp rendering
  const pixelX = Math.round(x * settings.effectiveCellWidth + settings.panOffset.x);
  const pixelY = Math.round(y * settings.effectiveCellHeight + settings.panOffset.y);
  const cellWidth = Math.round(settings.effectiveCellWidth);
  const cellHeight = Math.round(settings.effectiveCellHeight);

  // Draw background (only if different from canvas background)
  if (cell.bgColor && cell.bgColor !== 'transparent' && cell.bgColor !== settings.canvasBackgroundColor) {
    ctx.fillStyle = cell.bgColor;
    ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
  }

  // Draw character with pixel-perfect positioning
  if (cell.char && cell.char !== ' ') {
    ctx.fillStyle = cell.color || settings.defaultTextColor;
    ctx.font = settings.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Center text with rounded positions for crisp rendering
    const centerX = Math.round(pixelX + cellWidth / 2);
    const centerY = Math.round(pixelY + cellHeight / 2);
    
    ctx.fillText(cell.char, centerX, centerY);
  }
};

/**
 * Main direct frame rendering function
 * This is called from the optimized playback loop to render frames directly
 */
export const renderFrameDirectly = (
  frame: Frame,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  renderSettings?: {
    effectiveCellWidth: number;
    effectiveCellHeight: number;
    panOffset: { x: number; y: number };
    fontMetrics: { fontSize: number; fontFamily: string };
    zoom: number;
    theme: string;
  }
) => {
  const canvas = canvasRef.current;
  if (!canvas) {
    return;
  }
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  
  // Get current canvas settings
  const canvasSettings = getCanvasSettings();
  
  // Use provided render settings or calculate defaults
  const settings = renderSettings || {
    effectiveCellWidth: 18,
    effectiveCellHeight: 18,
    panOffset: { x: 0, y: 0 },
    fontMetrics: { fontSize: 16, fontFamily: 'SF Mono, Monaco, Consolas, monospace' },
    zoom: 1,
    theme: 'dark',
  };
  
  // Calculate drawing styles (similar to useCanvasRenderer)
  const scaledFontSize = settings.fontMetrics.fontSize * settings.zoom;
  const fontString = `${scaledFontSize}px '${settings.fontMetrics.fontFamily}', monospace`;
  const gridLineColor = calculateAdaptiveGridColor(canvasSettings.canvasBackgroundColor, settings.theme as 'light' | 'dark');
  
  const drawingSettings = {
    effectiveCellWidth: settings.effectiveCellWidth,
    effectiveCellHeight: settings.effectiveCellHeight,
    panOffset: settings.panOffset,
    canvasBackgroundColor: canvasSettings.canvasBackgroundColor,
    font: fontString,
    defaultTextColor: '#FFFFFF',
  };

  // Apply text rendering optimizations
  setupTextRendering(ctx);

  // Clear canvas and fill with background color
  if (canvasSettings.canvasBackgroundColor === 'transparent') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = canvasSettings.canvasBackgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Draw grid background if enabled (optional for playback)
  if (canvasSettings.showGrid) {
    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = 1;
    
    // Draw vertical lines
    for (let x = 0; x <= canvasSettings.width; x++) {
      const lineX = Math.round(x * settings.effectiveCellWidth + settings.panOffset.x) + 0.5;
      ctx.beginPath();
      ctx.moveTo(lineX, settings.panOffset.y);
      ctx.lineTo(lineX, canvasSettings.height * settings.effectiveCellHeight + settings.panOffset.y);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= canvasSettings.height; y++) {
      const lineY = Math.round(y * settings.effectiveCellHeight + settings.panOffset.y) + 0.5;
      ctx.beginPath();
      ctx.moveTo(settings.panOffset.x, lineY);
      ctx.lineTo(canvasSettings.width * settings.effectiveCellWidth + settings.panOffset.x, lineY);
      ctx.stroke();
    }
  }

  // Set font context once for the entire render
  ctx.font = fontString;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Render all cells in the frame
  frame.data.forEach((cell, key) => {
    const [x, y] = key.split(',').map(Number);
    
    // Only render cells within canvas bounds
    if (x >= 0 && x < canvasSettings.width && y >= 0 && y < canvasSettings.height) {
      drawCellDirect(ctx, x, y, cell, drawingSettings);
    }
  });
  
};