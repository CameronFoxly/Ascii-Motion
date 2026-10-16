/** Selection masks and clipboard on explicit content frames (layer-local coordinates). */
import { useSelectionStore } from '../../../stores/selectionStore';
import { useToolStore } from '../../../stores/toolStore';
import { clearAllSelections } from '../../../hooks/useSelectionSync';
import { getCellsInPolygon } from '../../../utils/polygon';
import type { Cell } from '../../../types';
import { BridgeError, invalid } from '../errors';
import type { OperationHandler } from '../runtime';
import {
  canvas, cellKey, inCanvas, parseKey, putCell, regionCells, resolveTarget, targetResult, writeContentFrame,
  type StyleInput, type TargetInput,
} from './common';
import { readSelection } from './document';

/** Apply a mask to both the tool store (rect selection) and the unified selection store. */
export function applySelectionMask(mask: Set<string>): void {
  if (mask.size === 0) {
    clearAllSelections();
    return;
  }
  const tool = useToolStore.getState();
  tool.clearLassoSelection();
  tool.clearMagicWandSelection();
  tool.setSelectionFromMask(new Set(mask));
  useSelectionStore.getState().setSelection(new Set(mask));
}

function currentMask(): Set<string> {
  const sel = useSelectionStore.getState();
  return sel.isActive ? new Set(sel.selectedCells) : new Set();
}

function requireMask(): Set<string> {
  const mask = currentMask();
  if (mask.size === 0) throw new BridgeError('NOT_FOUND', 'No active selection');
  return mask;
}

function requireNoActiveMove(): void {
  if (useSelectionStore.getState().hasActiveMove()) {
    throw new BridgeError('CONFLICT', 'A selection move is in progress in the app; commit or cancel it first');
  }
}

function cellMatches(cell: Cell | undefined, match: StyleInput): boolean {
  const c = cell ?? { char: ' ', color: '', bgColor: 'transparent' };
  return (match.char === undefined || c.char === match.char)
    && (match.color === undefined || (c.color ?? '').toLowerCase() === match.color.toLowerCase())
    && (match.bgColor === undefined || (c.bgColor ?? 'transparent').toLowerCase() === match.bgColor.toLowerCase());
}

function matchMask(data: Map<string, Cell>, match: StyleInput, from?: { x: number; y: number }): Set<string> {
  const { width, height } = canvas();
  const out = new Set<string>();
  if (!from) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) if (cellMatches(data.get(cellKey(x, y)), match)) out.add(cellKey(x, y));
    }
    return out;
  }
  if (!inCanvas(from.x, from.y)) throw invalid('contiguousFrom is outside the canvas');
  if (!cellMatches(data.get(cellKey(from.x, from.y)), match)) return out;
  const stack = [from];
  while (stack.length) {
    const p = stack.pop()!;
    const key = cellKey(p.x, p.y);
    if (out.has(key) || !inCanvas(p.x, p.y) || !cellMatches(data.get(key), match)) continue;
    out.add(key);
    stack.push({ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 });
  }
  return out;
}

