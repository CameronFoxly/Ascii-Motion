# Time-Based Effects System - Implementation Plan

**Status**: Planning Phase  
**Date**: October 1, 2025  
**Feature**: Animation Timeline Controls & Time-Based Effects

---

## 📋 Overview

This document outlines the complete implementation plan for adding time-based effects and advanced timeline controls to ASCII Motion. The system introduces wave warp, wiggle effects, and bulk frame management capabilities with full undo/redo support.

## 🎯 Goals

1. **Time-Based Effects**: Wave warp and wiggle transformations that respect real-world time progression
2. **Timeline Controls**: Bulk frame duration editing and multi-frame creation
3. **Professional UX**: Draggable dialogs, live preview, keyboard shortcuts
4. **History Integration**: Full undo/redo support for all operations
5. **Extensibility**: Architecture designed for future time-based effects

## 🏗️ Architecture Overview

### Core Principles

1. **Permanent Transformations**: Effects modify frame data permanently (unlike visual filters)
2. **Real-World Time**: Effects progress based on accumulated milliseconds, not frame steps
3. **Undo/Redo Support**: All operations integrate with existing history system
4. **Preview-First**: Non-destructive preview before applying changes
5. **Established Patterns**: Follow effects system architecture exactly

### System Components

```
src/
├── types/
│   └── timeEffects.ts          # Type definitions for all time effects
├── constants/
│   └── timeEffects.ts          # Default settings and parameter ranges
├── utils/
│   └── timeEffectsProcessing.ts # Core transformation algorithms
├── stores/
│   └── timeEffectsStore.ts     # Zustand state management
├── hooks/
│   └── useTimeEffectsHistory.ts # History integration hook
└── components/
    └── features/
        └── timeEffects/
            ├── WaveWarpDialog.tsx
            ├── WiggleDialog.tsx
            ├── SetFrameDurationDialog.tsx
            └── AddFramesDialog.tsx
```

---

## 📐 Type System Design

### File: `src/types/timeEffects.ts`

```typescript
// Time effect types
export type TimeEffectType = 'wave-warp' | 'wiggle';

// Axis enums
export type WaveAxis = 'horizontal' | 'vertical';

// Wiggle modes
export type WiggleMode = 'horizontal-wave' | 'vertical-wave' | 'noise';

// Wave Warp Settings
export interface WaveWarpSettings {
  axis: WaveAxis;           // Direction of wave propagation
  frequency: number;        // Wave frequency (0.1 - 5.0)
  amplitude: number;        // Displacement amplitude in cells (1 - 20)
  speed: number;            // Wave speed in pixels/second (10 - 500)
  phase: number;            // Initial phase offset (0 - 360 degrees)
}

// Wiggle Settings
export interface WiggleSettings {
  mode: WiggleMode;
  
  // Wave mode settings (horizontal-wave, vertical-wave)
  waveFrequency: number;    // 0.1 - 5.0
  waveAmplitude: number;    // 1 - 20 cells
  waveSpeed: number;        // 10 - 500 pixels/second
  
  // Noise mode settings (Perlin noise)
  noiseOctaves: number;     // 1 - 8 layers
  noiseFrequency: number;   // 0.001 - 0.1
  noiseAmplitude: number;   // 1 - 50 cells
  noiseSeed: number;        // Random seed (0 - 9999)
}

// Frame Range Control
export interface FrameRangeSettings {
  applyToAll: boolean;
  startFrame: number;       // 0-based index
  endFrame: number;         // 0-based index (inclusive)
}

// Time Effect History Action
export interface TimeEffectHistoryAction {
  type: 'apply_time_effect';
  timestamp: number;
  description: string;
  data: {
    effectType: TimeEffectType;
    effectSettings: WaveWarpSettings | WiggleSettings;
    frameRange: FrameRangeSettings;
    affectedFrameIndices: number[];
    previousFramesData: Array<{
      frameIndex: number;
      data: Map<string, Cell>;
    }>;
  };
}

// Frame Duration History Action
export interface SetFrameDurationHistoryAction {
  type: 'set_frame_durations';
  timestamp: number;
  description: string;
  data: {
    affectedFrameIndices: number[];
    newDuration: number;
    previousDurations: Array<{
      frameIndex: number;
      duration: number;
    }>;
  };
}
```

