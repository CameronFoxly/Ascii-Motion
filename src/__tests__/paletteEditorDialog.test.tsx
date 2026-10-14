import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaletteEditorDialog } from '../components/features/PaletteEditorDialog';
import { GeneratorPropertiesPanel } from '../components/features/timeline/GeneratorPropertiesPanel';
import { useCharacterPaletteStore } from '../stores/characterPaletteStore';
import { usePaletteStore } from '../stores/paletteStore';
import { useImportStore } from '../stores/importStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useToolStore } from '../stores/toolStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useAnimationStore } from '../stores/animationStore';
import { processHistoryAction } from '../hooks/useKeyboardShortcuts';
import { registerAllGenerators } from '../registry/generators';

vi.mock('../hooks/useProjectFileActions', () => ({ useProjectFileActions: vi.fn() }));

function Editor({ kind, initialId }: { kind: 'character' | 'color'; initialId: string }) {
  const [paletteId, setPaletteId] = useState(initialId);
  return <PaletteEditorDialog open onOpenChange={vi.fn()} kind={kind} paletteId={paletteId} onPaletteChange={setPaletteId} />;
}

function replay(redo = false) {
  act(() => {
    const state = useToolStore.getState();
    const action = redo ? state.redo() : state.undo();
    expect(action).toBeDefined();
    useToolStore.setState({ isProcessingHistory: true });
    try {
      processHistoryAction(action!, redo, useCanvasStore.getState(), useAnimationStore.getState());
    } finally {
      useToolStore.setState({ isProcessingHistory: false });
    }
  });
}

