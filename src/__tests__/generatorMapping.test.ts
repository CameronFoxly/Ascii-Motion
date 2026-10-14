import { beforeEach, describe, expect, it } from 'vitest';
import { registerAllGenerators } from '../registry/generators';
import { getGeneratorInitialSettings } from '../registry/generatorRegistry';
import { useCharacterPaletteStore } from '../stores/characterPaletteStore';
import { usePaletteStore } from '../stores/paletteStore';
import { useTimelineStore } from '../stores/timelineStore';
import { createIntensityBuffer, mapIntensityToCells, type ResolvedMappingSettings } from '../utils/generators/intensityMapping';
import { renderGeneratorFrame, resolveGeneratorSettings, resolveMappingSettings } from '../utils/generators/generatorRuntime';
import { serializeGeneratorSource, deserializeGeneratorSource } from '../utils/generators/generatorSerialization';
import type { GeneratorSource, GeneratorSourceId } from '../types/generatorLayer';

beforeEach(() => {
  registerAllGenerators();
  useCharacterPaletteStore.getState().resetToDefaults();
  usePaletteStore.getState().reset();
  useTimelineStore.getState().createNewProject();
});

describe('generator palette mapping', () => {
  it('new generators select a character palette while legacy sources preserve inline characters', () => {
    const settings = getGeneratorInitialSettings('turbulent-noise', 20, 10)!;
    expect(resolveMappingSettings(settings).characterSet).toEqual(
      useCharacterPaletteStore.getState().getPaletteById('minimal-ascii')!.characters);
    const source: GeneratorSource = {
      id: 'legacy' as GeneratorSourceId, generatorType: 'turbulent-noise',
      startFrame: 0, durationFrames: 30, enabled: true,
      settings: { 'mapping.characterSet': 'ABC' }, propertyTracks: [],
    };
    expect(resolveMappingSettings(resolveGeneratorSettings(source, 0)).characterSet).toEqual(['A', 'B', 'C']);
    expect(resolveMappingSettings(resolveGeneratorSettings(deserializeGeneratorSource(serializeGeneratorSource(source)), 0)).characterSet)
      .toEqual(['A', 'B', 'C']);
  });

  it.each(['radio-waves', 'turbulent-noise', 'particle-physics', 'rain-drops', 'digital-rain'])(
    '%s refreshes cached output when its shared character palette is edited', (generatorType) => {
      const palette = useCharacterPaletteStore.getState().createCustomPalette('Characters', ['A', 'A']);
      const source: GeneratorSource = {
        id: 'generator' as GeneratorSourceId, generatorType, startFrame: 0, durationFrames: 30, enabled: true,
        settings: { ...getGeneratorInitialSettings(generatorType, 20, 10), 'mapping.characterPaletteId': palette.id },
        propertyTracks: [],
      };
      const before = renderGeneratorFrame(source, 15, 20, 10);
      expect(before.size).toBeGreaterThan(0);
      expect([...before.values()].every((cell) => cell.char === 'A')).toBe(true);
      useCharacterPaletteStore.getState().updateCustomPalette(palette.id, { characters: ['B', 'B'] });
      const after = renderGeneratorFrame(source, 15, 20, 10);
      expect(after.size).toBe(before.size);
      expect([...after.values()].every((cell) => cell.char === 'B')).toBe(true);
    });

  it('resolves palette IDs through an explicit lookup without touching the live-store cache', () => {
    const palette = useCharacterPaletteStore.getState().createCustomPalette('Characters', ['A', 'A']);
    const source: GeneratorSource = {
      id: 'generator' as GeneratorSourceId, generatorType: 'turbulent-noise', startFrame: 0, durationFrames: 30, enabled: true,
      settings: {
        ...getGeneratorInitialSettings('turbulent-noise', 20, 10),
        'mapping.characterPaletteId': palette.id,
        'mapping.textColorPaletteId': 'saved-colors',
      },
      propertyTracks: [],
    };
    const paletteLookup = {
      colors: (id: string) => (id === 'saved-colors' ? ['#00ff00'] : undefined),
      characters: (id: string) => (id === palette.id ? ['Z', 'Z'] : undefined),
    };
    const saved = renderGeneratorFrame(source, 15, 20, 10, { paletteLookup });
    expect(saved.size).toBeGreaterThan(0);
    expect([...saved.values()].every((cell) => cell.char === 'Z' && cell.color === '#00ff00')).toBe(true);
    const live = renderGeneratorFrame(source, 15, 20, 10);
    expect([...live.values()].every((cell) => cell.char === 'A')).toBe(true);
  });

  it('refreshes cached colors when a shared color palette is edited', () => {
    const paletteId = usePaletteStore.getState().createCustomPalette('Colors', ['#ff0000']);
    const source: GeneratorSource = {
      id: 'generator' as GeneratorSourceId, generatorType: 'turbulent-noise', startFrame: 0, durationFrames: 30, enabled: true,
      settings: {
        ...getGeneratorInitialSettings('turbulent-noise', 20, 10),
        'mapping.characterSet': 'X', 'mapping.characterPaletteId': '',
        'mapping.textColorPaletteId': paletteId,
      },
      propertyTracks: [],
    };
    expect([...renderGeneratorFrame(source, 3, 20, 10).values()].every((cell) => cell.color === '#ff0000')).toBe(true);
    const colorId = usePaletteStore.getState().getActivePalette()!.colors[0].id;
    usePaletteStore.getState().updateColor(paletteId, colorId, '#00ff00');
    expect([...renderGeneratorFrame(source, 3, 20, 10).values()].every((cell) => cell.color === '#00ff00')).toBe(true);
  });

  it('keyframes palette selection and reverse flags with hold interpolation and session round-trip', () => {
    const tl = useTimelineStore.getState();
    const layerId = tl.addGeneratorLayer('turbulent-noise', { durationFrames: 20 })!;
    const paletteTrack = tl.addGeneratorPropertyTrack(layerId, 'mapping.characterPaletteId')!;
    tl.addGeneratorKeyframe(layerId, paletteTrack, 0, 'minimal-ascii');
    tl.addGeneratorKeyframe(layerId, paletteTrack, 10, 'block-characters');
    for (const path of ['mapping.reverseCharacterIndex', 'mapping.reverseTextColorIndex', 'mapping.reverseBackgroundColorIndex']) {
      const trackId = tl.addGeneratorPropertyTrack(layerId, path)!;
      tl.addGeneratorKeyframe(layerId, trackId, 0, false);
      tl.addGeneratorKeyframe(layerId, trackId, 10, true);
    }
    const source = useTimelineStore.getState().getLayer(layerId)!.generator!;
    const restored = deserializeGeneratorSource(serializeGeneratorSource(source));
    for (const frame of [0, 9, 10, 15]) {
      expect(resolveGeneratorSettings(restored, frame)).toEqual(resolveGeneratorSettings(source, frame));
      expect(resolveGeneratorSettings(source, frame)['mapping.reverseCharacterIndex']).toBe(frame >= 10);
      expect(resolveGeneratorSettings(source, frame)['mapping.characterPaletteId']).toBe(frame < 10 ? 'minimal-ascii' : 'block-characters');
    }
  });
});

