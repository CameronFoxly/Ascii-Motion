/**
 * Animated Text Generator — literal text in a box with keyframeable position,
 * size and colors, plus one optional animation effect (typewriter, blink, wave).
 *
 * Unlike intensity generators, this emits cells directly (mode: 'cells').
 */

import { Type } from 'lucide-react';
import type { Cell } from '../../types';
import type { EffectPropertyDefinition } from '../../types/effectBlock';
import type { CellsGeneratorEntry, GeneratorFrameContext } from '../generatorRegistry';
import { layoutText, type TextAlign, type TextLayout, type TextShape } from '../../utils/generators/animatedTextLayout';
import { boolProp, defaultsFromDefinitions, n, numberProp, s, selectProp, b } from './propertyHelpers';
import { useToolStore } from '../../stores/toolStore';

export const ANIMATED_TEXT_GENERATOR_TYPE = 'animated-text';

export type AnimatedTextEffect = 'none' | 'typewriter' | 'blink' | 'wave';

const TEXT = 'Text';
const BOX = 'Box';
const STYLE = 'Style';
const ANIMATION = 'Animation';
const TRANSPARENT = 'transparent';

const effectIs = (...values: AnimatedTextEffect[]) => ({ path: 'effect', values });

const propertyDefinitions: EffectPropertyDefinition[] = [
  {
    path: 'text', displayName: 'Text', category: TEXT, valueType: 'string', defaultValue: 'Text',
    interpolation: 'hold', control: 'multiline',
  },
  numberProp('position.x', 'Position X', BOX, 0, -1000, 1000, 1, { unit: 'cells' }),
  numberProp('position.y', 'Position Y', BOX, 0, -1000, 1000, 1, { unit: 'cells' }),
  selectProp('shape', 'Shape', BOX, 'hug', [
    { label: 'Hug Contents', value: 'hug' },
    { label: 'Fixed Size', value: 'fixed' },
  ]),
  numberProp('box.width', 'Width', BOX, 20, 1, 500, 1, { unit: 'cells', visibleWhen: { path: 'shape', values: ['fixed'] } }),
  numberProp('box.height', 'Height', BOX, 3, 1, 500, 1, { unit: 'cells', visibleWhen: { path: 'shape', values: ['fixed'] } }),
  selectProp('align', 'Alignment', BOX, 'left', [
    { label: 'Left', value: 'left' },
    { label: 'Center', value: 'center' },
    { label: 'Right', value: 'right' },
  ]),
  { path: 'textColor', displayName: 'Text Color', category: STYLE, valueType: 'color', defaultValue: '#ffffff', interpolation: 'hold' },
  { path: 'backgroundColor', displayName: 'Background', category: STYLE, valueType: 'color', defaultValue: TRANSPARENT, interpolation: 'hold' },
  boolProp('fillBox', 'Fill Box Background', STYLE, false),
  selectProp('effect', 'Effect', ANIMATION, 'none', [
    { label: 'None', value: 'none' },
    { label: 'Typewriter', value: 'typewriter' },
    { label: 'Blink', value: 'blink' },
    { label: 'Wave', value: 'wave' },
  ]),
  // Typewriter
  selectProp('typewriter.units', 'Units', ANIMATION, 'percent', [
    { label: 'Percentage', value: 'percent' },
    { label: 'Index', value: 'index' },
  ], { visibleWhen: effectIs('typewriter') }),
  numberProp('typewriter.start', 'Start', ANIMATION, 0, 0, 10000, 1, { visibleWhen: effectIs('typewriter') }),
  numberProp('typewriter.end', 'End', ANIMATION, 100, 0, 10000, 1, { visibleWhen: effectIs('typewriter') }),
  boolProp('typewriter.cursor', 'Block Cursor', ANIMATION, false, { visibleWhen: effectIs('typewriter') }),
  {
    path: 'typewriter.cursorChar', displayName: 'Cursor Char', category: ANIMATION, valueType: 'string',
    defaultValue: '█', interpolation: 'hold',
    visibleWhen: effectIs('typewriter'), visibleWhenAll: [{ path: 'typewriter.cursor', values: ['true'] }],
  },
  boolProp('typewriter.cursorBlink', 'Cursor Blink', ANIMATION, true, {
    visibleWhen: effectIs('typewriter'), visibleWhenAll: [{ path: 'typewriter.cursor', values: ['true'] }],
  }),
  numberProp('typewriter.cursorBlinkFrames', 'Blink Rate', ANIMATION, 15, 1, 240, 1, {
    unit: 'fr',
    interpolation: 'hold',
    visibleWhen: effectIs('typewriter'),
    visibleWhenAll: [
      { path: 'typewriter.cursor', values: ['true'] },
      { path: 'typewriter.cursorBlink', values: ['true'] },
    ],
  }),
  // Blink
  numberProp('blink.onFrames', 'On Frames', ANIMATION, 15, 1, 600, 1, { unit: 'fr', visibleWhen: effectIs('blink') }),
  numberProp('blink.offFrames', 'Off Frames', ANIMATION, 15, 0, 600, 1, { unit: 'fr', visibleWhen: effectIs('blink') }),
  numberProp('blink.offset', 'Phase Offset', ANIMATION, 0, -600, 600, 1, { unit: 'fr', visibleWhen: effectIs('blink') }),
  selectProp('blink.mode', 'Mode', ANIMATION, 'whole', [
    { label: 'Whole Text', value: 'whole' },
    { label: 'Per Character', value: 'per-character' },
  ], { visibleWhen: effectIs('blink') }),
  numberProp('blink.stagger', 'Stagger', ANIMATION, 2, -60, 60, 1, {
    unit: 'fr', visibleWhen: effectIs('blink'), visibleWhenAll: [{ path: 'blink.mode', values: ['per-character'] }],
  }),
  // Wave
  selectProp('wave.axis', 'Axis', ANIMATION, 'horizontal', [
    { label: 'Horizontal', value: 'horizontal' },
    { label: 'Vertical', value: 'vertical' },
  ], { visibleWhen: effectIs('wave') }),
  numberProp('wave.frequency', 'Frequency', ANIMATION, 1, 0.1, 5, 0.1, { visibleWhen: effectIs('wave') }),
  numberProp('wave.amplitude', 'Amplitude', ANIMATION, 1, -30, 30, 1, { unit: 'cells', visibleWhen: effectIs('wave') }),
  numberProp('wave.speed', 'Speed', ANIMATION, 5, -50, 50, 1, { visibleWhen: effectIs('wave') }),
  numberProp('wave.phase', 'Phase', ANIMATION, 0, 0, 360, 1, { unit: '°', visibleWhen: effectIs('wave') }),
];

