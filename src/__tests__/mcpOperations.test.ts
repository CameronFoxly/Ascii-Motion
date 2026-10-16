import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BRIDGE_DEFS, BRIDGE_OPERATIONS, getOperationContract } from '../mcp/contract/operations';
import { validateSchema } from '../mcp/contract/schema';
import { registerAllOperationHandlers } from '../mcp/operations/handlers';
import {
  __resetRuntimeForTests,
  getRegisteredOperationNames,
  runOperation,
  type OperationOutcome,
} from '../mcp/operations/runtime';
import { registerAllEffects } from '../registry/effects';
import { registerAllPostEffects } from '../registry/postEffects';
import { registerAllGenerators } from '../registry/generators';
import { useCanvasStore } from '../stores/canvasStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useToolStore } from '../stores/toolStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useProjectMetadataStore } from '../stores/projectMetadataStore';

type Ok = OperationOutcome & { result: Record<string, unknown> };

async function run(op: string, input: Record<string, unknown> = {}, expectedRevision?: number): Promise<Ok> {
  const outcome = await runOperation(op, input, expectedRevision === undefined ? {} : { expectedRevision });
  return outcome as Ok;
}

async function ok(op: string, input: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const outcome = await run(op, input);
  if (!outcome.ok) throw new Error(`${op} failed: ${outcome.error?.code} ${outcome.error?.message}`);
  const issues = validateSchema(outcome.result, getOperationContract(op)!.result, BRIDGE_DEFS, 'result');
  expect(issues, `${op} result matches contract`).toEqual([]);
  return outcome.result;
}

async function readCells(): Promise<Array<{ x: number; y: number; char: string; color?: string }>> {
  const result = await ok('read_cells', { scope: 'layer', format: 'cells', includeEffects: false });
  return result.cells as Array<{ x: number; y: number; char: string; color?: string }>;
}

beforeAll(() => {
  registerAllEffects();
  registerAllPostEffects();
  registerAllGenerators();
  registerAllOperationHandlers();
});

beforeEach(() => {
  useTimelineStore.getState().createNewProject();
  useCanvasStore.setState({ width: 20, height: 10, cells: new Map(), isDirty: false });
  useProjectMetadataStore.getState().resetProject();
  useToolStore.getState().clearHistory();
  useToolStore.getState().clearSelection();
  useSelectionStore.getState().clearSelection();
  __resetRuntimeForTests();
});

describe('bridge contract parity', () => {
  it('registers exactly one handler per contract operation', () => {
    const contract = BRIDGE_OPERATIONS.map((o) => o.name).sort();
    expect(getRegisteredOperationNames().sort()).toEqual(contract);
  });

  it('marks only read/view and purely additive operations as non-destructive', () => {
    for (const op of BRIDGE_OPERATIONS) {
      if (op.kind === 'read' || op.kind === 'view') expect(op.destructive, op.name).toBe(false);
    }
    for (const name of ['set_cells', 'update_layer', 'replace_in_cells', 'undo', 'redo', 'new_project', 'load_project', 'apply_operations', 'save_cloud_project']) {
      expect(getOperationContract(name)!.destructive, name).toBe(true);
    }
    expect(getOperationContract('add_layer')!.destructive).toBe(false);
  });
});

