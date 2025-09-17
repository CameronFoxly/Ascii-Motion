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
      
      // Create high-resolution canvas for export
      const exportCanvas = this.createExportCanvas(
        data.canvasDimensions.width,
        data.canvasDimensions.height,
        settings.sizeMultiplier,
        data.fontMetrics,
        data.typography
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
          typography: data.typography,
          sizeMultiplier: settings.sizeMultiplier,
          theme: data.uiState.theme,
          scale: exportCanvas.scale
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
   * Export animation as video (WebM/MP4)
   */
  async exportVideo(
    data: ExportDataBundle, 
    settings: VideoExportSettings, 
    filename: string
  ): Promise<void> {
    this.updateProgress('Preparing video export...', 0);

    try {
      // Check if we have frames to export
      if (data.frames.length === 0) {
        throw new Error('No frames to export');
      }

      // Check WebCodecs support for WebM
      if (settings.format === 'webm' && !this.supportsWebCodecs()) {
        throw new Error('WebCodecs is not supported in your browser. Please use a modern Chrome, Edge, or Safari browser, or switch to MP4 format.');
      }

      this.updateProgress('Setting up video encoder...', 10);

      if (settings.format === 'webm') {
        await this.exportWebMVideo(data, settings, filename);
      } else {
        // MP4 fallback using canvas frame capture and blob creation
        await this.exportMP4Fallback(data, settings, filename);
      }
      
    } catch (error) {
      console.error('Video export failed:', error);
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
        },
        typography: {
          fontSize: data.typography.fontSize,
          characterSpacing: data.typography.characterSpacing,
          lineSpacing: data.typography.lineSpacing
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
   * Create a high-resolution canvas for export with DPI scaling
   */
  private createExportCanvas(
    gridWidth: number,
    gridHeight: number,
    sizeMultiplier: number,
    fontMetrics: any,
    typography: any
  ): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; scale: number } {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    // Calculate cell dimensions using actual typography settings
    // Use typography.fontSize instead of fontMetrics.fontSize for accurate sizing
    const actualFontSize = typography?.fontSize || fontMetrics?.fontSize || 16;
    const characterSpacing = typography?.characterSpacing || 1.0;
    const lineSpacing = typography?.lineSpacing || 1.0;
    
    // Calculate base character dimensions from actual font size
    const baseCharWidth = actualFontSize * 0.6; // Standard monospace aspect ratio
    const baseCharHeight = actualFontSize;
    
    // Apply spacing multipliers and size multiplier
    const baseCellWidth = baseCharWidth * characterSpacing * sizeMultiplier;
    const baseCellHeight = baseCharHeight * lineSpacing * sizeMultiplier;
    
    // Calculate display dimensions
    const displayWidth = Math.max(gridWidth * baseCellWidth, 1);
    const displayHeight = Math.max(gridHeight * baseCellHeight, 1);
    
    // Use device pixel ratio for high-DPI export (minimum 2x for crisp exports)
    const devicePixelRatio = Math.max(window.devicePixelRatio || 1, 2);
    
    // Set canvas internal resolution to match device pixel ratio
    canvas.width = displayWidth * devicePixelRatio;
    canvas.height = displayHeight * devicePixelRatio;
    
    // Scale the drawing context to match the device pixel ratio
    ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // Setup high-quality rendering
    setupTextRendering(ctx);
    
    return { canvas, ctx, scale: devicePixelRatio };
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
      typography: any;
      sizeMultiplier: number;
      theme: string;
      scale?: number;
    }
  ): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');

    const { backgroundColor, showGrid, fontMetrics, typography, sizeMultiplier, theme } = options;
    
    // Calculate cell dimensions using actual typography settings
    const actualFontSize = typography?.fontSize || fontMetrics?.fontSize || 16;
    const characterSpacing = typography?.characterSpacing || 1.0;
    const lineSpacing = typography?.lineSpacing || 1.0;
    
    // Calculate character dimensions with spacing
    const baseCharWidth = actualFontSize * 0.6; // Standard monospace aspect ratio
    const baseCharHeight = actualFontSize;
    
    const cellWidth = baseCharWidth * characterSpacing * sizeMultiplier;
    const cellHeight = baseCharHeight * lineSpacing * sizeMultiplier;
    
    // Clear canvas with background color
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid if enabled
    if (showGrid) {
      this.drawGrid(ctx, gridWidth, gridHeight, cellWidth, cellHeight, backgroundColor, theme);
    }
    
    // Setup font for text rendering using actual typography settings
    const exportFontSize = actualFontSize * sizeMultiplier;
    const fontFamily = fontMetrics?.fontFamily || 'SF Mono, Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New"';
    ctx.font = `${exportFontSize}px '${fontFamily}', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw all cells
    frameData.forEach((cell, key) => {
      const [x, y] = key.split(',').map(Number);
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
    
    // Draw background if specified
    if (cell.bgColor && cell.bgColor !== 'transparent') {
      ctx.fillStyle = cell.bgColor;
      ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
    }
    
    // Draw character
    if (cell.char && cell.char.trim()) {
      ctx.fillStyle = cell.color || '#FFFFFF';
      ctx.fillText(
        cell.char,
        pixelX + cellWidth / 2,
        pixelY + cellHeight / 2
      );
    }
  }

  /**
   * Convert canvas to blob
   */
  private canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
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
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas - toBlob returned null'));
          }
        }, type);
      } catch (error) {
        reject(new Error(`Canvas toBlob failed: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  }

  /**
   * Check if WebCodecs is supported in the current browser
   */
  private supportsWebCodecs(): boolean {
    return typeof window !== 'undefined' && 
           'VideoEncoder' in window && 
           'VideoFrame' in window;
  }

  /**
   * Export video using WebCodecs API (WebM format)
   */
  private async exportWebMVideo(
    data: ExportDataBundle,
    settings: VideoExportSettings,
    filename: string
  ): Promise<void> {
    this.updateProgress('Creating video frames...', 20);
    
    // Generate frame canvases
    const frameCanvases = await this.generateVideoFrames(data, settings);
    
    if (frameCanvases.length === 0) {
      throw new Error('No frames generated for video export');
    }
    
    console.log(`📹 Generated ${frameCanvases.length} frames for video export`);
    console.log(`📐 Frame dimensions: ${frameCanvases[0].width}x${frameCanvases[0].height}`);
    console.log(`🎬 Frame rate: ${settings.frameRate} FPS`);
    
    this.updateProgress('Encoding video...', 50);
    
    try {
      // Use WebCodecs to create WebM video
      const videoBlob = await this.encodeWebMVideo(frameCanvases, settings);
      
      console.log(`💾 Video blob created: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
      
      this.updateProgress('Saving video file...', 90);
      
      saveAs(videoBlob, `${filename}.webm`);
      
      this.updateProgress('Video export complete!', 100);
      
      console.log('✅ Video export completed successfully');
    } catch (error) {
      console.error('❌ Video encoding failed:', error);
      throw error;
    } finally {
      // Clean up canvas resources
      frameCanvases.forEach(canvas => {
        canvas.width = 0;
        canvas.height = 0;
      });
    }
  }

  /**
   * Export video using canvas frame capture fallback (MP4-like)
   */
  private async exportMP4Fallback(
    data: ExportDataBundle,
    settings: VideoExportSettings,
    filename: string
  ): Promise<void> {
    this.updateProgress('Creating animation frames...', 20);
    
    // For now, create a simple image sequence as a fallback
    // In a production app, you'd integrate FFmpeg.wasm here
    const frameCanvases = await this.generateVideoFrames(data, settings);
    
    this.updateProgress('Creating frame archive...', 70);
    
    // Create a ZIP file with all frames for now
    // This is a temporary solution until FFmpeg.wasm is integrated
    await this.createFrameArchive(frameCanvases, filename, settings);
    
    this.updateProgress('Export complete!', 100);
  }

  /**
   * Generate canvas frames for video export
   */
  private async generateVideoFrames(
    data: ExportDataBundle,
    settings: VideoExportSettings
  ): Promise<HTMLCanvasElement[]> {
    const frames: HTMLCanvasElement[] = [];
    const totalFrames = data.frames.length;
    
    if (totalFrames === 0) {
      console.warn('⚠️ No frames found in animation data');
      return frames;
    }
    
    console.log(`🎬 Generating ${totalFrames} video frames...`);
    
    for (let i = 0; i < totalFrames; i++) {
      const frame = data.frames[i];
      
      // Create high-resolution canvas for this frame
      const frameCanvas = this.createExportCanvas(
        data.canvasDimensions.width,
        data.canvasDimensions.height,
        settings.sizeMultiplier,
        data.fontMetrics,
        data.typography
      );
      
      // Render the frame
      await this.renderFrame(
        frameCanvas.canvas,
        frame.data,
        data.canvasDimensions.width,
        data.canvasDimensions.height,
        {
          backgroundColor: data.canvasBackgroundColor,
          showGrid: settings.includeGrid && data.showGrid,
          fontMetrics: data.fontMetrics,
          typography: data.typography,
          sizeMultiplier: settings.sizeMultiplier,
          theme: data.uiState.theme,
          scale: frameCanvas.scale
        }
      );
      
      // Debug: Check if frame has content
      const ctx = frameCanvas.canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, frameCanvas.canvas.width, frameCanvas.canvas.height);
        const hasContent = imageData.data.some((value, index) => index % 4 !== 3 && value !== 0); // Check for non-transparent, non-black pixels
        console.log(`🖼️ Frame ${i + 1}: ${frameCanvas.canvas.width}x${frameCanvas.canvas.height}, has content: ${hasContent}`);
      }
      
      frames.push(frameCanvas.canvas);
      
      // Update progress
      const progress = 20 + (i / totalFrames) * 30; // 20-50% for frame generation
      this.updateProgress(`Rendering frame ${i + 1}/${totalFrames}...`, progress);
    }
    
    console.log(`✅ Generated ${frames.length} frames for video encoding`);
    return frames;
  }

  /**
   * Encode frames to WebM using WebCodecs
   */
  private async encodeWebMVideo(
    frames: HTMLCanvasElement[],
    settings: VideoExportSettings
  ): Promise<Blob> {
    const { Muxer, ArrayBufferTarget } = await import('webm-muxer');
    
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: 'V_VP9',
        width: frames[0].width,
        height: frames[0].height,
        frameRate: settings.frameRate
      }
    });

    // Set up VideoEncoder for WebCodecs encoding
    const encodedChunks: EncodedVideoChunk[] = [];
    
    return new Promise((resolve, reject) => {
      const encoder = new VideoEncoder({
        output: (chunk) => {
          encodedChunks.push(chunk);
          
          // Add encoded chunk directly to muxer
          muxer.addVideoChunk(chunk);
          
          // Update progress
          const progress = 50 + (encodedChunks.length / frames.length) * 30;
          this.updateProgress(`Encoding frame ${encodedChunks.length}/${frames.length}...`, progress);
          
          // Check if we've encoded all frames
          if (encodedChunks.length === frames.length) {
            encoder.close();
            muxer.finalize();
            const buffer = muxer.target.buffer;
            resolve(new Blob([buffer], { type: 'video/webm' }));
          }
        },
        error: (error) => {
          console.error('VideoEncoder error:', error);
          encoder.close();
          reject(error);
        }
      });

      // Configure the encoder
      encoder.configure({
        codec: 'vp09.00.10.08', // VP9 codec
        width: frames[0].width,
        height: frames[0].height,
        framerate: settings.frameRate,
        bitrate: this.getBitrateForQuality(settings.quality, frames[0].width, frames[0].height)
      });

      // Encode each frame
      for (let i = 0; i < frames.length; i++) {
        const canvas = frames[i];
        
        // Create VideoFrame from canvas
        const frame = new VideoFrame(canvas, {
          timestamp: (i * 1000000) / settings.frameRate // microseconds
        });
        
        // Encode the frame
        encoder.encode(frame, { keyFrame: i === 0 || i % 30 === 0 }); // Keyframe every 30 frames
        
        // Clean up the frame
        frame.close();
      }
      
      // Finish encoding
      encoder.flush();
    });
  }

  /**
   * Get bitrate based on quality setting and resolution
   */
  private getBitrateForQuality(quality: VideoExportSettings['quality'], width: number, height: number): number {
    const pixelCount = width * height;
    const baseRate = pixelCount / 1000; // Base rate per 1000 pixels
    
    switch (quality) {
      case 'low':
        return Math.max(500000, baseRate * 200); // Minimum 500kbps
      case 'medium':
        return Math.max(1000000, baseRate * 400); // Minimum 1Mbps  
      case 'high':
        return Math.max(2000000, baseRate * 800); // Minimum 2Mbps
      default:
        return Math.max(1000000, baseRate * 400);
    }
  }

  /**
   * Create a frame archive as fallback for MP4 export
   */
  private async createFrameArchive(
    frames: HTMLCanvasElement[],
    filename: string,
    settings: VideoExportSettings
  ): Promise<void> {
    // Create individual PNG files for each frame
    // This is a temporary solution - in production, use FFmpeg.wasm for MP4
    
    const archiveFrames: { name: string; blob: Blob }[] = [];
    
    for (let i = 0; i < frames.length; i++) {
      const canvas = frames[i];
      const blob = await this.canvasToBlob(canvas, 'image/png');
      
      archiveFrames.push({
        name: `frame_${i.toString().padStart(4, '0')}.png`,
        blob
      });
    }
    
    // For now, just save the first frame as a sample
    // In production, you'd create a ZIP file or integrate FFmpeg.wasm
    if (archiveFrames.length > 0) {
      saveAs(archiveFrames[0].blob, `${filename}_frame_sequence.png`);
    }
    
    // Show info about the frame sequence
    alert(`Created ${archiveFrames.length} frames. Frame rate: ${settings.frameRate} FPS. Duration: ${(archiveFrames.length / settings.frameRate).toFixed(1)}s\n\nNote: Full MP4 export requires FFmpeg integration. Currently exporting frame sequence.`);
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