export interface AnimatedTextBox {
  x: number;
  y: number;
  layout: TextLayout;
}

/** Resolve the text box (position + layout) for already-resolved settings */
export function getAnimatedTextBox(settings: Record<string, unknown>): AnimatedTextBox {
  const layout = layoutText(s(settings, 'text', ''), {
    shape: s<TextShape>(settings, 'shape', 'hug'),
    width: n(settings, 'box.width', 20),
    height: n(settings, 'box.height', 3),
    align: s<TextAlign>(settings, 'align', 'left'),
  });
  // Hugging boxes reserve a trailing column so the typewriter cursor fits after the longest line
  const reserveCursorColumn = s<string>(settings, 'shape', 'hug') !== 'fixed'
    && s<string>(settings, 'effect', 'none') === 'typewriter'
    && b(settings, 'typewriter.cursor', false);
  return {
    x: Math.round(n(settings, 'position.x', 0)),
    y: Math.round(n(settings, 'position.y', 0)),
    layout: reserveCursorColumn ? { ...layout, width: layout.width + 1 } : layout,
  };
}

/** Keep a caret cell inside the box: wrap to the next row, or clamp on the last row */
function caretInsideBox(caret: { col: number; row: number }, layout: TextLayout, align: TextAlign): { col: number; row: number } {
  if (caret.col < layout.width) return caret;
  if (caret.row + 1 < layout.height) {
    const col = align === 'center' ? Math.floor(layout.width / 2) : align === 'right' ? layout.width - 1 : 0;
    return { col, row: caret.row + 1 };
  }
  return { col: layout.width - 1, row: caret.row };
}

/** Visible [start, end) character-index range for the typewriter effect */
export function getTypewriterRange(settings: Record<string, unknown>, charCount: number): { start: number; end: number } {
  const units = s<string>(settings, 'typewriter.units', 'percent');
  let start = n(settings, 'typewriter.start', 0);
  let end = n(settings, 'typewriter.end', 100);
  if (units === 'percent') {
    start = Math.round((Math.min(100, Math.max(0, start)) / 100) * charCount);
    end = Math.round((Math.min(100, Math.max(0, end)) / 100) * charCount);
  } else {
    start = Math.floor(Math.max(0, start));
    end = Math.floor(Math.max(0, end));
  }
  start = Math.min(start, charCount);
  end = Math.min(end, charCount);
  return { start, end: Math.max(start, end) };
}

function revealedEnd(settings: Record<string, unknown>): number {
  const { layout } = getAnimatedTextBox(settings);
  return getTypewriterRange(settings, layout.charCount).end;
}

function mod(a: number, m: number): number {
  return ((a % m) + m) % m;
}

