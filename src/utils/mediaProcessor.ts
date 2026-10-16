/**
 * MediaProcessor - Core utility for processing image and video files for ASCII conversion
 * 
 * Handles:
 * - File loading and validation
 * - Image/video frame extraction
 * - Basic image processing operations (resize, crop)
 * - Canvas conversion for ASCII processing
 * - Error handling for unsupported formats
 */

import * as MP4Box from 'mp4box';
import type { MP4File, MP4Info } from 'mp4box';

type Mp4ArrayBuffer = ArrayBuffer & { fileStart?: number };

export interface MediaFile {
  file: File;
  type: 'image' | 'video';
  name: string;
  size: number;
  duration?: number; // For video files
  frameCount?: number; // For video files
}

export interface ProcessingOptions {
  // Size controls
  targetWidth: number;  // Character width
  targetHeight: number; // Character height
  
  // Basic processing options
  maintainAspectRatio: boolean;
  cropMode: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  // Quality settings
  quality: 'high' | 'medium' | 'low';
  
  // Auto mode: output image at higher resolution (multiple pixels per cell)
  // When set, the output canvas will be targetWidth * pixelsPerCellX by targetHeight * pixelsPerCellY
  pixelsPerCellX?: number;
  pixelsPerCellY?: number;

  // Video sampling window (MCP bridge import). Omitted = every frame of the whole clip at the detected rate.
  videoWindow?: {
    startTime?: number;  // seconds
    duration?: number;   // seconds
    frameRate?: number;  // sampling rate in fps (also sets each frame's duration)
    maxFrames?: number;
  };
}

export interface ProcessedFrame {
  canvas: HTMLCanvasElement;
  imageData: ImageData;
  timestamp?: number; // For video frames
  frameIndex?: number; // For video frames
  frameDuration?: number; // Duration in milliseconds (for video frames)
}

export interface ProcessingResult {
  success: boolean;
  frames: ProcessedFrame[];
  metadata: {
    originalWidth: number;
    originalHeight: number;
    processedWidth: number;
    processedHeight: number;
    frameCount: number;
    duration?: number;
    frameRate?: number; // Original video frame rate
  };
  error?: string;
}

/**
 * Supported file formats for import
 */
export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/bmp',
  'image/webp',
  'image/svg+xml'
];

export const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/avi',
  'video/mov',
  'video/quicktime', // MOV files typically use this MIME type
  'video/wmv'
];

export const ALL_SUPPORTED_FORMATS = [
  ...SUPPORTED_IMAGE_FORMATS,
  ...SUPPORTED_VIDEO_FORMATS
];

