/**
 * Image Trace Processor
 * 
 * Utility for loading images and extracting raw video frames for the
 * image trace overlay feature. Unlike mediaProcessor.ts, this does NOT
 * convert to ASCII — it preserves the original pixel data for overlay rendering.
 * 
 * Video frame extraction follows the same 1:1 frame mapping pattern used
 * by the media import system: each video frame maps to one timeline frame,
 * with no FPS resampling.
 */

import * as MP4Box from 'mp4box';
import type { MP4File, MP4Info } from 'mp4box';
import type { ImageTraceSource } from '../stores/imageTraceStore';

type Mp4ArrayBuffer = ArrayBuffer & { fileStart?: number };

const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'image/bmp', 'image/webp', 'image/svg+xml'
];

const SUPPORTED_VIDEO_TYPES = [
  'video/mp4', 'video/webm', 'video/ogg', 'video/avi',
  'video/mov', 'video/quicktime', 'video/wmv'
];

/**
 * Determine if a file is a supported image or video type
 */
export function classifyTraceFile(file: File): 'image' | 'video' | null {
  if (SUPPORTED_IMAGE_TYPES.includes(file.type)) return 'image';
  if (SUPPORTED_VIDEO_TYPES.includes(file.type)) return 'video';
  return null;
}

/**
 * Get the accept string for the file input
 */
export function getTraceFileAcceptString(): string {
  return [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES].join(',');
}

/**
 * Load an image file as an HTMLCanvasElement (raw pixels, no processing)
 */
export async function processTraceImage(file: File): Promise<ImageTraceSource> {
  const img = await loadImage(file);
  
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  // Clean up the object URL
  URL.revokeObjectURL(img.src);

  return {
    type: 'image',
    file,
    name: file.name,
    imageCanvas: canvas,
    videoFrames: [],
    videoFps: 0,
    totalVideoFrames: 0,
    originalWidth: img.width,
    originalHeight: img.height,
  };
}

/**
 * Extract all frames from a video file as raw pixel canvases.
 * Uses the same center-sampling pattern as mediaProcessor.ts.
 * 1:1 frame mapping — no FPS resampling.
 */
export async function processTraceVideo(file: File): Promise<ImageTraceSource> {
  const video = await loadVideo(file);
  const fps = await detectVideoFps(video, file);
  const totalFrames = Math.floor(video.duration * fps);
  const frames: HTMLCanvasElement[] = [];

  for (let i = 0; i < totalFrames; i++) {
    // Sample at the CENTER of each frame's time window
    const targetTimestamp = (i + 0.5) / fps;
    if (targetTimestamp >= video.duration) break;

    video.currentTime = targetTimestamp;

    // Wait for seeked event
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 500);
      const handleSeeked = () => {
        clearTimeout(timeout);
        video.removeEventListener('seeked', handleSeeked);
        resolve();
      };
      video.addEventListener('seeked', handleSeeked);
    });

    // Wait for browser to render the frame (double RAF)
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    // Extra delay for first frame decoding
    if (i === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Draw frame to a new canvas
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    frames.push(canvas);
  }

  // Clean up
  URL.revokeObjectURL(video.src);

  return {
    type: 'video',
    file,
    name: file.name,
    imageCanvas: null,
    videoFrames: frames,
    videoFps: fps,
    totalVideoFrames: frames.length,
    originalWidth: video.videoWidth,
    originalHeight: video.videoHeight,
  };
}

/**
 * Get the correct video frame canvas for a given timeline frame position.
 * Applies the user's frame offset. Returns null if out of range.
 */
export function getFrameForTimelinePosition(
  source: ImageTraceSource,
  timelineFrame: number,
  frameOffset: number
): HTMLCanvasElement | null {
  if (source.type === 'image') {
    return source.imageCanvas;
  }

  // Video: 1:1 frame mapping with offset
  const videoFrameIndex = timelineFrame - frameOffset;
  if (videoFrameIndex < 0 || videoFrameIndex >= source.videoFrames.length) {
    return null;
  }
  return source.videoFrames[videoFrameIndex];
}

// ── Internal helpers ──

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
    img.src = URL.createObjectURL(file);
  });
}

function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error(`Failed to load video: ${file.name}`));
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Detect video FPS using MP4Box metadata, falling back to 30fps.
 * Same logic as mediaProcessor.ts estimateVideoFrameRate.
 */
async function detectVideoFps(video: HTMLVideoElement, file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const fps = await parseMP4FrameRate(arrayBuffer);
    if (fps > 0) return fps;
  } catch {
    // Fall through to default
  }
  return 30;
}

function parseMP4FrameRate(arrayBuffer: ArrayBuffer): Promise<number> {
  return new Promise((resolve) => {
    const mp4boxFile: MP4File = MP4Box.createFile();

    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      const allArgs = args.map(arg => String(arg)).join(' ');
      if (allArgs.includes('BoxParser') || allArgs.includes('Invalid box type') || allArgs.includes('©')) {
        return;
      }
      originalError.apply(console, args);
    };

    mp4boxFile.onReady = (info: MP4Info) => {
      console.error = originalError;
      const videoTrack = info.videoTracks?.[0];
      if (videoTrack) {
        let frameRate = 0;
        if (videoTrack.movie_timescale && videoTrack.movie_duration) {
          const durationInSeconds = videoTrack.movie_duration / videoTrack.movie_timescale;
          if (videoTrack.nb_samples && durationInSeconds > 0) {
            frameRate = videoTrack.nb_samples / durationInSeconds;
          }
        }
        if (!frameRate && videoTrack.timescale) {
          const commonRates = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];
          for (const rate of commonRates) {
            if (Math.abs(videoTrack.timescale / 1000 - rate) < 1) {
              frameRate = rate;
              break;
            }
          }
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
      console.error = originalError;
      resolve(0);
    };

    const buffer = arrayBuffer as Mp4ArrayBuffer;
    buffer.fileStart = 0;
    mp4boxFile.appendBuffer(buffer);
    mp4boxFile.flush();
  });
}
