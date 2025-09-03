import { create } from 'zustand';
import type { Animation, Frame, FrameId, Cell } from '../types';
import { DEFAULT_FRAME_DURATION } from '../constants';

interface AnimationState extends Animation {
  // Actions
  addFrame: (atIndex?: number) => void;
  removeFrame: (index: number) => void;
  duplicateFrame: (index: number) => void;
  setCurrentFrame: (index: number) => void;
  updateFrameDuration: (index: number, duration: number) => void;
  updateFrameName: (index: number, name: string) => void;
  reorderFrames: (fromIndex: number, toIndex: number) => void;
  
  // Frame data management
  setFrameData: (frameIndex: number, data: Map<string, Cell>) => void;
  getFrameData: (frameIndex: number) => Map<string, Cell> | undefined;
  
  // Playback controls
  play: () => void;
  pause: () => void;
  stop: () => void;
  togglePlayback: () => void;
  setLooping: (looping: boolean) => void;
  setFrameRate: (fps: number) => void;
  
  // Navigation
  nextFrame: () => void;
  previousFrame: () => void;
  goToFrame: (index: number) => void;
  
  // Computed values
  getCurrentFrame: () => Frame | undefined;
  getTotalFrames: () => number;
  calculateTotalDuration: () => number;
  getFrameAtTime: (time: number) => number;
}

const createEmptyFrame = (id?: FrameId, name?: string): Frame => ({
  id: (id || `frame-${Date.now()}-${Math.random()}`) as FrameId,
  name: name || `Frame ${Date.now()}`,
  duration: DEFAULT_FRAME_DURATION,
  data: new Map<string, Cell>(),
  thumbnail: undefined
});

export const useAnimationStore = create<AnimationState>((set, get) => ({
  // Initial state
  frames: [createEmptyFrame(undefined, "Frame 1")],
  currentFrameIndex: 0,
  isPlaying: false,
  frameRate: 12,
  totalDuration: DEFAULT_FRAME_DURATION,
  looping: false,

  // Actions
  addFrame: (atIndex?: number) => {
    set((state) => {
      const newFrame = createEmptyFrame();
      const insertIndex = atIndex !== undefined ? atIndex : state.frames.length;
      const newFrames = [...state.frames];
      newFrames.splice(insertIndex, 0, newFrame);
      
      return {
        frames: newFrames,
        currentFrameIndex: insertIndex,
        totalDuration: get().calculateTotalDuration()
      };
    });
  },

  removeFrame: (index: number) => {
    set((state) => {
      if (state.frames.length <= 1) return state; // Can't remove last frame
      
      const newFrames = state.frames.filter((_, i) => i !== index);
      let newCurrentIndex = state.currentFrameIndex;
      
      if (index <= state.currentFrameIndex && state.currentFrameIndex > 0) {
        newCurrentIndex = state.currentFrameIndex - 1;
      } else if (newCurrentIndex >= newFrames.length) {
        newCurrentIndex = newFrames.length - 1;
      }
      
      return {
        frames: newFrames,
        currentFrameIndex: newCurrentIndex,
        totalDuration: get().calculateTotalDuration()
      };
    });
  },

  duplicateFrame: (index: number) => {
    set((state) => {
      const frameToDuplicate = state.frames[index];
      if (!frameToDuplicate) return state;
      
      const duplicatedFrame: Frame = {
        ...frameToDuplicate,
        id: `frame-${Date.now()}-${Math.random()}` as FrameId,
        name: `${frameToDuplicate.name} Copy`,
        data: new Map(frameToDuplicate.data) // Deep copy the data
      };
      
      const newFrames = [...state.frames];
      newFrames.splice(index + 1, 0, duplicatedFrame);
      
      return {
        frames: newFrames,
        currentFrameIndex: index + 1,
        totalDuration: get().calculateTotalDuration()
      };
    });
  },

  setCurrentFrame: (index: number) => {
    set((state) => {
      if (index < 0 || index >= state.frames.length) return state;
      return { currentFrameIndex: index };
    });
  },

  updateFrameDuration: (index: number, duration: number) => {
    set((state) => {
      const newFrames = [...state.frames];
      if (newFrames[index]) {
        newFrames[index] = { ...newFrames[index], duration };
      }
      return {
        frames: newFrames,
        totalDuration: get().calculateTotalDuration()
      };
    });
  },

  updateFrameName: (index: number, name: string) => {
    set((state) => {
      const newFrames = [...state.frames];
      if (newFrames[index]) {
        newFrames[index] = { ...newFrames[index], name };
      }
      return { frames: newFrames };
    });
  },

  reorderFrames: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const newFrames = [...state.frames];
      const [movedFrame] = newFrames.splice(fromIndex, 1);
      newFrames.splice(toIndex, 0, movedFrame);
      
      // Update current frame index if needed
      let newCurrentIndex = state.currentFrameIndex;
      if (state.currentFrameIndex === fromIndex) {
        newCurrentIndex = toIndex;
      } else if (fromIndex < state.currentFrameIndex && toIndex >= state.currentFrameIndex) {
        newCurrentIndex = state.currentFrameIndex - 1;
      } else if (fromIndex > state.currentFrameIndex && toIndex <= state.currentFrameIndex) {
        newCurrentIndex = state.currentFrameIndex + 1;
      }
      
      return {
        frames: newFrames,
        currentFrameIndex: newCurrentIndex
      };
    });
  },

  // Frame data management
  setFrameData: (frameIndex: number, data: Map<string, Cell>) => {
    set((state) => {
      const newFrames = [...state.frames];
      if (newFrames[frameIndex]) {
        newFrames[frameIndex] = {
          ...newFrames[frameIndex],
          data: new Map(data)
        };
      }
      return { frames: newFrames };
    });
  },

  getFrameData: (frameIndex: number) => {
    const { frames } = get();
    return frames[frameIndex]?.data;
  },

  // Playback controls
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({ isPlaying: false, currentFrameIndex: 0 }),
  
  togglePlayback: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  setLooping: (looping: boolean) => set({ looping }),
  setFrameRate: (frameRate: number) => set({ frameRate }),

  // Navigation
  nextFrame: () => {
    set((state) => {
      const nextIndex = state.currentFrameIndex + 1;
      if (nextIndex >= state.frames.length) {
        return state.looping ? { currentFrameIndex: 0 } : state;
      }
      return { currentFrameIndex: nextIndex };
    });
  },

  previousFrame: () => {
    set((state) => {
      const prevIndex = state.currentFrameIndex - 1;
      if (prevIndex < 0) {
        return state.looping ? { currentFrameIndex: state.frames.length - 1 } : state;
      }
      return { currentFrameIndex: prevIndex };
    });
  },

  goToFrame: (index: number) => {
    const { frames } = get();
    if (index >= 0 && index < frames.length) {
      set({ currentFrameIndex: index });
    }
  },

  // Computed values
  getCurrentFrame: () => {
    const { frames, currentFrameIndex } = get();
    return frames[currentFrameIndex];
  },

  getTotalFrames: () => get().frames.length,

  calculateTotalDuration: () => {
    const { frames } = get();
    return frames.reduce((total, frame) => total + frame.duration, 0);
  },

  getFrameAtTime: (time: number) => {
    const { frames } = get();
    let elapsed = 0;
    
    for (let i = 0; i < frames.length; i++) {
      elapsed += frames[i].duration;
      if (time <= elapsed) {
        return i;
      }
    }
    
    return frames.length - 1; // Return last frame if time exceeds total duration
  }
}));
