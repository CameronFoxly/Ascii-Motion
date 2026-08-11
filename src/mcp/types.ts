/**
 * MCP Message Types
 * 
 * Defines the message protocol between the MCP server and browser client.
 */

import type { Cell } from '../types';

/**
 * Commands sent from MCP server to browser
 */
export type MCPCommand = 
  | MCPSetCellCommand
  | MCPSetCellsBatchCommand
  | MCPClearCellCommand
  | MCPResizeCanvasCommand
  | MCPSetCanvasDataCommand
  | MCPAddFrameCommand
  | MCPDeleteFrameCommand
  | MCPGoToFrameCommand
  | MCPSetFrameDurationCommand
  | MCPSetFrameRateCommand
  | MCPSetFrameDataCommand
  | MCPUndoCommand
  | MCPRedoCommand
  | MCPNewProjectCommand
  | MCPLoadProjectCommand
  | MCPSetForegroundColorCommand
  | MCPSetBackgroundColorCommand
  | MCPSelectRectangleCommand
  | MCPClearSelectionCommand
  | MCPAddPostEffectCommand
  | MCPRemovePostEffectCommand
  | MCPUpdatePostEffectCommand
  | MCPSetPostEffectKeyframeCommand
  | MCPRemovePostEffectKeyframeCommand
  | MCPListPostEffectsCommand
  | MCPGetPostEffectPresetsCommand;

export interface MCPSetCellCommand {
  type: 'set_cell';
  x: number;
  y: number;
  cell: Cell;
}

export interface MCPSetCellsBatchCommand {
  type: 'set_cells_batch';
  cells: Array<{ x: number; y: number; cell: Cell }>;
  frameIndex?: number;
}

export interface MCPClearCellCommand {
  type: 'clear_cell';
  x: number;
  y: number;
}

export interface MCPResizeCanvasCommand {
  type: 'resize_canvas';
  width: number;
  height: number;
}

export interface MCPSetCanvasDataCommand {
  type: 'set_canvas_data';
  cells: Array<{ key: string; cell: Cell }>;
}

export interface MCPAddFrameCommand {
  type: 'add_frame';
  atIndex?: number;
  cells?: Array<{ key: string; cell: Cell }>;
  duration?: number;
}

export interface MCPDeleteFrameCommand {
  type: 'delete_frame';
  index: number;
}

export interface MCPGoToFrameCommand {
  type: 'go_to_frame';
  index: number;
}

export interface MCPSetFrameDurationCommand {
  type: 'set_frame_duration';
  index: number;
  duration: number;
}

export interface MCPSetFrameRateCommand {
  type: 'set_frame_rate';
  fps: number;
}

export interface MCPSetFrameDataCommand {
  type: 'set_frame_data';
  index: number;
  cells: Array<{ key: string; cell: Cell }>;
}

export interface MCPUndoCommand {
  type: 'undo';
}

export interface MCPRedoCommand {
  type: 'redo';
}

export interface MCPNewProjectCommand {
  type: 'new_project';
  width: number;
  height: number;
  backgroundColor?: string;
  name?: string;
}

export interface MCPLoadProjectCommand {
  type: 'load_project';
  sessionData: unknown; // SessionData type from the MCP server
}

export interface MCPSetForegroundColorCommand {
  type: 'set_foreground_color';
  color: string;
}

export interface MCPSetBackgroundColorCommand {
  type: 'set_background_color';
  color: string;
}

export interface MCPSelectRectangleCommand {
  type: 'select_rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MCPClearSelectionCommand {
  type: 'clear_selection';
}

// Post-effect commands
export interface MCPAddPostEffectCommand {
  type: 'add_post_effect';
  postEffectType: string;
  startFrame?: number;
  durationFrames?: number;
  settings?: Record<string, unknown>;
}

export interface MCPRemovePostEffectCommand {
  type: 'remove_post_effect';
  blockId: string;
}