---

## 🔧 Constants & Defaults

### File: `src/constants/timeEffects.ts`

```typescript
// Default Wave Warp Settings
export const DEFAULT_WAVE_WARP_SETTINGS: WaveWarpSettings = {
  axis: 'horizontal',
  frequency: 0.6,
  amplitude: 2,
  speed: 10,
  phase: 0
};

// Wave Warp Parameter Ranges
export const WAVE_WARP_RANGES = {
  FREQUENCY: { min: 0.1, max: 2.5, step: 0.1 },
  AMPLITUDE: { min: 0, max: 10, step: 1 },
  SPEED: { min: -200, max: 200, step: 10 },
  PHASE: { min: 0, max: 360, step: 1 }
} as const;

// Default Wiggle Settings
export const DEFAULT_WIGGLE_SETTINGS: WiggleSettings = {
  mode: 'horizontal-wave',
  waveFrequency: 1.0,
  waveAmplitude: 3,
  waveSpeed: 100,
  noiseOctaves: 4,
  noiseFrequency: 0.01,
  noiseAmplitude: 10,
  noiseSeed: 1234
};

// Wiggle Parameter Ranges
export const WIGGLE_RANGES = {
  WAVE_FREQUENCY: { min: 0.1, max: 5.0, step: 0.1 },
  WAVE_AMPLITUDE: { min: 1, max: 20, step: 1 },
  WAVE_SPEED: { min: 10, max: 500, step: 10 },
  NOISE_OCTAVES: { min: 1, max: 8, step: 1 },
  NOISE_FREQUENCY: { min: 0.001, max: 0.1, step: 0.001 },
  NOISE_AMPLITUDE: { min: 1, max: 50, step: 1 },
  NOISE_SEED: { min: 0, max: 9999, step: 1 }
} as const;

// Frame Duration Limits
export const FRAME_DURATION_LIMITS = {
  MIN_MS: 50,
  MAX_MS: 10000,
  MIN_FPS: 1,
  MAX_FPS: 60
} as const;
```

---

## ⚙️ Processing Utilities

### File: `src/utils/timeEffectsProcessing.ts`

