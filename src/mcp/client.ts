/**
 * MCP WebSocket Client
 * 
 * Connects to the ascii-motion-mcp server running in --live mode.
 * Receives commands and applies them to local Zustand stores.
 */

import type { Cell } from '../types';
import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import { useToolStore } from '../stores/toolStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useProjectMetadataStore } from '../stores/projectMetadataStore';
import { useTimelineStore } from '../stores/timelineStore';
import { getContentFrameAtTime } from '../utils/layerCompositing';
import { SessionImporter } from '../utils/sessionImporter';
import { MCPCommandDispatcher } from './commandDispatcher';
import { useMCPStore } from './store';
import type {
  MCPClientAuth,
  MCPClientHeartbeat,
  MCPClientStateSnapshot,
  MCPCommand,
  MCPCommandApplied,
  MCPCommandRequest,
  MCPExportRequest,
  MCPExportResult,
  MCPServerMessage,
} from './types';

const DEFAULT_PORT = 9876;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const RECONNECT_DELAY = 3000; // 3 seconds

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export class MCPClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private sessionId: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private port: number = DEFAULT_PORT;
  private autoReconnect: boolean = true;
  // Maps MCP server effect block IDs → browser effect block IDs
  private effectBlockIdMap: Map<string, string> = new Map();
  private readonly commandDispatcher: MCPCommandDispatcher;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.commandDispatcher = new MCPCommandDispatcher(
      (command) => this.executeCommand(command),
      (result) => this.send(result),
    );
  }

  /**
   * Connect to the MCP server
   */
  connect(token: string, port: number = DEFAULT_PORT): Promise<void> {
    return new Promise((resolve, reject) => {
      this.token = token;
      this.port = port;
      
      const url = `ws://127.0.0.1:${port}?token=${encodeURIComponent(token)}`;
      
      useMCPStore.getState().setConnectionState('connecting');
      useMCPStore.getState().setServerUrl(url);
      
      try {
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
          console.log('[MCP] Connected to server');
          useMCPStore.getState().setConnectionState('connected');
          useMCPStore.getState().setSessionId(this.sessionId);
          
          // Send auth message
          this.sendAuth();
          
          // Start heartbeat
          this.startHeartbeat();
          
          // Send current state to MCP server so it knows what's in the browser
          // Small delay to ensure connection is fully established
          setTimeout(() => {
            console.log('[MCP] Sending initial state snapshot');
            this.sendStateSnapshot();
          }, 100);
          
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.ws.onerror = (error) => {
          console.error('[MCP] WebSocket error:', error);
          useMCPStore.getState().setError('Connection error');
          reject(new Error('WebSocket connection failed'));
        };
        
        this.ws.onclose = (event) => {
          console.log('[MCP] Disconnected:', event.code, event.reason);
          this.cleanup();
          
          if (this.autoReconnect && this.token) {
            this.scheduleReconnect();
          }
        };
        
      } catch (error) {
        useMCPStore.getState().setError(String(error));
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the MCP server
   */
  disconnect(): void {
    this.autoReconnect = false;
    this.cleanup();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnected');
      this.ws = null;
    }
    
    useMCPStore.getState().reset();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Send a state snapshot to the server (includes full frame data for sync)
   */
  sendStateSnapshot(): void {
    if (!this.isConnected()) return;
    
    const canvas = useCanvasStore.getState();
    const projectMeta = useProjectMetadataStore.getState();
    const timeline = useTimelineStore.getState();

    // Flush current canvas cells into the active layer's content frame
    // so the timeline store has the latest data for all reads below.
    this.flushCanvasToActiveContentFrame();
    
    // Re-read timeline state after flush
    const timelineAfterFlush = useTimelineStore.getState();

    // Build layer data — always present since the app always has ≥1 layer.
    const isLayerMode = timelineAfterFlush.layers.length > 0;

    // Build animation.frames directly from timeline content frames (source of truth).
    // The animationStore adapter caches frames and only re-derives on structural
    // changes — NOT on cell edits — so reading it here produces stale/empty data.
    type FrameRecord = { id: string; name: string; duration: number; data: Record<string, { char: string; color: string; bgColor: string }> };
    let frames: FrameRecord[];
    let frameCount: number;
    let currentFrameIndex: number;
    let frameRate: number;
    let isPlaying: boolean;
    let looping: boolean;

    if (isLayerMode) {
      const activeLayer = timelineAfterFlush.layers.find(l => l.id === timelineAfterFlush.view.activeLayerId)
        ?? timelineAfterFlush.layers[0];
      frames = activeLayer.contentFrames.map(cf => {
        const data: Record<string, { char: string; color: string; bgColor: string }> = {};
        cf.data.forEach((cell, key) => {
          data[key] = { char: cell.char, color: cell.color, bgColor: cell.bgColor };
        });
        return {
          id: cf.id,
          name: cf.name,
          duration: cf.durationFrames * (1000 / timelineAfterFlush.config.frameRate),
          data,
        };
      });
      frameCount = activeLayer.contentFrames.length;
      currentFrameIndex = timelineAfterFlush.view.currentFrame;
      frameRate = timelineAfterFlush.config.frameRate;
      isPlaying = timelineAfterFlush.view.isPlaying;
      looping = timelineAfterFlush.view.looping;
    } else {
      // Fallback to adapter for non-layer (legacy) mode
      const animation = useAnimationStore.getState();
      frames = animation.frames.map(frame => {
        const data: Record<string, { char: string; color: string; bgColor: string }> = {};
        frame.data.forEach((cell, key) => {
          data[key] = { char: cell.char, color: cell.color, bgColor: cell.bgColor };
        });
        return { id: frame.id, name: frame.name, duration: frame.duration, data };
      });
      frameCount = animation.frames.length;
      currentFrameIndex = animation.currentFrameIndex;
      frameRate = animation.frameRate;
      isPlaying = animation.isPlaying;
      looping = animation.looping;
    }

    // Serialize current canvas cells for the snapshot
    const canvasCells: Record<string, { char: string; color: string; bgColor: string }> = {};
    canvas.cells.forEach((cell, key) => {
      canvasCells[key] = { char: cell.char, color: cell.color, bgColor: cell.bgColor };
    });

    let layerData: Record<string, unknown> | undefined;
    if (isLayerMode) {
      layerData = {
        layers: timelineAfterFlush.layers.map(l => ({
          id: l.id,
          name: l.name,
          visible: l.visible,
          solo: l.solo,
          locked: l.locked,
          opacity: l.opacity,
          parentGroupId: l.parentGroupId,
          syncKeyframesToFrames: l.syncKeyframesToFrames,
          contentFrames: l.contentFrames.map(cf => {
            const cfData: Record<string, { char: string; color: string; bgColor: string }> = {};
            cf.data.forEach((cell, key) => {
              cfData[key] = { char: cell.char, color: cell.color, bgColor: cell.bgColor };
            });
            return {
              id: cf.id,
              name: cf.name,
              startFrame: cf.startFrame,
              durationFrames: cf.durationFrames,
              data: cfData,
              hidden: cf.hidden,
            };
          }),
          propertyTracks: l.propertyTracks.map(pt => ({
            id: pt.id,
            propertyPath: pt.propertyPath,
            loopKeyframes: pt.loopKeyframes,
            keyframes: pt.keyframes.map(kf => ({
              id: kf.id,
              frame: kf.frame,
              value: kf.value,
              easing: kf.easing,
            })),
          })),
          staticProperties: l.staticProperties,
        })),
        layerGroups: timelineAfterFlush.layerGroups.map(g => ({
          id: g.id,
          name: g.name,
          childLayerIds: g.childLayerIds,
          visible: g.visible,
          solo: g.solo,
          locked: g.locked,
          collapsed: g.collapsed,
          propertyTracks: g.propertyTracks,
          staticProperties: g.staticProperties,
        })),
        activeLayerId: timelineAfterFlush.view.activeLayerId,
        timeline: {
          frameRate: timelineAfterFlush.config.frameRate,
          durationFrames: timelineAfterFlush.config.durationFrames,
          looping: timelineAfterFlush.view.looping,
        },
      };
    }
    
    const snapshot: MCPClientStateSnapshot = {
      type: 'state_snapshot',
      canvas: {
        width: canvas.width,
        height: canvas.height,
        cellCount: canvas.getCellCount(),
        backgroundColor: canvas.canvasBackgroundColor,
        cells: canvasCells,
      },
      animation: {
        frameCount,
        currentFrameIndex,
        isPlaying,
        looping,
        frameRate,
        frames,
      },
      project: {
        name: projectMeta.projectName,
      },
      // Post effects data
      postEffects: timelineAfterFlush.postEffectTracks.length > 0
        ? timelineAfterFlush.postEffectTracks.map((t) => ({
            blockId: t.effectBlock.id as string,
            type: t.effectBlock.postEffectType,
            enabled: t.effectBlock.enabled,
            startFrame: t.effectBlock.startFrame,
            durationFrames: t.effectBlock.durationFrames,
            settings: { ...t.effectBlock.settings },
          }))
        : undefined,
      // v2 layer data (included when in layer mode)
      ...(layerData || {}),
    };
    
    console.log('[MCP] Sending state snapshot:', isLayerMode ? `${timeline.layers.length} layers` : `${frames.length} frames`);
    this.send(snapshot);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Flush canvasStore cells into the active layer's content frame in
   * timelineStore.  The canvas ↔ timeline sync is normally debounced (150ms)
   * via useFrameSynchronization, so the content frame can be stale when the
   * MCP server requests state or an export. This ensures the timeline has
   * the latest cell data before we read from it.
   */
  private flushCanvasToActiveContentFrame(): void {
    const timeline = useTimelineStore.getState();
    if (timeline.layers.length === 0) return;

    const activeLayer = timeline.layers.find(l => l.id === timeline.view.activeLayerId)
      ?? timeline.layers[0];
    if (!activeLayer) return;

    const cf = getContentFrameAtTime(activeLayer, timeline.view.currentFrame);
    if (!cf) return;

    const cells = useCanvasStore.getState().cells;
    timeline.updateContentFrameData(activeLayer.id, cf.id, new Map(cells));
  }

  private syncCanvasToCurrentContentFrame(): void {
    const timeline = useTimelineStore.getState();
    const activeLayer = timeline.layers.find((layer) => layer.id === timeline.view.activeLayerId)
      ?? timeline.layers[0];
    const activeFrame = activeLayer
      ? getContentFrameAtTime(activeLayer, timeline.view.currentFrame)
      : null;
    const canvas = useCanvasStore.getState();

    canvas.setActiveLayerId(activeLayer?.id ?? null);
    canvas.setCanvasData(activeFrame ? new Map(activeFrame.data) : new Map<string, Cell>());
    canvas.setDirty(false);
  }

  private generateSessionId(): string {
    const timestamp = Date.now();

    // Prefer Web Crypto API in browser-like environments
    let randomPart: string | null = null;
    const globalRef: Record<string, unknown> = (typeof globalThis !== 'undefined') ? (globalThis as Record<string, unknown>) : {};

    const webCrypto = globalRef && ((globalRef.crypto as Record<string, unknown>) || ((globalRef.window as Record<string, unknown>)?.crypto as Record<string, unknown>));
    if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(8);
      (webCrypto.getRandomValues as (arr: Uint8Array) => void)(bytes);
      // Convert bytes to hex string
      randomPart = Array.from(bytes)
        .map((b: number) => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, 12);
    } else {
      // Fallback to Math.random for environments without Web Crypto
      randomPart = Math.random().toString(36).substring(2, 14);
    }

    return `browser-${timestamp}-${randomPart}`;
  }

  private sendAuth(): void {
    if (!this.token) return;
    
    const auth: MCPClientAuth = {
      type: 'auth',
      token: this.token,
      sessionId: this.sessionId
    };
    
    this.send(auth);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        const heartbeat: MCPClientHeartbeat = { type: 'heartbeat' };
        this.send(heartbeat);
      }
    }, HEARTBEAT_INTERVAL);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    
    console.log(`[MCP] Reconnecting in ${RECONNECT_DELAY}ms...`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.token) {
        this.connect(this.token, this.port).catch(() => {
          // Retry again
          if (this.autoReconnect) {
            this.scheduleReconnect();
          }
        });
      }
    }, RECONNECT_DELAY);
  }

  private cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    useMCPStore.getState().setConnectionState('disconnected');
  }

  private send(message: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(data: string): void {
    try {
      const message: unknown = JSON.parse(data);

      if (!isRecord(message)) {
        throw new Error('MCP message must be an object');
      }
      
      // Handle JSON-RPC style notifications from MCP server
      if (message.jsonrpc === '2.0' && typeof message.method === 'string') {
        this.handleNotification(message.method, message.params);
        return;
      }

      if (message.type === 'command_request') {
        this.handleCommandRequest(message);
        return;
      }
      
      // Handle legacy message format
      const legacyMessage = message as unknown as MCPServerMessage;
      
      switch (legacyMessage.type) {
        case 'auth_result':
          if (!legacyMessage.success) {
            console.error('[MCP] Auth failed:', legacyMessage.error);
            useMCPStore.getState().setError(legacyMessage.error || 'Authentication failed');
            this.disconnect();
          }
          break;
          
        case 'command':
          if (legacyMessage.command) {
            void this.executeCommand(legacyMessage.command).then(
              () => useMCPStore.getState().incrementCommandCount(),
              (error) => console.error('[MCP] Legacy command failed:', error),
            );
          }
          break;
          
        case 'state_request':
          this.sendStateSnapshot();
          break;
          
        case 'export_request':
          this.handleExportRequest(message as unknown as MCPExportRequest);
          break;
          
        case 'error':
          console.error('[MCP] Server error:', legacyMessage.error);
          break;
      }
    } catch (error) {
      console.error('[MCP] Failed to parse message:', error);
    }
  }

  private handleCommandRequest(message: Record<string, unknown>): void {
    const requestId = message.requestId;
    if (typeof requestId !== 'string' || requestId.length === 0) {
      console.error('[MCP] command_request is missing a requestId');
      return;
    }

    const command = message.command;
    if (!isRecord(command) || typeof command.type !== 'string') {
      void this.commandDispatcher.reject(
        requestId,
        'command_request is missing a valid command',
      ).catch((error) => console.error('[MCP] Failed to emit command result:', error));
      return;
    }

    const request: MCPCommandRequest = {
      type: 'command_request',
      requestId,
      command: command as unknown as MCPCommand,
    };

    void this.commandDispatcher.dispatch(request).then(
      () => useMCPStore.getState().incrementCommandCount(),
      (error) => console.error('[MCP] Failed to emit command result:', error),
    );
  }

  private handleNotification(method: string, params: unknown): void {
    console.log('[MCP] Received notification:', method, params);
    
    if (method === 'notifications/connected') {
      console.log('[MCP] Connected to server');
      return;
    }
    
    if (method === 'notifications/stateChanged') {
      const { type, data } = params as { type: string; data: unknown };
      this.handleStateChange(type, data);
      useMCPStore.getState().incrementCommandCount();
    }
  }

  private handleStateChange(type: string, data: unknown): void {
    console.log('[MCP] State change:', type, data);
    
    switch (type) {
      case 'new_project': {
        const projectData = data as { width: number; height: number; name: string; backgroundColor?: string };
        this.handleNewProject({
          width: projectData.width,
          height: projectData.height,
          name: projectData.name,
          backgroundColor: projectData.backgroundColor
        });
        break;
      }
      
      case 'set_cell': {
        const cellData = data as { x: number; y: number; cell: Cell };
        this.handleSetCell(cellData);
        break;
      }
      
      case 'resize_canvas': {
        const resizeData = data as { width: number; height: number };
        this.handleResizeCanvas(resizeData);
        break;
      }
      
      case 'set_cells_batch': {
        const batchData = data as { cells: Array<{ x: number; y: number; cell: Cell }> };
        this.handleSetCellsBatch({ cells: batchData.cells });
        break;
      }
      
      case 'clear_cell': {
        const clearData = data as { x: number; y: number };
        this.handleClearCell(clearData);
        break;
      }
      
      case 'fill_region': {
        // Fill region modifies many cells - request a full state refresh
        // For now, log it; a full sync would require the MCP server to send all cell data
        console.log('[MCP] Fill region completed, cells filled:', (data as { cellsFilled: number }).cellsFilled);
        break;
      }
      
      case 'clear_canvas': {
        // Clear all cells on the current frame
        useCanvasStore.getState().clearCanvas();
        break;
      }
      
      case 'add_frame': {
        // Add a new frame with optional data
        const addData = data as { frame?: { index?: number; duration?: number; data?: Record<string, Cell> }; totalFrames?: number };
        const frameIndex = addData.frame?.index;
        useAnimationStore.getState().addFrame(frameIndex);
        // If duration is provided, set it
        if (addData.frame?.duration && frameIndex !== undefined) {
          useAnimationStore.getState().updateFrameDuration(frameIndex, addData.frame.duration);
        }
        // If data is provided, set it
        if (addData.frame?.data && frameIndex !== undefined) {
          const cellMap = new Map<string, Cell>();
          for (const [key, cell] of Object.entries(addData.frame.data)) {
            cellMap.set(key, cell);
          }
          useAnimationStore.getState().setFrameData(frameIndex, cellMap);
        }
        break;
      }
      
      case 'delete_frame': {
        const deleteData = data as { index: number; totalFrames: number };
        useAnimationStore.getState().removeFrame(deleteData.index);
        break;
      }
      
      case 'duplicate_frame':
      case 'copy_frame_and_modify': {
        // These create new frames with data - trigger a full frame sync
        // For now, just add a frame and the data will be synced on next interaction
        const copyData = data as { newFrame: { index: number; id: string; name: string; duration: number; data?: Record<string, Cell> }; totalFrames: number };
        // Add frame at the correct position
        useAnimationStore.getState().addFrame(copyData.newFrame.index);
        // Set the frame duration
        useAnimationStore.getState().updateFrameDuration(copyData.newFrame.index, copyData.newFrame.duration);
        // If data is provided, set it
        if (copyData.newFrame.data) {
          const cellMap = new Map<string, Cell>();
          for (const [key, cell] of Object.entries(copyData.newFrame.data)) {
            cellMap.set(key, cell);
          }
          useAnimationStore.getState().setFrameData(copyData.newFrame.index, cellMap);
        }
        break;
      }
      
      case 'go_to_frame': {
        const goToData = data as { index: number };
        useAnimationStore.getState().goToFrame(goToData.index);
        break;
      }
      
      case 'set_frame_duration': {
        const durationData = data as { index: number; duration: number };
        useAnimationStore.getState().updateFrameDuration(durationData.index, durationData.duration);
        break;
      }
      
      case 'set_frame_name': {
        // Frame names are currently not stored in the animation store
        // Just log for now
        console.log('[MCP] Frame name set:', data);
        break;
      }
      
      case 'set_foreground_color': {
        const colorData = data as { color: string };
        useToolStore.getState().setSelectedColor(colorData.color);
        break;
      }
      
      case 'set_background_color': {
        const colorData = data as { color: string };
        useToolStore.getState().setSelectedBgColor(colorData.color);
        break;
      }
      
      case 'set_selected_character': {
        const charData = data as { character: string };
        useToolStore.getState().setSelectedChar(charData.character);
        break;
      }
      
      case 'set_frame_data': {
        // Set all cell data for a specific frame
        const frameData = data as { frameIndex: number; data: Record<string, Cell> };
        const cellMap = new Map<string, Cell>();
        for (const [key, cell] of Object.entries(frameData.data)) {
          cellMap.set(key, cell);
        }
        useAnimationStore.getState().setFrameData(frameData.frameIndex, cellMap);
        console.log('[MCP] Set frame data for frame', frameData.frameIndex, 'with', cellMap.size, 'cells');
        break;
      }

      // =====================================================================
      // Layer operations (v2)
      // =====================================================================
      case 'add_layer': {
        const layerData = data as { layer: { id: string; name: string }; totalLayers: number };
        console.log('[MCP] Layer added:', layerData.layer.name, '- total:', layerData.totalLayers);
        // Request full state sync to get the new layer
        this.sendStateSnapshot();
        break;
      }

      case 'remove_layer': {
        const removeData = data as { layerId: string };
        console.log('[MCP] Layer removed:', removeData.layerId);
        this.sendStateSnapshot();
        break;
      }

      case 'duplicate_layer': {
        const dupData = data as { sourceLayerId: string; newLayer: { id: string; name: string } };
        console.log('[MCP] Layer duplicated:', dupData.newLayer.name);
        this.sendStateSnapshot();
        break;
      }

      case 'set_active_layer': {
        const activeData = data as { layerId: string };
        console.log('[MCP] Active layer changed:', activeData.layerId);
        break;
      }

      case 'rename_layer': {
        const renameData = data as { layerId: string; name: string };
        console.log('[MCP] Layer renamed:', renameData.layerId, '→', renameData.name);
        break;
      }

      case 'reorder_layers': {
        const reorderData = data as { fromIndex: number; toIndex: number };
        console.log('[MCP] Layers reordered:', reorderData.fromIndex, '→', reorderData.toIndex);
        break;
      }

      case 'set_layer_visibility': {
        const visData = data as { layerId: string; visible?: boolean; solo?: boolean; locked?: boolean; opacity?: number };
        console.log('[MCP] Layer visibility changed:', visData.layerId);
        break;
      }

      case 'add_content_frame': {
        const cfData = data as { layerId: string; contentFrame: { id: string; name: string; startFrame: number; durationFrames: number } };
        console.log('[MCP] Content frame added to layer:', cfData.layerId, 'at frame', cfData.contentFrame.startFrame);
        break;
      }

      case 'remove_content_frame': {
        const rcfData = data as { layerId: string; contentFrameId: string };
        console.log('[MCP] Content frame removed:', rcfData.contentFrameId, 'from layer:', rcfData.layerId);
        break;
      }

      case 'add_keyframe': {
        const kfData = data as { layerId: string; propertyPath: string; keyframe: { id: string; frame: number; value: number } };
        console.log('[MCP] Keyframe added:', kfData.propertyPath, 'at frame', kfData.keyframe.frame, '=', kfData.keyframe.value);
        break;
      }

      case 'remove_keyframe': {
        const rkfData = data as { layerId: string; trackId: string; keyframeId: string };
        console.log('[MCP] Keyframe removed:', rkfData.keyframeId);
        break;
      }

      // =====================================================================
      // Effect block operations (procedural effects)
      // =====================================================================
      case 'add_effect_block': {
        const ebData = data as {
          blockId: string;
          trackId: string;
          ownerId: string | null;
          effectType: string;
          startFrame: number;
          durationFrames: number;
          settings?: Record<string, unknown>;
        };
        const browserBlockId = useTimelineStore.getState().addEffectBlock(
          ebData.ownerId as import('../types/timeline').LayerId | import('../types/timeline').LayerGroupId | null,
          ebData.effectType,
          ebData.startFrame,
          ebData.durationFrames,
        );
        if (browserBlockId) {
          // Store mapping from server block ID → browser block ID
          this.effectBlockIdMap.set(ebData.blockId, browserBlockId);
        }
        console.log('[MCP] Effect block added:', ebData.effectType, 'on', ebData.ownerId ?? 'global', '| server:', ebData.blockId, '→ browser:', browserBlockId);
        break;
      }

      case 'remove_effect_block': {
        const rebData = data as { blockId: string };
        const browserRemoveId = this.effectBlockIdMap.get(rebData.blockId) ?? rebData.blockId;
        const ts = useTimelineStore.getState();
        for (const layer of ts.layers) {
          for (const et of (layer.effectTracks ?? [])) {
            if (et.effectBlock.id === browserRemoveId) {
              ts.removeEffectBlock(layer.id, browserRemoveId as import('../types/effectBlock').EffectBlockId);
              break;
            }
          }
        }
        for (const group of ts.layerGroups) {
          for (const et of (group.effectTracks ?? [])) {
            if (et.effectBlock.id === browserRemoveId) {
              ts.removeEffectBlock(group.id, browserRemoveId as import('../types/effectBlock').EffectBlockId);
              break;
            }
          }
        }
        for (const et of ts.globalEffects) {
          if (et.effectBlock.id === browserRemoveId) {
            ts.removeEffectBlock(null, browserRemoveId as import('../types/effectBlock').EffectBlockId);
            break;
          }
        }
        this.effectBlockIdMap.delete(rebData.blockId);
        console.log('[MCP] Effect block removed:', rebData.blockId);
        break;
      }

      case 'update_effect_block': {
        const uebData = data as { blockId: string; settings?: Record<string, unknown>; enabled?: boolean };
        const browserUpdateId = this.effectBlockIdMap.get(uebData.blockId) ?? uebData.blockId;
        if (uebData.settings) {
          useTimelineStore.getState().updateEffectBlockSettings(
            browserUpdateId as import('../types/effectBlock').EffectBlockId,
            uebData.settings,
          );
        }
        if (uebData.enabled !== undefined) {
          useTimelineStore.getState().toggleEffectBlockEnabled(
            browserUpdateId as import('../types/effectBlock').EffectBlockId,
          );
        }
        console.log('[MCP] Effect block updated:', uebData.blockId);
        break;
      }

      case 'add_effect_keyframe': {
        const aekData = data as {
          blockId: string;
          propertyPath: string;
          frame: number;
          value: number | boolean | string;
          keyframeId?: string;
        };
        // Translate server block ID → browser block ID
        const browserBlkId = this.effectBlockIdMap.get(aekData.blockId) ?? aekData.blockId;
        const timeline = useTimelineStore.getState();

        // Find existing property track ID, or create one
        let propTrackId: string | null = null;
        const allEffectOwners = [
          ...timeline.layers.flatMap(l => (l.effectTracks ?? []).map(et => et)),
          ...timeline.layerGroups.flatMap(g => (g.effectTracks ?? []).map(et => et)),
          ...timeline.globalEffects,
        ];
        for (const et of allEffectOwners) {
          if (et.effectBlock.id === browserBlkId) {
            const existingPt = et.effectBlock.propertyTracks.find(
              pt => pt.propertyPath === aekData.propertyPath
            );
            if (existingPt) {
              propTrackId = existingPt.id as string;
            }
            break;
          }
        }

        // If no existing track, create one
        if (!propTrackId) {
          propTrackId = timeline.addEffectPropertyTrack(
            browserBlkId as import('../types/effectBlock').EffectBlockId,
            aekData.propertyPath,
          );
        }

        if (propTrackId) {
          timeline.addEffectKeyframe(
            browserBlkId as import('../types/effectBlock').EffectBlockId,
            propTrackId as import('../types/effectBlock').EffectPropertyTrackId,
            aekData.frame,
            aekData.value,
          );
          console.log('[MCP] Effect keyframe added:', aekData.propertyPath, '=', aekData.value, 'at frame', aekData.frame);
        } else {
          console.warn('[MCP] Could not add effect keyframe: property track creation failed for block', browserBlkId);
        }
        break;
      }

      case 'remove_effect_keyframe': {
        const rekData = data as { blockId: string; keyframeId: string };
        const browserRekId = this.effectBlockIdMap.get(rekData.blockId) ?? rekData.blockId;
        const tsState = useTimelineStore.getState();
        const allOwners = [
          ...tsState.layers.flatMap(l => (l.effectTracks ?? []).map(et => ({ et, ownerId: l.id }))),
          ...tsState.layerGroups.flatMap(g => (g.effectTracks ?? []).map(et => ({ et, ownerId: g.id }))),
          ...tsState.globalEffects.map(et => ({ et, ownerId: null })),
        ];
        for (const { et } of allOwners) {
          if (et.effectBlock.id === browserRekId) {
            for (const pt of et.effectBlock.propertyTracks) {
              const kf = pt.keyframes.find(k => k.id === rekData.keyframeId);
              if (kf) {
                tsState.removeEffectKeyframe(
                  browserRekId as import('../types/effectBlock').EffectBlockId,
                  pt.id,
                  rekData.keyframeId as import('../types/timeline').KeyframeId,
                );
                break;
              }
            }
            break;
          }
        }
        console.log('[MCP] Effect keyframe removed:', rekData.keyframeId);
        break;
      }

      case 'create_group': {
        const grpData = data as { group: { id: string; name: string; childLayerIds: string[] } };
        console.log('[MCP] Group created:', grpData.group.name);
        break;
      }

      case 'ungroup_layers': {
        const ungroupData = data as { groupId: string };
        console.log('[MCP] Group dissolved:', ungroupData.groupId);
        break;
      }

      case 'set_frame_rate': {
        const fpsData = data as { fps: number };
        console.log('[MCP] Frame rate changed:', fpsData.fps, 'fps');
        break;
      }

      case 'set_timeline_duration': {
        const durData = data as { durationFrames: number };
        console.log('[MCP] Timeline duration changed:', durData.durationFrames, 'frames');
        break;
      }
      
      default:
        console.log('[MCP] Unhandled state change type:', type);
    }
  }

  private async executeCommand(command: MCPCommand): Promise<MCPCommandApplied | undefined> {
    console.log('[MCP] Executing command:', command.type);
    
    switch (command.type) {
      case 'set_cell':
        this.handleSetCell(command);
        break;
        
      case 'set_cells_batch':
        return this.handleSetCellsBatch(command);
        
      case 'clear_cell':
        this.handleClearCell(command);
        break;
        
      case 'resize_canvas':
        this.handleResizeCanvas(command);
        break;
        
      case 'set_canvas_data':
        this.handleSetCanvasData(command);
        break;
        
      case 'add_frame':
        this.handleAddFrame(command);
        break;
        
      case 'delete_frame':
        this.handleDeleteFrame(command);
        break;
        
      case 'go_to_frame':
        this.handleGoToFrame(command);
        break;
        
      case 'set_frame_duration':
        return this.handleSetFrameDuration(command);

      case 'set_frame_rate':
        return this.handleSetFrameRate(command);
        
      case 'set_frame_data':
        this.handleSetFrameData(command);
        break;
        
      case 'undo':
        this.handleUndo();
        break;
        
      case 'redo':
        this.handleRedo();
        break;
        
      case 'new_project':
        this.handleNewProject(command);
        break;
        
      case 'load_project':
        return this.handleLoadProject(command);
        
      case 'set_foreground_color':
        this.handleSetForegroundColor(command);
        break;
        
      case 'set_background_color':
        this.handleSetBackgroundColor(command);
        break;
        
      case 'select_rectangle':
        this.handleSelectRectangle(command);
        break;
        
      case 'clear_selection':
        this.handleClearSelection();
        break;

      // Post Effect commands
      case 'add_post_effect':
        this.handleAddPostEffect(command);
        break;

      case 'remove_post_effect':
        this.handleRemovePostEffect(command);
        break;

      case 'update_post_effect':
        this.handleUpdatePostEffect(command);
        break;

      case 'set_post_effect_keyframe':
        this.handleSetPostEffectKeyframe(command);
        break;

      case 'remove_post_effect_keyframe':
        this.handleRemovePostEffectKeyframe(command);
        break;

      case 'list_post_effects':
        this.handleListPostEffects();
        break;

      case 'get_post_effect_presets':
        this.handleGetPostEffectPresets();
        break;
        
      default:
        throw new Error(`Unsupported browser command: ${(command as { type: string }).type}`);
    }
  }

  // ==========================================================================
  // Command Handlers
  // ==========================================================================

  private handleSetCell(cmd: { x: number; y: number; cell: Cell }): void {
    useCanvasStore.getState().setCell(cmd.x, cmd.y, cmd.cell);
  }

  private handleSetCellsBatch(cmd: {
    cells: Array<{ x: number; y: number; cell: Cell }>;
    frameIndex?: number;
  }): MCPCommandApplied {
    if (!Array.isArray(cmd.cells)) {
      throw new Error('set_cells_batch cells must be an array');
    }

    const canvas = useCanvasStore.getState();
    for (const update of cmd.cells) {
      if (
        !isRecord(update)
        || !Number.isInteger(update.x)
        || !Number.isInteger(update.y)
        || update.x < 0
        || update.x >= canvas.width
        || update.y < 0
        || update.y >= canvas.height
        || !isRecord(update.cell)
        || typeof update.cell.char !== 'string'
        || typeof update.cell.color !== 'string'
        || typeof update.cell.bgColor !== 'string'
      ) {
        throw new Error('set_cells_batch contains an invalid or out-of-bounds cell');
      }
    }

    if (cmd.frameIndex !== undefined && (!Number.isInteger(cmd.frameIndex) || cmd.frameIndex < 0)) {
      throw new Error('set_cells_batch frameIndex must be a non-negative integer');
    }

    this.flushCanvasToActiveContentFrame();

    const timeline = useTimelineStore.getState();
    const activeLayer = timeline.layers.find((layer) => layer.id === timeline.view.activeLayerId)
      ?? timeline.layers[0];
    if (!activeLayer) {
      throw new Error('set_cells_batch requires an active layer');
    }

    let targetFrameIndex = cmd.frameIndex;
    if (targetFrameIndex === undefined) {
      const currentContentFrame = getContentFrameAtTime(activeLayer, timeline.view.currentFrame);
      targetFrameIndex = currentContentFrame
        ? activeLayer.contentFrames.findIndex((frame) => frame.id === currentContentFrame.id)
        : -1;
    }

    const targetFrame = activeLayer.contentFrames[targetFrameIndex];
    if (!targetFrame) {
      throw new Error(`set_cells_batch frameIndex ${targetFrameIndex} is out of range`);
    }

    const nextData = new Map(targetFrame.data);
    let cellsChanged = 0;

    for (const { x, y, cell } of cmd.cells) {
      const key = `${x},${y}`;
      const previous = nextData.get(key);
      const removesCell = cell.char === ' '
        && cell.color === '#FFFFFF'
        && cell.bgColor === 'transparent';

      if (removesCell) {
        if (nextData.delete(key)) {
          cellsChanged += 1;
        }
        continue;
      }

      if (
        !previous
        || previous.char !== cell.char
        || previous.color !== cell.color
        || previous.bgColor !== cell.bgColor
      ) {
        nextData.set(key, { ...cell });
        cellsChanged += 1;
      }
    }

    timeline.updateContentFrameData(activeLayer.id, targetFrame.id, nextData);

    const currentContentFrame = getContentFrameAtTime(activeLayer, timeline.view.currentFrame);
    if (currentContentFrame?.id === targetFrame.id) {
      canvas.setActiveLayerId(activeLayer.id);
      canvas.setCanvasData(nextData);
      canvas.setDirty(false);
    }

    return {
      currentFrameIndex: timeline.view.currentFrame,
      cellsChanged,
    };
  }

  private handleClearCell(cmd: { x: number; y: number }): void {
    useCanvasStore.getState().clearCell(cmd.x, cmd.y);
  }

  private handleResizeCanvas(cmd: { width: number; height: number }): void {
    useCanvasStore.getState().setCanvasSize(cmd.width, cmd.height);
  }

  private handleSetCanvasData(cmd: { cells: Array<{ key: string; cell: Cell }> }): void {
    const newCells = new Map<string, Cell>();
    for (const { key, cell } of cmd.cells) {
      newCells.set(key, cell);
    }
    useCanvasStore.getState().setCanvasData(newCells);
  }

  private handleAddFrame(cmd: { atIndex?: number; cells?: Array<{ key: string; cell: Cell }>; duration?: number }): void {
    let canvasData: Map<string, Cell> | undefined;
    if (cmd.cells) {
      canvasData = new Map<string, Cell>();
      for (const { key, cell } of cmd.cells) {
        canvasData.set(key, cell);
      }
    }
    useAnimationStore.getState().addFrame(cmd.atIndex, canvasData, cmd.duration);
  }

  private handleDeleteFrame(cmd: { index: number }): void {
    useAnimationStore.getState().removeFrame(cmd.index);
  }

  private handleGoToFrame(cmd: { index: number }): void {
    useAnimationStore.getState().goToFrame(cmd.index);
  }

  private handleSetFrameDuration(cmd: { index: number; duration: number }): MCPCommandApplied {
    if (!Number.isInteger(cmd.index) || cmd.index < 0) {
      throw new Error('set_frame_duration index must be a non-negative integer');
    }
    if (!Number.isFinite(cmd.duration) || cmd.duration <= 0) {
      throw new Error('set_frame_duration duration must be greater than zero');
    }

    this.flushCanvasToActiveContentFrame();

    const timeline = useTimelineStore.getState();
    const activeLayer = timeline.layers.find((layer) => layer.id === timeline.view.activeLayerId)
      ?? timeline.layers[0];
    if (!activeLayer) {
      throw new Error('set_frame_duration requires an active layer');
    }

    const targetFrame = activeLayer.contentFrames[cmd.index];
    if (!targetFrame) {
      throw new Error(`set_frame_duration index ${cmd.index} is out of range`);
    }

    const durationFrames = Math.round(cmd.duration / (1000 / timeline.config.frameRate));
    if (!Number.isSafeInteger(durationFrames) || durationFrames < 1) {
      throw new Error('set_frame_duration does not map to a valid timeline duration');
    }

    const delta = durationFrames - targetFrame.durationFrames;
    const nextContentFrames = activeLayer.contentFrames.map((frame, index) => {
      if (index < cmd.index) {
        return frame;
      }
      if (index === cmd.index) {
        return { ...frame, durationFrames };
      }
      return { ...frame, startFrame: frame.startFrame + delta };
    });

    let previousEnd = 0;
    for (const [index, frame] of nextContentFrames.entries()) {
      if (
        !Number.isSafeInteger(frame.startFrame)
        || !Number.isSafeInteger(frame.durationFrames)
        || frame.startFrame < 0
        || frame.durationFrames < 1
        || (index > 0 && frame.startFrame < previousEnd)
      ) {
        throw new Error('set_frame_duration would create invalid or overlapping content frames');
      }
      previousEnd = frame.startFrame + frame.durationFrames;
    }

    const nextTimelineDuration = timeline.config.durationFrames + delta;
    const otherLayerEnd = timeline.layers
      .filter((layer) => layer.id !== activeLayer.id)
      .flatMap((layer) => layer.contentFrames)
      .reduce(
        (maxEnd, frame) => Math.max(maxEnd, frame.startFrame + frame.durationFrames),
        0,
      );
    const activeLayerEnd = nextContentFrames.reduce(
      (maxEnd, frame) => Math.max(maxEnd, frame.startFrame + frame.durationFrames),
      0,
    );

    if (
      !Number.isSafeInteger(nextTimelineDuration)
      || nextTimelineDuration < 1
      || activeLayerEnd > nextTimelineDuration
      || otherLayerEnd > nextTimelineDuration
    ) {
      throw new Error('set_frame_duration would create an invalid timeline duration');
    }

    const oldTargetEnd = targetFrame.startFrame + targetFrame.durationFrames;
    const newTargetEnd = targetFrame.startFrame + durationFrames;
    let nextCurrentFrame = timeline.view.currentFrame;

    if (nextCurrentFrame >= oldTargetEnd) {
      nextCurrentFrame += delta;
    } else if (nextCurrentFrame >= newTargetEnd) {
      nextCurrentFrame = newTargetEnd - 1;
    }
    nextCurrentFrame = Math.max(
      0,
      Math.min(nextCurrentFrame, nextTimelineDuration - 1),
    );

    useTimelineStore.setState((state) => ({
      layers: state.layers.map((layer) => (
        layer.id === activeLayer.id
          ? { ...layer, contentFrames: nextContentFrames }
          : layer
      )),
      config: {
        ...state.config,
        durationFrames: nextTimelineDuration,
        durationMs: (nextTimelineDuration / state.config.frameRate) * 1000,
      },
      view: {
        ...state.view,
        currentFrame: nextCurrentFrame,
      },
    }));

    this.syncCanvasToCurrentContentFrame();

    return {
      currentFrameIndex: nextCurrentFrame,
      durationMs: durationFrames * (1000 / timeline.config.frameRate),
    };
  }

  private handleSetFrameRate(cmd: { fps: number }): MCPCommandApplied {
    if (!Number.isFinite(cmd.fps) || cmd.fps <= 0) {
      throw new Error('set_frame_rate fps must be greater than zero');
    }

    useTimelineStore.getState().setFrameRate(cmd.fps, false);
    const applied = useTimelineStore.getState().config;

    if (applied.frameRate !== cmd.fps) {
      throw new Error(`set_frame_rate failed to apply ${cmd.fps} fps`);
    }

    return {
      frameRate: applied.frameRate,
      durationMs: applied.durationMs,
    };
  }

  private handleSetFrameData(cmd: { index: number; cells: Array<{ key: string; cell: Cell }> }): void {
    const data = new Map<string, Cell>();
    for (const { key, cell } of cmd.cells) {
      data.set(key, cell);
    }
    useAnimationStore.getState().setFrameData(cmd.index, data);
  }

  private handleUndo(): void {
    useToolStore.getState().undo();
  }

  private handleRedo(): void {
    useToolStore.getState().redo();
  }

  private handleNewProject(cmd: { width: number; height: number; backgroundColor?: string; name?: string }): void {
    // Reset canvas
    const canvasStore = useCanvasStore.getState();
    canvasStore.setCanvasSize(cmd.width, cmd.height);
    canvasStore.clearCanvas();
    if (cmd.backgroundColor) {
      canvasStore.setCanvasBackgroundColor(cmd.backgroundColor);
    }
    
    // Set project name
    if (cmd.name) {
      useProjectMetadataStore.getState().setProjectName(cmd.name);
    }
    
    // Reset animation
    useAnimationStore.getState().resetAnimation();
    
    // Clear history
    useToolStore.getState().clearHistory();
    
    // Clear selection
    useSelectionStore.getState().clearSelection();
  }

  private async handleLoadProject(cmd: { sessionData: unknown }): Promise<MCPCommandApplied> {
    await SessionImporter.importSessionData(cmd.sessionData);

    const timeline = useTimelineStore.getState();
    return {
      currentFrameIndex: timeline.view.currentFrame,
      frameRate: timeline.config.frameRate,
      durationMs: timeline.config.durationMs,
    };
  }

  private handleSetForegroundColor(cmd: { color: string }): void {
    useToolStore.getState().setSelectedColor(cmd.color);
  }

  private handleSetBackgroundColor(cmd: { color: string }): void {
    useToolStore.getState().setSelectedBgColor(cmd.color);
  }

  private handleSelectRectangle(cmd: { x: number; y: number; width: number; height: number }): void {
    // Build a Set of cell keys for the rectangle
    const cells = new Set<string>();
    for (let y = cmd.y; y < cmd.y + cmd.height; y++) {
      for (let x = cmd.x; x < cmd.x + cmd.width; x++) {
        cells.add(`${x},${y}`);
      }
    }
    useSelectionStore.getState().setSelection(cells);
  }

  private handleClearSelection(): void {
    useSelectionStore.getState().clearSelection();
  }

  // ==========================================================================
  // Post Effect Command Handlers
  // ==========================================================================

  private handleAddPostEffect(cmd: { postEffectType: string; startFrame?: number; durationFrames?: number; settings?: Record<string, unknown> }): void {
    const tl = useTimelineStore.getState();
    const startFrame = cmd.startFrame ?? 0;
    const durationFrames = cmd.durationFrames ?? tl.config.durationFrames;
    const blockId = tl.addPostEffectBlock(cmd.postEffectType, startFrame, durationFrames);
    if (blockId && cmd.settings) {
      tl.updatePostEffectBlockSettings(blockId, cmd.settings);
    }
    if (blockId) {
      // Store mapping for server reference
      this.postEffectBlockIdMap.set(cmd.postEffectType + '-' + Date.now(), blockId as string);
      console.log('[MCP] Added post effect:', cmd.postEffectType, 'blockId:', blockId);
    }
  }

  private handleRemovePostEffect(cmd: { blockId: string }): void {
    const tl = useTimelineStore.getState();
    const track = tl.postEffectTracks.find((t) => (t.effectBlock.id as string) === cmd.blockId);
    if (track) {
      tl.removePostEffectBlock(track.effectBlock.id);
      console.log('[MCP] Removed post effect:', cmd.blockId);
    }
  }

  private handleUpdatePostEffect(cmd: { blockId: string; settings?: Record<string, unknown>; startFrame?: number; durationFrames?: number; enabled?: boolean }): void {
    const tl = useTimelineStore.getState();
    const track = tl.postEffectTracks.find((t) => (t.effectBlock.id as string) === cmd.blockId);
    if (!track) return;
    const blockId = track.effectBlock.id;

    if (cmd.settings) {
      tl.updatePostEffectBlockSettings(blockId, cmd.settings);
    }
    if (cmd.startFrame !== undefined || cmd.durationFrames !== undefined) {
      tl.updatePostEffectBlockTiming(
        blockId,
        cmd.startFrame ?? track.effectBlock.startFrame,
        cmd.durationFrames ?? track.effectBlock.durationFrames,
      );
    }
    if (cmd.enabled !== undefined && cmd.enabled !== track.effectBlock.enabled) {
      tl.togglePostEffectBlockEnabled(blockId);
    }
  }

  private handleSetPostEffectKeyframe(cmd: { blockId: string; propertyPath: string; frame: number; value: number | boolean | string }): void {
    const tl = useTimelineStore.getState();
    const track = tl.postEffectTracks.find((t) => (t.effectBlock.id as string) === cmd.blockId);
    if (!track) return;
    const blockId = track.effectBlock.id;

    // Ensure property track exists
    let propTrack = track.effectBlock.propertyTracks.find((pt) => pt.propertyPath === cmd.propertyPath);
    if (!propTrack) {
      const ptId = tl.addPostEffectPropertyTrack(blockId, cmd.propertyPath);
      if (!ptId) return;
      // Re-read after creating
      const updatedTrack = useTimelineStore.getState().postEffectTracks.find((t) => t.effectBlock.id === blockId);
      propTrack = updatedTrack?.effectBlock.propertyTracks.find((pt) => pt.propertyPath === cmd.propertyPath);
      if (!propTrack) return;
    }

    tl.addPostEffectKeyframe(blockId, propTrack.id, cmd.frame, cmd.value);
  }

  private handleRemovePostEffectKeyframe(cmd: { blockId: string; propertyPath: string; frame: number }): void {
    const tl = useTimelineStore.getState();
    const track = tl.postEffectTracks.find((t) => (t.effectBlock.id as string) === cmd.blockId);
    if (!track) return;

    const propTrack = track.effectBlock.propertyTracks.find((pt) => pt.propertyPath === cmd.propertyPath);
    if (!propTrack) return;

    const kf = propTrack.keyframes.find((k) => k.frame === cmd.frame);
    if (kf) {
      tl.removePostEffectKeyframe(track.effectBlock.id, propTrack.id, kf.id);
    }
  }

  private handleListPostEffects(): void {
    const tl = useTimelineStore.getState();
    const effects = tl.postEffectTracks.map((t) => ({
      blockId: t.effectBlock.id as string,
      type: t.effectBlock.postEffectType,
      enabled: t.effectBlock.enabled,
      startFrame: t.effectBlock.startFrame,
      durationFrames: t.effectBlock.durationFrames,
      settings: { ...t.effectBlock.settings },
    }));
    console.log('[MCP] Post effects list:', JSON.stringify(effects));
    // Send back via WebSocket if connected
    this.send({ type: 'post_effects_list', effects });
  }

  private handleGetPostEffectPresets(): void {
    // Dynamic import to avoid pulling in registry at init time
    import('../registry/postEffectRegistry').then(({ getAllPostEffects }) => {
      const presets = getAllPostEffects().map((entry) => ({
        type: entry.type,
        name: entry.name,
        category: entry.category,
        description: entry.description,
        defaultSettings: { ...entry.defaultSettings },
        properties: entry.propertyDefinitions.map((d) => ({
          path: d.path,
          displayName: d.displayName,
          valueType: d.valueType,
          defaultValue: d.defaultValue,
          min: d.min,
          max: d.max,
          step: d.step,
          unit: d.unit,
          options: d.options,
        })),
      }));
      console.log('[MCP] Post effect presets:', JSON.stringify(presets));
      this.send({ type: 'post_effect_presets', presets });
    });
  }

  // Post effect block ID mapping (server ref → browser ID)
  private postEffectBlockIdMap = new Map<string, string>();

  // ==========================================================================
  // Export Request Handler
  // ==========================================================================

  private async handleExportRequest(request: MCPExportRequest): Promise<void> {
    console.log('[MCP] Export request received:', request.exportType, request.format);

    try {
      // Flush canvas cells to timeline so the export sees latest data
      this.flushCanvasToActiveContentFrame();

      // Dynamically import to avoid circular deps and keep initial bundle small
      const { ExportDataCollector } = await import('../utils/exportDataCollector');
      const { ExportRenderer } = await import('../utils/exportRenderer');

      // Collect export data from current app state
      const exportData = ExportDataCollector.collect();

      // If a specific frame index was requested, navigate to it first
      if (request.settings.frameIndex !== undefined && typeof request.settings.frameIndex === 'number') {
        exportData.currentFrameIndex = request.settings.frameIndex;
      }

      // Create a renderer that captures the blob instead of saving via file-saver
      let capturedBlob: Blob | null = null;
      const renderer = new ExportRenderer();

      if (request.exportType === 'image') {
        const imageSettings = {
          sizeMultiplier: (request.settings.sizeMultiplier as 1 | 2 | 3 | 4) ?? 1,
          includeGrid: (request.settings.includeGrid as boolean) ?? false,
          format: (request.settings.format as 'png' | 'jpg' | 'svg') ?? 'png',
          quality: (request.settings.quality as number) ?? 90,
          svgSettings: {
            includeGrid: (request.settings.includeGrid as boolean) ?? false,
            textAsOutlines: false,
            includeBackground: true,
            prettify: true,
          },
        };

        if (imageSettings.format === 'svg') {
          // SVG export produces a string, not a blob via canvas
          // We'll capture it by overriding the save
          capturedBlob = await this.captureExportBlob(
            () => renderer.exportSvg(exportData, imageSettings, request.filename),
          );
        } else {
          capturedBlob = await this.captureExportBlob(
            () => renderer.exportImage(exportData, imageSettings, request.filename),
          );
        }
      } else if (request.exportType === 'video') {
        const videoSettings = {
          sizeMultiplier: (request.settings.sizeMultiplier as 1 | 2 | 4) ?? 1,
          frameRate: (request.settings.frameRate as number | 'auto') ?? 'auto',
          frameRange: request.settings.frameRange === 'all'
            ? { start: 0, end: exportData.frames.length - 1 }
            : (request.settings.frameRange as { start: number; end: number }),
          quality: (request.settings.quality as 'high' | 'medium' | 'low') ?? 'high',
          crf: (request.settings.crf as number) ?? 24,
          format: (request.settings.format as 'webm' | 'mp4') ?? 'mp4',
          includeGrid: (request.settings.includeGrid as boolean) ?? false,
          loops: (request.settings.loops as 'none' | '2x' | '4x' | '8x') ?? 'none',
        };

        capturedBlob = await this.captureExportBlob(
          () => renderer.exportVideo(exportData, videoSettings, request.filename),
        );
      }

      if (capturedBlob) {
        // Convert blob to base64
        const base64 = await this.blobToBase64(capturedBlob);
        const result: MCPExportResult = {
          type: 'export_result',
          requestId: request.requestId,
          success: true,
          data: base64,
          mimeType: capturedBlob.type,
          filename: request.filename,
          bytes: capturedBlob.size,
        };
        this.send(result);
        console.log('[MCP] Export complete, sent', capturedBlob.size, 'bytes');
      } else {
        this.send({
          type: 'export_result',
          requestId: request.requestId,
          success: false,
          error: 'Export produced no data',
        } as MCPExportResult);
      }
    } catch (err) {
      console.error('[MCP] Export failed:', err);
      this.send({
        type: 'export_result',
        requestId: request.requestId,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      } as MCPExportResult);
    }
  }

  /**
   * Intercept file-saver's saveAs to capture the blob instead of downloading.
   * Uses a global intercept that patches the anchor click mechanism.
   */
  private async captureExportBlob(exportFn: () => Promise<void>): Promise<Blob | null> {
    let captured: Blob | null = null;

    // Intercept by patching HTMLAnchorElement.click and URL.createObjectURL
    // file-saver creates an <a> element with a blob URL and clicks it
    const originalClick = HTMLAnchorElement.prototype.click;
    const originalCreateObjectURL = URL.createObjectURL;

    URL.createObjectURL = (obj: Blob | MediaSource) => {
      if (obj instanceof Blob) {
        captured = obj;
      }
      return originalCreateObjectURL.call(URL, obj);
    };

    HTMLAnchorElement.prototype.click = function() {
      // If we captured a blob, suppress the download
      if (captured) return;
      return originalClick.call(this);
    };

    try {
      await exportFn();
    } finally {
      HTMLAnchorElement.prototype.click = originalClick;
      URL.createObjectURL = originalCreateObjectURL;
    }

    return captured;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove the data:...;base64, prefix
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

// Singleton instance
let mcpClientInstance: MCPClient | null = null;

/**
 * Get or create the MCP client singleton
 */
export function createMCPClient(): MCPClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new MCPClient();
  }
  return mcpClientInstance;
}