describe('reverse index mapping', () => {
  const settings: ResolvedMappingSettings = {
    enableCharacterMapping: true, characterSet: ['A', 'B', 'C', 'D'],
    characterDitherMode: 'by-index', ditherStrength: 0.5,
    enableTextColorMapping: true, textColors: ['#000000', '#555555', '#aaaaaa', '#ffffff'],
    textColorMappingMode: 'by-index', textColorDitherStrength: 0.5,
    enableBackgroundColorMapping: true, backgroundColors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00'],
    backgroundColorMappingMode: 'by-index', backgroundColorDitherStrength: 0.5,
  };
  const buffer = createIntensityBuffer(5, 1);
  buffer.intensity.set([0, 0.25, 0.5, 0.75, 1]);
  buffer.coverage.fill(1);

  it('reverses character, text and background indexes independently without mutating palettes', () => {
    const original = structuredClone(settings);
    const forward = [...mapIntensityToCells(buffer, settings).values()];
    const characters = [...mapIntensityToCells(buffer, { ...settings, reverseCharacterIndex: true }).values()];
    expect(forward.map((cell) => cell.char)).toEqual(['A', 'B', 'C', 'C', 'D']);
    expect(characters.map((cell) => cell.char)).toEqual(['D', 'C', 'B', 'B', 'A']);
    expect(characters.map((cell) => cell.color)).toEqual(forward.map((cell) => cell.color));
    const text = [...mapIntensityToCells(buffer, { ...settings, reverseTextColorIndex: true }).values()];
    expect(text.map((cell) => cell.color)).toEqual(['#ffffff', '#aaaaaa', '#555555', '#555555', '#000000']);
    expect(text.map((cell) => cell.char)).toEqual(forward.map((cell) => cell.char));
    const background = [...mapIntensityToCells(buffer, { ...settings, reverseBackgroundColorIndex: true }).values()];
    expect(background.map((cell) => cell.bgColor)).toEqual(['#ffff00', '#0000ff', '#00ff00', '#00ff00', '#ff0000']);
    expect(settings).toEqual(original);
  });

  it('ignores reverse flags for dithering and closest-color modes', () => {
    const dithered: ResolvedMappingSettings = {
      ...settings, characterDitherMode: 'bayer4x4', textColorMappingMode: 'closest', backgroundColorMappingMode: 'noise-dither',
    };
    expect(mapIntensityToCells(buffer, {
      ...dithered, reverseCharacterIndex: true, reverseTextColorIndex: true, reverseBackgroundColorIndex: true,
    })).toEqual(mapIntensityToCells(buffer, dithered));
  });
});
