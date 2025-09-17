import { saveAs } from 'file-saver';
import type { 
  ExportDataBundle, 
  PngExportSettings, 
  VideoExportSettings, 
  SessionExportSettings,
  ExportProgress 
} from '../types/export';
import type { Cell } from '../types';
import { setupTextRendering } from './canvasTextRendering';
import { calculateAdaptiveGridColor } from './gridColor';

/**
 * High-quality export renderer for ASCII Motion
 * Handles PNG, MP4, and Session exports with optimal quality settings
 */
export class ExportRenderer {
  private progressCallback?: (progress: ExportProgress) => void;

  constructor(progressCallback?: (progress: ExportProgress) => void) {
    this.progressCallback = progressCallback;
  }

  /**
   * Export current frame as PNG image
   */
  async exportPng(
    data: ExportDataBundle, 
    settings: PngExportSettings, 
    filename: string
  ): Promise<void> {
    this.updateProgress('Preparing PNG export...', 0);

    try {
      // Get current frame data
      const currentFrame = data.frames[data.currentFrameIndex]?.data || data.canvasData;
      console.log('PNG Export - Current frame index:', data.currentFrameIndex);
      console.log('PNG Export - Available frames:', data.frames.length);
      console.log('PNG Export - Canvas data size:', data.canvasData.size);
      console.log('PNG Export - Current frame data size:', currentFrame.size);
      console.log('PNG Export - Using frame data:', currentFrame === data.canvasData ? 'canvas data' : 'frame data');
      
      // Create high-resolution canvas for export
      const exportCanvas = this.createExportCanvas(
        data.canvasDimensions.width,
        data.canvasDimensions.height,
        settings.sizeMultiplier,
        data.fontMetrics
      );

      this.updateProgress('Rendering canvas...', 30);

      // Render the frame
      await this.renderFrame(
        exportCanvas.canvas,
        currentFrame,
        data.canvasDimensions.width,
        data.canvasDimensions.height,
        {
          backgroundColor: data.canvasBackgroundColor,
          showGrid: settings.includeGrid && data.showGrid,
          fontMetrics: data.fontMetrics,
          sizeMultiplier: settings.sizeMultiplier,
          theme: data.uiState.theme
        }
      );

      this.updateProgress('Converting to PNG...', 70);

      // Convert to blob and download
      const blob = await this.canvasToBlob(exportCanvas.canvas, 'image/png');
      
      this.updateProgress('Saving file...', 90);
      
      saveAs(blob, `${filename}.png`);
      
      this.updateProgress('Export complete!', 100);
    } catch (error) {
      console.error('PNG export failed:', error);
      throw new Error(`PNG export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export animation as MP4 video
   */
  async exportMp4(
    data: ExportDataBundle, 
    _settings: VideoExportSettings, 
    _filename: string
  ): Promise<void> {
    this.updateProgress('Preparing MP4 export...', 0);

    try {
      // Check if we have frames to export
      if (data.frames.length === 0) {
        throw new Error('No frames to export');
      }

      this.updateProgress('Setting up video encoder...', 10);

      // For now, we'll create a simple implementation
      // In a full implementation, you'd use FFmpeg.js or similar
      throw new Error('MP4 export not yet implemented - requires FFmpeg integration');
      
    } catch (error) {
      console.error('MP4 export failed:', error);
      throw error;
    }
  }

  /**
   * Export complete session as JSON file
   */
  async exportSession(
    data: ExportDataBundle, 
    settings: SessionExportSettings, 
    filename: string
  ): Promise<void> {
    this.updateProgress('Preparing session export...', 0);

    try {
      this.updateProgress('Serializing data...', 30);

      // Create session data structure
      const sessionData = {
        version: '1.0.0',
        metadata: settings.includeMetadata ? {
          exportedAt: new Date().toISOString(),
          exportVersion: '1.0.0',
          userAgent: navigator.userAgent
        } : undefined,
        canvas: {
          width: data.canvasDimensions.width,
          height: data.canvasDimensions.height,
          canvasBackgroundColor: data.canvasBackgroundColor,
          showGrid: data.showGrid
        },
        animation: {
          frames: data.frames.map(frame => ({
            id: frame.id,
            name: frame.name,
            duration: frame.duration,
            data: Object.fromEntries(frame.data.entries())
          })),
          currentFrameIndex: data.currentFrameIndex,
          frameRate: data.frameRate,
          looping: data.looping
        },
        tools: {
          activeTool: data.toolState.activeTool,
          selectedCharacter: data.toolState.selectedCharacter,
          selectedColor: data.toolState.selectedColor,
          selectedBgColor: data.toolState.selectedBgColor,
          paintBucketContiguous: data.toolState.paintBucketContiguous,
          rectangleFilled: data.toolState.rectangleFilled
        },
        ui: {
          theme: data.uiState.theme,
          zoom: data.uiState.zoom,
          panOffset: data.uiState.panOffset,
          fontMetrics: data.fontMetrics
        }
      };

      this.updateProgress('Converting to JSON...', 70);

      // Convert to JSON string
      const jsonString = JSON.stringify(sessionData, null, 2);
      
      this.updateProgress('Creating file...', 90);

      // Create blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      saveAs(blob, `${filename}.asciimtn`);
      
      this.updateProgress('Export complete!', 100);
    } catch (error) {
      console.error('Session export failed:', error);
      throw new Error(`Session export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a high-resolution canvas for export
   */
  private createExportCanvas(
    gridWidth: number,
    gridHeight: number,
    sizeMultiplier: number,
    fontMetrics: any
  ): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    console.log('Creating export canvas with:', {
      gridWidth,
      gridHeight,
      sizeMultiplier,
      fontMetrics
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    // Calculate cell dimensions based on font metrics
    // Use correct property names from FontMetrics interface
    const cellWidth = (fontMetrics?.characterWidth || 12) * sizeMultiplier;
    const cellHeight = (fontMetrics?.characterHeight || 16) * sizeMultiplier;
    
    console.log('Calculated cell dimensions:', { cellWidth, cellHeight });
    
    // Set canvas size with minimum dimensions
    const canvasWidth = Math.max(gridWidth * cellWidth, 1);
    const canvasHeight = Math.max(gridHeight * cellHeight, 1);
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    console.log('Canvas dimensions set to:', { width: canvas.width, height: canvas.height });
    
    // Setup high-quality rendering
    setupTextRendering(ctx);
    
    return { canvas, ctx };
  }

  /**
   * Render a single frame to canvas
   */
  private async renderFrame(
    canvas: HTMLCanvasElement,
    frameData: Map<string, Cell>,
    gridWidth: number,
    gridHeight: number,
    options: {
      backgroundColor: string;
      showGrid: boolean;
      fontMetrics: any;
      sizeMultiplier: number;
      theme: string;
    }
  ): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');

    const { backgroundColor, showGrid, fontMetrics, sizeMultiplier, theme } = options;
    
    // Calculate cell dimensions
    const cellWidth = fontMetrics.characterWidth * sizeMultiplier;
    const cellHeight = fontMetrics.characterHeight * sizeMultiplier;
    
    // Clear canvas with background color
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid if enabled
    if (showGrid) {
      this.drawGrid(ctx, gridWidth, gridHeight, cellWidth, cellHeight, backgroundColor, theme);
    }
    
    // Setup font for text rendering
    const fontSize = fontMetrics.fontSize * sizeMultiplier;
    ctx.font = `${fontSize}px '${fontMetrics.fontFamily}', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw all cells
    console.log('Frame data for rendering:', frameData);
    console.log('Frame data size:', frameData.size);
    
    frameData.forEach((cell, key) => {
      const [x, y] = key.split(',').map(Number);
      console.log(`Drawing cell at ${x},${y}:`, cell);
      this.drawExportCell(ctx, x, y, cell, cellWidth, cellHeight);
    });
  }

  /**
   * Draw grid lines for export
   */
  private drawGrid(
    ctx: CanvasRenderingContext2D,
    gridWidth: number,
    gridHeight: number,
    cellWidth: number,
    cellHeight: number,
    backgroundColor: string,
    theme: string
  ): void {
    const gridColor = calculateAdaptiveGridColor(backgroundColor, theme as 'light' | 'dark');
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    
    // Vertical lines
    for (let x = 0; x <= gridWidth; x++) {
      const xPos = x * cellWidth;
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, gridHeight * cellHeight);
    }
    
    // Horizontal lines
    for (let y = 0; y <= gridHeight; y++) {
      const yPos = y * cellHeight;
      ctx.moveTo(0, yPos);
      ctx.lineTo(gridWidth * cellWidth, yPos);
    }
    
    ctx.stroke();
  }

  /**
   * Draw a single cell for export
   */
  private drawExportCell(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    cell: Cell,
    cellWidth: number,
    cellHeight: number
  ): void {
    const pixelX = x * cellWidth;
    const pixelY = y * cellHeight;
    
    console.log(`Drawing cell at pixel position ${pixelX},${pixelY} with dimensions ${cellWidth}x${cellHeight}`);
    console.log('Cell data:', cell);
    
    // Draw background if specified
    if (cell.bgColor && cell.bgColor !== 'transparent') {
      console.log(`Drawing background color ${cell.bgColor}`);
      ctx.fillStyle = cell.bgColor;
      ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
    }
    
    // Draw character
    if (cell.char && cell.char.trim()) {
      console.log(`Drawing character "${cell.char}" with color ${cell.color}`);
      ctx.fillStyle = cell.color || '#FFFFFF';
      ctx.fillText(
        cell.char,
        pixelX + cellWidth / 2,
        pixelY + cellHeight / 2
      );
    } else {
      console.log('No character to draw:', { char: cell.char, trimmed: cell.char?.trim() });
    }
  }

  /**
   * Convert canvas to blob
   */
  private canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
    console.log('Converting canvas to blob. Canvas dimensions:', {
      width: canvas.width,
      height: canvas.height,
      area: canvas.width * canvas.height,
      type
    });

    // Check if canvas has valid dimensions
    if (canvas.width <= 0 || canvas.height <= 0) {
      throw new Error(`Invalid canvas dimensions: ${canvas.width}x${canvas.height}`);
    }

    // Check if canvas is too large (some browsers have limits)
    const maxDimension = 32767; // Common browser limit
    if (canvas.width > maxDimension || canvas.height > maxDimension) {
      throw new Error(`Canvas dimensions too large: ${canvas.width}x${canvas.height}. Max: ${maxDimension}x${maxDimension}`);
    }

    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('Successfully created blob:', blob.size, 'bytes');
            resolve(blob);
          } else {
            console.error('toBlob returned null. Canvas state:', {
              width: canvas.width,
              height: canvas.height,
              context: canvas.getContext('2d') ? 'available' : 'null'
            });
            reject(new Error('Failed to create blob from canvas - toBlob returned null'));
          }
        }, type);
      } catch (error) {
        console.error('Error in toBlob call:', error);
        reject(new Error(`Canvas toBlob failed: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  }

  /**
   * Update export progress
   */
  private updateProgress(message: string, percentage: number): void {
    if (this.progressCallback) {
      this.progressCallback({
        message,
        progress: percentage,
        stage: percentage < 100 ? 'processing' : 'complete'
      });
    }
  }
}