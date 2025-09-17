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
  cropMode: 'center' | 'top' | 'bottom' | 'left' | 'right';
  
  // Quality settings
  quality: 'high' | 'medium' | 'low';
}

export interface ProcessedFrame {
  canvas: HTMLCanvasElement;
  imageData: ImageData;
  timestamp?: number; // For video frames
  frameIndex?: number; // For video frames
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
      const frames = await this.extractVideoFrames(video, options);
      
      return {
        success: true,
        frames,
        metadata: {
          originalWidth: video.videoWidth,
          originalHeight: video.videoHeight,
          processedWidth: frames[0]?.canvas.width || 0,
          processedHeight: frames[0]?.canvas.height || 0,
          frameCount: frames.length,
          duration: video.duration
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
    
    // Calculate dimensions
    const dimensions = this.calculateDimensions(
      img.width, 
      img.height, 
      targetWidth, 
      targetHeight, 
      maintainAspectRatio
    );
    
    // Set canvas size
    this.canvas.width = dimensions.outputWidth;
    this.canvas.height = dimensions.outputHeight;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Apply crop settings
    const sourceRect = this.calculateSourceRect(
      img.width,
      img.height,
      dimensions.outputWidth,
      dimensions.outputHeight,
      cropMode,
      maintainAspectRatio
    );
    
    // Draw image to canvas
    this.ctx.drawImage(
      img,
      sourceRect.x,
      sourceRect.y,
      sourceRect.width,
      sourceRect.height,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    
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
   * Extract frames from video at regular intervals
   */
  private async extractVideoFrames(video: HTMLVideoElement, options: ProcessingOptions): Promise<ProcessedFrame[]> {
    const frames: ProcessedFrame[] = [];
    const frameRate = 10; // Extract 10 frames per second for now
    const totalFrames = Math.min(100, Math.floor(video.duration * frameRate)); // Cap at 100 frames
    
    for (let i = 0; i < totalFrames; i++) {
      const timestamp = (i / frameRate);
      video.currentTime = timestamp;
      
      // Wait for video to seek to the correct time
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });
      
      // Process current frame
      const processedFrame = this.processVideoFrameToCanvas(video, options, timestamp, i);
      frames.push(processedFrame);
    }
    
    return frames;
  }

  /**
   * Process single video frame to canvas
   */
  private processVideoFrameToCanvas(
    video: HTMLVideoElement, 
    options: ProcessingOptions, 
    timestamp: number, 
    frameIndex: number
  ): ProcessedFrame {
    const { targetWidth, targetHeight, maintainAspectRatio, cropMode } = options;
    
    // Calculate dimensions
    const dimensions = this.calculateDimensions(
      video.videoWidth, 
      video.videoHeight, 
      targetWidth, 
      targetHeight, 
      maintainAspectRatio
    );
    
    // Set canvas size
    this.canvas.width = dimensions.outputWidth;
    this.canvas.height = dimensions.outputHeight;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Apply crop settings
    const sourceRect = this.calculateSourceRect(
      video.videoWidth,
      video.videoHeight,
      dimensions.outputWidth,
      dimensions.outputHeight,
      cropMode,
      maintainAspectRatio
    );
    
    // Draw video frame to canvas
    this.ctx.drawImage(
      video,
      sourceRect.x,
      sourceRect.y,
      sourceRect.width,
      sourceRect.height,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    
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
      frameIndex
    };
  }

  /**
   * Calculate output dimensions based on target size and aspect ratio options
   */
  private calculateDimensions(
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number,
    targetHeight: number,
    maintainAspectRatio: boolean
  ) {
    if (!maintainAspectRatio) {
      return {
        outputWidth: targetWidth,
        outputHeight: targetHeight
      };
    }
    
    const sourceAspectRatio = sourceWidth / sourceHeight;
    const targetAspectRatio = targetWidth / targetHeight;
    
    let outputWidth: number;
    let outputHeight: number;
    
    if (sourceAspectRatio > targetAspectRatio) {
      // Source is wider - fit to width
      outputWidth = targetWidth;
      outputHeight = Math.round(targetWidth / sourceAspectRatio);
    } else {
      // Source is taller - fit to height
      outputHeight = targetHeight;
      outputWidth = Math.round(targetHeight * sourceAspectRatio);
    }
    
    return { outputWidth, outputHeight };
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
    
    if (sourceAspectRatio > targetAspectRatio) {
      // Source is wider - crop width
      cropHeight = sourceHeight;
      cropWidth = sourceHeight * targetAspectRatio;
      cropY = 0;
      
      switch (cropMode) {
        case 'left':
          cropX = 0;
          break;
        case 'right':
          cropX = sourceWidth - cropWidth;
          break;
        case 'center':
        default:
          cropX = (sourceWidth - cropWidth) / 2;
          break;
      }
    } else {
      // Source is taller - crop height
      cropWidth = sourceWidth;
      cropHeight = sourceWidth / targetAspectRatio;
      cropX = 0;
      
      switch (cropMode) {
        case 'top':
          cropY = 0;
          break;
        case 'bottom':
          cropY = sourceHeight - cropHeight;
          break;
        case 'center':
        default:
          cropY = (sourceHeight - cropHeight) / 2;
          break;
      }
    }
    
    return {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight
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