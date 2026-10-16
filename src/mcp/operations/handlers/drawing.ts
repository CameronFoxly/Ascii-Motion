/**
 * Semantic drawing operations. Each reuses the app's tool engines (brush,
 * fill area, gradient, box drawing, bezier/vector shapes, FIGlet) and commits
 * to an explicit content frame in layer-local coordinates.
 */
import { BOX_DRAWING_STYLES } from '../../../constants/boxDrawingStyles';
import { DEFAULT_PALETTE_ID, getPaletteById } from '../../../constants/bezierAutofill';
import { renderFigletText, type AsciiTypeLayoutPreset } from '../../../lib/figletClient';
import { getCanvasTypographySnapshot } from '../../../stores/canvasTypographySnapshot';
import { useCharacterPaletteStore } from '../../../stores/characterPaletteStore';
import { usePaletteStore } from '../../../stores/paletteStore';
import type { BezierAnchorPoint } from '../../../stores/bezierStore';
import type { BrushShape, Cell, GradientDefinition, GradientProperty } from '../../../types';
import { generateBezierPreview } from '../../../utils/bezierFillUtils';
import { detectConnections, generateBoxRectangle, getBoxDrawingCharacter, getLineCells } from '../../../utils/boxDrawingEngine';
import { calculateBrushCells } from '../../../utils/brushUtils';
import { findFillArea } from '../../../utils/fillArea';
import { calculateCellDimensions } from '../../../utils/fontMetrics';
import { calculateGradientCells } from '../../../utils/gradientEngine';
import { generateEllipseAnchorPoints, generateRectangleAnchorPoints } from '../../../utils/vectorShapeGeometry';
import { BridgeError, invalid, notFound } from '../errors';
import type { OperationHandler } from '../runtime';
import { canvas, cellKey, parseKey, putCell, regionCells, resolveStyle, resolveTarget, targetResult, writeContentFrame, type StyleInput, type TargetInput } from './common';

type Point = { x: number; y: number };
type Target = ReturnType<typeof resolveTarget>;

function finish(target: Target, data: Map<string, Cell>, extra: Record<string, unknown> = {}) {
  writeContentFrame(target, data);
  return targetResult(target, extra);
}

function strokeKeys(points: Point[], size: number, shape: BrushShape): Set<string> {
  const aspect = getCanvasTypographySnapshot().fontMetrics.aspectRatio;
  const keys = new Set<string>();
  const stamp = (p: Point) => calculateBrushCells(p.x, p.y, size, shape, aspect).forEach((c) => keys.add(cellKey(c.x, c.y)));
  if (points.length === 1) stamp(points[0]);
  for (let i = 1; i < points.length; i += 1) getLineCells(points[i - 1], points[i]).forEach(stamp);
  return keys;
}

function cellMetrics() {
  const snap = getCanvasTypographySnapshot();
  return calculateCellDimensions(snap.fontMetrics, { characterSpacing: snap.characterSpacing, lineSpacing: snap.lineSpacing });
}

function requireCanvas2d(op: string): void {
  const ok = typeof document !== 'undefined' && (() => {
    try { return Boolean(document.createElement('canvas').getContext('2d')); } catch { return false; }
  })();
  if (!ok) throw new BridgeError('UI_NOT_READY', `${op} needs a browser 2D canvas for rasterization`);
}

interface VectorOptions {
  fillMode?: 'constant' | 'palette' | 'autofill' | 'lineart';
  autofillPaletteId?: string;
  strokeWidth?: number;
  strokeTaperStart?: number;
  strokeTaperEnd?: number;
  filled?: boolean;
}

function rasterizeVector(op: string, target: Target, anchors: BezierAnchorPoint[], closed: boolean, opts: VectorOptions, style: Cell) {
  requireCanvas2d(op);
  const { width, height } = canvas();
  const { cellWidth, cellHeight } = cellMetrics();
  const fillMode = opts.fillMode ?? 'constant';
  const autofillId = opts.autofillPaletteId ?? DEFAULT_PALETTE_ID;
  if (fillMode === 'autofill' && !getPaletteById(autofillId)) throw notFound('Autofill palette', autofillId);
  const { previewCells } = generateBezierPreview(
    anchors, closed, fillMode, width, height, cellWidth, cellHeight, 1, { x: 0, y: 0 },
    style.char, style.color, style.bgColor,
    fillMode === 'palette' ? useCharacterPaletteStore.getState().activePalette.characters : undefined,
    fillMode === 'autofill' ? autofillId : undefined,
    'current', usePaletteStore.getState().getActivePalette() ?? undefined,
    opts.strokeWidth ?? 1, opts.strokeTaperStart ?? 0, opts.strokeTaperEnd ?? 0,
    undefined, undefined, undefined,
    opts.filled ?? true,
  );
  const data = new Map(target.contentFrame.data);
  previewCells.forEach((cell, key) => { const p = parseKey(key); putCell(data, p.x, p.y, cell); });
  return finish(target, data, { changedCells: previewCells.size });
}

