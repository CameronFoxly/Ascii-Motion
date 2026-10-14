import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAllGenerators } from '../registry/generators';
import { getGenerator, getGeneratorInitialSettings, type GeneratorFrameContext } from '../registry/generatorRegistry';
import {
  animatedTextGenerator as textGen,
  getAnimatedTextBox,
  getTypewriterRange,
} from '../registry/generators/animatedText';
import { layoutText } from '../utils/generators/animatedTextLayout';
import { compositeLayersAtFrame } from '../utils/layerCompositing';
import { applyTypewriterDefaultKeyframes, convertTypewriterUnits } from '../utils/generators/animatedTextActions';
import {
  renderGeneratorFrame,
  resolveGeneratorSettings,
  setGeneratorEditPreview,
  setGeneratorFrameRate,
} from '../utils/generators/generatorRuntime';
import { AnimatedTextOverlay } from '../components/features/AnimatedTextOverlay';
import { GeneratorPropertiesPanel } from '../components/features/timeline/GeneratorPropertiesPanel';
import { useTimelineStore } from '../stores/timelineStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import { useAnimationStore } from '../stores/animationStore';
import { useAnimatedTextEditStore } from '../stores/animatedTextEditStore';
import { usePlaybackOnlySnapshot } from '../hooks/usePlaybackOnlySnapshot';
import { processHistoryAction } from '../hooks/useKeyboardShortcuts';
import type { Cell } from '../types';

vi.mock('../hooks/useProjectFileActions', () => ({ useProjectFileActions: vi.fn() }));
vi.mock('../hooks/usePlaybackOnlySnapshot', () => ({ usePlaybackOnlySnapshot: vi.fn() }));
vi.mock('../contexts/CanvasContext', () => ({
  useCanvasContext: () => ({ cellWidth: 10, cellHeight: 20, zoom: 2, panOffset: { x: 3, y: 4 } }),
}));

const ctx = (frame: number, editing = false): GeneratorFrameContext =>
  ({ width: 80, height: 24, fps: 30, localFrame: frame, time: frame / 30, dt: 1, editing });

function settings(extra: Record<string, unknown> = {}) {
  return { ...textGen.defaultSettings, 'position.x': 0, 'position.y': 0, ...extra };
}