```typescript
import { createNoise2D } from 'simplex-noise';
import type { Cell } from '../types';
import type { WaveWarpSettings, WiggleSettings, WaveAxis, WiggleMode } from '../types/timeEffects';

/**
 * Calculate accumulated time from frame 0 to frame N
 * Used to determine wave phase based on real-world time progression
 */
export function calculateAccumulatedTime(
  frames: Array<{ duration: number }>,
  targetFrameIndex: number
): number {
  let accumulatedTime = 0;
  
  for (let i = 0; i <= targetFrameIndex && i < frames.length; i++) {
    accumulatedTime += frames[i].duration;
  }
  
  return accumulatedTime;
}

/**
 * Apply wave warp effect to a single frame
 * Moves cell content based on sine wave displacement
 */
export function applyWaveWarpToFrame(
  frameData: Map<string, Cell>,
  canvasWidth: number,
  canvasHeight: number,
  settings: WaveWarpSettings,
  accumulatedTime: number
): Map<string, Cell> {
  const newFrameData = new Map<string, Cell>();
  const { axis, frequency, amplitude, speed, phase } = settings;
  
  // Calculate wave phase based on accumulated time
  const wavePhase = (accumulatedTime * speed / 1000) + (phase * Math.PI / 180);
  
  // Process each cell
  frameData.forEach((cell, key) => {
    const [x, y] = key.split(',').map(Number);
    
    let newX = x;
    let newY = y;
    
    if (axis === 'horizontal') {
      // Horizontal wave: vertical displacement based on x position
      const displacement = Math.round(
        amplitude * Math.sin((x * frequency * Math.PI / 10) + wavePhase)
      );
      newY = y + displacement;
    } else {
      // Vertical wave: horizontal displacement based on y position
      const displacement = Math.round(
        amplitude * Math.sin((y * frequency * Math.PI / 10) + wavePhase)
      );
      newX = x + displacement;
    }
    
    // Bounds check
    if (newX >= 0 && newX < canvasWidth && newY >= 0 && newY < canvasHeight) {
      newFrameData.set(`${newX},${newY}`, cell);
    }
  });
  
  return newFrameData;
}

/**
 * Apply wiggle effect to a single frame
 * Moves all cells together based on wave or noise function
 */
export function applyWiggleToFrame(
  frameData: Map<string, Cell>,
  canvasWidth: number,
  canvasHeight: number,
  settings: WiggleSettings,
  accumulatedTime: number
): Map<string, Cell> {
  const newFrameData = new Map<string, Cell>();
  
  let offsetX = 0;
  let offsetY = 0;
  
  if (settings.mode === 'horizontal-wave') {
    // Horizontal wave motion
    const phase = (accumulatedTime * settings.waveSpeed / 1000);
    offsetX = Math.round(
      settings.waveAmplitude * Math.sin(settings.waveFrequency * phase)
    );
  } else if (settings.mode === 'vertical-wave') {
    // Vertical wave motion
    const phase = (accumulatedTime * settings.waveSpeed / 1000);
    offsetY = Math.round(
      settings.waveAmplitude * Math.sin(settings.waveFrequency * phase)
    );
  } else if (settings.mode === 'noise') {
    // Perlin noise motion
    const noise2D = createNoise2D(() => settings.noiseSeed / 9999);
    const timeScale = accumulatedTime / 1000;
    
    offsetX = Math.round(
      settings.noiseAmplitude * noise2D(timeScale * settings.noiseFrequency, 0)
    );
    offsetY = Math.round(
      settings.noiseAmplitude * noise2D(0, timeScale * settings.noiseFrequency)
    );
  }
  
  // Apply offset to all cells
  frameData.forEach((cell, key) => {
    const [x, y] = key.split(',').map(Number);
    const newX = x + offsetX;
    const newY = y + offsetY;
    
    // Bounds check
    if (newX >= 0 && newX < canvasWidth && newY >= 0 && newY < canvasHeight) {
      newFrameData.set(`${newX},${newY}`, cell);
    }
  });
  
  return newFrameData;
}

/**
 * Convert FPS to milliseconds per frame
 */
export function fpsToMs(fps: number): number {
  return Math.round(1000 / fps);
}

/**
 * Convert milliseconds to FPS
 */
export function msToFps(ms: number): number {
  return Math.round(1000 / ms);
}
```

---

## 🗄️ Store Architecture

### File: `src/stores/timeEffectsStore.ts`