beforeEach(() => {
  useCharacterPaletteStore.getState().resetToDefaults();
  usePaletteStore.getState().reset();
  useToolStore.getState().clearHistory();
  useTimelineStore.getState().createNewProject();
  registerAllGenerators();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('reusable palette editor dialog', () => {
  it('stays open on outside clicks, has no dimming overlay, and drags by its title bar', () => {
    const onOpenChange = vi.fn();
    render(
      <div>
        <button>Canvas</button>
        <PaletteEditorDialog open onOpenChange={onOpenChange} kind="color" paletteId="default" onPaletteChange={vi.fn()} />
      </div>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Color Palette' });
    expect(document.querySelector('[data-state="open"].fixed.inset-0')).toBeNull();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Canvas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Canvas' }));
    expect(onOpenChange).not.toHaveBeenCalled();
    const before = dialog.style.transform;
    fireEvent.pointerDown(within(dialog).getByText('Color Palette'), { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(document, { clientX: 130, clientY: 120 });
    fireEvent.pointerUp(document);
    expect(dialog.style.transform).not.toBe(before);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('reuses character creation, picker, editing and management without changing import settings', () => {
    const importSettings = structuredClone(useImportStore.getState().settings);
    render(<Editor kind="character" initialId="minimal-ascii" />);
    expect(screen.queryByText('Mapping Style')).toBeNull();
    expect(screen.queryByText('Character Dithering')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Create character palette' }));
    expect(useCharacterPaletteStore.getState().customPalettes).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Edit character' }));
    const picker = screen.getByRole('dialog', { name: 'Select Character for Mapping' });
    const input = within(picker).getByPlaceholderText('Type or paste...');
    fireEvent.change(input, { target: { value: 'Z' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(useCharacterPaletteStore.getState().customPalettes[0].characters).toEqual(['Z']);
    expect(screen.queryByRole('dialog', { name: 'Select Character for Mapping' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add current character' }));
    expect(useCharacterPaletteStore.getState().customPalettes[0].characters).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Manage character palettes' }));
    expect(screen.getByRole('dialog', { name: 'Manage Character Palettes' })).toBeDefined();
    expect(useImportStore.getState().settings).toEqual(importSettings);
    expect(useCharacterPaletteStore.getState().activePalette.id).toBe('minimal-ascii');
  });

  it('edits a character preset as a custom copy and supports palette undo/redo while open', () => {
    const preset = useCharacterPaletteStore.getState().getPaletteById('minimal-ascii')!;
    const before = [...preset.characters];
    render(<Editor kind="character" initialId="minimal-ascii" />);
    fireEvent.click(screen.getByRole('button', { name: 'Reverse character order' }));
    expect(useCharacterPaletteStore.getState().getPaletteById('minimal-ascii')!.characters).toEqual(before);
    expect(useCharacterPaletteStore.getState().customPalettes[0].characters).toEqual([...before].reverse());
    expect(useToolStore.getState().historyStack.every((action) => action.type === 'palette_edit')).toBe(true);
    const historyLength = useToolStore.getState().historyStack.length;
    replay();
    expect(useCharacterPaletteStore.getState().customPalettes[0].characters).toEqual(before);
    replay(true);
    expect(useCharacterPaletteStore.getState().customPalettes[0].characters).toEqual([...before].reverse());
    expect(useToolStore.getState().historyStack).toHaveLength(historyLength);
  });

  it('edits colors through a nested modal and exports the consumer palette', () => {
    const paletteId = usePaletteStore.getState().createCustomPalette('Dialog Colors', ['#112233']);
    const importSettings = structuredClone(useImportStore.getState().settings);
    render(<Editor kind="color" initialId={paletteId} />);
    expect(screen.queryByText('Mapping Mode')).toBeNull();
    const dialog = screen.getByRole('dialog', { name: 'Color Palette' });
    const swatch = dialog.querySelector('[draggable="true"]')!;
    fireEvent.doubleClick(swatch);
    const picker = screen.getByRole('dialog', { name: 'Edit Color' });
    const input = picker.querySelector('input[placeholder="#000000"]')!;
    fireEvent.change(input, { target: { value: '#ff0000' } });
    fireEvent.click(within(picker).getByRole('button', { name: 'OK' }));
    expect(usePaletteStore.getState().customPalettes[0].colors[0].value).toBe('#FF0000');
    expect(screen.queryByRole('dialog', { name: 'Edit Color' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Export color palette' }));
    const exportDialog = screen.getByRole('dialog', { name: 'Export Color Palette' });
    expect(within(exportDialog).getByDisplayValue('dialog-colors')).toBeDefined();
    expect(useImportStore.getState().settings).toEqual(importSettings);
  });

  it('makes a preset color editable on the first double click', () => {
    render(<Editor kind="color" initialId="ansi-16" />);
    const preset = usePaletteStore.getState().palettes.find((p) => p.id === 'ansi-16')!;
    const dialog = screen.getByRole('dialog', { name: 'Color Palette' });
    const swatch = dialog.querySelector('[draggable="false"]')!;
    fireEvent.doubleClick(swatch);
    expect(screen.getByRole('dialog', { name: 'Edit Color' })).toBeDefined();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Edit Color' })).getByRole('button', { name: 'Cancel' }));
    expect(usePaletteStore.getState().customPalettes).toHaveLength(1);
    expect(usePaletteStore.getState().customPalettes[0].colors).toHaveLength(preset.colors.length);
  });

  it('edits duplicate color values by swatch identity rather than the first matching value', () => {
    const id = usePaletteStore.getState().createCustomPalette('Duplicates', ['#112233', '#112233']);
    render(<Editor kind="color" initialId={id} />);
    const swatches = screen.getByRole('dialog', { name: 'Color Palette' }).querySelectorAll('[draggable="true"]');
    fireEvent.doubleClick(swatches[1]);
    const picker = screen.getByRole('dialog', { name: 'Edit Color' });
    fireEvent.change(picker.querySelector('input[placeholder="#000000"]')!, { target: { value: '#ff0000' } });
    fireEvent.click(within(picker).getByRole('button', { name: 'OK' }));
    expect(usePaletteStore.getState().customPalettes[0].colors.map((color) => color.value)).toEqual(['#112233', '#FF0000']);
  });

  it.each(['Remove color', 'Move color left', 'Move color right'])('maps preset IDs correctly for %s', (action) => {
    render(<Editor kind="color" initialId="ansi-16" />);
    const preset = usePaletteStore.getState().palettes.find((palette) => palette.id === 'ansi-16')!;
    const original = preset.colors.map((color) => color.value);
    const swatches = screen.getByRole('dialog', { name: 'Color Palette' }).querySelectorAll('[draggable="false"]');
    fireEvent.click(swatches[1]);
    fireEvent.click(screen.getByRole('button', { name: action }));
    const expected = [...original];
    if (action === 'Remove color') expected.splice(1, 1);
    else {
      const target = action === 'Move color left' ? 0 : 2;
      [expected[1], expected[target]] = [expected[target], expected[1]];
    }
    expect(usePaletteStore.getState().customPalettes[0].colors.map((color) => color.value)).toEqual(expected);
    expect(preset.colors.map((color) => color.value)).toEqual(original);
  });

  it.each(['character', 'color'] as const)('requires explicit replacement of a missing %s palette', (kind) => {
    render(<Editor kind={kind} initialId="missing-palette" />);
    expect(screen.getByRole('alert').textContent).toContain('unavailable');
    expect(screen.queryByRole('button', { name: /Reverse .* order/ })).toBeNull();
    fireEvent.change(screen.getByRole('combobox', { name: 'Choose replacement palette' }), {
      target: { value: kind === 'character' ? 'minimal-ascii' : 'ansi-16' },
    });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: kind === 'character' ? 'Reverse character order' : 'Reverse color order' })).toBeDefined();
  });

  it('records color editing and replays it without creating history during undo', () => {
    const paletteId = usePaletteStore.getState().createCustomPalette('Colors', ['#112233']);
    render(<Editor kind="color" initialId={paletteId} />);
    useToolStore.getState().clearHistory();
    fireEvent.click(screen.getByRole('button', { name: 'Add color' }));
    expect(usePaletteStore.getState().customPalettes[0].colors).toHaveLength(2);
    expect(useToolStore.getState().historyStack).toHaveLength(1);
    replay();
    expect(usePaletteStore.getState().customPalettes[0].colors).toHaveLength(1);
    replay(true);
    expect(usePaletteStore.getState().customPalettes[0].colors).toHaveLength(2);
    expect(useToolStore.getState().historyStack).toHaveLength(1);
  });

  it('exports the controlled character palette rather than the global selection', () => {
    const palette = useCharacterPaletteStore.getState().createCustomPalette('Dialog Characters', ['X', 'Y']);
    render(<Editor kind="character" initialId={palette.id} />);
    fireEvent.click(screen.getByRole('button', { name: 'Manage character palettes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export character palette' }));
    const dialog = screen.getByRole('dialog', { name: 'Export Character Palette' });
    expect(within(dialog).getByDisplayValue('dialog-characters')).toBeDefined();
    expect(useCharacterPaletteStore.getState().activePalette.id).toBe('minimal-ascii');
  });

  it.each(['character', 'color'] as const)('selects an imported %s palette for the consumer', (kind) => {
    vi.useFakeTimers();
    const importSettings = structuredClone(useImportStore.getState().settings);
    render(<Editor kind={kind} initialId={kind === 'character' ? 'minimal-ascii' : 'ansi-16'} />);
    if (kind === 'character') fireEvent.click(screen.getByRole('button', { name: 'Manage character palettes' }));
    fireEvent.click(screen.getByRole('button', { name: `Import ${kind} palette` }));
    fireEvent.click(screen.getByRole('button', { name: 'Paste JSON' }));
    const data = kind === 'character'
      ? { name: 'Imported Characters', characters: ['X', 'Y'], category: 'custom' }
      : { name: 'Imported Colors', colors: ['#112233', '#445566'] };
    fireEvent.change(screen.getByRole('textbox'), { target: { value: JSON.stringify(data) } });
    fireEvent.click(screen.getByRole('button', { name: 'Import Palette' }));
    act(() => vi.runAllTimers());
    if (kind === 'character') {
      const manager = screen.getByRole('dialog', { name: 'Manage Character Palettes' });
      fireEvent.click(within(manager).getByRole('button', { name: 'Close' }));
      expect(useCharacterPaletteStore.getState().customPalettes[0].characters).toEqual(['X', 'Y']);
      expect(screen.getByRole('combobox').textContent).toContain('Imported Characters');
    } else {
      expect(usePaletteStore.getState().customPalettes[0].colors.map((color) => color.value)).toEqual(['#112233', '#445566']);
      expect(screen.getByRole('combobox').textContent).toContain('Imported Colors');
    }
    expect(useImportStore.getState().settings).toEqual(importSettings);
  });
});

describe('generator palette buttons', () => {
  it.each([
    ['Edit Character Palette', 'Character Palette', 'character'],
    ['Edit Text Palette', 'Text Palette', 'color'],
    ['Edit Background Palette', 'Background Palette', 'color'],
  ] as const)('%s opens the reusable %s dialog', (button, title) => {
    const id = useTimelineStore.getState().addGeneratorLayer('turbulent-noise')!;
    useTimelineStore.getState().updateGeneratorSettings(id, { 'mapping.enableBackgroundColorMapping': true });
    render(<GeneratorPropertiesPanel />);
    fireEvent.click(screen.getByRole('button', { name: button }));
    expect(screen.getByRole('dialog', { name: title })).toBeDefined();
    expect(screen.queryByText('Mapping Style')).toBeNull();
    expect(screen.queryByText('Mapping Mode')).toBeNull();
  });

  it('creates an equivalent palette for legacy character sets without changing their characters', () => {
    const id = useTimelineStore.getState().addGeneratorLayer('turbulent-noise')!;
    useTimelineStore.getState().updateGeneratorSettings(id, {
      'mapping.characterPaletteId': '', 'mapping.characterSet': 'XYZ',
    });
    render(<GeneratorPropertiesPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Character Palette' }));
    const paletteId = String(useTimelineStore.getState().getLayer(id)!.generator!.settings['mapping.characterPaletteId']);
    expect(useCharacterPaletteStore.getState().getPaletteById(paletteId)!.characters).toEqual(['X', 'Y', 'Z']);
  });

  it('shows keyframeable reverse controls only for by-index modes', () => {
    const id = useTimelineStore.getState().addGeneratorLayer('turbulent-noise')!;
    render(<GeneratorPropertiesPanel />);
    expect(screen.getByTitle('Reverse Characters')).toBeDefined();
    expect(screen.getByTitle('Reverse Text Colors')).toBeDefined();
    act(() => useTimelineStore.getState().updateGeneratorSettings(id, {
      'mapping.characterDitherMode': 'bayer4x4', 'mapping.textColorMappingMode': 'closest',
    }));
    expect(screen.queryByTitle('Reverse Characters')).toBeNull();
    expect(screen.queryByTitle('Reverse Text Colors')).toBeNull();
  });

  it('records palette selection and reversal, including auto-keying and undo', () => {
    const state = useTimelineStore.getState();
    state.setDuration(20);
    const id = state.addGeneratorLayer('turbulent-noise')!;
    const track = state.addGeneratorPropertyTrack(id, 'mapping.reverseCharacterIndex')!;
    state.addGeneratorKeyframe(id, track, 0, false);
    state.goToFrame(10);
    render(<GeneratorPropertiesPanel />);
    const row = screen.getByTitle('Reverse Characters').parentElement!;
    fireEvent.click(within(row).getByRole('button', { name: 'Off' }));
    const source = useTimelineStore.getState().getLayer(id)!.generator!;
    expect(source.propertyTracks.find((t) => t.id === track)!.keyframes.map((key) => [key.frame, key.value]))
      .toEqual([[0, false], [10, true]]);
    replay();
    expect(useTimelineStore.getState().getLayer(id)!.generator!.propertyTracks[0].keyframes).toHaveLength(1);
    replay(true);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Character Palette' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create character palette' }));
    expect(useTimelineStore.getState().getLayer(id)!.generator!.settings['mapping.characterPaletteId'])
      .toBe(useCharacterPaletteStore.getState().customPalettes[0].id);
    replay();
    expect(useTimelineStore.getState().getLayer(id)!.generator!.settings['mapping.characterPaletteId']).toBe('minimal-ascii');
    replay();
    expect(useCharacterPaletteStore.getState().customPalettes).toHaveLength(0);
    replay(true);
    replay(true);
    expect(useTimelineStore.getState().getLayer(id)!.generator!.settings['mapping.characterPaletteId'])
      .toBe(useCharacterPaletteStore.getState().customPalettes[0].id);
  });
});