export interface MCPUpdatePostEffectCommand {
  type: 'update_post_effect';
  blockId: string;
  settings?: Record<string, unknown>;
  startFrame?: number;
  durationFrames?: number;
  enabled?: boolean;
}

export interface MCPSetPostEffectKeyframeCommand {
  type: 'set_post_effect_keyframe';
  blockId: string;
  propertyPath: string;
  frame: number;
  value: number | boolean | string;
}

export interface MCPRemovePostEffectKeyframeCommand {
  type: 'remove_post_effect_keyframe';
  blockId: string;
  propertyPath: string;
  frame: number;
}

export interface MCPListPostEffectsCommand {
  type: 'list_post_effects';
}

export interface MCPGetPostEffectPresetsCommand {
  type: 'get_post_effect_presets';
}

/**
 * State updates sent from browser to MCP server
 */
export interface MCPStateUpdate {
  type: 'state_update';
  timestamp: number;
  changes: StateChange[];
}

export interface StateChange {
  store: 'canvas' | 'animation' | 'selection' | 'tools';
  property: string;
  value: unknown;
}

/**
 * Base message wrapper
 */
export interface MCPMessage {
  id: string;
  timestamp: number;
  payload: MCPCommand | MCPStateUpdate | MCPClientMessage;
}

/**
 * Messages sent from browser client to MCP server
 */
export type MCPClientMessage =
  | MCPClientAuth
  | MCPClientHeartbeat
  | MCPClientStateSnapshot
  | MCPCommandResult;

export interface MCPClientAuth {
  type: 'auth';
  token: string;
  sessionId: string;
}

export interface MCPClientHeartbeat {
  type: 'heartbeat';
}

export interface MCPClientStateSnapshot {
  type: 'state_snapshot';
  canvas: {
    width: number;
    height: number;
    cellCount: number;
    backgroundColor: string;
    cells: Record<string, { char: string; color: string; bgColor: string }>;
  };
  animation: {
    frameCount: number;
    currentFrameIndex: number;
    isPlaying: boolean;
    looping: boolean;
    frameRate: number;
    frames: Array<{
      id: string;
      name: string;
      duration: number;
      data: Record<string, { char: string; color: string; bgColor: string }>;
    }>;
  };
  project?: {
    name: string;
  };
  postEffects?: Array<{
    blockId: string;
    type: string;
    enabled: boolean;
    startFrame: number;
    durationFrames: number;
    settings: Record<string, unknown>;
  }>;
}

/**
 * Export request sent from MCP server to browser
 */
export interface MCPExportRequest {
  type: 'export_request';
  requestId: string;
  exportType: 'image' | 'video';
  format: string;
  settings: Record<string, unknown>;
  filename: string;
}

/**
 * Export result sent from browser back to MCP server
 */
export interface MCPExportResult {
  type: 'export_result';
  requestId: string;
  success: boolean;
  data?: string;       // base64-encoded file data
  mimeType?: string;
  filename?: string;
  error?: string;
  bytes?: number;
}

/**
 * Authoritative acknowledged command request sent by the MCP server.
 */
export interface MCPCommandRequest {
  type: 'command_request';
  requestId: string;
  command: MCPCommand;
}

export interface MCPCommandApplied {
  currentFrameIndex?: number;
  cellsChanged?: number;
  frameRate?: number;
  durationMs?: number;
}

export type MCPCommandResult =
  | {
      type: 'command_result';
      requestId: string;
      success: true;
      applied?: MCPCommandApplied;
    }
  | {
      type: 'command_result';
      requestId: string;
      success: false;
      error: string;
    };

/**
 * Server responses
 */
export interface MCPServerMessage {
  type: 'auth_result' | 'command' | 'command_request' | 'state_request' | 'export_request' | 'error';
  success?: boolean;
  error?: string;
  command?: MCPCommand;
  requestId?: string;
}