```typescript
import { create } from 'zustand';
import type { 
  WaveWarpSettings, 
  WiggleSettings, 
  FrameRangeSettings,
  TimeEffectType 
} from '../types/timeEffects';
import { DEFAULT_WAVE_WARP_SETTINGS, DEFAULT_WIGGLE_SETTINGS } from '../constants/timeEffects';

interface TimeEffectsState {
  // Dialog visibility
  isWaveWarpDialogOpen: boolean;
  isWiggleDialogOpen: boolean;
  isSetDurationDialogOpen: boolean;
  isAddFramesDialogOpen: boolean;
  
  // Effect settings
  waveWarpSettings: WaveWarpSettings;
  wiggleSettings: WiggleSettings;
  
  // Frame range control (shared across dialogs)
  frameRange: FrameRangeSettings;
  
  // Preview system
  isPreviewActive: boolean;
  previewEffect: TimeEffectType | null;
  
  // Actions - Dialog Management
  openWaveWarpDialog: () => void;
  closeWaveWarpDialog: () => void;
  openWiggleDialog: () => void;
  closeWiggleDialog: () => void;
  openSetDurationDialog: () => void;
  closeSetDurationDialog: () => void;
  openAddFramesDialog: () => void;
  closeAddFramesDialog: () => void;
  
  // Actions - Settings Updates
  updateWaveWarpSettings: (settings: Partial<WaveWarpSettings>) => void;
  updateWiggleSettings: (settings: Partial<WiggleSettings>) => void;
  updateFrameRange: (range: Partial<FrameRangeSettings>) => void;
  
  // Actions - Preview Management
  startPreview: (effectType: TimeEffectType) => void;
  stopPreview: () => void;
  
  // Actions - Apply Effects (delegated to history hook)
  applyWaveWarp: () => Promise<boolean>;
  applyWiggle: () => Promise<boolean>;
}

export const useTimeEffectsStore = create<TimeEffectsState>((set, get) => ({
  // Initial state
  isWaveWarpDialogOpen: false,
  isWiggleDialogOpen: false,
  isSetDurationDialogOpen: false,
  isAddFramesDialogOpen: false,
  
  waveWarpSettings: DEFAULT_WAVE_WARP_SETTINGS,
  wiggleSettings: DEFAULT_WIGGLE_SETTINGS,
  
  frameRange: {
    applyToAll: true,
    startFrame: 0,
    endFrame: 0
  },
  
  isPreviewActive: false,
  previewEffect: null,
  
  // Dialog management
  openWaveWarpDialog: () => set({ isWaveWarpDialogOpen: true }),
  closeWaveWarpDialog: () => {
    get().stopPreview();
    set({ isWaveWarpDialogOpen: false });
  },
  
  openWiggleDialog: () => set({ isWiggleDialogOpen: true }),
  closeWiggleDialog: () => {
    get().stopPreview();
    set({ isWiggleDialogOpen: false });
  },
  
  openSetDurationDialog: () => set({ isSetDurationDialogOpen: true }),
  closeSetDurationDialog: () => set({ isSetDurationDialogOpen: false }),
  
  openAddFramesDialog: () => set({ isAddFramesDialogOpen: true }),
  closeAddFramesDialog: () => set({ isAddFramesDialogOpen: false }),
  
  // Settings updates
  updateWaveWarpSettings: (settings) => set((state) => ({
    waveWarpSettings: { ...state.waveWarpSettings, ...settings }
  })),
  
  updateWiggleSettings: (settings) => set((state) => ({
    wiggleSettings: { ...state.wiggleSettings, ...settings }
  })),
  
  updateFrameRange: (range) => set((state) => ({
    frameRange: { ...state.frameRange, ...range }
  })),
  
  // Preview management
  startPreview: (effectType) => set({ 
    isPreviewActive: true, 
    previewEffect: effectType 
  }),
  
  stopPreview: () => {
    // Clear preview from canvas via previewStore
    const { usePreviewStore } = require('../stores/previewStore');
    usePreviewStore.getState().clearPreview();
    set({ isPreviewActive: false, previewEffect: null });
  },
  
  // Apply methods (will be implemented in history hook)
  applyWaveWarp: async () => {
    // Implementation delegated to useTimeEffectsHistory hook
    return true;
  },
  
  applyWiggle: async () => {
    // Implementation delegated to useTimeEffectsHistory hook
    return true;
  }
}));
```

---

## 🔄 History Integration

### File: `src/hooks/useTimeEffectsHistory.ts`