let anchorSeq = 0;
function anchor(p: { x: number; y: number; handleIn?: Point; handleOut?: Point }): BezierAnchorPoint {
  const hasHandles = Boolean(p.handleIn || p.handleOut);
  anchorSeq += 1;
  return {
    id: `bridge-anchor-${anchorSeq}`,
    position: { x: p.x, y: p.y },
    hasHandles,
    handleIn: p.handleIn ?? null,
    handleOut: p.handleOut ?? null,
    handleSymmetric: false,
    selected: false,
  };
}

const DEFAULT_GRADIENT_PROPERTY: GradientProperty = { enabled: false, stops: [], interpolation: 'linear', ditherStrength: 50, quantizeSteps: 'infinite' };

function gradientProperty(input: Partial<GradientProperty> | undefined): GradientProperty {
  if (!input) return DEFAULT_GRADIENT_PROPERTY;
  return { ...DEFAULT_GRADIENT_PROPERTY, enabled: true, ...input } as GradientProperty;
}

function matchCriteria(match: { char?: boolean; color?: boolean; bgColor?: boolean } | undefined) {
  return { char: match?.char ?? true, color: match?.color ?? true, bgColor: match?.bgColor ?? true };
}

export const drawingHandlers: Record<string, OperationHandler> = {
  draw_brush_stroke: (input) => {
    const target = resolveTarget(input.target as TargetInput);
    const keys = strokeKeys(input.points as Point[], (input.size as number) ?? 1, ((input.shape as BrushShape) ?? 'circle'));
    const style = input.erase ? null : resolveStyle(input.style as StyleInput);
    const data = new Map(target.contentFrame.data);
    keys.forEach((k) => { const p = parseKey(k); putCell(data, p.x, p.y, style); });
    return finish(target, data, { changedCells: keys.size });
  },
  draw_line: (input) => {
    const target = resolveTarget(input.target as TargetInput);
    const keys = strokeKeys([input.from as Point, input.to as Point], (input.size as number) ?? 1, ((input.shape as BrushShape) ?? 'circle'));
    const style = resolveStyle(input.style as StyleInput);
    const data = new Map(target.contentFrame.data);
    keys.forEach((k) => { const p = parseKey(k); putCell(data, p.x, p.y, style); });
    return finish(target, data, { changedCells: keys.size });
  },
  fill_area: (input) => {
    const target = resolveTarget(input.target as TargetInput);
    const { width, height } = canvas();
    const source = target.contentFrame.data;
    const keys = findFillArea({
      startX: input.x as number, startY: input.y as number, canvasWidth: width, canvasHeight: height,
      getCell: (x, y) => source.get(cellKey(x, y)),
      contiguous: (input.contiguous as boolean | undefined) ?? true,
      matchCriteria: matchCriteria(input.match as never),
    });
    const style = resolveStyle(input.style as StyleInput);
    const data = new Map(source);
    keys.forEach((k) => { const p = parseKey(k); putCell(data, p.x, p.y, style); });
    return finish(target, data, { changedCells: keys.size });
  },
  gradient_fill: (input) => {
    const target = resolveTarget(input.target as TargetInput);
    const source = target.contentFrame.data;
    const { width, height } = canvas();
    let area: Set<string>;
    if (input.region) {
      area = new Set(regionCells(input.region as never).map((p) => cellKey(p.x, p.y)));
    } else {
      const seed = (input.seed as Point | undefined) ?? (input.start as Point);
      area = findFillArea({
        startX: seed.x, startY: seed.y, canvasWidth: width, canvasHeight: height,
        getCell: (x, y) => source.get(cellKey(x, y)),
        contiguous: (input.contiguous as boolean | undefined) ?? true,
        matchCriteria: matchCriteria(input.match as never),
      });
    }
    const definition: GradientDefinition = {
      type: ((input.type as string) ?? 'linear') as GradientDefinition['type'],
      character: gradientProperty(input.character as never),
      textColor: gradientProperty(input.textColor as never),
      backgroundColor: gradientProperty(input.backgroundColor as never),
    };
    if (!definition.character.enabled && !definition.textColor.enabled && !definition.backgroundColor.enabled) {
      throw invalid('Provide at least one of character, textColor, backgroundColor');
    }
    const cells = calculateGradientCells({
      startPoint: input.start as Point,
      endPoint: input.end as Point,
      definition,
      fillArea: area,
      cellAspectRatio: getCanvasTypographySnapshot().fontMetrics.aspectRatio,
      getCell: (x, y) => source.get(cellKey(x, y)),
    });
    const data = new Map(source);
    cells.forEach((cell, key) => { const p = parseKey(key); putCell(data, p.x, p.y, cell); });
    return finish(target, data, { changedCells: cells.size });
  },
  draw_ascii_box: (input) => {
    const target = resolveTarget(input.target as TargetInput);
    const styleId = (input.styleId as string | undefined) ?? 'single-line';
    const boxStyle = BOX_DRAWING_STYLES.find((s) => s.id === styleId);
    if (!boxStyle) throw notFound('Box style', styleId);
    const style = resolveStyle(input.style as StyleInput);
    const data = new Map(target.contentFrame.data);
    let drawn: Map<string, Cell>;
    if (input.region) {
      const r = input.region as { x: number; y: number; width: number; height: number };
      drawn = generateBoxRectangle({ x: r.x, y: r.y }, { x: r.x + r.width - 1, y: r.y + r.height - 1 }, boxStyle, data, style.color, style.bgColor).previewData;
    } else if (input.path) {
      const path = input.path as Point[];
      const keys = new Set<string>();
      for (let i = 1; i < path.length; i += 1) getLineCells(path[i - 1], path[i]).forEach((c) => keys.add(cellKey(c.x, c.y)));
      drawn = new Map();
      keys.forEach((k) => {
        const p = parseKey(k);
        drawn.set(k, { char: getBoxDrawingCharacter(detectConnections(p.x, p.y, keys, data), boxStyle), color: style.color, bgColor: style.bgColor });
      });
    } else {
      throw invalid('Pass region or path');
    }
    drawn.forEach((cell, key) => { const p = parseKey(key); putCell(data, p.x, p.y, cell); });
    return finish(target, data, { changedCells: drawn.size });
  },
  place_text: (input) => {
    const target = resolveTarget(input.target as TargetInput);
    const style = resolveStyle(input.style as StyleInput);
    const data = new Map(target.contentFrame.data);
    const lines = (input.text as string).replace(/\r\n?/g, '\n').split('\n');
    let changed = 0;
    lines.forEach((line, row) => Array.from(line).forEach((ch, col) => {
      putCell(data, (input.x as number) + col, (input.y as number) + row, { ...style, char: ch });
      changed += 1;
    }));
    return finish(target, data, { changedCells: changed });
  },
  place_figlet_text: async (input) => {
    const target = resolveTarget(input.target as TargetInput);
    const style = resolveStyle(input.style as StyleInput);
    let lines: string[];
    try {
      ({ lines } = await renderFigletText(input.text as string, {
        font: (input.font as string | undefined) ?? 'Standard',
        horizontalLayout: ((input.horizontalLayout as AsciiTypeLayoutPreset | undefined) ?? 'normal'),
        verticalLayout: ((input.verticalLayout as AsciiTypeLayoutPreset | undefined) ?? 'normal'),
      }));
    } catch (error) {
      throw new BridgeError('NOT_FOUND', `FIGlet font could not be loaded: ${error instanceof Error ? error.message : String(error)}`);
    }
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    const transparent = (input.transparentWhitespace as boolean | undefined) ?? true;
    const data = new Map(target.contentFrame.data);
    let changed = 0;
    lines.forEach((line, row) => Array.from(line).forEach((ch, col) => {
      if (ch === ' ' && transparent) return;
      putCell(data, (input.x as number) + col, (input.y as number) + row, { ...style, char: ch });
      changed += 1;
    }));
    return finish(target, data, { changedCells: changed, width: Math.max(0, ...lines.map((l) => Array.from(l).length)), height: lines.length });
  },
  draw_shape: (input) => {
    const target = resolveTarget(input.target as TargetInput);
    const r = input.region as { x: number; y: number; width: number; height: number };
    const filled = (input.filled as boolean | undefined) ?? true;
    const generate = input.shape === 'ellipse' ? generateEllipseAnchorPoints : generateRectangleAnchorPoints;
    const anchors = generate({ x: r.x, y: r.y, width: r.width, height: r.height }, filled);
    return rasterizeVector('draw_shape', target, anchors, filled, { ...(input as VectorOptions), filled }, resolveStyle(input.style as StyleInput));
  },
  draw_bezier: (input) => {
    const target = resolveTarget(input.target as TargetInput);
    const anchors = (input.points as Array<{ x: number; y: number; handleIn?: Point; handleOut?: Point }>).map(anchor);
    return rasterizeVector('draw_bezier', target, anchors, Boolean(input.closed), input as VectorOptions, resolveStyle(input.style as StyleInput));
  },
};