export class MediaProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create canvas context for media processing');
    }
    this.ctx = ctx;
  }

  /**
   * Validate and classify uploaded file
   */
  validateFile(file: File): MediaFile | null {
    const isImage = SUPPORTED_IMAGE_FORMATS.includes(file.type);
    const isVideo = SUPPORTED_VIDEO_FORMATS.includes(file.type);
    
    if (!isImage && !isVideo) {
      return null;
    }

    return {
      file,
      type: isImage ? 'image' : 'video',
      name: file.name,
      size: file.size
    };
  }

  /**
   * Process image file and convert to canvas frames
   */
  async processImage(mediaFile: MediaFile, options: ProcessingOptions): Promise<ProcessingResult> {
    try {
      const img = await this.loadImage(mediaFile.file);
      const processedFrame = this.processImageToCanvas(img, options);
      
      return {
        success: true,
        frames: [processedFrame],
        metadata: {
          originalWidth: img.width,
          originalHeight: img.height,
          processedWidth: processedFrame.canvas.width,
          processedHeight: processedFrame.canvas.height,
          frameCount: 1
        }
      };
    } catch (error) {
      return {
        success: false,
        frames: [],
        metadata: {
          originalWidth: 0,
          originalHeight: 0,
          processedWidth: 0,
          processedHeight: 0,
          frameCount: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error processing image'
      };
    }
  }

  /**
   * Process video file and extract frames
   */
  async processVideo(mediaFile: MediaFile, options: ProcessingOptions): Promise<ProcessingResult> {
    try {
      const video = await this.loadVideo(mediaFile.file);
      const { frames, detectedFrameRate } = await this.extractVideoFrames(video, options, mediaFile.file);
      
      return {
        success: true,
        frames,
        metadata: {
          originalWidth: video.videoWidth,
          originalHeight: video.videoHeight,
          processedWidth: frames[0]?.canvas.width || 0,
          processedHeight: frames[0]?.canvas.height || 0,
          frameCount: frames.length,
          duration: video.duration,
          frameRate: detectedFrameRate
        }
      };
    } catch (error) {
      return {
        success: false,
        frames: [],
        metadata: {
          originalWidth: 0,
          originalHeight: 0,
          processedWidth: 0,
          processedHeight: 0,
          frameCount: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error processing video'
      };
    }
  }

  /**
   * Load image file into HTMLImageElement
   */
  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Load video file into HTMLVideoElement
   */
  private loadVideo(file: File): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        resolve(video);
      };
      
      video.onerror = () => {
        reject(new Error(`Failed to load video: ${file.name}`));
      };
      
      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Process image to canvas with resize and crop options
   */
  private processImageToCanvas(img: HTMLImageElement, options: ProcessingOptions): ProcessedFrame {
    const { targetWidth, targetHeight, maintainAspectRatio, cropMode } = options;
    
    // When pixelsPerCell is set (auto mode), output at higher resolution
    const ppcX = options.pixelsPerCellX ?? 1;
    const ppcY = options.pixelsPerCellY ?? 1;
    const canvasWidth = targetWidth * ppcX;
    const canvasHeight = targetHeight * ppcY;
    
    // Set canvas to output size
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (maintainAspectRatio) {
      // Apply crop settings to fill the canvas while maintaining aspect ratio
      const sourceRect = this.calculateSourceRect(
        img.width,
        img.height,
        targetWidth,
        targetHeight,
        cropMode,
        maintainAspectRatio
      );
      
      // Draw cropped image to fill the entire canvas
      this.ctx.drawImage(
        img,
        sourceRect.x,
        sourceRect.y,
        sourceRect.width,
        sourceRect.height,
        0,
        0,
        canvasWidth,
        canvasHeight
      );
    } else {
      // Stretch to fit without maintaining aspect ratio
      this.ctx.drawImage(
        img,
        0,
        0,
        img.width,
        img.height,
        0,
        0,
        canvasWidth,
        canvasHeight
      );
    }
    
    // Get image data
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    // Create result canvas (clone)
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = this.canvas.width;
    resultCanvas.height = this.canvas.height;
    const resultCtx = resultCanvas.getContext('2d')!;
    resultCtx.drawImage(this.canvas, 0, 0);
    
    return {
      canvas: resultCanvas,
      imageData
    };
  }

  /**
   * Extract frames from video using original frame rate
   * 
   * Samples at the CENTER of each frame's time window to avoid boundary issues
   * where the browser might round to an adjacent frame. Uses seeked event + 
   * requestAnimationFrame to ensure frames are properly decoded and rendered.
   */
  private async extractVideoFrames(video: HTMLVideoElement, options: ProcessingOptions, originalFile: File): Promise<{ frames: ProcessedFrame[], detectedFrameRate: number }> {
    const frames: ProcessedFrame[] = [];
    
    // Try to detect frame rate or use common defaults
    const detectedFrameRate = await this.estimateVideoFrameRate(video, originalFile);
    const window = options.videoWindow ?? {};
    const estimatedFrameRate = window.frameRate ?? detectedFrameRate;
    const frameDuration = Math.round(1000 / estimatedFrameRate); // Convert to milliseconds

    const windowStart = window.startTime ?? 0;
    if (windowStart >= video.duration) {
      throw new Error(`invalid startTime ${windowStart}s: video is ${video.duration.toFixed(2)}s long`);
    }
    const windowEnd = Math.min(video.duration, window.duration !== undefined ? windowStart + window.duration : Infinity);
    let totalFrames = Math.max(1, Math.floor((windowEnd - windowStart) * estimatedFrameRate));
    if (window.maxFrames !== undefined) totalFrames = Math.min(totalFrames, window.maxFrames);
    
    for (let i = 0; i < totalFrames; i++) {
      // Sample at the CENTER of each frame's time window to avoid boundary issues
      // Frame i spans from (i/fps) to ((i+1)/fps), so center is at ((i + 0.5) / fps)
      // This prevents the browser from rounding to an adjacent frame at exact boundaries
      const targetTimestamp = windowStart + (i + 0.5) / estimatedFrameRate;
      
      // Stop if we exceed the sampled window
      if (targetTimestamp >= windowEnd) break;
      
      // Seek to the target timestamp
      video.currentTime = targetTimestamp;
      
      // Wait for the seeked event with timeout
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 500);
        const handleSeeked = () => {
          clearTimeout(timeout);
          video.removeEventListener('seeked', handleSeeked);
          resolve();
        };
        video.addEventListener('seeked', handleSeeked);
      });
      
      // Wait for browser to render the frame (double RAF pattern)
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
      
      // Additional delay for first frame which may need more decoding time
      if (i === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Process current frame
      const processedFrame = this.processVideoFrameToCanvas(video, options, targetTimestamp, i, frameDuration);
      frames.push(processedFrame);
    }
    
    return { frames, detectedFrameRate: estimatedFrameRate };
  }

  /**
   * Extract frame rate from video file metadata
   */
  private async estimateVideoFrameRate(video: HTMLVideoElement, originalFile: File): Promise<number> {
    try {
      // Attempt to get frame rate from video metadata
      const frameRate = await this.extractFrameRateFromMetadata(video, originalFile);
      if (frameRate > 0) {

        return frameRate;
      }
    } catch {
      // ignore metadata parsing errors and fall back to default frame rate
    }

    // Fallback to common frame rate

    return 30;
  }

  /**
   * Extract frame rate from video file metadata using MP4Box
   */
  private async extractFrameRateFromMetadata(_video: HTMLVideoElement, originalFile: File): Promise<number> {
    try {
      // Use the original file directly instead of fetching from blob URL
      const arrayBuffer = await originalFile.arrayBuffer();
      
      return await this.parseMP4FrameRate(arrayBuffer);
    } catch {
      return 0;
    }
  }

  /**
   * Parse MP4 file to extract framerate using MP4Box
   * 
   * Note: Suppresses console errors for known non-critical metadata warnings
   * (e.g., QuickTime atoms like ©TIM, ©NAM that MP4Box doesn't recognize)
   */
  private parseMP4FrameRate(arrayBuffer: ArrayBuffer): Promise<number> {
    return new Promise((resolve) => {
      const mp4boxFile: MP4File = MP4Box.createFile();
      
      // Temporarily suppress console.error to prevent MP4Box metadata warnings
      // MP4Box logs errors directly before calling our error handler
      const originalError = console.error;
      console.error = (...args: unknown[]) => {
        // Check all arguments for MP4Box metadata warnings
        const allArgs = args.map(arg => String(arg)).join(' ');
        
        // Suppress known non-critical MP4Box metadata warnings
        if (allArgs.includes('BoxParser') || 
            allArgs.includes('Invalid box type') ||
            allArgs.includes('©')) { // QuickTime atoms start with ©
          // Silently ignore - these are QuickTime metadata atoms we don't need
          return;
        }
        
        // Pass through other errors
        originalError.apply(console, args);
      };
      
      // Set up event handlers
      mp4boxFile.onReady = (info: MP4Info) => {
        // Restore console.error
        console.error = originalError;
        
        // Look for video tracks
        const videoTrack = info.videoTracks?.[0];
        if (videoTrack) {
          // Calculate frame rate from track info
          let frameRate = 0;
          
          if (videoTrack.movie_timescale && videoTrack.movie_duration) {
            const durationInSeconds = videoTrack.movie_duration / videoTrack.movie_timescale;
            if (videoTrack.nb_samples && durationInSeconds > 0) {
              frameRate = videoTrack.nb_samples / durationInSeconds;
            }
          }
          
          // Alternative: use timescale if available
          if (!frameRate && videoTrack.timescale) {
            // Many videos store frame rate info in the timescale
            const commonRates = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];
            
            // Check if timescale matches common frame rates
            for (const rate of commonRates) {
              if (Math.abs(videoTrack.timescale / 1000 - rate) < 1) {
                frameRate = rate;
                break;
              }
            }
            
            // If no match, try direct calculation
            if (!frameRate && videoTrack.timescale > 1000) {
              frameRate = videoTrack.timescale / 1000;
            }
          }
          
          resolve(frameRate > 0 && frameRate <= 120 ? frameRate : 0);
        } else {
          resolve(0);
        }
      };
      
      mp4boxFile.onError = () => {
        // Restore console.error
        console.error = originalError;
        // MP4Box parsing failed, use default framerate
        resolve(0);
      };
      
      // Convert ArrayBuffer to the format MP4Box expects
      const buffer = arrayBuffer as Mp4ArrayBuffer;
      buffer.fileStart = 0;
      
      // Append data and flush
      mp4boxFile.appendBuffer(buffer);
      mp4boxFile.flush();
    });
  }

  /**
   * Process single video frame to canvas
   */
  private processVideoFrameToCanvas(
    video: HTMLVideoElement, 
    options: ProcessingOptions, 
    timestamp: number, 
    frameIndex: number,
    frameDuration: number
  ): ProcessedFrame {
    const { targetWidth, targetHeight, maintainAspectRatio, cropMode } = options;
    
    // When pixelsPerCell is set (auto mode), output at higher resolution
    const ppcX = options.pixelsPerCellX ?? 1;
    const ppcY = options.pixelsPerCellY ?? 1;
    const canvasWidth = targetWidth * ppcX;
    const canvasHeight = targetHeight * ppcY;
    
    // Set canvas to output size
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (maintainAspectRatio) {
      // Apply crop settings to fill the canvas while maintaining aspect ratio
      const sourceRect = this.calculateSourceRect(
        video.videoWidth,
        video.videoHeight,
        targetWidth,
        targetHeight,
        cropMode,
        maintainAspectRatio
      );
      
      // Draw cropped video frame to fill the entire canvas
      this.ctx.drawImage(
        video,
        sourceRect.x,
        sourceRect.y,
        sourceRect.width,
        sourceRect.height,
        0,
        0,
        canvasWidth,
        canvasHeight
      );
    } else {
      // Stretch to fit without maintaining aspect ratio
      this.ctx.drawImage(
        video,
        0,
        0,
        video.videoWidth,
        video.videoHeight,
        0,
        0,
        canvasWidth,
        canvasHeight
      );
    }
    
    // Get image data
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    // Create result canvas (clone)
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = this.canvas.width;
    resultCanvas.height = this.canvas.height;
    const resultCtx = resultCanvas.getContext('2d')!;
    resultCtx.drawImage(this.canvas, 0, 0);
    
    return {
      canvas: resultCanvas,
      imageData,
      timestamp,
      frameIndex,
      frameDuration
    };
  }

  /**
   * Calculate source rectangle for cropping
   */
  private calculateSourceRect(
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number,
    targetHeight: number,
    cropMode: ProcessingOptions['cropMode'],
    maintainAspectRatio: boolean
  ) {
    if (!maintainAspectRatio) {
      return {
        x: 0,
        y: 0,
        width: sourceWidth,
        height: sourceHeight
      };
    }
    
    const sourceAspectRatio = sourceWidth / sourceHeight;
    const targetAspectRatio = targetWidth / targetHeight;
    
    let cropWidth: number;
    let cropHeight: number;
    let cropX: number;
    let cropY: number;
    
    // Calculate crop dimensions to fill target while maintaining aspect ratio
    if (sourceAspectRatio > targetAspectRatio) {
      // Source is wider - crop width, fit height
      cropHeight = sourceHeight;
      cropWidth = sourceHeight * targetAspectRatio;
    } else {
      // Source is taller - crop height, fit width
      cropWidth = sourceWidth;
      cropHeight = sourceWidth / targetAspectRatio;
    }
    
    // Calculate crop position based on alignment mode
    switch (cropMode) {
      case 'top-left':
        cropX = 0;
        cropY = 0;
        break;
      case 'top':
        cropX = (sourceWidth - cropWidth) / 2;
        cropY = 0;
        break;
      case 'top-right':
        cropX = sourceWidth - cropWidth;
        cropY = 0;
        break;
      case 'left':
        cropX = 0;
        cropY = (sourceHeight - cropHeight) / 2;
        break;
      case 'center':
      default:
        cropX = (sourceWidth - cropWidth) / 2;
        cropY = (sourceHeight - cropHeight) / 2;
        break;
      case 'right':
        cropX = sourceWidth - cropWidth;
        cropY = (sourceHeight - cropHeight) / 2;
        break;
      case 'bottom-left':
        cropX = 0;
        cropY = sourceHeight - cropHeight;
        break;
      case 'bottom':
        cropX = (sourceWidth - cropWidth) / 2;
        cropY = sourceHeight - cropHeight;
        break;
      case 'bottom-right':
        cropX = sourceWidth - cropWidth;
        cropY = sourceHeight - cropHeight;
        break;
    }
    
    return {
      x: Math.max(0, cropX),
      y: Math.max(0, cropY),
      width: Math.min(cropWidth, sourceWidth),
      height: Math.min(cropHeight, sourceHeight)
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Clean up canvas and context
    this.canvas.remove();
  }
}

/**
 * Singleton instance for media processing
 */
export const mediaProcessor = new MediaProcessor();