```typescript
import { useCallback } from 'react';
import { useTimeEffectsStore } from '../stores/timeEffectsStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import { useToolStore } from '../stores/toolStore';
import { applyWaveWarpToFrame, applyWiggleToFrame, calculateAccumulatedTime } from '../utils/timeEffectsProcessing';
import type { TimeEffectType } from '../types/timeEffects';
import type { TimeEffectHistoryAction } from '../types/timeEffects';

export const useTimeEffectsHistory = () => {
  const { pushToHistory } = useToolStore();
  const { 
    waveWarpSettings, 
    wiggleSettings, 
    frameRange,
    closeWaveWarpDialog,
    closeWiggleDialog
  } = useTimeEffectsStore();
  
  const { width: canvasWidth, height: canvasHeight } = useCanvasStore();
  const { frames } = useAnimationStore();
  
  /**
   * Get affected frame indices based on frame range settings
   */
  const getAffectedFrameIndices = useCallback((): number[] => {
    if (frameRange.applyToAll) {
      return frames.map((_, index) => index);
    }
    
    const indices: number[] = [];
    for (let i = frameRange.startFrame; i <= frameRange.endFrame; i++) {
      if (i >= 0 && i < frames.length) {
        indices.push(i);
      }
    }
    return indices;
  }, [frameRange, frames]);
  
  /**
   * Apply wave warp with history tracking
   */
  const applyWaveWarpWithHistory = useCallback(async (): Promise<boolean> => {
    try {
      const affectedIndices = getAffectedFrameIndices();
      if (affectedIndices.length === 0) return false;
      
      // Save previous state for undo
      const previousFramesData = affectedIndices.map(index => ({
        frameIndex: index,
        data: new Map(frames[index].data)
      }));
      
      // Apply wave warp to each frame
      const { useAnimationStore } = await import('../stores/animationStore');
      const animationStore = useAnimationStore.getState();
      
      affectedIndices.forEach(frameIndex => {
        const accumulatedTime = calculateAccumulatedTime(frames, frameIndex);
        const transformedData = applyWaveWarpToFrame(
          frames[frameIndex].data,
          canvasWidth,
          canvasHeight,
          waveWarpSettings,
          accumulatedTime
        );
        
        animationStore.setFrameData(frameIndex, transformedData);
      });
      
      // Create history action
      const historyAction: TimeEffectHistoryAction = {
        type: 'apply_time_effect',
        timestamp: Date.now(),
        description: `Apply wave warp to ${affectedIndices.length} frame(s)`,
        data: {
          effectType: 'wave-warp',
          effectSettings: { ...waveWarpSettings },
          frameRange: { ...frameRange },
          affectedFrameIndices: affectedIndices,
          previousFramesData
        }
      };
      
      pushToHistory(historyAction);
      closeWaveWarpDialog();
      
      return true;
    } catch (error) {
      console.error('Failed to apply wave warp:', error);
      return false;
    }
  }, [waveWarpSettings, frameRange, frames, canvasWidth, canvasHeight, pushToHistory, closeWaveWarpDialog, getAffectedFrameIndices]);
  
  /**
   * Apply wiggle with history tracking
   */
  const applyWiggleWithHistory = useCallback(async (): Promise<boolean> => {
    try {
      const affectedIndices = getAffectedFrameIndices();
      if (affectedIndices.length === 0) return false;
      
      // Save previous state for undo
      const previousFramesData = affectedIndices.map(index => ({
        frameIndex: index,
        data: new Map(frames[index].data)
      }));
      
      // Apply wiggle to each frame
      const { useAnimationStore } = await import('../stores/animationStore');
      const animationStore = useAnimationStore.getState();
      
      affectedIndices.forEach(frameIndex => {
        const accumulatedTime = calculateAccumulatedTime(frames, frameIndex);
        const transformedData = applyWiggleToFrame(
          frames[frameIndex].data,
          canvasWidth,
          canvasHeight,
          wiggleSettings,
          accumulatedTime
        );
        
        animationStore.setFrameData(frameIndex, transformedData);
      });
      
      // Create history action
      const historyAction: TimeEffectHistoryAction = {
        type: 'apply_time_effect',
        timestamp: Date.now(),
        description: `Apply wiggle (${wiggleSettings.mode}) to ${affectedIndices.length} frame(s)`,
        data: {
          effectType: 'wiggle',
          effectSettings: { ...wiggleSettings },
          frameRange: { ...frameRange },
          affectedFrameIndices: affectedIndices,
          previousFramesData
        }
      };
      
      pushToHistory(historyAction);
      closeWiggleDialog();
      
      return true;
    } catch (error) {
      console.error('Failed to apply wiggle:', error);
      return false;
    }
  }, [wiggleSettings, frameRange, frames, canvasWidth, canvasHeight, pushToHistory, closeWiggleDialog, getAffectedFrameIndices]);
  
  return {
    applyWaveWarpWithHistory,
    applyWiggleWithHistory
  };
};
```

