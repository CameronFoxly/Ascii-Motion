/**
 * Text layout for the Animated Text generator.
 *
 * Converts a (multi-line) string into positioned glyphs inside a box, either
 * hugging the content or wrapped to a fixed size. Shared by the renderer and
 * the on-canvas editing overlay so the caret always matches rendered output.
 */

export type TextShape = 'hug' | 'fixed';
export type TextAlign = 'left' | 'center' | 'right';

export interface TextLayoutOptions {
  shape: TextShape;
  /** Box width in cells (fixed shape only) */
  width?: number;
  /** Box height in cells (fixed shape only) */
  height?: number;
  align: TextAlign;
}

export interface TextGlyph {
  char: string;
  /** Column within the box */
  col: number;
  /** Row within the box */
  row: number;
  /** Reading-order character index, excluding newlines (used by animation effects) */
  index: number;
  /** Index into the source string */
  sourceIndex: number;
}

export interface TextLayout {
  width: number;
  height: number;
  /** Visible glyphs (clipped to the box in fixed mode) */
  glyphs: TextGlyph[];
  /** Number of characters excluding newlines */
  charCount: number;
  /** Caret cell for each source position 0..text.length (before that character) */
  carets: Array<{ col: number; row: number }>;
  /** Source string position of each character index */
  sourceOfIndex: number[];
}

interface SourceChar {
  ch: string;
  src: number;
  index: number;
}

interface VisualLine {
  chars: SourceChar[];
  /** Source positions whose caret sits at the end of this line (newlines, dropped wrap spaces) */
  tail: number[];
}

function trimTrailingSpaces(line: VisualLine): void {
  while (line.chars.length > 0 && line.chars[line.chars.length - 1].ch === ' ') {
    const dropped = line.chars.pop()!;
    line.tail.unshift(dropped.src);
  }
}

/** Greedy word wrap; words longer than the width are broken by character */
function wrapHardLine(chars: SourceChar[], width: number): VisualLine[] {
  const lines: VisualLine[] = [];
  let cur: VisualLine = { chars: [], tail: [] };
  let i = 0;
  while (i < chars.length) {
    const isSpace = chars[i].ch === ' ';
    let j = i;
    while (j < chars.length && (chars[j].ch === ' ') === isSpace) j++;
    const token = chars.slice(i, j);
    i = j;
    if (isSpace) {
      cur.chars.push(...token);
      continue;
    }
    if (cur.chars.length + token.length <= width) {
      cur.chars.push(...token);
      continue;
    }
    const hasText = cur.chars.some((c) => c.ch !== ' ');
    if (hasText) {
      trimTrailingSpaces(cur);
      lines.push(cur);
      cur = { chars: [], tail: [] };
    }
    for (const c of token) {
      if (cur.chars.length >= width) {
        lines.push(cur);
        cur = { chars: [], tail: [] };
      }
      cur.chars.push(c);
    }
  }
  lines.push(cur);
  return lines;
}

export function layoutText(text: string, options: TextLayoutOptions): TextLayout {
  const fixed = options.shape === 'fixed';
  const fixedWidth = Math.max(1, Math.round(options.width ?? 1));
  const fixedHeight = Math.max(1, Math.round(options.height ?? 1));

  // Split into hard lines with source/char indices
  const hardLines: SourceChar[][] = [[]];
  const newlineSources: number[][] = [[]];
  let index = 0;
  const sourceOfIndex: number[] = [];
  const chars = Array.from(text);
  let src = 0;
  for (const ch of chars) {
    if (ch === '\n') {
      newlineSources[newlineSources.length - 1].push(src);
      hardLines.push([]);
      newlineSources.push([]);
    } else {
      sourceOfIndex.push(src);
      hardLines[hardLines.length - 1].push({ ch, src, index: index++ });
    }
    src += ch.length;
  }

  const lines: VisualLine[] = [];
  hardLines.forEach((hard, h) => {
    const visual = fixed ? wrapHardLine(hard, fixedWidth) : [{ chars: hard, tail: [] }];
    visual[visual.length - 1].tail.push(...newlineSources[h]);
    lines.push(...visual);
  });

  const width = fixed
    ? fixedWidth
    : Math.max(1, ...lines.map((l) => l.chars.length));
  const height = fixed ? fixedHeight : Math.max(1, lines.length);

  const glyphs: TextGlyph[] = [];
  const carets: Array<{ col: number; row: number }> = new Array(text.length + 1);
  lines.forEach((line, row) => {
    const visibleLength = Math.min(line.chars.length, width);
    const offset = options.align === 'center'
      ? Math.floor((width - visibleLength) / 2)
      : options.align === 'right'
        ? width - visibleLength
        : 0;
    line.chars.forEach((c, i) => {
      const col = offset + i;
      carets[c.src] = { col, row };
      if (i >= width || row >= height) return;
      glyphs.push({ char: c.ch, col, row, index: c.index, sourceIndex: c.src });
    });
    const end = { col: offset + line.chars.length, row };
    for (const t of line.tail) carets[t] = end;
  });
  const last = lines[lines.length - 1];
  const lastOffset = options.align === 'center'
    ? Math.floor((width - Math.min(last.chars.length, width)) / 2)
    : options.align === 'right'
      ? width - Math.min(last.chars.length, width)
      : 0;
  carets[text.length] = { col: lastOffset + last.chars.length, row: lines.length - 1 };
  // Fill positions inside surrogate pairs with the preceding caret
  for (let k = 0; k <= text.length; k++) {
    if (!carets[k]) carets[k] = carets[k - 1] ?? { col: 0, row: 0 };
  }

  return { width, height, glyphs, charCount: index, carets, sourceOfIndex };
}