/** Render to rows of text (space for empty cells) */
function rows(cells: Map<string, Cell>, w = 12, h = 4): string[] {
  const out: string[] = [];
  for (let y = 0; y < h; y++) {
    let line = '';
    for (let x = 0; x < w; x++) line += cells.get(`${x},${y}`)?.char ?? ' ';
    out.push(line.trimEnd());
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  return out;
}

function replay(redo = false) {
  act(() => {
    const action = redo ? useToolStore.getState().redo() : useToolStore.getState().undo();
    expect(action).toBeDefined();
    processHistoryAction(action!, redo, useCanvasStore.getState(), useAnimationStore.getState());
  });
}

beforeEach(() => {
  registerAllGenerators();
  useTimelineStore.getState().createNewProject();
  useTimelineStore.getState().setDuration(120);
  useCanvasStore.getState().setCanvasSize(80, 24);
  useToolStore.getState().clearHistory();
  useToolStore.getState().setActiveTool('pencil');
  setGeneratorFrameRate(30);
  vi.mocked(usePlaybackOnlySnapshot).mockReturnValue({ isActive: false, currentFrameIndex: 0, frames: [] });
});

afterEach(() => {
  cleanup();
  useAnimatedTextEditStore.getState().stopEditing();
  setGeneratorEditPreview(null);
});

describe('animated text layout', () => {
  it('hugs content: grows right while typing and down on newlines', () => {
    expect(layoutText('', { shape: 'hug', align: 'left' })).toMatchObject({ width: 1, height: 1, charCount: 0 });
    expect(layoutText('Hi', { shape: 'hug', align: 'left' })).toMatchObject({ width: 2, height: 1 });
    const two = layoutText('Hi\nthere', { shape: 'hug', align: 'left' });
    expect(two).toMatchObject({ width: 5, height: 2, charCount: 7 });
    expect(two.carets[3]).toEqual({ col: 0, row: 1 });
    expect(two.carets[8]).toEqual({ col: 5, row: 1 });
    expect(layoutText('a\n', { shape: 'hug', align: 'left' }).height).toBe(2);
  });

  it('aligns each line within the box', () => {
    const glyphs = (align: 'left' | 'center' | 'right') =>
      layoutText('abcd\nab', { shape: 'hug', align }).glyphs.filter((g) => g.row === 1).map((g) => g.col);
    expect(glyphs('left')).toEqual([0, 1]);
    expect(glyphs('center')).toEqual([1, 2]);
    expect(glyphs('right')).toEqual([2, 3]);
  });

  it('word-wraps, breaks long words, and clips overflow rows in fixed size', () => {
    const layout = layoutText('hello big world abcdefghij', { shape: 'fixed', width: 6, height: 3, align: 'left' });
    expect(layout).toMatchObject({ width: 6, height: 3 });
    const lines: string[] = [];
    for (const g of layout.glyphs) lines[g.row] = (lines[g.row] ?? '').padEnd(g.col, ' ') + g.char;
    expect(lines).toEqual(['hello', 'big', 'world']);
    const unclipped = layoutText('abcdefghij', { shape: 'fixed', width: 4, height: 9, align: 'left' });
    expect(Math.max(...unclipped.glyphs.map((g) => g.row))).toBe(2);
  });
});

describe('animated text rendering', () => {
  it('draws literal text with colors and transparent background by default', () => {
    const cells = textGen.renderCells(ctx(0), settings({ text: 'Hi', textColor: '#ff0000' }), {});
    expect(rows(cells)).toEqual(['Hi']);
    expect(cells.get('0,0')).toEqual({ char: 'H', color: '#ff0000', bgColor: 'transparent' });
  });

  it('fills the whole box only when Fill Box Background is on', () => {
    const base = settings({ text: 'a b\nc', backgroundColor: '#0000ff' });
    expect(textGen.renderCells(ctx(0), base, {}).size).toBe(4);
    expect(textGen.renderCells(ctx(0), { ...base, fillBox: true }, {}).size).toBe(6);
    expect(textGen.renderCells(ctx(0), { ...base, backgroundColor: 'transparent', fillBox: true }, {}).size).toBe(3);
  });

  it('uses white for the cursor by default, independently of the text color', () => {
    const s = settings({
      text: 'Hi', textColor: '#ff0000', effect: 'typewriter', 'typewriter.cursor': true,
      'typewriter.cursorBlink': false,
    });
    expect(textGen.renderCells(ctx(0), s, {}).get('2,0')?.color).toBe('#ffffff');
    expect(textGen.renderCells(ctx(0), { ...s, 'typewriter.cursorColor': '#00ff00' }, {}).get('2,0')?.color).toBe('#00ff00');
  });

  it('typewriter reveals [start, end) by percent or index, ignoring newlines', () => {
    const s = settings({ text: 'ab\ncd', effect: 'typewriter', 'typewriter.end': 50 });
    expect(getTypewriterRange(s, 4)).toEqual({ start: 0, end: 2 });
    expect(rows(textGen.renderCells(ctx(0), s, {}))).toEqual(['ab']);
    const idx = { ...s, 'typewriter.units': 'index', 'typewriter.start': 1, 'typewriter.end': 3 };
    expect(rows(textGen.renderCells(ctx(0), idx, {}))).toEqual([' b', 'c']);
  });

  it('places a block cursor at the next character and blinks only while paused', () => {
    const at = (end: number) => settings({
      text: 'abcd', effect: 'typewriter', 'typewriter.units': 'index', 'typewriter.end': end,
      'typewriter.cursor': true, 'typewriter.cursorBlinkRate': 3,
    });
    // Advancing: cursor always shown
    expect(rows(textGen.renderCells(ctx(3), at(2), {}, at(1)))).toEqual(['ab█']);
    // Paused at 3 blinks/s (30fps): on for 5 frames, off for 5
    expect(rows(textGen.renderCells(ctx(4), at(2), {}, at(2)))).toEqual(['ab█']);
    expect(rows(textGen.renderCells(ctx(7), at(2), {}, at(2)))).toEqual(['ab']);
    expect(rows(textGen.renderCells(ctx(12), at(2), {}, at(2)))).toEqual(['ab█']);
    // Slowest rate (0.1/s): on for 5s, off for 5s
    const slow = { ...at(2), 'typewriter.cursorBlinkRate': 0.1 };
    expect(rows(textGen.renderCells(ctx(140), slow, {}, slow))).toEqual(['ab█']);
    expect(rows(textGen.renderCells(ctx(160), slow, {}, slow))).toEqual(['ab']);
    const noBlink = { ...at(2), 'typewriter.cursorBlink': false };
    expect(rows(textGen.renderCells(ctx(7), noBlink, {}, noBlink))).toEqual(['ab█']);
    // Fully revealed: cursor after the last character
    expect(rows(textGen.renderCells(ctx(0), at(4), {}))).toEqual(['abcd█']);
  });

  it('blinks the whole text or staggers per character', () => {
    const s = settings({ text: 'abc', effect: 'blink', 'blink.onFrames': 2, 'blink.offFrames': 2 });
    expect(rows(textGen.renderCells(ctx(1), s, {}))).toEqual(['abc']);
    expect(rows(textGen.renderCells(ctx(2), s, {}))).toEqual([]);
    expect(rows(textGen.renderCells(ctx(2), { ...s, 'blink.offset': 2 }, {}))).toEqual(['abc']);
    const per = { ...s, 'blink.mode': 'per-character', 'blink.stagger': 1 };
    expect(rows(textGen.renderCells(ctx(2), per, {}))).toEqual([' bc']);
  });

  it('wave offsets characters along the chosen axis', () => {
    const s = settings({
      'position.y': 2, text: 'abcdefghij', effect: 'wave', 'wave.amplitude': 2, 'wave.frequency': 5,
    });
    const cells = textGen.renderCells(ctx(0), s, { 'wave.speed': 0 });
    const ys = [...cells.keys()].map((k) => Number(k.split(',')[1]));
    expect(new Set(ys).size).toBeGreaterThan(1);
    expect(cells.size).toBe(10);
    const vertical = textGen.renderCells(ctx(0), { ...s, 'wave.axis': 'vertical', text: 'a\nb\nc' }, { 'wave.speed': 0 });
    expect([...vertical.keys()].every((k) => k.endsWith(',2') || k.endsWith(',3') || k.endsWith(',4'))).toBe(true);
  });

  it('shows the full un-animated text while editing', () => {
    const s = settings({ text: 'abcd', effect: 'typewriter', 'typewriter.end': 0 });
    expect(rows(textGen.renderCells(ctx(0), s, {}))).toEqual([]);
    expect(rows(textGen.renderCells(ctx(0, true), s, {}))).toEqual(['abcd']);
  });

  it('keeps the fully revealed typewriter cursor inside the box', () => {
    const full = (extra: Record<string, unknown>) => settings({
      effect: 'typewriter', 'typewriter.end': 100, 'typewriter.cursor': true, 'typewriter.cursorBlink': false, ...extra,
    });
    // Hug: a trailing column is reserved for the cursor, whatever the alignment
    const right = full({ text: 'abcd\nab', align: 'right' });
    expect(getAnimatedTextBox(right).layout.width).toBe(5);
    expect(rows(textGen.renderCells(ctx(0), right, {}))).toEqual(['abcd', '  ab█']);
    expect(getAnimatedTextBox({ ...right, 'typewriter.cursor': false }).layout.width).toBe(4);
    // Fixed: wrap to the next row when there is one, otherwise stay on the last cell
    const fixed = full({ text: 'abcd', shape: 'fixed', 'box.width': 4, 'box.height': 2 });
    expect(getAnimatedTextBox(fixed).layout.width).toBe(4);
    expect(rows(textGen.renderCells(ctx(0), fixed, {}))).toEqual(['abcd', '█']);
    expect(rows(textGen.renderCells(ctx(0), { ...fixed, 'box.height': 1 }, {}))).toEqual(['abc█']);
  });
});

describe('animated text generator integration', () => {
  it('preserves filled background cells through compositing, transforms, and baking', () => {
    const tl = useTimelineStore.getState();
    const id = tl.addGeneratorLayer('animated-text', { durationFrames: 1 })!;
    tl.updateGeneratorSettings(id, {
      text: 'a', shape: 'fixed', 'box.width': 4, 'box.height': 2,
      'position.x': 0, 'position.y': 0, backgroundColor: '#0000ff', fillBox: true,
    });
    const composite = () => compositeLayersAtFrame(useTimelineStore.getState().layers, 0, 80, 24);
    expect(composite().size).toBe(8);
    expect(composite().get('3,1')).toMatchObject({ char: ' ', bgColor: '#0000ff' });
    useTimelineStore.setState((state) => ({
      layers: state.layers.map((layer) => layer.id === id
        ? { ...layer, staticProperties: { ...layer.staticProperties, 'transform.position.x': 2 } }
        : layer),
    }));
    expect(composite().size).toBe(8);
    expect(composite().get('5,1')).toMatchObject({ char: ' ', bgColor: '#0000ff' });
    tl.bakeGeneratorLayer(id);
    expect(composite().size).toBe(8);
    expect(composite().get('5,1')?.bgColor).toBe('#0000ff');
  });

  it('clips text only after applying the layer transform', () => {
    const tl = useTimelineStore.getState();
    const id = tl.addGeneratorLayer('animated-text', { durationFrames: 1 })!;
    tl.updateGeneratorSettings(id, { text: 'abc', 'position.x': -2, 'position.y': 0 });
    const source = tl.getLayer(id)!.generator!;
    expect(renderGeneratorFrame(source, 0, 80, 24).has('-2,0')).toBe(true);
    useTimelineStore.setState((state) => ({
      layers: state.layers.map((layer) => layer.id === id
        ? { ...layer, staticProperties: { ...layer.staticProperties, 'transform.position.x': 2 } }
        : layer),
    }));
    const composite = compositeLayersAtFrame(useTimelineStore.getState().layers, 0, 80, 24);
    expect(composite.get('0,0')?.char).toBe('a');
    expect(composite.get('1,0')?.char).toBe('b');
    expect(composite.get('2,0')?.char).toBe('c');
  });

  it('converts both range values and all existing keys while preserving the reveal', () => {
    const tl = useTimelineStore.getState();
    const id = tl.addGeneratorLayer('animated-text', { durationFrames: 11 })!;
    tl.updateGeneratorSettings(id, { text: 'ab\n😀cdef', effect: 'typewriter', 'typewriter.start': 15 });
    applyTypewriterDefaultKeyframes(id);
    const source = () => tl.getLayer(id)!.generator!;
    const before = Array.from({ length: 11 }, (_, f) => rows(renderGeneratorFrame(source(), f, 80, 24)));
    convertTypewriterUnits(id, 'index', 5);
    expect(source().settings['typewriter.units']).toBe('index');
    const convertedEnd = source().propertyTracks.find((track) => track.propertyPath === 'typewriter.end')?.keyframes;
    expect(convertedEnd).toHaveLength(2);
    expect(convertedEnd?.[0].value).toBe(0);
    expect(convertedEnd?.[1].value).toBe(7);
    expect(Array.from({ length: 11 }, (_, f) => rows(renderGeneratorFrame(source(), f, 80, 24)))).toEqual(before);
    convertTypewriterUnits(id, 'percent', 5);
    expect(Array.from({ length: 11 }, (_, f) => rows(renderGeneratorFrame(source(), f, 80, 24)))).toEqual(before);
    tl.updateGeneratorSettings(id, { text: '' });
    convertTypewriterUnits(id, 'index', 0);
    convertTypewriterUnits(id, 'percent', 0);
    expect(source().settings['typewriter.end']).toBe(0);
  });

  it('preserves the reveal when text length changes while converting units', () => {
    const tl = useTimelineStore.getState();
    const id = tl.addGeneratorLayer('animated-text', { durationFrames: 11 })!;
    tl.updateGeneratorSettings(id, { text: 'abcd', effect: 'typewriter', 'typewriter.end': 50 });
    const textTrack = tl.addGeneratorPropertyTrack(id, 'text')!;
    tl.addGeneratorKeyframe(id, textTrack, 5, 'abcdefgh');
    const source = () => useTimelineStore.getState().getLayer(id)!.generator!;
    const before = Array.from({ length: 11 }, (_, f) => rows(renderGeneratorFrame(source(), f, 80, 24)));
    convertTypewriterUnits(id, 'index', 0);
    expect(Array.from({ length: 11 }, (_, f) => rows(renderGeneratorFrame(source(), f, 80, 24)))).toEqual(before);
    convertTypewriterUnits(id, 'percent', 0);
    expect(Array.from({ length: 11 }, (_, f) => rows(renderGeneratorFrame(source(), f, 80, 24)))).toEqual(before);
  });

  it('keeps the typewriter cursor visible while the fractional reveal boundary advances', () => {
    const previous = settings({
      text: 'abcd', effect: 'typewriter', 'typewriter.end': 25,
      'typewriter.cursor': true, 'typewriter.cursorBlinkRate': 3,
    });
    const current = { ...previous, 'typewriter.end': 26 };
    expect(rows(textGen.renderCells(ctx(7), current, {}, previous))).toEqual(['a█']);
  });
  it('uses direct cells without intensity mapping settings and centers by default', () => {
    const entry = getGenerator('animated-text')!;
    expect(entry.propertyDefinitions.some((d) => d.path.startsWith('mapping.'))).toBe(false);
    const initial = getGeneratorInitialSettings('animated-text', 80, 24)!;
    expect(initial).not.toHaveProperty('mapping.characterPaletteId');
    expect(initial).toMatchObject({ 'position.x': 38, 'position.y': 11, text: 'Text', shape: 'hug' });
  });

  it('defaults the text color to the current foreground color', () => {
    useToolStore.getState().setSelectedColor('#FF0000');
    expect(getGeneratorInitialSettings('animated-text', 80, 24)!.textColor).toBe('#FF0000');
    useToolStore.getState().setSelectedColor('transparent');
    expect(getGeneratorInitialSettings('animated-text', 80, 24)!.textColor).toBe('#ffffff');
    useToolStore.getState().setSelectedColor('#FFFFFF');
  });

  it('holds keyframed text and bypasses the output cache for edit previews', () => {
    const tl = useTimelineStore.getState();
    const id = tl.addGeneratorLayer('animated-text')!;
    tl.updateGeneratorSettings(id, { effect: 'typewriter', 'typewriter.end': 0 });
    const track = tl.addGeneratorPropertyTrack(id, 'text')!;
    tl.addGeneratorKeyframe(id, track, 0, 'One');
    tl.addGeneratorKeyframe(id, track, 10, 'Two');
    tl.updateGeneratorSettings(id, { 'typewriter.end': 100 });
    const source = () => tl.getLayer(id)!.generator!;
    expect(resolveGeneratorSettings(source(), 9).text).toBe('One');
    expect(resolveGeneratorSettings(source(), 10).text).toBe('Two');
    tl.updateGeneratorSettings(id, { 'typewriter.end': 0 });
    expect(renderGeneratorFrame(source(), 0, 80, 24).size).toBe(0);
    setGeneratorEditPreview(source().id);
    expect(renderGeneratorFrame(source(), 0, 80, 24, { editPreview: true }).size).toBe(3);
    // Renders that don't opt in (exports, previews, onion skins) keep the animated output
    expect(renderGeneratorFrame(source(), 0, 80, 24).size).toBe(0);
    expect(compositeLayersAtFrame(useTimelineStore.getState().layers, 0, 80, 24).size).toBe(0);
    expect(compositeLayersAtFrame(
      useTimelineStore.getState().layers, 0, 80, 24, undefined, true, undefined, undefined, { generatorEditPreview: true },
    ).size).toBe(3);
    setGeneratorEditPreview(null);
    expect(renderGeneratorFrame(source(), 0, 80, 24, { editPreview: true }).size).toBe(0);
  });

  it('auto-keyframes typewriter End across the span when the effect is chosen', () => {
    const tl = useTimelineStore.getState();
    const id = tl.addGeneratorLayer('animated-text', { startFrame: 5, durationFrames: 20 })!;
    applyTypewriterDefaultKeyframes(id);
    const kfs = tl.getLayer(id)!.generator!.propertyTracks.find((t) => t.propertyPath === 'typewriter.end')!.keyframes;
    expect(kfs.map((k) => [k.frame, k.value])).toEqual([[5, 0], [24, 100]]);
    tl.updateGeneratorKeyframe(id, tl.getLayer(id)!.generator!.propertyTracks[0].id, kfs[1].id, { value: 50 });
    applyTypewriterDefaultKeyframes(id);
    expect(tl.getLayer(id)!.generator!.propertyTracks[0].keyframes.map((k) => k.value)).toEqual([0, 50]);
  });

  it('shows the full text instead of auto-keying when the span is a single frame', () => {
    const tl = useTimelineStore.getState();
    const id = tl.addGeneratorLayer('animated-text', { startFrame: 0, durationFrames: 1 })!;
    applyTypewriterDefaultKeyframes(id);
    const source = tl.getLayer(id)!.generator!;
    expect(source.propertyTracks).toHaveLength(0);
    expect(source.settings['typewriter.end']).toBe(100);
  });
});

describe('animated text panel', () => {
  it('toggles background fill and exposes a cursor color picker only when enabled', () => {
    const tl = useTimelineStore.getState();
    const id = tl.addGeneratorLayer('animated-text')!;
    tl.updateGeneratorSettings(id, {
      text: 'a', shape: 'fixed', 'box.width': 4, 'box.height': 2,
      backgroundColor: '#0000ff', effect: 'typewriter', 'typewriter.end': 100,
    });
    render(<GeneratorPropertiesPanel />);
    fireEvent.click(within(screen.getByText('Fill Box Background').parentElement!).getByRole('button', { name: 'Off' }));
    expect(tl.getLayer(id)!.generator!.settings.fillBox).toBe(true);
    expect(compositeLayersAtFrame(useTimelineStore.getState().layers, 0, 80, 24).size).toBe(8);
    expect(screen.queryByLabelText('Edit Cursor Color')).toBeNull();
    fireEvent.click(within(screen.getByText('Block Cursor').parentElement!).getByRole('button', { name: 'Off' }));
    expect(screen.getByLabelText('Edit Cursor Color').getAttribute('title')).toBe('#ffffff');
  });

  it('records live color changes when the open swatch closes the picker', () => {
    const tl = useTimelineStore.getState();
    const id = tl.addGeneratorLayer('animated-text')!;
    render(<GeneratorPropertiesPanel />);
    const swatch = screen.getByLabelText('Edit Text Color');
    fireEvent.click(swatch);
    fireEvent.change(screen.getByPlaceholderText('#000000'), { target: { value: '#123456' } });
    expect(useTimelineStore.getState().getLayer(id)!.generator!.settings.textColor).toBe('#123456');
    fireEvent.click(swatch);
    expect(screen.queryByText('Cancel')).toBeNull();
    expect(useToolStore.getState().historyStack).toHaveLength(1);

    fireEvent.click(swatch);
    fireEvent.change(screen.getByPlaceholderText('#000000'), { target: { value: '#abcdef' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Cancel')).toBeNull();
    expect(useTimelineStore.getState().getLayer(id)!.generator!.settings.textColor).toBe('#123456');
    expect(useToolStore.getState().historyStack).toHaveLength(1);
  });

  it('caps range inputs by units and converts a switch in one undo entry', () => {
    const tl = useTimelineStore.getState();
    const id = tl.addGeneratorLayer('animated-text')!;
    tl.updateGeneratorSettings(id, { text: 'abcdef', effect: 'typewriter', 'typewriter.start': 0, 'typewriter.end': 50 });
    render(<GeneratorPropertiesPanel />);
    const units = screen.getAllByRole('combobox').find((element) =>
      Array.from((element as HTMLSelectElement).options).some((option) => option.value === 'percent'))!;
    fireEvent.change(units, { target: { value: 'index' } });
    expect((screen.getByLabelText('End') as HTMLInputElement).value).toBe('3');
    expect(useToolStore.getState().historyStack).toHaveLength(1);
    replay();
    expect((screen.getByLabelText('End') as HTMLInputElement).value).toBe('50');
    expect(tl.getLayer(id)!.generator!.settings['typewriter.units']).toBe('percent');
    replay(true);
    const end = screen.getByLabelText('End') as HTMLInputElement;
    fireEvent.focus(end);
    fireEvent.change(end, { target: { value: '999' } });
    fireEvent.blur(end);
    expect(end.value).toBe('6');
    fireEvent.change(units, { target: { value: 'percent' } });
    expect(end.value).toBe('100');
    fireEvent.focus(end);
    fireEvent.change(end, { target: { value: '999' } });
    fireEvent.blur(end);
    expect(end.value).toBe('100');
  });
  it('shows effect controls conditionally and auto-keys typewriter in one undo entry', () => {
    const tl = useTimelineStore.getState();
    const id = tl.addGeneratorLayer('animated-text')!;
    render(<GeneratorPropertiesPanel />);
    expect(screen.queryByText('Mapping')).toBeNull();
    expect(screen.queryByText('Width')).toBeNull();
    expect(screen.queryByText('Start')).toBeNull();
    expect(screen.getByLabelText('Text')).toBeDefined();
    expect(screen.getByLabelText('Edit Text Color')).toBeDefined();

    const effectSelect = screen.getAllByRole('combobox').find((el) =>
      Array.from((el as HTMLSelectElement).options).some((o) => o.value === 'typewriter'))!;
    fireEvent.change(effectSelect, { target: { value: 'typewriter' } });
    expect(screen.getByText('Start')).toBeDefined();
    expect(screen.queryByText('Cursor Char')).toBeNull();
    const endTrack = tl.getLayer(id)!.generator!.propertyTracks.find((t) => t.propertyPath === 'typewriter.end');
    expect(endTrack?.keyframes).toHaveLength(2);
    expect(useToolStore.getState().historyStack).toHaveLength(1);
    replay();
    expect(tl.getLayer(id)!.generator!.propertyTracks).toHaveLength(0);
    expect(tl.getLayer(id)!.generator!.settings.effect).toBe('none');
  });

  it('commits multiline text on blur, including newlines', () => {
    const tl = useTimelineStore.getState();
    const id = tl.addGeneratorLayer('animated-text')!;
    render(<GeneratorPropertiesPanel />);
    const area = screen.getByLabelText('Text') as HTMLTextAreaElement;
    fireEvent.focus(area);
    fireEvent.change(area, { target: { value: 'line 1\nline 2' } });
    expect(tl.getLayer(id)!.generator!.settings.text).toBe('Text');
    fireEvent.blur(area);
    expect(tl.getLayer(id)!.generator!.settings.text).toBe('line 1\nline 2');
  });
});

describe('animated text overlay', () => {
  // Cells are 20x40px after zoom, offset by pan {3,4}
  const clientFor = (x: number, y: number) => ({ clientX: 3 + x * 20 + 5, clientY: 4 + y * 40 + 5, pointerId: 1 });

  function addText() {
    const tl = useTimelineStore.getState();
    const id = tl.addGeneratorLayer('animated-text', { startFrame: 0, durationFrames: 10 })!;
    tl.updateGeneratorSettings(id, { 'position.x': 5, 'position.y': 6, text: 'Hello' });
    tl.goToFrame(0);
    return id;
  }

  it('outlines the box and places the position handle at the top-left corner', () => {
    addText();
    render(<AnimatedTextOverlay />);
    const handle = screen.getByLabelText('Text box position');
    expect(handle.style.left).toBe('103px');
    expect(handle.style.top).toBe('244px');
    expect(screen.getByTestId('animated-text-box').getAttribute('points'))
      .toBe('103,244 203,244 203,284 103,284');
  });

  it('keeps text editing focused when the position handle is clicked', () => {
    const id = addText();
    act(() => useAnimatedTextEditStore.getState().startEditing(id));
    render(<AnimatedTextOverlay />);
    const input = screen.getByTestId('animated-text-input');
    const handle = screen.getByLabelText('Text box position');
    fireEvent.pointerDown(handle, { ...clientFor(5, 6), button: 0 });
    expect(document.activeElement).toBe(input);
    expect(useAnimatedTextEditStore.getState().editingLayerId).toBe(id);
  });

  it('does not let locked layers edit or drag', () => {
    const id = addText();
    act(() => {
      useTimelineStore.setState((state) => ({
        layers: state.layers.map((layer) => layer.id === id ? { ...layer, locked: true } : layer),
      }));
      useAnimatedTextEditStore.getState().startEditing(id);
    });
    const { rerender } = render(<AnimatedTextOverlay />);
    expect(useAnimatedTextEditStore.getState().editingLayerId).toBeNull();
    expect(screen.queryByTestId('animated-text-input')).toBeNull();
    const before = useTimelineStore.getState().getLayer(id)!.generator!.settings['position.x'];
    fireEvent.pointerDown(screen.getByTestId('animated-text-box'), { ...clientFor(6, 6), button: 0 });
    fireEvent.pointerMove(screen.getByTestId('animated-text-box'), clientFor(10, 8));
    fireEvent.pointerUp(screen.getByTestId('animated-text-box'), clientFor(10, 8));
    rerender(<AnimatedTextOverlay />);
    expect(useTimelineStore.getState().getLayer(id)!.generator!.settings['position.x']).toBe(before);
  });

  it('lets non-drawing tools pass through the text overlay', () => {
    const id = addText();
    useToolStore.getState().setActiveTool('eyedropper');
    render(<AnimatedTextOverlay />);
    const before = useTimelineStore.getState().getLayer(id)!.generator!.settings['position.x'];
    fireEvent.pointerDown(screen.getByTestId('animated-text-box'), { ...clientFor(6, 6), button: 0 });
    fireEvent.pointerMove(screen.getByTestId('animated-text-box'), clientFor(10, 8));
    fireEvent.pointerUp(screen.getByTestId('animated-text-box'), clientFor(10, 8));
    expect(useTimelineStore.getState().getLayer(id)!.generator!.settings['position.x']).toBe(before);
  });

  it('transforms the whole selection and caret with the layer', () => {
    const id = addText();
    act(() => {
      useTimelineStore.setState((state) => ({
        layers: state.layers.map((layer) => layer.id === id ? {
          ...layer,
          staticProperties: {
            ...layer.staticProperties,
            'transform.anchorPoint.x': 0,
            'transform.anchorPoint.y': 0,
            'transform.position.x': 0,
            'transform.position.y': 0,
            'transform.scale.x': 2,
            'transform.scale.y': 2,
          },
        } : layer),
      }));
      useAnimatedTextEditStore.getState().startEditing(id, { selectAll: true });
    });
    render(<AnimatedTextOverlay />);
    const glyph = screen.getByTestId('animated-text-overlay').querySelector('polygon.fill-sky-400\\/40')!;
    expect(glyph.getAttribute('points')).toBe('203,484 243,484 243,564 203,564');
    const input = screen.getByTestId('animated-text-input') as HTMLTextAreaElement;
    input.setSelectionRange(5, 5);
    fireEvent.select(input);
    const caret = screen.getByTestId('animated-text-caret');
    expect(caret.getAttribute('x2')).toBe(caret.getAttribute('x1'));
    expect(Number(caret.getAttribute('y2')) - Number(caret.getAttribute('y1'))).toBe(80);
  });

  it('drags the box with one undo entry and shows a motion trail when animated', () => {
    const id = addText();
    render(<AnimatedTextOverlay />);
    const box = screen.getByTestId('animated-text-box');
    fireEvent.pointerDown(box, { ...clientFor(6, 6), button: 0 });
    fireEvent.pointerMove(box, clientFor(10, 8));
    fireEvent.pointerUp(box, clientFor(10, 8));
    const at = (f: number) => resolveGeneratorSettings(useTimelineStore.getState().getLayer(id)!.generator!, f);
    expect(at(0)).toMatchObject({ 'position.x': 9, 'position.y': 8 });
    expect(useToolStore.getState().historyStack).toHaveLength(1);
    replay();
    expect(at(0)).toMatchObject({ 'position.x': 5, 'position.y': 6 });

    const tl = useTimelineStore.getState();
    act(() => {
      const track = tl.addGeneratorPropertyTrack(id, 'position.x')!;
      tl.addGeneratorKeyframe(id, track, 0, 0);
      tl.addGeneratorKeyframe(id, track, 9, 9);
    });
    const overlay = screen.getByTestId('animated-text-overlay');
    expect(overlay.querySelectorAll('.bg-yellow-500\\/50, .bg-yellow-400.rounded-full')).toHaveLength(10);
  });

  it('edits on the canvas: typing grows the box, Enter adds a line, Esc commits one undo entry', () => {
    const id = addText();
    render(<AnimatedTextOverlay />);
    fireEvent.doubleClick(screen.getByTestId('animated-text-box'));
    expect(useAnimatedTextEditStore.getState().editingLayerId).toBe(id);
    const input = screen.getByTestId('animated-text-input') as HTMLTextAreaElement;
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: 'Hello world', selectionStart: 11, selectionEnd: 11 } });
    fireEvent.change(input, { target: { value: 'Hello world\nok', selectionStart: 14, selectionEnd: 14 } });
    const source = () => useTimelineStore.getState().getLayer(id)!.generator!;
    expect(getAnimatedTextBox(resolveGeneratorSettings(source(), 0)).layout).toMatchObject({ width: 11, height: 2 });
    expect(screen.getByTestId('animated-text-caret').getAttribute('x1')).toBe(String(3 + 7 * 20));
    expect(useToolStore.getState().historyStack).toHaveLength(0);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(useAnimatedTextEditStore.getState().editingLayerId).toBeNull();
    expect(screen.queryByTestId('animated-text-input')).toBeNull();
    expect(useToolStore.getState().historyStack).toHaveLength(1);
    replay();
    expect(source().settings.text).toBe('Hello');
  });

  it('selects all text when editing starts after creation and exits on outside click', () => {
    const id = addText();
    act(() => useAnimatedTextEditStore.getState().startEditing(id, { selectAll: true }));
    render(<AnimatedTextOverlay />);
    const input = screen.getByTestId('animated-text-input') as HTMLTextAreaElement;
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 5]);
    fireEvent.pointerDown(document.body);
    expect(useAnimatedTextEditStore.getState().editingLayerId).toBeNull();
  });

  it('hides during playback and when another layer is selected', () => {
    const id = addText();
    const { rerender } = render(<AnimatedTextOverlay />);
    act(() => useTimelineStore.getState().setActiveLayer(null));
    expect(screen.queryByTestId('animated-text-overlay')).toBeNull();
    act(() => useTimelineStore.getState().setActiveLayer(id));
    vi.mocked(usePlaybackOnlySnapshot).mockReturnValue({ isActive: true, currentFrameIndex: 0, frames: [] });
    rerender(<AnimatedTextOverlay />);
    expect(screen.queryByTestId('animated-text-overlay')).toBeNull();
  });
});
