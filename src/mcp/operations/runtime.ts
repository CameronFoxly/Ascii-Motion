/**
 * Bridge operation runtime: validation, revisioning, atomic history and
 * rollback around app-owned operation handlers.
 */
import {
  BRIDGE_DEFS,
  getOperationContract,
  type BridgeErrorCode,
  type OperationContract,
} from '../contract/operations';
import { validateSchema } from '../contract/schema';
import { useTimelineStore } from '../../stores/timelineStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';
import { useToolStore } from '../../stores/toolStore';
import { BridgeError, toBridgeError } from './errors';
import {
  captureDocumentState,
  flushCanvasToTimeline,
  restoreDocumentState,
  syncCanvasFromTimeline,
  type DocumentState,
} from './state';

export interface OperationContext {
  /** Do not record an undo entry for this mutation (e.g. copy without cut). */
  skipHistory(): void;
  /** Document identity changed (new/load/open) — history is cleared, new documentId. */
  replaceDocument(): void;
  /** Mutation produced no change; keep revision and history untouched. */
  noChange(): void;
  readonly contract: OperationContract;
}

export type OperationHandler = (input: Record<string, unknown>, ctx: OperationContext) => unknown | Promise<unknown>;

export interface OperationOutcome {
  ok: boolean;
  op: string;
  result?: unknown;
  error?: { code: BridgeErrorCode; message: string; details?: unknown };
  revision: number;
  documentId: string;
}

export type DocChangedSource = 'ui' | 'bridge' | 'history' | 'load';
type DocChangedListener = (event: { documentId: string; revision: number; source: DocChangedSource }) => void;

const handlers = new Map<string, OperationHandler>();

export function registerOperationHandlers(map: Record<string, OperationHandler>): void {
  for (const [name, handler] of Object.entries(map)) {
    if (!getOperationContract(name)) {
      throw new Error(`Handler registered for operation missing from contract: ${name}`);
    }
    handlers.set(name, handler);
  }
}

export function getRegisteredOperationNames(): string[] {
  return [...handlers.keys()];
}

