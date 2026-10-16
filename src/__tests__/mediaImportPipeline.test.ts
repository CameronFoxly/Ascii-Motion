import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_IMPORT_SETTINGS } from '../stores/importStore';
import { convertMediaToCells, type ConversionContext } from '../utils/mediaImportPipeline';

// jsdom cannot decode PNGs or read canvas pixels. Only that boundary is stubbed;
// settings, pixel-to-character conversion and cell placement use the real pipeline.
vi.mock('../utils/mediaProcessor', () => ({
  mediaProcessor: {
    validateFile: (file: File) => ({ file, type: 'image' }),
    processImage: async () => ({
      success: true,
      frames: [{
        canvas: document.createElement('canvas'),
        imageData: {
          width: 3,
          height: 1,
          colorSpace: 'srgb',
          data: new Uint8ClampedArray([0, 0, 0, 255, 127, 127, 127, 255, 255, 255, 255, 255]),
        } satisfies ImageData,
      }],
      metadata: { originalWidth: 3, originalHeight: 1, processedWidth: 3, processedHeight: 1, frameCount: 1 },
    }),
  },
}));

describe('image import character ordering', () => {
  it.each([
    { characters: [' ', '.', '@'], invertDensity: false, expected: [' ', '.', '@'] },
    { characters: ['@', '.', ' '], invertDensity: false, expected: ['@', '.', ' '] },
    { characters: [' ', '.', '@'], invertDensity: true, expected: ['@', '.', ' '] },
  ])('maps black/gray/white pixels with $characters and invertDensity=$invertDensity', async ({ characters, invertDensity, expected }) => {
    const context: ConversionContext = {
      palettes: [],
      characterPalette: { id: 'ordering', name: 'Ordering', characters, category: 'custom', isPreset: false, isCustom: true },
      mappingMethod: 'brightness',
      mappingMode: 'by-index',
      invertDensity,
      ditherStrength: 0,
      defaultTextColor: '#ffffff',
    };
    const converted = await convertMediaToCells(
      new File([], 'pixels.png', { type: 'image/png' }),
      {
        ...DEFAULT_IMPORT_SETTINGS,
        characterWidth: 3,
        characterHeight: 1,
        cropMode: 'top-left',
        characterMappingStyle: 'character-palette',
        enableCharacterMapping: true,
        enableTextColorMapping: false,
        enableBackgroundColorMapping: false,
        enableColorAsAlpha: false,
        colorQuantization: 'none',
        nudgeX: 2,
      },
      context,
      { width: 5, height: 1 },
    );
    expect(converted.type).toBe('image');
    expect(converted.frames).toHaveLength(1);
    expect([...converted.frames[0].data.keys()]).toEqual(['2,0', '3,0', '4,0']);
    expect([...converted.frames[0].data.values()].map((cell) => cell.char)).toEqual(expected);
    expect(context.characterPalette.characters).toEqual(characters);
  });
});
