/** Color and character palette management through the palette stores. */
import { usePaletteStore } from '../../../stores/paletteStore';
import { useCharacterPaletteStore } from '../../../stores/characterPaletteStore';
import { validateCharacterPaletteJSON } from '../../../utils/characterPaletteValidation';
import { isValidCharacter } from '../../../types/palette';
import type { OperationHandler } from '../runtime';
import { invalid, notFound } from '../errors';

type Kind = 'color' | 'character';

function colorPalette(id: string) {
  const palette = usePaletteStore.getState().getAllPalettes().find((p) => p.id === id);
  if (!palette) throw notFound('Color palette', id);
  return palette;
}

function characterPalette(id: string) {
  const palette = useCharacterPaletteStore.getState().getPaletteById(id);
  if (!palette) throw notFound('Character palette', id);
  return palette;
}

function requireCustom(kind: Kind, id: string): void {
  const palette = kind === 'color' ? colorPalette(id) : characterPalette(id);
  if (palette.isPreset || !palette.isCustom) {
    throw invalid(`${palette.name} is a preset palette; duplicate_palette it first to edit a copy`, { paletteId: id });
  }
}

export function describePalette(kind: Kind, id: string): Record<string, unknown> {
  if (kind === 'color') {
    const p = colorPalette(id);
    return { kind, paletteId: p.id, name: p.name, colors: p.colors.map((c) => c.value), isPreset: p.isPreset, active: usePaletteStore.getState().activePaletteId === p.id };
  }
  const p = characterPalette(id);
  return { kind, paletteId: p.id, name: p.name, characters: [...p.characters], category: p.category, isPreset: p.isPreset, active: useCharacterPaletteStore.getState().activePalette.id === p.id };
}

function activate(kind: Kind, id: string): void {
  if (kind === 'color') usePaletteStore.getState().setActivePalette(id);
  else useCharacterPaletteStore.getState().setActivePalette(characterPalette(id));
}

function replaceColors(id: string, colors: string[]): void {
  const store = usePaletteStore.getState();
  colorPalette(id).colors.forEach((c) => store.removeColor(id, c.id));
  colors.forEach((value) => usePaletteStore.getState().addColor(id, value));
}

/** Character palette entries must each be one code point so saved sessions reload. */
function paletteCharacters(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  const chars = value as string[];
  const bad = chars.filter((c) => !isValidCharacter(c));
  if (bad.length) throw invalid(`Palette characters must each be a single character (one code point): ${bad.map((c) => JSON.stringify(c)).join(', ')}`);
  return [...chars];
}

export const paletteHandlers: Record<string, OperationHandler> = {
  set_active_palette: (input) => {
    const kind = input.kind as Kind;
    const id = input.paletteId as string;
    if (kind === 'color') colorPalette(id);
    activate(kind, id);
    return describePalette(kind, id);
  },

  create_palette: (input) => {
    const kind = input.kind as Kind;
    const name = input.name as string;
    let id: string;
    if (kind === 'color') {
      if (input.characters) throw invalid('characters only apply to kind "character"');
      id = usePaletteStore.getState().createCustomPalette(name, (input.colors as string[] | undefined) ?? []);
    } else {
      if (input.colors) throw invalid('colors only apply to kind "color"');
      id = useCharacterPaletteStore.getState().createCustomPalette(name, paletteCharacters(input.characters) ?? []).id;
    }
    if (input.activate) activate(kind, id);
    return describePalette(kind, id);
  },

  update_palette: (input) => {
    const kind = input.kind as Kind;
    const id = input.paletteId as string;
    requireCustom(kind, id);
    if (kind === 'color') {
      if (input.characters) throw invalid('characters only apply to kind "character"');
      if (input.name !== undefined) usePaletteStore.getState().renamePalette(id, input.name as string);
      if (input.colors) replaceColors(id, input.colors as string[]);
    } else {
      if (input.colors) throw invalid('colors only apply to kind "color"');
      useCharacterPaletteStore.getState().updateCustomPalette(id, {
        ...(input.name !== undefined ? { name: input.name as string } : {}),
        ...(input.characters ? { characters: paletteCharacters(input.characters) } : {}),
      });
    }
    return describePalette(kind, id);
  },

  delete_palette: (input) => {
    const kind = input.kind as Kind;
    const id = input.paletteId as string;
    requireCustom(kind, id);
    if (kind === 'color') {
      if (!usePaletteStore.getState().deletePalette(id)) throw invalid(`Could not delete palette ${id}`);
    } else {
      useCharacterPaletteStore.getState().deleteCustomPalette(id);
    }
    return {
      kind,
      deletedPaletteId: id,
      activePaletteId: kind === 'color' ? usePaletteStore.getState().activePaletteId : useCharacterPaletteStore.getState().activePalette.id,
    };
  },

  duplicate_palette: (input) => {
    const kind = input.kind as Kind;
    const sourceId = input.paletteId as string;
    const name = input.name as string | undefined;
    let id: string;
    if (kind === 'color') {
      colorPalette(sourceId);
      id = usePaletteStore.getState().duplicatePalette(sourceId, name);
    } else {
      characterPalette(sourceId);
      id = useCharacterPaletteStore.getState().duplicatePalette(sourceId, name).id;
    }
    return { ...describePalette(kind, id), sourcePaletteId: sourceId };
  },

  import_palette: (input) => {
    const kind = input.kind as Kind;
    const data = input.data as string;
    let id: string;
    if (kind === 'color') {
      const result = usePaletteStore.getState().importPalette(data);
      if (!result.success || !result.paletteId) throw invalid(result.message);
      id = result.paletteId;
    } else {
      const validation = validateCharacterPaletteJSON(data);
      if (!validation.isValid || !validation.data) throw invalid(`Invalid character palette: ${validation.errors.join('; ')}`, { errors: validation.errors });
      id = useCharacterPaletteStore.getState().importPalette(validation.data).id;
    }
    if (input.activate) activate(kind, id);
    return describePalette(kind, id);
  },

  export_palette: (input) => {
    const kind = input.kind as Kind;
    const id = input.paletteId as string;
    const exported = kind === 'color'
      ? (colorPalette(id), usePaletteStore.getState().exportPalette(id))
      : (characterPalette(id), useCharacterPaletteStore.getState().exportPalette(id));
    if (!exported) throw notFound(`${kind} palette`, id);
    const text = JSON.stringify(exported, null, 2);
    const safe = (exported.name || 'palette').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'palette';
    return {
      artifact: {
        filename: `${safe}${kind === 'character' ? '-characters' : ''}.json`,
        mimeType: 'application/json',
        encoding: 'utf8',
        bytes: new TextEncoder().encode(text).length,
        data: text,
      },
    };
  },
};
