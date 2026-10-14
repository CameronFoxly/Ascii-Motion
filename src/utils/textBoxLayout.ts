import type { TextAlignment, TextBoxRegion, TextBoxEdit, TextCharacterStyle } from '../types';

export interface TextBoxLine {
  start: number;
  end: number;
  text: string;
  x: number;
  y: number;
  characters: Array<{ text: string; start: number; end: number; styleIndex: number }>;
}

export function textCodePoints(text: string): Array<{ text: string; start: number; end: number }> {
  const characters: Array<{ text: string; start: number; end: number }> = [];
  let offset = 0;
  for (const character of text) {
    characters.push({ text: character, start: offset, end: offset + character.length });
    offset += character.length;
  }
  return characters;
}

export function textCodePointIndex(text: string, offset: number): number {
  return textCodePoints(text).filter((character) => character.end <= offset).length;
}

export function moveTextCodePointOffset(text: string, offset: number, direction: -1 | 1): number {
  const characters = textCodePoints(text);
  if (direction < 0) {
    return [...characters].reverse().find((character) => character.start < offset)?.start ?? 0;
  }
  return characters.find((character) => character.end > offset)?.end ?? text.length;
}

export function normalizeTextOffset(text: string, offset: number): number {
  const characters = textCodePoints(text);
  const bounded = Math.max(0, Math.min(text.length, offset));
  for (const character of characters) {
    if (bounded > character.start && bounded < character.end) return character.start;
  }
  return bounded;
}

export function updateTextBoxStyles(
  edit: TextBoxEdit, text: string, caret: number, insertionStyle: TextCharacterStyle,
): TextCharacterStyle[] {
  const oldCharacters = textCodePoints(edit.text);
  const newCharacters = textCodePoints(text);
  let start = textCodePointIndex(edit.text, Math.min(edit.anchor, edit.caret));
  let end = textCodePointIndex(edit.text, Math.max(edit.anchor, edit.caret));
  const difference = newCharacters.length - oldCharacters.length;
  if (start === end && difference < 0) {
    start = Math.min(textCodePointIndex(text, caret), textCodePointIndex(edit.text, edit.caret));
    end = start - difference;
  }
  let inserted = newCharacters.length - (oldCharacters.length - (end - start));
  // Prefer the actual selection/caret to disambiguate edits to repeated characters.
  if (inserted < 0 ||
      newCharacters.slice(0, start).map(({ text: value }) => value).join('') !==
        oldCharacters.slice(0, start).map(({ text: value }) => value).join('') ||
      newCharacters.slice(start + inserted).map(({ text: value }) => value).join('') !==
        oldCharacters.slice(end).map(({ text: value }) => value).join('')) {
    start = 0;
    while (start < Math.min(newCharacters.length, oldCharacters.length) &&
      newCharacters[start].text === oldCharacters[start].text) start++;
    end = oldCharacters.length;
    let suffix = newCharacters.length;
    while (end > start && suffix > start &&
      oldCharacters[end - 1].text === newCharacters[suffix - 1].text) {
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
  const start = textCodePointIndex(edit.text, Math.min(edit.anchor, edit.caret));
  const end = textCodePointIndex(edit.text, Math.max(edit.anchor, edit.caret));
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
  const characters = textCodePoints(text);
  let start = 0;
  while (start <= characters.length) {
    const newline = characters.findIndex((character, index) => index >= start && character.text === '\n');
    const paragraphEnd = newline === -1 ? characters.length : newline;
    let end = Math.min(start + width, paragraphEnd);
    let next = end;
    if (end < paragraphEnd) {
      let space = characters[end]?.text === ' ' ? end : -1;
      if (space === -1) {
        for (let index = end - 1; index >= start; index--) {
          if (characters[index].text === ' ') {
            space = index;
            break;
          }
        }
      }
      if (space > start) {
        end = space;
        next = space;
        while (next < paragraphEnd && characters[next]?.text === ' ') next++;
      }
    }
    const lineCharacters = characters.slice(start, end).map((character, index) => ({
      ...character, styleIndex: start + index,
    }));
    const lineText = lineCharacters.map(({ text: character }) => character).join('');
    const spare = width - lineCharacters.length;
    const offset = alignment === 'right' ? spare : alignment === 'center' ? Math.floor(spare / 2) : 0;
    const lineStart = characters[start]?.start ?? text.length;
    const lineEnd = characters[end - 1]?.end ?? lineStart;
    lines.push({
      start: lineStart, end: lineEnd, text: lineText, x: box.left + offset, y: box.top + lines.length,
      characters: lineCharacters,
    });
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
  const column = line.characters.filter((character) => character.end <= offset).length;
  return { x: line.x + Math.max(0, Math.min(line.characters.length, column)), y: line.y };
}

export function textBoxOffsetAt(lines: TextBoxLine[], x: number, y: number): number {
  const line = lines[Math.max(0, Math.min(lines.length - 1, y - lines[0].y))];
  const column = Math.max(0, Math.min(line.characters.length, x - line.x));
  return line.characters[column]?.start ?? line.end;
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
