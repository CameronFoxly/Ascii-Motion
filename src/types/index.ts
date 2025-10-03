// Core ASCII Motion types

export type FrameId = string & { __brand: 'FrameId' };
export type ProjectId = string & { __brand: 'ProjectId' };

export interface Cell {
  char: string;
  color: string;
  bgColor: string;
}

export interface Frame {
  id: FrameId;
  name: string;
  duration: number; // in milliseconds
  data: Map<string, Cell>; // key: "x,y"
  thumbnail?: string; // base64 image data URL
}

export interface Animation {
  frames: Frame[];
  currentFrameIndex: number;
  isPlaying: boolean;
  frameRate: number; // fps for display reference
  totalDuration: number; // calculated from frame durations
  looping: boolean;
}

export interface Canvas {
  width: number;
  height: number;
  cells: Map<string, Cell>; // current frame data, key: "x,y"
}

export interface Project {
  id: ProjectId;
  name: string;
  created: string;
  modified: string;
  canvas: {
    width: number;
    height: number;
  };
  animation: {
    frames: Frame[];
    settings: {
      defaultFrameDuration: number;
      onionSkinning: {
        enabled: boolean;
        framesBefore: number;
        framesAfter: number;
        opacity: number;
      };
    };
  };
}

export type Tool = 
  | 'pencil' 
  | 'eraser' 
  | 'paintbucket' 
  | 'select' 
  | 'lasso'
  | 'magicwand'
  | 'rectangle' 
  | 'ellipse'
  | 'eyedropper'
  | 'line'
  | 'text'
  | 'brush'
  | 'gradientfill'
  | 'fliphorizontal'
  | 'flipvertical';

export type BrushShape = 'circle' | 'square' | 'horizontal' | 'vertical';

export interface ToolState {
  activeTool: Tool;
  selectedChar: string;
  selectedColor: string;
  selectedBgColor: string;
  brushSize: number;
  brushShape: BrushShape;
  rectangleFilled: boolean;
  paintBucketContiguous: boolean;
  magicWandContiguous: boolean;
}

export type SelectionShape = 'rectangle' | 'custom';

export interface Selection {
  start: { x: number; y: number };
  end: { x: number; y: number };
  active: boolean;
  selectedCells: Set<string>;
  shape: SelectionShape;
}

export interface LassoSelection {
  path: { x: number; y: number }[];
  selectedCells: Set<string>; // Cell keys "x,y" that are inside the polygon
  active: boolean;
  isDrawing: boolean; // Currently drawing the lasso path
}

export interface MagicWandSelection {
  selectedCells: Set<string>; // Cell keys "x,y" that match the target criteria
  targetCell: Cell | null; // The original clicked cell (for matching criteria)
  active: boolean;
  contiguous: boolean; // Whether to select only connected matching cells
}

export interface TextToolState {
  isTyping: boolean;
  cursorPosition: { x: number; y: number } | null;
  cursorVisible: boolean; // For blink animation
  textBuffer: string; // Current word being typed for undo batching
  lineStartX: number; // Starting X position for line returns
}

export interface CharacterPalette {
  categories: {
    [key: string]: string[];
  };
  customPalettes: {
    [name: string]: string[];
  };
  activePalette: string;
}

export interface ExportSettings {
  gif: {
    width: number;
    height: number;
    quality: number;
    colors: number;
    scale: number;
  };
  video: {
    width: number;
    height: number;
    quality: number;
    format: 'mp4' | 'webm';
    scale: number;
  };
  text: {
    preserveFormatting: boolean;
    lineEndings: 'lf' | 'crlf';
  };
}

// Gradient Fill Tool Types
export type InterpolationMethod = 'linear' | 'constant' | 'bayer2x2' | 'bayer4x4' | 'noise';
export type QuantizeStepCount =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 'infinite';
export type GradientType = 'linear' | 'radial';

export interface GradientStop {
  position: number; // 0-1 along gradient line
  value: string; // Character, color hex, or bgColor hex
}

export interface GradientProperty {
  enabled: boolean;
  stops: GradientStop[];
  interpolation: InterpolationMethod;
  ditherStrength: number; // 0-100, controls how much dithering spreads across stop range
  quantizeSteps: QuantizeStepCount; // Number of discrete steps for linear interpolation ('infinite' for smooth)
}

export interface GradientDefinition {
  type: GradientType;
  character: GradientProperty;
  textColor: GradientProperty;
  backgroundColor: GradientProperty;
}

export interface GradientState {
  // Fill area matching (extends paint bucket logic)
  contiguous: boolean;
  matchChar: boolean;
  matchColor: boolean;
  matchBgColor: boolean;
  
  // Gradient definition
  definition: GradientDefinition;
  
  // Interactive state
  isApplying: boolean;
  startPoint: { x: number; y: number } | null;
  endPoint: { x: number; y: number } | null;
  ellipsePoint: { x: number; y: number } | null;
  previewData: Map<string, Cell> | null;
}