export const selectionHandlers: Record<string, OperationHandler> = {
  set_selection: (input) => {
    requireNoActiveMove();
    const { width, height } = canvas();
    let mask: Set<string>;
    switch (input.mode) {
      case 'rectangle': {
        if (!input.region) throw invalid('mode "rectangle" requires region');
        mask = new Set(regionCells(input.region as { x: number; y: number; width: number; height: number })
          .filter((p) => inCanvas(p.x, p.y)).map((p) => cellKey(p.x, p.y)));
        break;
      }
      case 'cells': {
        if (!input.cells) throw invalid('mode "cells" requires cells');
        mask = new Set((input.cells as Array<{ x: number; y: number }>).filter((p) => inCanvas(p.x, p.y)).map((p) => cellKey(p.x, p.y)));
        break;
      }
      case 'polygon': {
        if (!input.polygon) throw invalid('mode "polygon" requires polygon');
        mask = getCellsInPolygon(input.polygon as Array<{ x: number; y: number }>, width, height);
        break;
      }
      case 'match': {
        if (!input.match) throw invalid('mode "match" requires match');
        const target = resolveTarget(input.target as TargetInput, { editable: false });
        mask = matchMask(target.contentFrame.data, input.match as StyleInput, input.contiguousFrom as { x: number; y: number } | undefined);
        break;
      }
      default:
        mask = new Set(regionCells({ x: 0, y: 0, width, height }).map((p) => cellKey(p.x, p.y)));
    }
    const combine = (input.combine as string | undefined) ?? 'replace';
    if (combine !== 'replace') {
      const base = currentMask();
      if (combine === 'add') mask.forEach((k) => base.add(k));
      else mask.forEach((k) => base.delete(k));
      mask = base;
    }
    applySelectionMask(mask);
    return readSelection();
  },

  clear_selection: () => {
    requireNoActiveMove();
    clearAllSelections();
    return readSelection();
  },

  copy_selection: (input, ctx) => {
    requireNoActiveMove();
    const mask = requireMask();
    const cut = input.cut === true;
    const target = resolveTarget(input.target as TargetInput, { editable: cut });
    useSelectionStore.getState().copySelection(target.contentFrame.data);
    const clipboard = useSelectionStore.getState().getClipboard();
    const copiedCells = clipboard?.data.size ?? 0;
    if (!cut) {
      ctx.noChange();
      return targetResult(target, { copiedCells, cut: false });
    }
    const next = new Map(target.contentFrame.data);
    let changedCells = 0;
    mask.forEach((k) => { if (next.delete(k)) changedCells += 1; });
    if (changedCells > 0) writeContentFrame(target, next);
    else ctx.noChange();
    return targetResult(target, { copiedCells, cut: true, changedCells });
  },

  paste_clipboard: (input) => {
    requireNoActiveMove();
    const clipboard = useSelectionStore.getState().getClipboard();
    if (!clipboard || clipboard.data.size === 0) throw new BridgeError('NOT_FOUND', 'Clipboard is empty');
    const target = resolveTarget(input.target as TargetInput);
    const { minX, minY, maxX, maxY } = clipboard.bounds;
    const dx = (input.x as number | undefined) === undefined ? 0 : (input.x as number) - minX;
    const dy = (input.y as number | undefined) === undefined ? 0 : (input.y as number) - minY;
    const next = new Map(target.contentFrame.data);
    if (input.transparent === false) {
      for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) next.delete(cellKey(x + dx, y + dy));
    }
    const pasted = new Set<string>();
    clipboard.data.forEach((cell, key) => {
      const p = parseKey(key);
      const x = p.x + dx;
      const y = p.y + dy;
      if (!inCanvas(x, y)) return;
      putCell(next, x, y, cell);
      pasted.add(cellKey(x, y));
    });
    writeContentFrame(target, next);
    applySelectionMask(pasted);
    return targetResult(target, { pastedCells: pasted.size, x: minX + dx, y: minY + dy });
  },

  move_selection: (input, ctx) => {
    requireNoActiveMove();
    const mask = requireMask();
    const dx = input.dx as number;
    const dy = input.dy as number;
    if (dx === 0 && dy === 0) {
      ctx.noChange();
      return { movedCells: 0 };
    }
    const target = resolveTarget(input.target as TargetInput);
    const source = target.contentFrame.data;
    const next = new Map(source);
    const moving: Array<[number, number, Cell]> = [];
    mask.forEach((k) => {
      const cell = source.get(k);
      next.delete(k);
      if (cell) {
        const p = parseKey(k);
        moving.push([p.x + dx, p.y + dy, cell]);
      }
    });
    moving.forEach(([x, y, cell]) => { if (inCanvas(x, y)) putCell(next, x, y, cell); });
    writeContentFrame(target, next);
    const moved = new Set<string>();
    mask.forEach((k) => {
      const p = parseKey(k);
      if (inCanvas(p.x + dx, p.y + dy)) moved.add(cellKey(p.x + dx, p.y + dy));
    });
    applySelectionMask(moved);
    return targetResult(target, { movedCells: moving.length, dx, dy });
  },
};