---

## 🎨 UI Components

### 1. Wave Warp Dialog

**File**: `src/components/features/timeEffects/WaveWarpDialog.tsx`

**Features**:
- Draggable dialog bar with title and close button
- Live preview toggle (auto-starts on mount)
- Axis selection (Horizontal/Vertical) with radio buttons
- Frequency slider (0.1 - 5.0)
- Amplitude slider (1 - 20 cells)
- Speed slider (10 - 500 px/s)
- Frame range controls (Start/End with "Apply to all" toggle)
- Apply button (Enter key) / Cancel button (Escape key)
- Position: Lower-left corner initially

### 2. Wiggle Dialog

**File**: `src/components/features/timeEffects/WiggleDialog.tsx`

**Features**:
- Draggable dialog bar
- Mode selection: Horizontal Wave / Vertical Wave / Noise (tabs or radio)
- **Wave Mode Controls** (horizontal/vertical):
  - Frequency slider
  - Amplitude slider
  - Speed slider
- **Noise Mode Controls**:
  - Octaves slider (1-8)
  - Frequency slider (0.001-0.1)
  - Amplitude slider (1-50)
  - Seed input (0-9999)
- Frame range controls
- Apply/Cancel buttons with shortcuts
- Position: Lower-left corner initially

### 3. Set Frame Duration Dialog

**File**: `src/components/features/timeEffects/SetFrameDurationDialog.tsx`

**Features**:
- Draggable dialog bar
- Tab system: "Milliseconds (ms)" / "Frames per second (fps)"
- Numeric input with validation (whole numbers only)
- Real-time conversion display between ms/fps
- "Apply to all frames" (sets all frame durations to input value)
- Apply/Cancel buttons
- Position: Lower-left corner initially

### 4. Add Frames Dialog

**File**: `src/components/features/timeEffects/AddFramesDialog.tsx`

**Features**:
- Draggable dialog bar
- "Number of frames" numeric input (1-100)
- "Duplicate active frame" toggle checkbox
  - When ON: New frames filled with current frame content
  - When OFF: New frames are blank
- Frames appended to end of timeline
- Apply/Cancel buttons
- Integration with `useAnimationHistory` for undo support
- Position: Lower-left corner initially

---

## 🍔 Menu Integration

### File: `src/components/features/AnimationTimeline.tsx` (Updated)

