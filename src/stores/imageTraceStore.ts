/**
 * Image Trace Store
 * 
 * Manages state for the image trace overlay feature.
 * Allows users to upload an image or video as a translucent overlay
 * on the canvas for tracing. This is render-only (excluded from exports)
 * and transient (not persisted in sessions).
 */

import { create } from 'zustand';

export interface ImageTraceSource {
  type: 'image' | 'video';
  file: File;
  name: string;
  /** For images: the loaded image as a canvas element */
  imageCanvas: HTMLCanvasElement | null;
  /** For videos: array of frame canvases (raw pixel frames, not ASCII) */
  videoFrames: HTMLCanvasElement[];
  /** Detected video FPS (only for video sources) */
  videoFps: number;
  /** Total number of video frames */
  totalVideoFrames: number;
  /** Original pixel dimensions of the source */
  originalWidth: number;
  originalHeight: number;
}

export interface ImageTraceState {
  enabled: boolean;
  source: ImageTraceSource | null;
  /** Opacity of the overlay (0.0–1.0) */
  opacity: number;
  /** Whether the overlay renders behind or in front of ASCII content */
  renderOrder: 'behind' | 'inFront';
  /** Video frame offset relative to timeline (in frames) */
  frameOffset: number;
  /** Pixel offset for positioning the overlay */
  position: { x: number; y: number };
  /** Scale factor (1.0 = original size) */
  scale: number;
  /** Whether the source is currently being loaded/processed */
  isLoading: boolean;
  /** Error message if loading failed */
  loadError: string | null;
}

export interface ImageTraceActions {
  setSource: (source: ImageTraceSource) => void;
  clearSource: () => void;
  setOpacity: (opacity: number) => void;
  setRenderOrder: (order: 'behind' | 'inFront') => void;
  setFrameOffset: (offset: number) => void;
  setPosition: (x: number, y: number) => void;
  setScale: (scale: number) => void;
  fitToCanvas: (canvasPixelWidth: number, canvasPixelHeight: number) => void;
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
  setLoading: (loading: boolean) => void;
  setLoadError: (error: string | null) => void;
}

export const useImageTraceStore = create<ImageTraceState & ImageTraceActions>((set, get) => ({
  // State
  enabled: false,
  source: null,
  opacity: 0.5,
  renderOrder: 'behind',
  frameOffset: 0,
  position: { x: 0, y: 0 },
  scale: 1.0,
  isLoading: false,
  loadError: null,

  // Actions
  setSource: (source) => set({ 
    source, 
    enabled: true, 
    isLoading: false, 
    loadError: null,
    // Reset transform when loading new source
    position: { x: 0, y: 0 },
    scale: 1.0,
    frameOffset: 0,
  }),

  clearSource: () => set({ 
    source: null, 
    enabled: false,
    frameOffset: 0,
    position: { x: 0, y: 0 },
    scale: 1.0,
    isLoading: false,
    loadError: null,
  }),

  setOpacity: (opacity) => set({ opacity: Math.max(0, Math.min(1, opacity)) }),

  setRenderOrder: (renderOrder) => set({ renderOrder }),

  setFrameOffset: (frameOffset) => set({ frameOffset }),

  setPosition: (x, y) => set({ position: { x, y } }),

  setScale: (scale) => set({ scale: Math.max(0.1, Math.min(5.0, scale)) }),

  fitToCanvas: (canvasPixelWidth, canvasPixelHeight) => {
    const { source } = get();
    if (!source) return;

    const sourceWidth = source.originalWidth;
    const sourceHeight = source.originalHeight;
    if (sourceWidth === 0 || sourceHeight === 0) return;

    // Scale to fit the canvas while maintaining aspect ratio
    const scaleX = canvasPixelWidth / sourceWidth;
    const scaleY = canvasPixelHeight / sourceHeight;
    const fitScale = Math.min(scaleX, scaleY);

    // Center the image
    const scaledWidth = sourceWidth * fitScale;
    const scaledHeight = sourceHeight * fitScale;
    const offsetX = Math.round((canvasPixelWidth - scaledWidth) / 2);
    const offsetY = Math.round((canvasPixelHeight - scaledHeight) / 2);

    set({ 
      scale: fitScale, 
      position: { x: offsetX, y: offsetY } 
    });
  },

  toggle: () => {
    const { source, enabled } = get();
    if (source) {
      set({ enabled: !enabled });
    }
  },

  setEnabled: (enabled) => set({ enabled }),

  setLoading: (isLoading) => set({ isLoading }),

  setLoadError: (loadError) => set({ loadError, isLoading: false }),
}));