function isBlinkVisible(settings: Record<string, unknown>, frame: number, index: number): boolean {
  const on = Math.max(1, Math.round(n(settings, 'blink.onFrames', 15)));
  const off = Math.max(0, Math.round(n(settings, 'blink.offFrames', 15)));
  if (off === 0) return true;
  let t = frame + Math.round(n(settings, 'blink.offset', 0));
  if (s<string>(settings, 'blink.mode', 'whole') === 'per-character') {
    t -= index * Math.round(n(settings, 'blink.stagger', 2));
  }
  return mod(t, on + off) < on;
}

function renderAnimatedText(
  ctx: GeneratorFrameContext,
  settings: Record<string, unknown>,
  phases: Record<string, number>,
  previousSettings?: Record<string, unknown>,
): Map<string, Cell> {
  const out = new Map<string, Cell>();
  const { x: boxX, y: boxY, layout } = getAnimatedTextBox(settings);
  const color = s(settings, 'textColor', '#ffffff') || '#ffffff';
  const bgColor = s(settings, 'backgroundColor', TRANSPARENT) || TRANSPARENT;
  const hasBg = bgColor !== TRANSPARENT;
  const effect: AnimatedTextEffect = ctx.editing ? 'none' : s<AnimatedTextEffect>(settings, 'effect', 'none');

  const put = (col: number, row: number, char: string) => {
    const x = boxX + col;
    const y = boxY + row;
    if (x < 0 || y < 0 || x >= ctx.width || y >= ctx.height) return;
    if ((char === ' ' || char === '') && !hasBg) return;
    out.set(`${x},${y}`, { char, color, bgColor });
  };

  if (hasBg && b(settings, 'fillBox', false)) {
    for (let row = 0; row < layout.height; row++) {
      for (let col = 0; col < layout.width; col++) put(col, row, ' ');
    }
  }

  let range = { start: 0, end: layout.charCount };
  if (effect === 'typewriter') range = getTypewriterRange(settings, layout.charCount);

  const waveAmplitude = n(settings, 'wave.amplitude', 1);
  const waveFrequency = n(settings, 'wave.frequency', 1);
  const wavePhase = (phases['wave.speed'] ?? 0) + (n(settings, 'wave.phase', 0) * Math.PI) / 180;
  const waveHorizontal = s(settings, 'wave.axis', 'horizontal') === 'horizontal';

  for (const glyph of layout.glyphs) {
    if (effect === 'typewriter' && (glyph.index < range.start || glyph.index >= range.end)) continue;
    if (effect === 'blink' && !isBlinkVisible(settings, ctx.localFrame, glyph.index)) continue;
    let col = glyph.col;
    let row = glyph.row;
    if (effect === 'wave') {
      if (waveHorizontal) {
        row += Math.round(waveAmplitude * Math.sin((col * waveFrequency * Math.PI) / 10 + wavePhase));
      } else {
        col += Math.round(waveAmplitude * Math.sin((row * waveFrequency * Math.PI) / 10 + wavePhase));
      }
    }
    put(col, row, glyph.char);
  }

  if (effect === 'typewriter' && b(settings, 'typewriter.cursor', false)) {
    const caretSource = range.end < layout.charCount ? layout.sourceOfIndex[range.end] : s(settings, 'text', '').length;
    const caret = caretInsideBox(
      layout.carets[caretSource] ?? { col: 0, row: 0 },
      layout,
      s<TextAlign>(settings, 'align', 'left'),
    );
    const paused = previousSettings === undefined || revealedEnd(previousSettings) === range.end;
    let visible = true;
    if (paused && b(settings, 'typewriter.cursorBlink', true)) {
      const rate = Math.max(1, Math.round(n(settings, 'typewriter.cursorBlinkFrames', 15)));
      visible = Math.floor(ctx.localFrame / rate) % 2 === 0;
    }
    if (visible) {
      const cursorChar = Array.from(s(settings, 'typewriter.cursorChar', '█'))[0] ?? '█';
      put(caret.col, caret.row, cursorChar);
    }
  }

  return out;
}

export const animatedTextGenerator: CellsGeneratorEntry = {
  type: ANIMATED_TEXT_GENERATOR_TYPE,
  name: 'Animated Text',
  icon: Type,
  description: 'Text in a box with keyframeable position and size, plus typewriter, blink, and wave animations',
  mode: 'cells',
  defaultSettings: defaultsFromDefinitions(propertyDefinitions),
  propertyDefinitions,
  phaseProperties: ['wave.speed'],
  getCanvasDefaults: (w, h) => {
    const text = 'Text';
    const foreground = useToolStore.getState().selectedColor;
    return {
      'position.x': Math.floor((w - text.length) / 2),
      'position.y': Math.floor((h - 1) / 2),
      // New boxes use the current foreground color (white when it is transparent)
      textColor: foreground && foreground !== TRANSPARENT ? foreground : '#ffffff',
    };
  },
  renderCells: renderAnimatedText,
};