**Menu Structure**:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm">
          <Menu className="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Animation controls</TooltipContent>
    </Tooltip>
  </DropdownMenuTrigger>
  
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={openSetDurationDialog}>
      <Clock className="w-4 h-4 mr-2" />
      Set frame duration
    </DropdownMenuItem>
    
    <DropdownMenuItem onClick={openAddFramesDialog}>
      <Plus className="w-4 h-4 mr-2" />
      Add frames
    </DropdownMenuItem>
    
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Sparkles className="w-4 h-4 mr-2" />
        Time effects
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem onClick={openWaveWarpDialog}>
          <Waves className="w-4 h-4 mr-2" />
          Wave warp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openWiggleDialog}>
          <Move className="w-4 h-4 mr-2" />
          Wiggle
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  </DropdownMenuContent>
</DropdownMenu>
```

**Placement**: Timeline header, next to "Frames" label

---

## 🔍 Preview System

### Preview Implementation

**Strategy**: Single-frame preview on current canvas
- Preview shows transformation for **current frame only**
- Uses `previewStore` pattern from effects system
- 80% opacity overlay on canvas
- Auto-starts when dialog opens
- Stops when dialog closes or Apply/Cancel clicked

**Preview Update Triggers**:
- Settings change (frequency, amplitude, etc.)
- Axis/mode change
- Frame navigation (preview updates for new frame)

**Implementation**:
```typescript
// In dialog components
useEffect(() => {
  if (isOpen && isPreviewActive) {
    const currentFrameIndex = useAnimationStore.getState().currentFrameIndex;
    const frames = useAnimationStore.getState().frames;
    const accumulatedTime = calculateAccumulatedTime(frames, currentFrameIndex);
    
    // Apply effect to current frame only
    const previewData = applyWaveWarpToFrame(
      frames[currentFrameIndex].data,
      canvasWidth,
      canvasHeight,
      waveWarpSettings,
      accumulatedTime
    );
    
    // Show on canvas via previewStore
    usePreviewStore.getState().setPreview(previewData);
  }
}, [waveWarpSettings, isPreviewActive, currentFrameIndex]);
```

---

## 📝 History System Updates

### Type Updates

**File**: `src/types/index.ts`

```typescript
export type HistoryActionType = 
  | 'canvas_edit'
  | 'add_frame'
  | 'duplicate_frame'
  | 'delete_frame'
  | 'reorder_frames'
  | 'update_duration'
  | 'update_name'
  | 'apply_effect'
  | 'apply_time_effect'      // NEW
  | 'set_frame_durations';   // NEW
```

### History Processing

**File**: `src/hooks/useKeyboardShortcuts.ts` or dedicated history processor

```typescript
case 'apply_time_effect': {
  const timeEffectAction = action as TimeEffectHistoryAction;
  if (isRedo) {
    // Re-apply time effect
    const { effectType, effectSettings, affectedFrameIndices } = timeEffectAction.data;
    
    affectedFrameIndices.forEach(frameIndex => {
      const accumulatedTime = calculateAccumulatedTime(frames, frameIndex);
      
      let transformedData;
      if (effectType === 'wave-warp') {
        transformedData = applyWaveWarpToFrame(
          frames[frameIndex].data,
          canvasWidth,
          canvasHeight,
          effectSettings as WaveWarpSettings,
          accumulatedTime
        );
      } else if (effectType === 'wiggle') {
        transformedData = applyWiggleToFrame(
          frames[frameIndex].data,
          canvasWidth,
          canvasHeight,
          effectSettings as WiggleSettings,
          accumulatedTime
        );
      }
      
      if (transformedData) {
        animationStore.setFrameData(frameIndex, transformedData);
      }
    });
  } else {
    // Undo: Restore previous frame data
    timeEffectAction.data.previousFramesData.forEach(({ frameIndex, data }) => {
      animationStore.setFrameData(frameIndex, data);
    });
  }
  break;
}

