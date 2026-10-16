/**
 * MCP WebSocket Client
 *
 * Connects to the ascii-motion-mcp server running in --live mode. The browser
 * is authoritative: v3 servers send typed operations (`op_request`, or
 * canonical `command_request`) that run through the validated operation
 * runtime; legacy servers' commands and notifications are adapted onto the
 * same operations (see legacyAdapters.ts).
 */

import type { Cell } from '../types';
import { useCanvasStore } from '../stores/canvasStore';
import { useProjectMetadataStore } from '../stores/projectMetadataStore';
import { useTimelineStore } from '../stores/timelineStore';
import { getContentFrameAtTime } from '../utils/layerCompositing';
import { SessionImporter } from '../utils/sessionImporter';
import { navigateToFrameAtomically } from './frameNavigation';
import { useMCPStore } from './store';
import { serializeSnapshotLayer } from './snapshotSerialization';
import { executeGeneratorCommand, isGeneratorCommand } from './generatorCommands';
import {
  BRIDGE_CONTRACT_VERSION,
  BRIDGE_PROTOCOL,
  BRIDGE_PROTOCOL_VERSION,
  exportFormatNames,
  getOperationContract,
} from './contract/operations';
import { BRIDGE_CONTRACT_HASH } from './contract/contractHash.generated';
import {
  getDocumentIdentity,
  markDocumentReplaced,
  onDocumentChanged,
  runOperation,
  type OperationOutcome,
} from './operations/runtime';
import { flushCanvasToTimeline } from './operations/state';
import { registerAllOperationHandlers } from './operations/handlers';
import { buildCapabilities, EXPORT_FORMATS, readNativeDocument } from './operations/handlers/document';
import { renderExport } from './operations/handlers/io';
import { LegacyNotificationAdapter, legacyCommandCall, runLegacyCall } from './legacyAdapters';
import { VERSION, BUILD_HASH } from '../constants/version';
import type {
  MCPClientAuth,
  MCPClientHeartbeat,
  MCPClientStateSnapshot,
  MCPCommand,
  MCPCommandApplied,
  MCPCommandResult,
  MCPExportRequest,
  MCPExportResult,
  MCPServerMessage,
} from './types';

type ExportFormat = (typeof exportFormatNames)[number];

const DEFAULT_PORT = 9876;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const RECONNECT_DELAY = 3000; // 3 seconds
const LEGACY_RESYNC_DELAY = 100;

