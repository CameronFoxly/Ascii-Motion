import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { registerAllOperationHandlers } from '../mcp/operations/handlers';
import { __resetRuntimeForTests, runOperation, type OperationOutcome } from '../mcp/operations/runtime';
import { getTypographyState } from '../mcp/operations/state';
import { registerAllEffects } from '../registry/effects';
import { registerAllPostEffects } from '../registry/postEffects';
import { registerAllGenerators } from '../registry/generators';
import { useCanvasStore } from '../stores/canvasStore';
import { usePaletteStore } from '../stores/paletteStore';
import { useProjectMetadataStore } from '../stores/projectMetadataStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useToolStore } from '../stores/toolStore';

type Outcome = OperationOutcome & { result: Record<string, unknown> };

async function run(op: string, input: Record<string, unknown> = {}): Promise<Outcome> {
  return (await runOperation(op, input, {})) as Outcome;
}

async function ok(op: string, input: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const outcome = await run(op, input);
  if (!outcome.ok) throw new Error(`${op} failed: ${outcome.error?.code} ${outcome.error?.message}`);
  return outcome.result;
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

describe('PR review regressions', () => {
  it('update_palette replaces every color, including down to a single color', async () => {
    const created = await ok('create_palette', { kind: 'color', name: 'Replace', colors: ['#111111', '#222222', '#333333'] });
    const paletteId = (created.paletteId ?? (created.ids as Record<string, string>)?.paletteId) as string;
    await ok('update_palette', { kind: 'color', paletteId, colors: ['#abcdef'] });
    const palette = usePaletteStore.getState().customPalettes.find((p) => p.id === paletteId)!;
    expect(palette.colors.map((c) => c.value)).toEqual(['#abcdef']);
  });

  it('cut keeps background-only cells in the clipboard', async () => {
    await ok('set_cells', { cells: [{ x: 0, y: 0, char: ' ', bgColor: '#ff0000' }, { x: 1, y: 0, char: 'X' }] });
    await ok('set_selection', { mode: 'rectangle', region: { x: 0, y: 0, width: 2, height: 1 } });
    const result = await ok('copy_selection', { cut: true });
    expect(result.copiedCells).toBe(2);
    expect(useSelectionStore.getState().getClipboard()?.data.get('0,0')?.bgColor).toBe('#ff0000');
  });

  it('rejects export setting values the exporters cannot honor', async () => {
    for (const [format, settings] of [
      ['image_sequence', { format: 'gif' }],
      ['png', { sizeMultiplier: 5 }],
      ['jpg', { quality: 0 }],
      ['webm', { quality: 50 }],
      ['mp4', { crf: 99 }],
      ['text', { includeMetadata: 'yes' }],
      ['ansi', { colorMode: 'hex' }],
      ['html', { backgroundColor: 'red' }],
      ['image_sequence', { svgSettings: { prettify: 1 } }],
    ] as const) {
      const outcome = await run('export', { format, settings });
      expect(outcome.error?.code, `${format} ${JSON.stringify(settings)}`).toBe('INVALID_INPUT');
    }
    expect((await run('export', { format: 'ansi', settings: { colorMode: 'truecolor' } })).ok).toBe(true);
  });

  it('undo restores typography changed by set_typography', async () => {
    const before = getTypographyState();
    await ok('set_typography', { fontSize: before.fontSize + 4 });
    expect(getTypographyState().fontSize).toBe(before.fontSize + 4);
    await ok('undo');
    expect(getTypographyState().fontSize).toBe(before.fontSize);
  });
});