// Utility type for creating Cell coordinates
export const createCellKey = (x: number, y: number): string => `${x},${y}`;
export const parseCellKey = (key: string): { x: number; y: number } => {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
};

// Type guards
export const isValidCell = (cell: any): cell is Cell => {
  return typeof cell === 'object' && 
         typeof cell.char === 'string' && 
         typeof cell.color === 'string' && 
         typeof cell.bgColor === 'string';
};

export const isValidFrame = (frame: any): frame is Frame => {
  return typeof frame === 'object' &&
         typeof frame.id === 'string' &&
         typeof frame.name === 'string' &&
         typeof frame.duration === 'number' &&
         frame.data instanceof Map;
};

// Enhanced History System Types
export type HistoryActionType = 
  | 'canvas_edit'      // Canvas cell modifications
  | 'add_frame'        // Add new frame
  | 'duplicate_frame'  // Duplicate existing frame
  | 'delete_frame'     // Delete frame
  | 'reorder_frames'   // Reorder frame positions
  | 'update_duration'  // Change frame duration
  | 'update_name'      // Change frame name
  | 'navigate_frame'   // Navigate to different frame
  | 'apply_effect'     // Apply effect to canvas or timeline
  | 'apply_time_effect'     // Apply time-based effect (wave warp, wiggle)
  | 'set_frame_durations';  // Bulk set frame durations

export interface HistoryAction {
  type: HistoryActionType;
  timestamp: number;
  description: string;
}

export interface CanvasHistoryAction extends HistoryAction {
  type: 'canvas_edit';
  data: {
    canvasData: Map<string, Cell>;
    frameIndex: number;
  };
}

export interface AddFrameHistoryAction extends HistoryAction {
  type: 'add_frame';
  data: {
    frameIndex: number;
    frame: Frame;
    canvasData: Map<string, Cell>; // Canvas state when frame was added
    previousCurrentFrame: number;
  };
}

export interface DuplicateFrameHistoryAction extends HistoryAction {
  type: 'duplicate_frame';
  data: {
    originalIndex: number;
    newIndex: number;
    frame: Frame;
    previousCurrentFrame: number;
  };
}

export interface DeleteFrameHistoryAction extends HistoryAction {
  type: 'delete_frame';
  data: {
    frameIndex: number;
    frame: Frame;
    previousCurrentFrame: number;
    newCurrentFrame: number;
  };
}

export interface ReorderFramesHistoryAction extends HistoryAction {
  type: 'reorder_frames';
  data: {
    fromIndex: number;
    toIndex: number;
    previousCurrentFrame: number;
    newCurrentFrame: number;
  };
}

export interface UpdateDurationHistoryAction extends HistoryAction {
  type: 'update_duration';
  data: {
    frameIndex: number;
    oldDuration: number;
    newDuration: number;
  };
}

export interface UpdateNameHistoryAction extends HistoryAction {
  type: 'update_name';
  data: {
    frameIndex: number;
    oldName: string;
    newName: string;
  };
}

export interface NavigateFrameHistoryAction extends HistoryAction {
  type: 'navigate_frame';
  data: {
    previousFrameIndex: number;
    newFrameIndex: number;
  };
}

export interface ApplyEffectHistoryAction extends HistoryAction {
  type: 'apply_effect';
  data: {
    effectType: import('./effects').EffectType;
    effectSettings: any; // Settings object for the effect
    applyToTimeline: boolean;
    affectedFrameIndices: number[];
    previousCanvasData?: Map<string, Cell>; // For single canvas effects
    previousFramesData?: Array<{ frameIndex: number; data: Map<string, Cell> }>; // For timeline effects
  };
}

export interface ApplyTimeEffectHistoryAction extends HistoryAction {
  type: 'apply_time_effect';
  data: {
    effectType: import('./timeEffects').TimeEffectType;
    effectSettings: import('./timeEffects').WaveWarpSettings | import('./timeEffects').WiggleSettings;
    frameRange: import('./timeEffects').FrameRangeSettings;
    affectedFrameIndices: number[];
    previousFramesData: Array<{ frameIndex: number; data: Map<string, Cell> }>;
  };
}

export interface SetFrameDurationsHistoryAction extends HistoryAction {
  type: 'set_frame_durations';
  data: {
    affectedFrameIndices: number[];
    newDuration: number;
    previousDurations: Array<{ frameIndex: number; duration: number }>;
  };
}

export type AnyHistoryAction = 
  | CanvasHistoryAction
  | AddFrameHistoryAction 
  | DuplicateFrameHistoryAction
  | DeleteFrameHistoryAction
  | ReorderFramesHistoryAction
  | UpdateDurationHistoryAction
  | UpdateNameHistoryAction
  | NavigateFrameHistoryAction
  | ApplyEffectHistoryAction
  | ApplyTimeEffectHistoryAction
  | SetFrameDurationsHistoryAction;