/** Command types understood by pre-v3 servers' `command`/`command_request`. */
const LEGACY_COMMAND_TYPES = new Set([
  'set_cell', 'set_cells_batch', 'clear_cell', 'resize_canvas', 'set_canvas_data', 'add_frame', 'delete_frame',
  'go_to_frame', 'set_frame_duration', 'set_frame_rate', 'set_frame_data', 'undo', 'redo', 'new_project',
  'load_project', 'set_foreground_color', 'set_background_color', 'select_rectangle', 'clear_selection',
  'add_post_effect', 'remove_post_effect', 'update_post_effect', 'set_post_effect_keyframe',
  'remove_post_effect_keyframe', 'list_post_effects', 'get_post_effect_presets',
  'get_generator_catalog', 'add_generator_layer', 'update_generator_layer', 'set_generator_property',
  'set_generator_keyframes', 'remove_generator_keyframes', 'reset_generator', 'randomize_generator_seed',
  'get_generator_state', 'render_generator_frames', 'bake_generator_layer',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export class MCPClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private sessionId: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private port: number = DEFAULT_PORT;
  private autoReconnect: boolean = true;
  /** Set once the server speaks protocol v3; legacy notifications are then ignored. */
  private v3 = false;
  private inbox: Promise<void> = Promise.resolve();
  private unsubscribeDocChanged: (() => void) | null = null;
  private resyncTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly notifications = new LegacyNotificationAdapter();

  constructor() {
    this.sessionId = this.generateSessionId();
    registerAllOperationHandlers();
  }

  /**
   * Connect to the MCP server
   */
  connect(token: string, port: number = DEFAULT_PORT): Promise<void> {
    // An explicit connect re-enables reconnects after a prior disconnect().
    this.autoReconnect = true;
    return new Promise((resolve, reject) => {
      this.token = token;
      this.port = port;

      const url = `ws://127.0.0.1:${port}?token=${encodeURIComponent(token)}`;

      useMCPStore.getState().setConnectionState('connecting');
      useMCPStore.getState().setServerUrl(`ws://127.0.0.1:${port}`);

      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('[MCP] Connected to server');
          useMCPStore.getState().setConnectionState('connected');
          useMCPStore.getState().setSessionId(this.sessionId);

          this.v3 = false;
          this.notifications.reset();
          this.sendAuth();
          this.sendHello();
          this.startHeartbeat();
          this.unsubscribeDocChanged?.();
          this.unsubscribeDocChanged = onDocumentChanged((event) => {
            this.send({ type: 'doc_changed', ...event });
          });

          // Small delay to ensure connection is fully established
          setTimeout(() => this.sendStateSnapshot(), 100);

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
   * Send a state snapshot. v3 fields carry the native document; the legacy
   * canvas/animation/layers fields remain for pre-v3 servers.
   */
  sendStateSnapshot(requestId?: string): void {
    if (!this.isConnected()) return;

    this.flushCanvasToActiveContentFrame();
    const { documentId, revision } = getDocumentIdentity();
    const canvas = useCanvasStore.getState();
    const projectMeta = useProjectMetadataStore.getState();
    const timeline = useTimelineStore.getState();

    const activeLayer = timeline.layers.find((l) => l.id === timeline.view.activeLayerId) ?? timeline.layers[0];
    type CellRecord = { char: string; color: string; bgColor: string };
    const toRecord = (data: Map<string, Cell>): Record<string, CellRecord> => {
      const out: Record<string, CellRecord> = {};
      data.forEach((cell, key) => { out[key] = { char: cell.char, color: cell.color, bgColor: cell.bgColor }; });
      return out;
    };
    const contentFrames = activeLayer?.contentFrames ?? [];
    const frames = contentFrames.map((cf) => ({
      id: cf.id,
      name: cf.name,
      duration: cf.durationFrames * (1000 / timeline.config.frameRate),
      data: toRecord(cf.data),
    }));
    // Legacy servers index `frames` with this value, so send the ordinal of
    // the content frame under the playhead, not the timeline frame.
    const current = activeLayer ? getContentFrameAtTime(activeLayer, timeline.view.currentFrame) : null;
    const ordinal = current ? contentFrames.findIndex((cf) => cf.id === current.id) : -1;
    const legacyFrameIndex = ordinal >= 0 ? ordinal : Math.max(0, Math.min(contentFrames.length - 1, timeline.view.currentFrame));

    const snapshot: MCPClientStateSnapshot & Record<string, unknown> = {
      type: 'state_snapshot',
      ...(requestId ? { requestId } : {}),
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      document: readNativeDocument(),
      documentId,
      revision,
      activeLayerId: timeline.view.activeLayerId ?? null,
      currentFrame: timeline.view.currentFrame,
      canvas: {
        width: canvas.width,
        height: canvas.height,
        cellCount: canvas.getCellCount(),
        backgroundColor: canvas.canvasBackgroundColor,
        cells: toRecord(canvas.cells),
      },
      animation: {
        frameCount: contentFrames.length,
        currentFrameIndex: legacyFrameIndex,
        isPlaying: timeline.view.isPlaying,
        looping: timeline.view.looping,
        frameRate: timeline.config.frameRate,
        frames,
      },
      project: {
        name: projectMeta.projectName,
      },
      postEffects: timeline.postEffectTracks.length > 0
        ? timeline.postEffectTracks.map((t) => ({
            blockId: t.effectBlock.id as string,
            type: t.effectBlock.postEffectType,
            enabled: t.effectBlock.enabled,
            startFrame: t.effectBlock.startFrame,
            durationFrames: t.effectBlock.durationFrames,
            settings: { ...t.effectBlock.settings },
          }))
        : undefined,
      layers: timeline.layers.map(serializeSnapshotLayer),
      layerGroups: timeline.layerGroups.map((g) => ({
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
      timeline: {
        frameRate: timeline.config.frameRate,
        durationFrames: timeline.config.durationFrames,
        looping: timeline.view.looping,
      },
    };

    this.send(snapshot);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /** Persist pending canvas edits into the active content frame (debounced sync). */
  private flushCanvasToActiveContentFrame(): void {
    flushCanvasToTimeline();
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

  private sendHello(): void {
    const { documentId, revision } = getDocumentIdentity();
    const meta = useProjectMetadataStore.getState();
    this.send({
      type: 'hello',
      protocol: BRIDGE_PROTOCOL,
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      contractVersion: BRIDGE_CONTRACT_VERSION,
      contractHash: BRIDGE_CONTRACT_HASH,
      app: { version: VERSION, build: BUILD_HASH },
      sessionId: this.sessionId,
      document: { documentId, projectId: meta.currentProjectId ?? null, name: meta.projectName, revision },
      capabilities: buildCapabilities(),
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;

    console.log(`[MCP] Reconnecting in ${RECONNECT_DELAY}ms...`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.token && this.autoReconnect) {
        this.connect(this.token, this.port).catch(() => {
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

    if (this.resyncTimer) {
      clearTimeout(this.resyncTimer);
      this.resyncTimer = null;
    }

    this.unsubscribeDocChanged?.();
    this.unsubscribeDocChanged = null;

    useMCPStore.getState().setConnectionState('disconnected');
  }

  private send(message: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /** Serialize all inbound work so results are emitted in arrival order. */
  private enqueue(task: () => Promise<void> | void): void {
    this.inbox = this.inbox.then(task).catch((error) => console.error('[MCP] Message handling failed:', error));
  }

  private handleMessage(data: string): void {
    let message: unknown;
    try {
      message = JSON.parse(data);
    } catch (error) {
      console.error('[MCP] Failed to parse message:', error);
      return;
    }
    if (!isRecord(message)) {
      console.error('[MCP] MCP message must be an object');
      return;
    }

    if (message.protocolVersion === BRIDGE_PROTOCOL_VERSION) this.v3 = true;

    if (message.jsonrpc === '2.0' && typeof message.method === 'string') {
      const { method, params } = message as { method: string; params: unknown };
      this.enqueue(() => this.handleNotification(method, params));
      return;
    }

    switch (message.type) {
      case 'op_request':
        this.v3 = true;
        this.enqueue(() => this.handleOpRequest(message));
        return;
      case 'command_request':
        this.enqueue(() => this.handleCommandRequest(message));
        return;
      case 'state_request': {
        const requestId = typeof message.requestId === 'string' ? message.requestId : undefined;
        this.enqueue(() => this.sendStateSnapshot(requestId));
        return;
      }
      case 'export_request':
        this.enqueue(() => this.handleExportRequest(message as unknown as MCPExportRequest));
        return;
    }

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
          const command = legacyMessage.command;
          this.enqueue(async () => {
            try {
              await this.executeLegacyCommand(command);
              useMCPStore.getState().incrementCommandCount();
            } catch (error) {
              console.error('[MCP] Legacy command failed:', error);
            }
          });
        }
        break;

      case 'error':
        console.error('[MCP] Server error:', legacyMessage.error);
        break;
    }
  }

  private async handleOpRequest(message: Record<string, unknown>): Promise<void> {
    const requestId = typeof message.requestId === 'string' ? message.requestId : '';
    const op = typeof message.op === 'string' ? message.op : '';
    const expectedRevision = typeof message.expectedRevision === 'number' ? message.expectedRevision : undefined;
    const outcome = await runOperation(op, message.input ?? {}, { expectedRevision });
    this.send(outcome.ok
      ? { type: 'op_result', requestId, op, ok: true, result: outcome.result, revision: outcome.revision, documentId: outcome.documentId }
      : { type: 'op_result', requestId, op, ok: false, error: outcome.error, revision: outcome.revision, documentId: outcome.documentId });
    useMCPStore.getState().incrementCommandCount();
  }

  private isCanonicalRequest(message: Record<string, unknown>, type: string): boolean {
    if (!getOperationContract(type)) return false;
    if (message.protocolVersion === BRIDGE_PROTOCOL_VERSION || typeof message.expectedRevision === 'number') return true;
    return this.v3 || !LEGACY_COMMAND_TYPES.has(type);
  }

  private async handleCommandRequest(message: Record<string, unknown>): Promise<void> {
    const requestId = message.requestId;
    if (typeof requestId !== 'string' || requestId.length === 0) {
      console.error('[MCP] command_request is missing a requestId');
      return;
    }

    const command = message.command;
    if (!isRecord(command) || typeof command.type !== 'string') {
      this.send({ type: 'command_result', requestId, success: false, error: 'command_request is missing a valid command', errorCode: 'INVALID_INPUT' });
      return;
    }

    if (this.isCanonicalRequest(message, command.type)) {
      this.v3 = true;
      const { type, ...input } = command;
      const expectedRevision = typeof message.expectedRevision === 'number' ? message.expectedRevision : undefined;
      const outcome = await runOperation(type as string, input, { expectedRevision });
      this.send(this.toCommandResult(requestId, outcome));
    } else {
      let result: MCPCommandResult;
      try {
        const applied = await this.executeLegacyCommand(command as unknown as MCPCommand);
        result = applied
          ? { type: 'command_result', requestId, success: true, applied }
          : { type: 'command_result', requestId, success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result = { type: 'command_result', requestId, success: false, error: message === 'undefined' ? 'Unknown browser command error' : message };
      }
      this.send(result);
    }
    useMCPStore.getState().incrementCommandCount();
  }

  private toCommandResult(requestId: string, outcome: OperationOutcome): Record<string, unknown> {
    if (outcome.ok) {
      return { type: 'command_result', requestId, success: true, applied: outcome.result, revision: outcome.revision, documentId: outcome.documentId };
    }
    return {
      type: 'command_result',
      requestId,
      success: false,
      error: outcome.error?.message ?? 'Operation failed',
      errorCode: outcome.error?.code ?? 'INTERNAL',
      ...(outcome.error?.details !== undefined ? { errorDetails: outcome.error.details } : {}),
      revision: outcome.revision,
      documentId: outcome.documentId,
    };
  }

  private async handleNotification(method: string, params: unknown): Promise<void> {
    if (method === 'notifications/connected') {
      return;
    }

    if (method === 'notifications/stateChanged') {
      const { type, data } = (isRecord(params) ? params : {}) as { type?: string; data?: unknown };
      if (typeof type === 'string') await this.handleStateChange(type, data);
      useMCPStore.getState().incrementCommandCount();
    }
  }

  /**
   * Legacy servers mutate their own copy, then notify. Replay the change as a
   * canonical operation, then resend the snapshot so the server adopts the
   * browser's authoritative state and IDs.
   */
  private async handleStateChange(type: string, data: unknown): Promise<void> {
    if (this.v3) {
      console.warn('[MCP] Ignoring legacy stateChanged notification from a v3 server:', type);
      return;
    }

    const d = isRecord(data) ? data : {};
    try {
      switch (type) {
        case 'go_to_frame':
          await this.handleGoToFrame({ index: d.index as number });
          break;
        case 'set_frame_duration':
          this.handleSetFrameDuration({ index: d.index as number, duration: d.duration as number });
          break;
        case 'set_frame_rate':
          this.handleSetFrameRate({ fps: d.fps as number });
          break;
        default: {
          const call = this.notifications.toCall(type, data);
          if (!call) {
            console.warn('[MCP] Unhandled legacy state change:', type);
            return;
          }
          if ('unsupported' in call) {
            console.warn('[MCP] Cannot replay %s: %s', type, call.unsupported);
            break;
          }
          const outcome = await runOperation(call.op, call.input);
          if (outcome.ok) this.notifications.learn(type, data, outcome);
          else console.warn('[MCP] Replaying %s failed:', type, outcome.error);
        }
      }
    } catch (error) {
      console.warn('[MCP] Replaying %s failed:', type, error);
    }
    this.scheduleLegacyResync();
  }

  private scheduleLegacyResync(): void {
    if (this.resyncTimer) return;
    this.resyncTimer = setTimeout(() => {
      this.resyncTimer = null;
      this.enqueue(() => this.sendStateSnapshot());
    }, LEGACY_RESYNC_DELAY);
  }

  /** Execute a legacy (pre-v3) command, returning its legacy `applied` payload. */
  private async executeLegacyCommand(command: MCPCommand): Promise<MCPCommandApplied | undefined> {
    switch (command.type) {
      case 'go_to_frame':
        return this.handleGoToFrame(command);
      case 'set_frame_duration':
        return this.handleSetFrameDuration(command);
      case 'set_frame_rate':
        return this.handleSetFrameRate(command);
      case 'load_project': {
        const applied = await this.handleLoadProject(command);
        markDocumentReplaced();
        return applied;
      }
      case 'list_post_effects':
        this.handleListPostEffects();
        return undefined;
      case 'get_post_effect_presets':
        this.handleGetPostEffectPresets();
        return undefined;
      case 'get_generator_catalog':
      case 'add_generator_layer':
      case 'update_generator_layer':
      case 'set_generator_property':
      case 'set_generator_keyframes':
      case 'remove_generator_keyframes':
      case 'reset_generator':
      case 'randomize_generator_seed':
      case 'get_generator_state':
      case 'render_generator_frames':
      case 'bake_generator_layer':
        return this.handleGeneratorCommand(command);
    }

    const call = legacyCommandCall(command as unknown as Record<string, unknown>);
    if (!call) {
      throw new Error(`Unsupported browser command: ${(command as { type: string }).type}`);
    }
    const result = await runLegacyCall(call);
    if (command.type === 'set_cells_batch') {
      return {
        currentFrameIndex: useTimelineStore.getState().view.currentFrame,
        cellsChanged: typeof result.changedCells === 'number' ? result.changedCells : 0,
      };
    }
    return undefined;
  }

  // ==========================================================================
  // Legacy acknowledged handlers (already validated and atomic)
  // ==========================================================================

  private async handleGoToFrame(cmd: { index: number }): Promise<MCPCommandApplied> {
    const currentFrameIndex = await navigateToFrameAtomically(cmd.index);
    return { currentFrameIndex };
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

  private async handleLoadProject(cmd: { sessionData: unknown }): Promise<MCPCommandApplied> {
    await SessionImporter.importSessionData(cmd.sessionData);

    const timeline = useTimelineStore.getState();
    return {
      currentFrameIndex: timeline.view.currentFrame,
      frameRate: timeline.config.frameRate,
      durationMs: timeline.config.durationMs,
    };
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

  // ==========================================================================
  // Generator Layer Command Handlers
  // ==========================================================================

  private handleGeneratorCommand(command: MCPCommand): MCPCommandApplied {
    if (!isGeneratorCommand(command)) {
      throw new Error(`Unsupported browser command: ${command.type}`);
    }
    if (command.type === 'add_generator_layer' || command.type === 'bake_generator_layer') {
      // Both change which layer the canvas shows; persist pending canvas edits first
      this.flushCanvasToActiveContentFrame();
    }
    return executeGeneratorCommand(command);
  }


  // ==========================================================================
  // Export Request Handler (legacy export_request → shared export renderer)
  // ==========================================================================

  private async handleExportRequest(request: MCPExportRequest): Promise<void> {
    const fail = (error: string) => this.send({ type: 'export_result', requestId: request.requestId, success: false, error } as MCPExportResult);
    try {
      const settings = (request.settings ?? {}) as Record<string, unknown>;
      const format = (typeof settings.format === 'string' ? settings.format : request.exportType === 'video' ? 'mp4' : 'png') as ExportFormat;
      if (!(format in EXPORT_FORMATS)) {
        fail(`Unsupported export format: ${String(settings.format)}`);
        return;
      }
      const allowed = EXPORT_FORMATS[format].options as Record<string, unknown>;
      const overrides: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(settings)) {
        if (key === 'format' || value === undefined) continue;
        if (key === 'frameIndex') {
          if ('frame' in allowed) overrides.frame = value;
          continue;
        }
        if (key === 'frameRange' && value === 'all') continue;
        if (key in allowed) overrides[key] = value;
      }
      const { artifact } = await renderExport(format, overrides, request.filename);
      const data = artifact.encoding === 'base64' ? artifact.data : utf8ToBase64(artifact.data);
      const result: MCPExportResult = {
        type: 'export_result',
        requestId: request.requestId,
        success: true,
        data,
        mimeType: artifact.mimeType,
        filename: request.filename || artifact.filename,
        bytes: artifact.bytes,
      };
      this.send(result);
    } catch (err) {
      console.error('[MCP] Export failed:', err);
      fail(err instanceof Error ? err.message : String(err));
    }
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
