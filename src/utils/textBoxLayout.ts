import type { TextAlignment, TextBoxRegion, TextBoxEdit, TextCharacterStyle } from '../types';

export interface TextBoxLine {
  start: number;
  end: number;
  text: string;
  x: number;
  y: number;
}

export function updateTextBoxStyles(
  edit: TextBoxEdit, text: string, caret: number, insertionStyle: TextCharacterStyle,
): TextCharacterStyle[] {
  let start = Math.min(edit.anchor, edit.caret);
  let end = Math.max(edit.anchor, edit.caret);
  const difference = text.length - edit.text.length;
  if (start === end && difference < 0) {
    start = Math.min(caret, edit.caret);
    end = start - difference;
  }
  let inserted = text.length - (edit.text.length - (end - start));
  // Prefer the actual selection/caret to disambiguate edits to repeated characters.
  if (inserted < 0 || text.slice(0, start) !== edit.text.slice(0, start) ||
      text.slice(start + inserted) !== edit.text.slice(end)) {
    start = 0;
    while (start < Math.min(text.length, edit.text.length) && text[start] === edit.text[start]) start++;
    end = edit.text.length;
    let suffix = text.length;
    while (end > start && suffix > start && edit.text[end - 1] === text[suffix - 1]) {
      end--;
      suffix--;
    }
    inserted = suffix - start;
  }
  return [
    ...edit.styles.slice(0, start),
    ...Array.from({ length: inserted }, () => ({ ...insertionStyle })),
    ...edit.styles.slice(end),
  ];
}

export function colorTextBoxSelection(
  edit: TextBoxEdit, property: keyof TextCharacterStyle, value: string,
): TextBoxEdit {
  const start = Math.min(edit.anchor, edit.caret);
  const end = Math.max(edit.anchor, edit.caret);
  if (start === end) return edit;
  return {
    ...edit,
    styles: edit.styles.map((style, index) =>
      index >= start && index < end ? { ...style, [property]: value } : style),
  };
}

export function layoutTextBox(text: string, box: TextBoxRegion, alignment: TextAlignment): TextBoxLine[] {
  const width = Math.max(1, box.right - box.left + 1);
  const lines: TextBoxLine[] = [];
  let start = 0;
  while (start <= text.length) {
    const newline = text.indexOf('\n', start);
    const paragraphEnd = newline === -1 ? text.length : newline;
    let end = Math.min(start + width, paragraphEnd);
    let next = end;
    if (end < paragraphEnd) {
      const space = text[end] === ' ' ? end : text.lastIndexOf(' ', end - 1);
      if (space > start) {
        end = space;
        next = space;
        while (next < paragraphEnd && text[next] === ' ') next++;
      }
    }
    const lineText = text.slice(start, end);
    const spare = width - lineText.length;
    const offset = alignment === 'right' ? spare : alignment === 'center' ? Math.floor(spare / 2) : 0;
    lines.push({ start, end, text: lineText, x: box.left + offset, y: box.top + lines.length });
    if (next === paragraphEnd) {
      if (newline === -1) break;
      start = next + 1;
    } else {
      start = next;
    }
  }
  return lines;
}

export function textBoxCaret(lines: TextBoxLine[], offset: number): { x: number; y: number } {
  const line = lines.find((_entry, index) =>
    index === lines.length - 1 || offset < lines[index + 1].start,
  ) ?? lines[lines.length - 1];
  return { x: line.x + Math.max(0, Math.min(line.text.length, offset - line.start)), y: line.y };
}

export function textBoxOffsetAt(lines: TextBoxLine[], x: number, y: number): number {
  const line = lines[Math.max(0, Math.min(lines.length - 1, y - lines[0].y))];
  return line.start + Math.max(0, Math.min(line.text.length, x - line.x));
}

export function textBoxToolbarPosition(
  right: number, bottom: number, viewportWidth: number, viewportHeight: number,
): { left: number; top: number } {
  const width = 108;
  const height = 36;
  return {
    left: Math.max(4, Math.min(right - width, viewportWidth - width - 4)),
    top: Math.max(4, Math.min(
      bottom + height + 8 > viewportHeight ? bottom - height - 8 : bottom + 8,
      viewportHeight - height - 4,
    )),
  };
}
