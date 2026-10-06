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
  | 'asciitype'
  | 'asciibox'
  | 'brush'
  | 'beziershape'
  | 'gradientfill'
  | 'fliphorizontal'
  | 'flipvertical'
  | 'layertransform';

export type BrushShape = 'circle' | 'square' | 'horizontal' | 'vertical';

export interface BrushSettings {
  size: number;
  shape: BrushShape;
}

export interface ToolState {
  activeTool: Tool;
  selectedChar: string;
  selectedColor: string;
  selectedBgColor: string;
  brushSettings: {
    pencil: BrushSettings;
    eraser: BrushSettings;
  };
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

/** Inclusive grid bounds of a text box drawn with the text tool */
export interface TextBoxRegion {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface TextToolState {
  isTyping: boolean;
  cursorPosition: { x: number; y: number } | null;
  cursorVisible: boolean; // For blink animation
  textBuffer: string; // Current word being typed for undo batching
  lineStartX: number; // Starting X position for line returns
  textBox: TextBoxRegion | null; // Active text box constraining typing (null = free typing)
  textBoxDraft: { start: { x: number; y: number }; current: { x: number; y: number } } | null; // In-progress drag
  textBoxFull: boolean; // True when the last cell of the text box is filled and input must stop
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
export const isValidCell = (cell: unknown): cell is Cell => {
  if (typeof cell !== 'object' || cell === null) {
    return false;
  }

  const candidate = cell as Partial<Cell>;
  return typeof candidate.char === 'string'
    && typeof candidate.color === 'string'
    && typeof candidate.bgColor === 'string';
};

export const isValidFrame = (frame: unknown): frame is Frame => {
  if (typeof frame !== 'object' || frame === null) {
    return false;
  }

  const candidate = frame as Partial<Frame> & { data?: unknown };
  return typeof candidate.id === 'string'
    && typeof candidate.name === 'string'
    && typeof candidate.duration === 'number'
    && candidate.data instanceof Map;
};

// Enhanced History System Types
export type HistoryActionType = 
  | 'canvas_edit'      // Canvas cell modifications
  | 'canvas_resize'    // Canvas size changes
  | 'add_frame'        // Add new frame
  | 'duplicate_frame'  // Duplicate existing frame
  | 'duplicate_frame_range' // Duplicate multiple frames
  | 'delete_frame'     // Delete frame
  | 'delete_frame_range'  // Delete multiple frames
  | 'delete_all_frames'   // Delete all frames and reset
  | 'reorder_frames'   // Reorder frame positions
  | 'reorder_frame_range' // Reorder multiple frames as a group
  | 'update_duration'  // Change frame duration
  | 'update_name'      // Change frame name
  | 'navigate_frame'   // Navigate to different frame
  | 'apply_effect'     // Apply effect to canvas or timeline
  | 'apply_time_effect'     // Apply time-based effect (wave warp, wiggle)
  | 'set_frame_durations'   // Bulk set frame durations
  | 'import_media'          // Import image/video to canvas
  | 'apply_generator'       // Apply procedural generator to timeline
  | 'bezier_add_point'      // Add anchor point to bezier shape
  | 'bezier_move_point'     // Move anchor point(s)
  | 'bezier_adjust_handle'  // Adjust bezier handle
  | 'bezier_toggle_handles' // Toggle handles on/off for a point
  | 'bezier_delete_point'   // Delete anchor point
  | 'bezier_close_shape'    // Close the bezier shape
  | 'bezier_commit'         // Commit bezier shape to canvas
  // Layer/Timeline actions (v2.0.0)
  | 'layer_add'
  | 'layer_remove'
  | 'layer_reorder'
  | 'layer_rename'
  | 'layer_visibility'
  | 'layer_opacity'
  | 'content_frame_add'
  | 'content_frame_remove'
  | 'content_frame_timing'
  | 'content_frame_data'
  | 'content_frame_rename'
  | 'keyframe_add'
  | 'keyframe_remove'
  | 'keyframe_update'
  | 'property_track_add'
  | 'property_track_remove'
  | 'frame_rate_change'
  | 'static_property_change'
  | 'content_frame_reorder'
  | 'timeline_duration_change'
  | 'trim_to_work_area'
  | 'apply_transforms'
  | 'merge_layers'
  | 'create_group'
  | 'ungroup_layers'
  // Effect block actions (procedural effects)
  | 'effect_block_add'
  | 'effect_block_remove'
  | 'effect_block_update'
  | 'effect_block_reorder'
  | 'effect_keyframe_add'
  | 'effect_keyframe_remove'
  | 'effect_keyframe_update'
  | 'effect_bake'
  // Post effect block actions (WebGL shader effects)
  | 'post_effect_block_add'
  | 'post_effect_block_remove'
  | 'post_effect_block_update';

export interface HistoryAction {
  type: HistoryActionType;
  timestamp: number;
  description: string;
}

export interface CanvasHistoryAction extends HistoryAction {
  type: 'canvas_edit';
  data: {
    // Previous canvas state BEFORE the edit (used for undo)
    previousCanvasData: Map<string, Cell>;
    // New canvas state AFTER the edit (used for redo). May be undefined for legacy entries
    newCanvasData?: Map<string, Cell>;
    frameIndex: number;
  };
}

export interface CanvasResizeHistoryAction extends HistoryAction {
  type: 'canvas_resize';
  data: {
    previousWidth: number;
    previousHeight: number;
    newWidth: number;
    newHeight: number;
    previousCanvasData: Map<string, Cell>;
    frameIndex: number;
    // Optional crop operation data (legacy single-layer)
    allFramesPreviousData?: Map<string, Cell>[];
    allFramesNewData?: Map<string, Cell>[];
    isCropOperation?: boolean;
    // Multi-layer snapshots (for crop and resize undo/redo)
    previousLayerSnapshots?: Array<{
      id: string;
      contentFrames: Array<{ id: string; data: Map<string, Cell> }>;
      staticProperties: Record<string, number>;
      propertyTracks: Array<{
        id: string;
        propertyPath: string;
        keyframes: Array<{ id: string; frame: number; value: number | boolean | string; easing: unknown }>;
      }>;
    }>;
    newLayerSnapshots?: Array<{
      id: string;
      contentFrames: Array<{ id: string; data: Map<string, Cell> }>;
      staticProperties: Record<string, number>;
      propertyTracks: Array<{
        id: string;
        propertyPath: string;
        keyframes: Array<{ id: string; frame: number; value: number | boolean | string; easing: unknown }>;
      }>;
    }>;
    previousGroupSnapshots?: Array<{
      id: string;
      staticProperties: Record<string, number>;
      propertyTracks?: Array<{
        id: string;
        propertyPath: string;
        keyframes: Array<{ id: string; frame: number; value: number | boolean | string; easing: unknown }>;
      }>;
    }>;
    newGroupSnapshots?: Array<{
      id: string;
      staticProperties: Record<string, number>;
      propertyTracks?: Array<{
        id: string;
        propertyPath: string;
        keyframes: Array<{ id: string; frame: number; value: number | boolean | string; easing: unknown }>;
      }>;
    }>;
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

export interface DuplicateFrameRangeHistoryAction extends HistoryAction {
  type: 'duplicate_frame_range';
  data: {
    originalFrameIndices: number[];
    insertedFrameIds: FrameId[];
    previousFrames: Frame[];
    newFrames: Frame[];
    previousSelection: number[];
    newSelection: number[];
    previousCurrentFrame: number;
    newCurrentFrame: number;
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

export interface DeleteFrameRangeHistoryAction extends HistoryAction {
  type: 'delete_frame_range';
  data: {
    frameIndices: number[];
    frames: Frame[];
    previousCurrentFrame: number;
    newCurrentFrame: number;
    previousFrames: Frame[];
    previousSelection: number[];
  };
}

export interface DeleteAllFramesHistoryAction extends HistoryAction {
  type: 'delete_all_frames';
  data: {
    frames: Frame[];
    previousCurrentFrame: number;
  };
}

export interface ReorderFrameRangeHistoryAction extends HistoryAction {
  type: 'reorder_frame_range';
  data: {
    frameIndices: number[];
    targetIndex: number;
    previousCurrentFrame: number;
    newCurrentFrame: number;
    movedFrameIds: FrameId[];
    previousSelectionFrameIds: FrameId[];
    newSelectionFrameIds: FrameId[];
  };
}

export interface ApplyEffectHistoryAction extends HistoryAction {
  type: 'apply_effect';
  data: {
    effectType: import('./effects').EffectType;
    effectSettings: import('./effects').EffectSettings; // Settings object for the effect
    applyToTimeline: boolean;
    targetScope?: 'active-layer' | 'all-layers'; // Which layers were targeted
    affectedLayerIds?: string[]; // Layer IDs affected (for correct undo targeting)
    affectedFrameIndices: number[];
    previousCanvasData?: Map<string, Cell>; // For single canvas effects (before)
    previousFramesData?: Array<{ frameIndex: number; data: Map<string, Cell> }>; // For timeline effects (before) — single layer
    previousLayerFramesData?: Array<{ layerId: string; framesData: Array<{ frameIndex: number; data: Map<string, Cell> }> }>; // For multi-layer timeline effects (before)
    newCanvasData?: Map<string, Cell>; // For single canvas effects (after) - needed for redo
    newFramesData?: Array<{ frameIndex: number; data: Map<string, Cell> }>; // For timeline effects (after) — single layer
    newLayerFramesData?: Array<{ layerId: string; framesData: Array<{ frameIndex: number; data: Map<string, Cell> }> }>; // For multi-layer timeline effects (after)
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

export interface ImportMediaHistoryAction extends HistoryAction {
  type: 'import_media';
  data: {
    mode: 'single' | 'overwrite' | 'append' | 'new_layer';
    // For single image import
    previousCanvasData?: Map<string, Cell>;
    previousFrameIndex?: number;
    newCanvasData?: Map<string, Cell>;
    // For multi-frame import (overwrite/append)
    previousFrames?: Frame[];
    previousCurrentFrame?: number;
    newFrames?: Frame[];
    newCurrentFrame?: number;
    importedFrameCount: number;
    // For new_layer mode (undo = remove layer, redo = re-create from snapshot)
    layerId?: string;
    layerName?: string;
    layerSnapshot?: Record<string, unknown>;
    previousActiveLayerId?: string;
    // For frame rate matching (undo restores previous fps)
    previousProjectFps?: number;
    newProjectFps?: number;
  };
}

export interface ApplyGeneratorHistoryAction extends HistoryAction {
  type: 'apply_generator';
  data: {
    generatorId: string;
    layerId: string;
    layerName: string;
    frameCount: number;
    // Serialized layer snapshot for redo restoration (Maps → Records)
    layerSnapshot: Record<string, unknown>;
  };
}

// Bezier Shape Tool History Actions
export interface BezierAddPointHistoryAction extends HistoryAction {
  type: 'bezier_add_point';
  data: {
    pointId: string;
    position: { x: number; y: number };
    withHandles: boolean;
    frameIndex: number;
  };
}

export interface BezierMovePointHistoryAction extends HistoryAction {
  type: 'bezier_move_point';
  data: {
    pointIds: string[]; // Support multi-select
    previousPositions: Array<{ pointId: string; position: { x: number; y: number } }>;
    newPositions: Array<{ pointId: string; position: { x: number; y: number } }>;
    frameIndex: number;
  };
}

export interface BezierAdjustHandleHistoryAction extends HistoryAction {
  type: 'bezier_adjust_handle';
  data: {
    pointId: string;
    handleType: 'in' | 'out';
    previousHandle: { x: number; y: number };
    newHandle: { x: number; y: number };
    // Store opposite handle state in case symmetry was broken
    previousOppositeHandle: { x: number; y: number } | null;
    newOppositeHandle: { x: number; y: number } | null;
    previousSymmetric: boolean;
    newSymmetric: boolean;
    frameIndex: number;
  };
}

export interface BezierToggleHandlesHistoryAction extends HistoryAction {
  type: 'bezier_toggle_handles';
  data: {
    pointId: string;
    previousHasHandles: boolean;
    newHasHandles: boolean;
    previousHandleIn: { x: number; y: number } | null;
    previousHandleOut: { x: number; y: number } | null;
    newHandleIn: { x: number; y: number } | null;
    newHandleOut: { x: number; y: number } | null;
    frameIndex: number;
  };
}

export interface BezierDeletePointHistoryAction extends HistoryAction {
  type: 'bezier_delete_point';
  data: {
    pointIndex: number; // Where the point was in the array
    point: import('../stores/bezierStore').BezierAnchorPoint;
    frameIndex: number;
  };
}

export interface BezierCloseShapeHistoryAction extends HistoryAction {
  type: 'bezier_close_shape';
  data: {
    wasClosed: boolean;
    nowClosed: boolean;
    frameIndex: number;
  };
}

export interface BezierCommitHistoryAction extends HistoryAction {
  type: 'bezier_commit';
  data: {
    // Full bezier state snapshot to restore on undo
    bezierState: {
      anchorPoints: Array<import('../stores/bezierStore').BezierAnchorPoint>;
      isClosed: boolean;
      fillMode: 'constant' | 'palette' | 'autofill' | 'lineart';
      autofillPaletteId: string;
      fillColorMode: 'current' | 'palette';
      strokeWidth: number;
      strokeTaperStart: number;
      strokeTaperEnd: number;
      shapeType: import('../stores/bezierStore').VectorShapeType;
      shapeBounds: import('../utils/vectorShapeGeometry').ShapeBounds | null;
      shapeFilled: boolean;
      bezierFilled: boolean;
      selectedChar: string;
      selectedColor: string;
      selectedBgColor: string;
    };
    // Canvas state before/after for canvas undo
    previousCanvasData: Map<string, Cell>;
    newCanvasData: Map<string, Cell>;
    frameIndex: number;
  };
}

// ============================================
// Layer/Timeline History Actions (v2.0.0)
// ============================================

export interface LayerAddHistoryAction extends HistoryAction {
  type: 'layer_add';
  data: {
    layerId: string;
    layerData: import('../types/timeline').Layer;
    insertIndex: number;
  };
}

export interface LayerRemoveHistoryAction extends HistoryAction {
  type: 'layer_remove';
  data: {
    layerId: string;
    layerData: import('../types/timeline').Layer;
    index: number;
  };
}

export interface LayerReorderHistoryAction extends HistoryAction {
  type: 'layer_reorder';
  data: {
    fromIndex: number;
    toIndex: number;
    // Full snapshots for undo/redo when group membership changes are involved
    previousLayers?: import('./timeline').Layer[];
    previousGroups?: import('./timeline').LayerGroup[];
    newLayers?: import('./timeline').Layer[];
    newGroups?: import('./timeline').LayerGroup[];
  };
}

export interface LayerRenameHistoryAction extends HistoryAction {
  type: 'layer_rename';
  data: {
    layerId: string;
    oldName: string;
    newName: string;
  };
}

export interface LayerVisibilityHistoryAction extends HistoryAction {
  type: 'layer_visibility';
  data: {
    layerId: string;
    oldVisible: boolean;
    newVisible: boolean;
  };
}

export interface LayerOpacityHistoryAction extends HistoryAction {
  type: 'layer_opacity';
  data: {
    layerId: string;
    oldOpacity: number;
    newOpacity: number;
  };
}

export interface ContentFrameAddHistoryAction extends HistoryAction {
  type: 'content_frame_add';
  data: {
    layerId: string;
    frameId: string;
    frameData: import('../types/timeline').ContentFrame;
  };
}

export interface ContentFrameRemoveHistoryAction extends HistoryAction {
  type: 'content_frame_remove';
  data: {
    layerId: string;
    frameId: string;
    frameData: import('../types/timeline').ContentFrame;
  };
}

export interface ContentFrameTimingHistoryAction extends HistoryAction {
  type: 'content_frame_timing';
  data: {
    layerId: string;
    frameId: string;
    oldTiming: { startFrame: number; durationFrames: number };
    newTiming: { startFrame: number; durationFrames: number };
    previousTimelineDuration?: number;
    newTimelineDuration?: number;
  };
}

export interface ContentFrameDataHistoryAction extends HistoryAction {
  type: 'content_frame_data';
  data: {
    layerId: string;
    frameId: string;
    previousData: Map<string, Cell>;
    newData: Map<string, Cell>;
  };
}

export interface ContentFrameRenameHistoryAction extends HistoryAction {
  type: 'content_frame_rename';
  data: {
    layerId: string;
    frameId: string;
    oldName: string;
    newName: string;
  };
}

export interface KeyframeAddHistoryAction extends HistoryAction {
  type: 'keyframe_add';
  data: {
    layerId: string;
    trackId: string;
    keyframeId: string;
    keyframe: import('../types/timeline').Keyframe;
  };
}

export interface KeyframeRemoveHistoryAction extends HistoryAction {
  type: 'keyframe_remove';
  data: {
    layerId: string;
    trackId: string;
    keyframeId: string;
    keyframe: import('../types/timeline').Keyframe;
  };
}

export interface KeyframeUpdateHistoryAction extends HistoryAction {
  type: 'keyframe_update';
  data: {
    layerId: string;
    trackId: string;
    keyframeId: string;
    oldValue: import('../types/timeline').Keyframe;
    newValue: import('../types/timeline').Keyframe;
  };
}

export interface PropertyTrackAddHistoryAction extends HistoryAction {
  type: 'property_track_add';
  data: {
    layerId: string;
    trackId: string;
    propertyPath: string;
  };
}

export interface PropertyTrackRemoveHistoryAction extends HistoryAction {
  type: 'property_track_remove';
  data: {
    layerId: string;
    trackId: string;
    trackData: import('../types/timeline').PropertyTrack;
  };
}

export interface FrameRateChangeHistoryAction extends HistoryAction {
  type: 'frame_rate_change';
  data: {
    oldFps: number;
    newFps: number;
    oldLayers: import('../types/timeline').Layer[];
    newLayers: import('../types/timeline').Layer[];
    oldDuration: number;
    newDuration: number;
  };
}

export interface StaticPropertyChangeHistoryAction extends HistoryAction {
  type: 'static_property_change';
  data: {
    layerId: string;
    propertyPath: string;
    oldValue: number | undefined;
    newValue: number;
  };
}

/**
 * Captures before/after snapshots of all content frame timings across
 * affected layers during a drag-and-drop reorder operation.
 */
export interface ContentFrameReorderHistoryAction extends HistoryAction {
  type: 'content_frame_reorder';
  data: {
    /** Snapshot of affected layers' content frames BEFORE the reorder */
    previousState: Array<{
      layerId: string;
      contentFrames: Array<{ id: string; startFrame: number; durationFrames: number; name: string; data: Map<string, Cell> }>;
    }>;
    /** Snapshot of affected layers' content frames AFTER the reorder */
    newState: Array<{
      layerId: string;
      contentFrames: Array<{ id: string; startFrame: number; durationFrames: number; name: string; data: Map<string, Cell> }>;
    }>;
    /** Keyframe positions before reorder (for sync-keyframes-to-frames) */
    previousKeyframes?: Array<{ layerId: string; trackId: string; keyframeId: string; frame: number }>;
    /** Keyframe positions after reorder */
    newKeyframes?: Array<{ layerId: string; trackId: string; keyframeId: string; frame: number }>;
    /** Timeline duration before (for remove blank space / trimming) */
    previousTimelineDuration?: number;
    /** Timeline duration after */
    newTimelineDuration?: number;
  };
}

export interface TimelineDurationChangeHistoryAction extends HistoryAction {
  type: 'timeline_duration_change';
  data: {
    oldDuration: number;
    newDuration: number;
  };
}

/**
 * Captures full before/after state for trim-to-work-area.
 * Includes layers, duration, and work area state.
 */
export interface TrimToWorkAreaHistoryAction extends HistoryAction {
  type: 'trim_to_work_area';
  data: {
    previousLayers: import('../types/timeline').Layer[];
    previousDuration: number;
    previousWorkAreaStart: number;
    previousWorkAreaEnd: number;
    newLayers: import('../types/timeline').Layer[];
    newDuration: number;
  };
}

export type AnyHistoryAction = 
  | CanvasHistoryAction
  | CanvasResizeHistoryAction
  | AddFrameHistoryAction 
  | DuplicateFrameHistoryAction
  | DuplicateFrameRangeHistoryAction
  | DeleteFrameHistoryAction
  | DeleteFrameRangeHistoryAction
  | DeleteAllFramesHistoryAction
  | ReorderFramesHistoryAction
  | ReorderFrameRangeHistoryAction
  | UpdateDurationHistoryAction
  | UpdateNameHistoryAction
  | NavigateFrameHistoryAction
  | ApplyEffectHistoryAction
  | ApplyTimeEffectHistoryAction
  | SetFrameDurationsHistoryAction
  | ImportMediaHistoryAction
  | ApplyGeneratorHistoryAction
  | BezierAddPointHistoryAction
  | BezierMovePointHistoryAction
  | BezierAdjustHandleHistoryAction
  | BezierToggleHandlesHistoryAction
  | BezierDeletePointHistoryAction
  | BezierCloseShapeHistoryAction
  | BezierCommitHistoryAction
  // Layer/Timeline actions (v2.0.0)
  | LayerAddHistoryAction
  | LayerRemoveHistoryAction
  | LayerReorderHistoryAction
  | LayerRenameHistoryAction
  | LayerVisibilityHistoryAction
  | LayerOpacityHistoryAction
  | ContentFrameAddHistoryAction
  | ContentFrameRemoveHistoryAction
  | ContentFrameTimingHistoryAction
  | ContentFrameDataHistoryAction
  | ContentFrameRenameHistoryAction
  | KeyframeAddHistoryAction
  | KeyframeRemoveHistoryAction
  | KeyframeUpdateHistoryAction
  | PropertyTrackAddHistoryAction
  | PropertyTrackRemoveHistoryAction
  | FrameRateChangeHistoryAction
  | StaticPropertyChangeHistoryAction
  | ContentFrameReorderHistoryAction
  | TimelineDurationChangeHistoryAction
  | TrimToWorkAreaHistoryAction
  | ApplyTransformsHistoryAction
  | MergeLayersHistoryAction
  | CreateGroupHistoryAction
  | UngroupLayersHistoryAction
  // Effect block actions (procedural effects)
  | EffectBlockAddHistoryAction
  | EffectBlockRemoveHistoryAction
  | EffectBlockUpdateHistoryAction
  | EffectBlockReorderHistoryAction
  | EffectKeyframeAddHistoryAction
  | EffectKeyframeRemoveHistoryAction
  | EffectKeyframeUpdateHistoryAction
  | EffectBakeHistoryAction
  // Post effect block actions (WebGL shader effects)
  | PostEffectBlockAddHistoryAction
  | PostEffectBlockRemoveHistoryAction
  | PostEffectBlockUpdateHistoryAction;

export interface ApplyTransformsHistoryAction extends HistoryAction {
  type: 'apply_transforms';
  data: {
    layerId: string;
    previousLayer: import('../types/timeline').Layer;
    newLayer: import('../types/timeline').Layer;
  };
}

export interface MergeLayersHistoryAction extends HistoryAction {
  type: 'merge_layers';
  data: {
    /** The layer IDs that were merged (in order, bottom to top) */
    removedLayers: import('../types/timeline').Layer[];
    /** The indices in the original layers array */
    removedIndices: number[];
    /** The new merged layer */
    mergedLayer: import('../types/timeline').Layer;
    /** Index where the merged layer was inserted */
    insertIndex: number;
  };
}

export interface CreateGroupHistoryAction extends HistoryAction {
  type: 'create_group';
  data: {
    groupId: string;
    groupName: string;
    layerIds: string[];
  };
}

export interface UngroupLayersHistoryAction extends HistoryAction {
  type: 'ungroup_layers';
  data: {
    group: import('../types/timeline').LayerGroup;
  };
}

// ============================================
// EFFECT BLOCK HISTORY ACTIONS
// ============================================

export interface EffectBlockAddHistoryAction extends HistoryAction {
  type: 'effect_block_add';
  data: {
    ownerId: string | null;
    ownerType: 'layer' | 'group' | 'global';
    trackSnapshot: import('../types/effectBlock').EffectTrack;
  };
}

export interface EffectBlockRemoveHistoryAction extends HistoryAction {
  type: 'effect_block_remove';
  data: {
    ownerId: string | null;
    ownerType: 'layer' | 'group' | 'global';
    trackSnapshot: import('../types/effectBlock').EffectTrack;
    trackIndex: number;
  };
}

export interface EffectBlockUpdateHistoryAction extends HistoryAction {
  type: 'effect_block_update';
  data: {
    ownerId: string | null;
    ownerType: 'layer' | 'group' | 'global';
    blockId: string;
    previousBlock: import('../types/effectBlock').EffectBlock;
    newBlock: import('../types/effectBlock').EffectBlock;
  };
}

export interface EffectBlockReorderHistoryAction extends HistoryAction {
  type: 'effect_block_reorder';
  data: {
    ownerId: string | null;
    ownerType: 'layer' | 'group' | 'global';
    fromIndex: number;
    toIndex: number;
  };
}

export interface EffectKeyframeAddHistoryAction extends HistoryAction {
  type: 'effect_keyframe_add';
  data: {
    ownerId: string | null;
    ownerType: 'layer' | 'group' | 'global';
    blockId: string;
    trackId: string;
    keyframe: import('../types/effectBlock').EffectKeyframe;
  };
}

export interface EffectKeyframeRemoveHistoryAction extends HistoryAction {
  type: 'effect_keyframe_remove';
  data: {
    ownerId: string | null;
    ownerType: 'layer' | 'group' | 'global';
    blockId: string;
    trackId: string;
    keyframe: import('../types/effectBlock').EffectKeyframe;
  };
}

export interface EffectKeyframeUpdateHistoryAction extends HistoryAction {
  type: 'effect_keyframe_update';
  data: {
    ownerId: string | null;
    ownerType: 'layer' | 'group' | 'global';
    blockId: string;
    trackId: string;
    keyframeId: string;
    previousKeyframe: import('../types/effectBlock').EffectKeyframe;
    newKeyframe: import('../types/effectBlock').EffectKeyframe;
  };
}

export interface EffectBakeHistoryAction extends HistoryAction {
  type: 'effect_bake';
  data: {
    ownerId: string | null;
    ownerType: 'layer' | 'group' | 'global';
    trackSnapshot: import('../types/effectBlock').EffectTrack;
    trackIndex: number;
    /** Full content frames snapshot per affected layer (for undo restoration) */
    layerSnapshots: Array<{
      layerId: string;
      contentFrames: import('../types/timeline').ContentFrame[];
    }>;
  };
}

// Post effect block history actions (WebGL shader effects)

export interface PostEffectBlockAddHistoryAction extends HistoryAction {
  type: 'post_effect_block_add';
  data: {
    trackSnapshot: import('../types/postEffect').PostEffectTrack;
  };
}

export interface PostEffectBlockRemoveHistoryAction extends HistoryAction {
  type: 'post_effect_block_remove';
  data: {
    trackSnapshot: import('../types/postEffect').PostEffectTrack;
    trackIndex: number;
  };
}

export interface PostEffectBlockUpdateHistoryAction extends HistoryAction {
  type: 'post_effect_block_update';
  data: {
    blockId: string;
    previousBlock: import('../types/postEffect').PostEffectBlock;
    newBlock: import('../types/postEffect').PostEffectBlock;
  };
}
