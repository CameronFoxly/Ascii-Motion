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
  | 'hand'
  | 'line'
  | 'text'
  | 'brush';

export interface ToolState {
  activeTool: Tool;
  selectedChar: string;
  selectedColor: string;
  selectedBgColor: string;
  brushSize: number;
  rectangleFilled: boolean;
  magicWandContiguous: boolean;
}

export interface Selection {
  start: { x: number; y: number };
  end: { x: number; y: number };
  active: boolean;
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