function newDocumentId(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return `doc-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

let documentId = newDocumentId();
let revision = 0;
let suppressDepth = 0;
const listeners = new Set<DocChangedListener>();
let subscribed = false;

function emit(source: DocChangedSource): void {
  for (const listener of listeners) {
    try {
      listener({ documentId, revision, source });
    } catch (error) {
      console.error('[bridge] doc_changed listener failed', error);
    }
  }
}

/**
 * Track edits made outside the bridge (UI, keyboard undo) so revision checks
 * detect concurrent changes.
 */
function ensureSubscriptions(): void {
  if (subscribed) return;
  subscribed = true;
  let pendingSource: DocChangedSource | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const bump = () => {
    if (suppressDepth > 0) return;
    revision += 1;
    pendingSource = useToolStore.getState().isProcessingHistory ? 'history' : 'ui';
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      if (pendingSource) emit(pendingSource);
      pendingSource = null;
    }, 50);
  };
  useTimelineStore.subscribe((state, prev) => {
    if (
      state.layers !== prev.layers ||
      state.layerGroups !== prev.layerGroups ||
      state.globalEffects !== prev.globalEffects ||
      state.postEffectTracks !== prev.postEffectTracks ||
      state.config !== prev.config
    ) bump();
  });
  useCanvasStore.subscribe((state, prev) => {
    if (state.width !== prev.width || state.height !== prev.height || state.canvasBackgroundColor !== prev.canvasBackgroundColor) bump();
  });
  useProjectMetadataStore.subscribe((state, prev) => {
    if (state.projectName !== prev.projectName || state.projectDescription !== prev.projectDescription) bump();
  });
}

export function getDocumentIdentity(): { documentId: string; revision: number } {
  ensureSubscriptions();
  return { documentId, revision };
}

export function onDocumentChanged(listener: DocChangedListener): () => void {
  ensureSubscriptions();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Run app-side changes without counting them as external edits. */
export async function withSuppressedTracking<T>(run: () => T | Promise<T>): Promise<T> {
  suppressDepth += 1;
  try {
    return await run();
  } finally {
    suppressDepth -= 1;
  }
}

/**
 * A whole document was installed outside `runOperation` (legacy load path):
 * rotate the identity so stale reads cannot write into it. Revisions stay
 * monotonic.
 */
export function markDocumentReplaced(): void {
  ensureSubscriptions();
  documentId = newDocumentId();
  revision += 1;
  emit('load');
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Validate and execute one operation. Operations are serialized; a failing
 * mutation is rolled back so the document is never left half-applied.
 */
export function runOperation(
  name: string,
  rawInput: unknown,
  options: { expectedRevision?: number } = {},
): Promise<OperationOutcome> {
  const execution = queue.then(() => executeOperation(name, rawInput, options));
  queue = execution.catch(() => undefined);
  return execution;
}

function failure(op: string, error: BridgeError): OperationOutcome {
  return {
    ok: false,
    op,
    error: { code: error.code, message: error.message, ...(error.details !== undefined ? { details: error.details } : {}) },
    revision,
    documentId,
  };
}

async function executeOperation(
  name: string,
  rawInput: unknown,
  options: { expectedRevision?: number },
): Promise<OperationOutcome> {
  ensureSubscriptions();
  const contract = getOperationContract(name);
  const handler = handlers.get(name);
  if (!contract || !handler) {
    return failure(name, new BridgeError('UNKNOWN_OPERATION', `Unknown operation: ${name}`));
  }

  const input = rawInput === undefined ? {} : rawInput;
  const issues = validateSchema(input, contract.input, BRIDGE_DEFS, 'input');
  if (issues.length > 0) {
    return failure(name, new BridgeError('INVALID_INPUT', `Invalid input for ${name}: ${issues[0].path} ${issues[0].message}`, { issues }));
  }

  if (
    options.expectedRevision !== undefined &&
    (contract.kind === 'mutation' || contract.kind === 'io') &&
    options.expectedRevision !== revision
  ) {
    return failure(name, new BridgeError('CONFLICT', `Document revision is ${revision}, expected ${options.expectedRevision}`, { revision, expectedRevision: options.expectedRevision }));
  }

  const params = input as Record<string, unknown>;
  let skipHistory = false;
  let replaced = false;
  let unchanged = false;
  const ctx: OperationContext = {
    contract,
    skipHistory: () => { skipHistory = true; },
    replaceDocument: () => { replaced = true; },
    noChange: () => { unchanged = true; },
  };

  if (contract.kind !== 'mutation') {
    try {
      // Reads/exports see unsaved canvas edits; the flush is a no-op when clean.
      flushCanvasToTimeline();
      suppressDepth += 1;
      let result: unknown;
      try {
        result = await handler(params, ctx);
        if (contract.kind === 'view') syncCanvasFromTimeline();
      } finally {
        suppressDepth -= 1;
      }
      if (replaced) {
        documentId = newDocumentId();
        revision += 1;
        emit('load');
      }
      return { ok: true, op: name, result: result ?? {}, revision, documentId };
    } catch (error) {
      return failure(name, toBridgeError(error));
    }
  }

  flushCanvasToTimeline();
  let before: DocumentState;
  try {
    before = captureDocumentState();
  } catch (error) {
    return failure(name, new BridgeError('INTERNAL', `Could not snapshot document: ${String(error)}`));
  }

  // Handlers may reuse app actions that push their own history entries; the
  // operation records exactly one snapshot entry instead.
  const savedHistory = captureHistoryStack();
  suppressDepth += 1;
  let result: unknown;
  try {
    result = await handler(params, ctx);
  } catch (error) {
    try {
      restoreDocumentState(before);
      restoreHistoryStack(savedHistory);
    } catch (restoreError) {
      console.error('[bridge] rollback failed', restoreError);
    }
    suppressDepth -= 1;
    return failure(name, toBridgeError(error));
  }

  try {
    if (!skipHistory || unchanged) restoreHistoryStack(savedHistory);
    if (unchanged) {
      const unchangedPayload = asPayload(result);
      return { ok: true, op: name, result: { ...unchangedPayload, ids: collectIds(unchangedPayload), revision, documentId, noChange: true }, revision, documentId };
    }
    if (replaced) {
      useToolStore.getState().clearHistory();
      documentId = newDocumentId();
    } else if (!skipHistory) {
      const after = captureDocumentState();
      useToolStore.getState().pushToHistory({
        type: 'document_snapshot',
        timestamp: Date.now(),
        description: describe(name),
        data: { operation: name, previous: before, next: after },
      });
    }
    syncCanvasFromTimeline();
  } finally {
    suppressDepth -= 1;
  }

  revision += 1;
  emit(replaced ? 'load' : 'bridge');
  const payload = asPayload(result);
  return { ok: true, op: name, result: { ...payload, ids: collectIds(payload), revision, documentId }, revision, documentId };
}

function asPayload(result: unknown): Record<string, unknown> {
  return result && typeof result === 'object' && !Array.isArray(result) ? (result as Record<string, unknown>) : {};
}

/** Top-level `*Id`/`*Ids` string fields, mirrored into the stable `ids` map. */
export function collectIds(payload: Record<string, unknown>): Record<string, string | string[]> {
  const ids: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!/Ids?$/.test(key) || key === 'documentId') continue;
    if (typeof value === 'string') ids[key] = value;
    else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) ids[key] = value as string[];
  }
  return ids;
}

function captureHistoryStack(): { historyStack: unknown[]; historyPosition: number } {
  const { historyStack, historyPosition } = useToolStore.getState();
  return { historyStack: [...historyStack], historyPosition };
}

function restoreHistoryStack(saved: { historyStack: unknown[]; historyPosition: number }): void {
  useToolStore.setState(saved as Partial<ReturnType<typeof useToolStore.getState>>);
}

/** Operations that may not appear inside apply_operations. */
export const BATCH_EXCLUDED_OPERATIONS = new Set(['apply_operations', 'undo', 'redo', 'new_project', 'load_project']);

/**
 * apply_operations: runs sub-mutations inside the enclosing mutation, so the
 * runtime's capture/rollback/single-history-entry covers the whole batch.
 */
const applyOperationsHandler: OperationHandler = async (input) => {
  const steps = input.operations as Array<{ op: string; input?: Record<string, unknown> }>;
  const results: Array<{ op: string; result: unknown }> = [];
  for (let index = 0; index < steps.length; index += 1) {
    const { op: stepName, input: stepInput = {} } = steps[index];
    const fail = (code: BridgeErrorCode, message: string, details?: Record<string, unknown>): never => {
      throw new BridgeError(code, `apply_operations step ${index} (${stepName}): ${message}`, { index, op: stepName, ...details });
    };
    const stepContract = getOperationContract(stepName);
    const stepHandler = handlers.get(stepName);
    if (!stepContract || !stepHandler) fail('UNKNOWN_OPERATION', 'unknown operation');
    if (stepContract!.kind !== 'mutation' || BATCH_EXCLUDED_OPERATIONS.has(stepName)) {
      fail('INVALID_INPUT', `operation kind '${stepContract!.kind}' is not allowed in a batch`);
    }
    const issues = validateSchema(stepInput, stepContract!.input, BRIDGE_DEFS, `operations[${index}].input`);
    if (issues.length > 0) fail('INVALID_INPUT', `${issues[0].path} ${issues[0].message}`, { issues });
    const stepCtx: OperationContext = {
      contract: stepContract!,
      skipHistory: () => undefined,
      noChange: () => undefined,
      replaceDocument: () => fail('INVALID_INPUT', 'document-replacing operations are not allowed in a batch'),
    };
    try {
      flushCanvasToTimeline();
      const stepResult = await stepHandler!(stepInput, stepCtx);
      syncCanvasFromTimeline();
      const stepPayload = asPayload(stepResult);
      results.push({ op: stepName, result: { ...stepPayload, ids: collectIds(stepPayload) } });
    } catch (error) {
      const bridgeError = toBridgeError(error);
      const prior = bridgeError.details as Record<string, unknown> | undefined;
      if (prior && typeof prior === 'object' && prior.index === index) throw bridgeError;
      fail(bridgeError.code, bridgeError.message, bridgeError.details !== undefined ? { cause: bridgeError.details } : undefined);
    }
  }
  return { results };
};
handlers.set('apply_operations', applyOperationsHandler);

function describe(name: string): string {
  return `MCP: ${name.replace(/_/g, ' ')}`;
}

/** Test helper: reset identity counters. */
export function __resetRuntimeForTests(): void {
  documentId = newDocumentId();
  revision = 0;
  queue = Promise.resolve();
}
