/** Direct cell editing on an explicit content frame (layer-local coordinates). */
import { applyHorizontalFlip, applyVerticalFlip, calculateBoundsFromCells, calculateContentBounds } from '../../../utils/flipUtils';
import { useSelectionStore } from '../../../stores/selectionStore';
import type { Cell } from '../../../types';
import type { ContentFrame } from '../../../types/timeline';
import { BridgeError, invalid } from '../errors';
import type { OperationHandler } from '../runtime';
import {
  canvas, cellKey, isEmptyCell, isLayerLocked, parseKey, putCell, requireEditableLayer, regionCells, resolveStyle, resolveTarget, targetResult,
  tl, writeContentFrame, type StyleInput, type TargetInput,
} from './common';
import { cellsToMap, type CellAtInput } from './timeline';

type RegionInput = { x: number; y: number; width: number; height: number };

/** Region, selection, or (when allowed) undefined meaning "everything". */
export function areaKeys(input: { region?: RegionInput; useSelection?: boolean }, fallback: 'all' | 'required'): Set<string> | null {
  if (input.region && input.useSelection) throw invalid('Pass either region or useSelection, not both');
  if (input.region) return new Set(regionCells(input.region).map((p) => cellKey(p.x, p.y)));
  if (input.useSelection) {
    const sel = useSelectionStore.getState();
    if (!sel.isActive || sel.selectedCells.size === 0) throw new BridgeError('NOT_FOUND', 'No active selection');
    return new Set(sel.selectedCells);
  }
  if (fallback === 'required') throw invalid('Pass region or useSelection');
  return null;
}

function cloneData(cf: ContentFrame): Map<string, Cell> {
  return new Map(cf.data);
}

function changedCount(before: Map<string, Cell>, after: Map<string, Cell>): number {
  let n = 0;
  const keys = new Set([...before.keys(), ...after.keys()]);
  keys.forEach((k) => {
    const a = before.get(k);
    const b = after.get(k);
    if (!a || !b ? a !== b : a.char !== b.char || a.color !== b.color || a.bgColor !== b.bgColor) n += 1;
  });
  return n;
}

function commit(target: ReturnType<typeof resolveTarget>, before: Map<string, Cell>, after: Map<string, Cell>, extra: Record<string, unknown> = {}) {
  const changed = changedCount(before, after);
  if (changed > 0) writeContentFrame(target, after);
  return targetResult(target, { changedCells: changed, ...extra });
}

function matches(cell: Cell | undefined, match: StyleInput): boolean {
  if (!cell) return false;
  return (match.char === undefined || cell.char === match.char)
    && (match.color === undefined || cell.color.toLowerCase() === match.color.toLowerCase())
    && (match.bgColor === undefined || (cell.bgColor ?? 'transparent').toLowerCase() === match.bgColor.toLowerCase());
}

export const cellHandlers: Record<string, OperationHandler> = {
  set_cells: (input) => {
    const target = resolveTarget(input.target as TargetInput);
    const before = cloneData(target.contentFrame);
    return commit(target, before, cellsToMap(input.cells as CellAtInput[], before));
  },
  clear_cells: (input) => {
    const target = resolveTarget(input.target as TargetInput);
    const before = cloneData(target.contentFrame);
    const keys = areaKeys(input as never, 'all');
    const after = keys ? new Map([...before].filter(([k]) => !keys.has(k))) : new Map<string, Cell>();
    return commit(target, before, after);
  },
  fill_region: (input) => {
    const target = resolveTarget(input.target as TargetInput);
    const before = cloneData(target.contentFrame);
    const keys = areaKeys(input as never, 'required')!;
    const style = resolveStyle(input.cell as StyleInput);
    const after = new Map(before);
    keys.forEach((k) => { const p = parseKey(k); putCell(after, p.x, p.y, style); });
    return commit(target, before, after);
  },
  import_text: (input) => {
    const target = resolveTarget(input.target as TargetInput);
    const before = cloneData(target.contentFrame);
    const after = input.clearFirst ? new Map<string, Cell>() : new Map(before);
    const style = resolveStyle(input.style as StyleInput);
    const ox = (input.x as number | undefined) ?? 0;
    const oy = (input.y as number | undefined) ?? 0;
    const lines = (input.text as string).replace(/\r\n?/g, '\n').split('\n');
    let width = 0;
    lines.forEach((line, row) => {
      const chars = Array.from(line);
      width = Math.max(width, chars.length);
      chars.forEach((ch, col) => {
        if (ch === ' ' && !input.keepSpaces) return;
        putCell(after, ox + col, oy + row, { ...style, char: ch });
      });
    });
    return commit(target, before, after, { width, height: lines.length });
  },
  shift_content: (input) => {
    const target = resolveTarget(input.target as TargetInput);
    const before = cloneData(target.contentFrame);
    const { width, height } = canvas();
    const dx = input.dx as number;
    const dy = input.dy as number;
    const after = new Map<string, Cell>();
    before.forEach((cell, key) => {
      const p = parseKey(key);
      let x = p.x + dx;
      let y = p.y + dy;
      if (input.wrap) {
        x = ((x % width) + width) % width;
        y = ((y % height) + height) % height;
      } else if (x < 0 || y < 0 || x >= width || y >= height) return;
      after.set(cellKey(x, y), cell);
    });
    return commit(target, before, after);
  },
  flip_content: (input) => {
    const target = resolveTarget(input.target as TargetInput);
    const before = cloneData(target.contentFrame);
    const keys = areaKeys(input as never, 'all');
    const bounds = keys ? calculateBoundsFromCells(keys) : calculateContentBounds(before);
    if (!bounds) return targetResult(target, { changedCells: 0 });
    const flip = input.axis === 'horizontal' ? applyHorizontalFlip : applyVerticalFlip;
    return commit(target, before, flip(before, bounds, keys ?? undefined));
  },
  replace_in_cells: (input) => {
    const match = input.match as StyleInput;
    const replace = input.replace as StyleInput;
    const scope = (input.scope as string | undefined) ?? 'content_frame';
    if ((input.region || input.useSelection) && scope !== 'content_frame') throw invalid('region/useSelection require scope "content_frame"');
    const area = areaKeys(input as never, 'all');
    const frames: Array<{ layerId: string; cf: ContentFrame }> = [];
    if (scope === 'content_frame') {
      const target = resolveTarget(input.target as TargetInput);
      frames.push({ layerId: target.layer.id, cf: target.contentFrame });
    } else {
      const layers = scope === 'layer'
        ? [requireEditableLayer((input.target as TargetInput | undefined)?.layerId)]
        : tl().layers.filter((l) => l.kind !== 'generator' && !isLayerLocked(l));
      layers.forEach((layer) => layer.contentFrames.forEach((cf) => frames.push({ layerId: layer.id, cf })));
    }
    let changedCells = 0;
    const contentFrameIds: string[] = [];
    for (const { layerId, cf } of frames) {
      const next = new Map(cf.data);
      let n = 0;
      cf.data.forEach((cell, key) => {
        if (area && !area.has(key)) return;
        if (isEmptyCell(cell) || !matches(cell, match)) return;
        const p = parseKey(key);
        const replaced = { char: replace.char ?? cell.char, color: replace.color ?? cell.color, bgColor: replace.bgColor ?? cell.bgColor };
        putCell(next, p.x, p.y, isEmptyCell(replaced) ? null : replaced);
        n += 1;
      });
      if (n > 0) {
        tl().updateContentFrameData(layerId as never, cf.id, next);
        changedCells += n;
        contentFrameIds.push(cf.id);
      }
    }
    return { changedCells, contentFrameIds };
  },
};