case 'set_frame_durations': {
  const durationAction = action as SetFrameDurationHistoryAction;
  if (isRedo) {
    // Re-apply new duration
    durationAction.data.affectedFrameIndices.forEach(frameIndex => {
      animationStore.updateFrameDuration(frameIndex, durationAction.data.newDuration);
    });
  } else {
    // Undo: Restore previous durations
    durationAction.data.previousDurations.forEach(({ frameIndex, duration }) => {
      animationStore.updateFrameDuration(frameIndex, duration);
    });
  }
  break;
}
```

---

## 🧪 Testing Plan

### Manual Test Cases

#### Wave Warp
- [ ] Horizontal axis: Verify vertical displacement
- [ ] Vertical axis: Verify horizontal displacement
- [ ] Frequency variations (0.1 to 5.0)
- [ ] Amplitude variations (1 to 20)
- [ ] Speed variations (10 to 500)
- [ ] Frame range: Test specific range vs all frames
- [ ] Preview accuracy vs final result
- [ ] Undo/redo functionality
- [ ] Accumulated time progression across frames

#### Wiggle
- [ ] Horizontal wave mode
- [ ] Vertical wave mode
- [ ] Noise mode with various octaves (1-8)
- [ ] Noise frequency variations
- [ ] Noise seed changes produce different results
- [ ] Frame range controls
- [ ] Preview vs final
- [ ] Undo/redo

#### Set Frame Duration
- [ ] Milliseconds mode: Input validation
- [ ] FPS mode: Input validation
- [ ] Conversion accuracy (ms ↔ fps)
- [ ] Apply to all frames
- [ ] Timeline updates correctly
- [ ] Undo/redo restores previous durations

#### Add Frames
- [ ] Add 1-100 frames
- [ ] Duplicate active frame toggle ON
- [ ] Duplicate active frame toggle OFF
- [ ] Frames appended to timeline
- [ ] Undo removes added frames
- [ ] Redo restores added frames

### Performance Testing
- [ ] Wave warp on 50+ frame timeline
- [ ] Wiggle with noise on 50+ frame timeline
- [ ] Preview responsiveness with complex settings
- [ ] Memory usage with large transformations

---

## 📚 Dependencies

### NPM Packages
- ✅ `simplex-noise` - Perlin noise implementation (installed)

### Internal Dependencies
- `useAnimationStore` - Frame data access
- `useCanvasStore` - Canvas dimensions
- `useToolStore` - History push
- `usePreviewStore` - Preview rendering
- `DraggableDialogBar` - Reusable draggable header
- Shadcn components: `DropdownMenu`, `Tabs`, `Slider`, `Input`, `Button`, etc.

---

## 🚀 Implementation Checklist

### Phase 1: Foundation
- [x] Install simplex-noise dependency
- [ ] Create type definitions (`timeEffects.ts`)
- [ ] Create constants (`timeEffects.ts`)
- [ ] Create processing utilities (`timeEffectsProcessing.ts`)
- [ ] Create time effects store (`timeEffectsStore.ts`)
- [ ] Create history integration hook (`useTimeEffectsHistory.ts`)

### Phase 2: Simple Dialogs
- [ ] Create SetFrameDurationDialog
- [ ] Create AddFramesDialog
- [ ] Test duration setting functionality
- [ ] Test frame addition functionality

### Phase 3: Complex Effects
- [ ] Create WaveWarpDialog
- [ ] Create WiggleDialog
- [ ] Implement preview system
- [ ] Test wave warp effect
- [ ] Test wiggle effect

### Phase 4: Integration
- [ ] Add hamburger menu to AnimationTimeline
- [ ] Implement menu structure with sub-menus
- [ ] Wire up dialog state management
- [ ] Update history action types
- [ ] Implement history processing for time effects

### Phase 5: Testing & Documentation
- [ ] Complete manual testing
- [ ] Performance testing
- [ ] Update COPILOT_INSTRUCTIONS.md
- [ ] Update DEVELOPMENT.md
- [ ] Create user-facing documentation

---

## 🎯 Success Criteria

1. ✅ All dialogs draggable and repositionable
2. ✅ Live preview works for current frame
3. ✅ Wave effects respect accumulated time
4. ✅ All operations support undo/redo
5. ✅ Frame range controls work correctly
6. ✅ Keyboard shortcuts functional (Enter/Escape)
7. ✅ Menu integrated in timeline header
8. ✅ No performance degradation with large timelines
9. ✅ Documentation updated per protocol

---

## 🔮 Future Enhancements

### Potential Additions
1. **Motion Blur Effect** - Simulates motion blur across frames
2. **Echo Effect** - Duplicates and offsets content over time
3. **Time Reversal** - Reverses frame order with transformations
4. **Ease Curves** - Non-linear time progression for effects
5. **Keyframe System** - Effect intensity varies over timeline
6. **Batch Operations** - Apply multiple effects in sequence

### Extensibility Points
- New time effect types can be added to `TimeEffectType` union
- Processing utilities can be extended with new algorithms
- Dialog components follow consistent pattern for easy replication
- History system supports arbitrary time effects

---

**End of Implementation Plan**