describe('operation runtime', () => {
  it('rejects invalid input and unknown operations without changing the revision', async () => {
    const before = (await run('get_document_summary')).revision;
    const bad = await run('set_cells', { cells: [] });
    expect(bad.ok).toBe(false);
    expect(bad.error?.code).toBe('INVALID_INPUT');
    const unknown = await run('no_such_op');
    expect(unknown.error?.code).toBe('UNKNOWN_OPERATION');
    expect(bad.revision).toBe(before);
  });

  it('bumps the revision on mutation and enforces expectedRevision', async () => {
    const start = (await run('get_document_summary')).revision;
    const write = await run('set_cells', { cells: [{ x: 1, y: 1, char: 'A' }] }, start);
    expect(write.ok).toBe(true);
    expect(write.revision).toBeGreaterThan(start);
    const stale = await run('set_cells', { cells: [{ x: 2, y: 1, char: 'B' }] }, start);
    expect(stale.ok).toBe(false);
    expect(stale.error?.code).toBe('CONFLICT');
    expect((await readCells()).map((c) => c.char)).toEqual(['A']);
  });

  it('records a single undo entry per mutation and undoes it', async () => {
    await ok('set_cells', { cells: [{ x: 0, y: 0, char: 'A' }, { x: 1, y: 0, char: 'B' }] });
    const history = await ok('get_history');
    expect(history.canUndo).toBe(true);
    const length = history.length as number;
    await ok('undo');
    expect(await readCells()).toEqual([]);
    expect((await ok('get_history')).length).toBe(length);
    await ok('redo');
    expect((await readCells()).length).toBe(2);
  });

  it('applies batches atomically with one history entry and per-operation ids', async () => {
    const before = (await ok('get_history')).length as number;
    const batch = await ok('apply_operations', {
      operations: [
        { op: 'add_layer', input: { name: 'Batch layer' } },
        { op: 'set_cells', input: { cells: [{ x: 3, y: 3, char: 'Z' }] } },
      ],
    });
    const results = batch.results as Array<{ op: string; result: Record<string, unknown> }>;
    expect(results.map((r) => r.op)).toEqual(['add_layer', 'set_cells']);
    expect(typeof results[0].result.layerId).toBe('string');
    expect((await ok('get_history')).length).toBe(before + 1);

    const layersBefore = useTimelineStore.getState().layers.length;
    const failed = await run('apply_operations', {
      operations: [
        { op: 'add_layer', input: { name: 'Rolled back' } },
        { op: 'remove_layer', input: { layerId: 'missing-layer' } },
      ],
    });
    expect(failed.ok).toBe(false);
    expect(useTimelineStore.getState().layers.length).toBe(layersBefore);

    const nested = await run('apply_operations', { operations: [{ op: 'undo' }] });
    expect(nested.ok).toBe(false);
    expect(nested.error?.code).toBe('INVALID_INPUT');
  });
});

describe('cell operations', () => {
  it('replace_in_cells with match {} recolors every non-empty selected cell and keeps chars', async () => {
    await ok('set_cells', { cells: [{ x: 0, y: 0, char: 'A' }, { x: 1, y: 0, char: 'B' }, { x: 5, y: 5, char: 'C' }] });
    await ok('set_selection', { mode: 'rectangle', region: { x: 0, y: 0, width: 3, height: 1 } });
    const result = await ok('replace_in_cells', { match: {}, replace: { color: '#ff0000' }, useSelection: true });
    expect(result.changedCells).toBe(2);
    const cells = await readCells();
    const byKey = new Map(cells.map((c) => [`${c.x},${c.y}`, c]));
    expect(byKey.get('0,0')).toMatchObject({ char: 'A', color: '#ff0000' });
    expect(byKey.get('1,0')).toMatchObject({ char: 'B', color: '#ff0000' });
    expect(byKey.get('5,5')?.color).not.toBe('#ff0000');
    expect(byKey.has('2,0')).toBe(false);
  });

  it('useSelection without a selection is rejected', async () => {
    const outcome = await run('replace_in_cells', { match: {}, replace: { color: '#ff0000' }, useSelection: true });
    expect(outcome.ok).toBe(false);
    expect(outcome.error?.code).toBe('NOT_FOUND');
  });
});

describe('palettes, generators and export', () => {
  it('creates and deletes a color palette', async () => {
    const created = await ok('create_palette', { kind: 'color', name: 'Test', colors: ['#112233', '#445566'] });
    const paletteId = (created.paletteId ?? (created.ids as Record<string, string>)?.paletteId) as string;
    expect(typeof paletteId).toBe('string');
    await ok('delete_palette', { kind: 'color', paletteId });
  });

  it('add_generator_layer applies initial keyframe tracks within one history entry', async () => {
    const before = (await ok('get_history')).length as number;
    const result = await ok('add_generator_layer', {
      generatorType: 'radio-waves',
      durationFrames: 10,
      keyframes: [{ propertyPath: 'frequency', keyframes: [{ frame: 0, value: 1 }, { frame: 9, value: 2 }] }],
    });
    expect(typeof result.layerId).toBe('string');
    expect((await ok('get_history')).length).toBe(before + 1);
    const layer = useTimelineStore.getState().layers.find((l) => l.id === result.layerId);
    expect(layer).toBeDefined();
  });

  it('exports text without triggering a download', async () => {
    await ok('set_cells', { cells: [{ x: 0, y: 0, char: 'H' }, { x: 1, y: 0, char: 'i' }] });
    const result = await ok('export', { format: 'text' });
    const artifact = result.artifact as { encoding: string; data: string; mimeType: string };
    expect(artifact.mimeType).toMatch(/text/);
    const text = artifact.encoding === 'base64' ? atob(artifact.data) : artifact.data;
    expect(text).toContain('Hi');
  });
});
