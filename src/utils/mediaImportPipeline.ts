/**
 * Media → ASCII import pipeline shared by the Import panel and the MCP bridge
 * `import_media` operation.
 */
import { ColorMatcher, asciiConverter } from './asciiConverter';
import type { ConversionSettings } from './asciiConverter';
import { SAMPLING_QUALITY_PRESETS } from './shapeBasedConverter';
import { mediaProcessor, type ProcessingOptions, type ProcessingResult } from './mediaProcessor';
import { positionImportCells } from './importTransformUtils';
import type { ImportSettings } from '../stores/importStore';
import type { ColorPalette } from '../types/palette';
import type { CharacterPalette } from '../types/palette';
import type { Cell } from '../types';

export interface ConversionContext {
  palettes: ColorPalette[];
  characterPalette: CharacterPalette;
  mappingMethod: ConversionSettings['mappingMethod'];
  mappingMode: ConversionSettings['characterMappingMode'];
  invertDensity: boolean;
  ditherStrength: number;
  defaultTextColor: string;
}

export function buildConversionSettings(settings: ImportSettings, ctx: ConversionContext): ConversionSettings {
  const resolvePaletteColors = (paletteId: string | null): string[] => {
    if (!paletteId) return [];
    const palette = ctx.palettes.find((candidate) => candidate.id === paletteId);
    return palette ? palette.colors.map((color) => color.value) : [];
  };

  return {
    enableCharacterMapping: settings.enableCharacterMapping,
    characterPalette: ctx.characterPalette,
    mappingMethod: ctx.mappingMethod,
    characterMappingMode: ctx.mappingMode,
    invertDensity: ctx.invertDensity,

    autoModeEnabled: settings.characterMappingStyle === 'auto-mode',
    autoModeCharacterSet: settings.autoModeCharacterSet,
    autoModeGlobalContrast: settings.autoModeGlobalContrast,
    autoModeDirectionalContrast: settings.autoModeDirectionalContrast,
    autoModeGridWidth: settings.characterWidth,
    autoModeGridHeight: settings.characterHeight,

    lineArtEnabled: settings.characterMappingStyle === 'line-art',
    lineArtBlurRadius: settings.lineArtBlurRadius,
    lineArtEdgeThreshold: settings.lineArtEdgeThreshold,
    lineArtDilateRadius: settings.lineArtDilateRadius,
    lineArtErodeRadius: settings.lineArtErodeRadius,
    lineArtSdfBlurRadius: settings.lineArtSdfBlurRadius,
    lineArtInverseMatchWeight: settings.lineArtInverseMatchWeight,
    lineArtGridWidth: settings.characterWidth,
    lineArtGridHeight: settings.characterHeight,

    enableTextColorMapping: settings.enableTextColorMapping,
    textColorPalette: settings.enableTextColorMapping ? resolvePaletteColors(settings.textColorPaletteId) : [],
    textColorMappingMode: settings.textColorMappingMode,
    textColorDitherStrength: settings.textColorDitherStrength,
    defaultTextColor: ctx.defaultTextColor,

    enableBackgroundColorMapping: settings.enableBackgroundColorMapping,
    backgroundColorPalette: settings.enableBackgroundColorMapping ? resolvePaletteColors(settings.backgroundColorPaletteId) : [],
    backgroundColorMappingMode: settings.backgroundColorMappingMode,
    backgroundColorDitherStrength: settings.backgroundColorDitherStrength,

    useOriginalColors: settings.useOriginalColors,
    colorQuantization: settings.colorQuantization,
    paletteSize: settings.paletteSize,
    colorMappingMode: settings.colorMappingMode,

    contrastEnhancement: 1 + (settings.contrast / 100),
    brightnessAdjustment: settings.brightness,
    saturationAdjustment: settings.saturation,
    highlightsAdjustment: settings.highlights,
    shadowsAdjustment: settings.shadows,
    midtonesAdjustment: settings.midtones,
    blurAmount: settings.blur,
    sharpenAmount: settings.sharpen,
    ditherStrength: ctx.ditherStrength,
  };
}

export function buildProcessingOptions(
  settings: Pick<ImportSettings, 'characterMappingStyle' | 'autoModeSamplingQuality' | 'characterWidth' | 'characterHeight' | 'cropMode'>,
): ProcessingOptions {
  const isAutoMode = settings.characterMappingStyle === 'auto-mode';
  const isLineArt = settings.characterMappingStyle === 'line-art';
  const qualityPreset = isAutoMode ? SAMPLING_QUALITY_PRESETS[settings.autoModeSamplingQuality] : undefined;
  // Line art needs higher resolution for edge detection.
  const lineArtPreset = isLineArt ? SAMPLING_QUALITY_PRESETS['low'] : undefined;
  const pixelsPreset = qualityPreset || lineArtPreset;
  return {
    targetWidth: settings.characterWidth,
    targetHeight: settings.characterHeight,
    maintainAspectRatio: false,
    cropMode: settings.cropMode,
    quality: 'medium',
    ...(pixelsPreset && {
      pixelsPerCellX: pixelsPreset.cellPixelsX,
      pixelsPerCellY: pixelsPreset.cellPixelsY,
    }),
  };
}

export interface ConvertedMediaFrame {
  data: Map<string, Cell>;
  durationMs: number;
}

/** Process a media file and convert every frame to positioned canvas cells. */
export async function convertMediaToCells(
  file: File,
  settings: ImportSettings,
  ctx: ConversionContext,
  canvas: { width: number; height: number },
): Promise<{ frames: ConvertedMediaFrame[]; metadata: ProcessingResult['metadata']; type: 'image' | 'video' }> {
  const mediaFile = mediaProcessor.validateFile(file);
  if (!mediaFile) {
    throw new Error(`Unsupported media type: ${file.type || file.name}`);
  }
  const options = buildProcessingOptions(settings);
  const result = mediaFile.type === 'image'
    ? await mediaProcessor.processImage(mediaFile, options)
    : await mediaProcessor.processVideo(mediaFile, options);
  if (!result.success) {
    throw new Error(result.error || 'Media processing failed');
  }
  const conversionSettings = buildConversionSettings(settings, ctx);
  const frames = result.frames.map((frame) => {
    const converted = asciiConverter.convertFrame(frame, conversionSettings);
    const keyed = applyColorKey(
      converted.cells,
      settings.enableColorAsAlpha,
      settings.colorAsAlphaKey,
      settings.colorAsAlphaTolerance,
      frame.imageData,
      settings.characterWidth,
      settings.characterHeight,
    );
    const data = positionImportCells(keyed, {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      imageWidth: settings.characterWidth,
      imageHeight: settings.characterHeight,
      cropMode: settings.cropMode,
      nudgeX: settings.nudgeX,
      nudgeY: settings.nudgeY,
    });
    return { data, durationMs: frame.frameDuration || 100 };
  });
  return { frames, metadata: result.metadata, type: mediaFile.type };
}

/**
 * Apply color keying to filter out cells matching the alpha key color
 * Uses ORIGINAL pixel colors from the source image (before preprocessing/palette mapping)
 * Returns a new Map with transparent cells removed
 * 
 * @param cells - The converted ASCII cells
 * @param enableColorAsAlpha - Whether color keying is enabled
 * @param colorAsAlphaKey - The hex color to match for transparency
 * @param colorAsAlphaTolerance - RGB distance tolerance (0-255)
 * @param originalImageData - The original source image data (before processing)
 */
export function applyColorKey(
  cells: Map<string, Cell>,
  enableColorAsAlpha: boolean,
  colorAsAlphaKey: string,
  colorAsAlphaTolerance: number,
  originalImageData?: ImageData,
  gridWidth?: number,
  gridHeight?: number
): Map<string, Cell> {
  if (!enableColorAsAlpha) {
    return cells;
  }

  const filteredCells = new Map<string, Cell>();
  
  cells.forEach((cell, key) => {
    // Parse cell coordinates from key (format: "x,y")
    const [x, y] = key.split(',').map(Number);
    
    let shouldRemove = false;
    
    if (originalImageData) {
      // When image is higher resolution than the grid (auto/line-art mode),
      // map cell coordinates to the center pixel of the corresponding cell region.
      const imgW = originalImageData.width;
      const imgH = originalImageData.height;
      const gw = gridWidth || imgW;
      const gh = gridHeight || imgH;
      const cellW = imgW / gw;
      const cellH = imgH / gh;
      const px = Math.min(Math.floor(x * cellW + cellW / 2), imgW - 1);
      const py = Math.min(Math.floor(y * cellH + cellH / 2), imgH - 1);
      
      const pixelIndex = (py * imgW + px) * 4;
      const r = originalImageData.data[pixelIndex];
      const g = originalImageData.data[pixelIndex + 1];
      const b = originalImageData.data[pixelIndex + 2];
      
      // Check if this original pixel matches the color key
      shouldRemove = ColorMatcher.matchesColorKey(r, g, b, colorAsAlphaKey, colorAsAlphaTolerance);
    } else {
      // Fallback: check post-processed cell colors (legacy behavior)
      const bgMatches = cell.bgColor !== 'transparent' && 
        ColorMatcher.matchesColorKey(
          ...hexToRgb(cell.bgColor),
          colorAsAlphaKey,
          colorAsAlphaTolerance
        );
      
      const textMatches = ColorMatcher.matchesColorKey(
        ...hexToRgb(cell.color),
        colorAsAlphaKey,
        colorAsAlphaTolerance
      );
      
      shouldRemove = bgMatches || textMatches;
    }
    
    // Keep cell if it doesn't match the alpha key
    if (!shouldRemove) {
      filteredCells.set(key, cell);
    }
  });
  
  return filteredCells;
}

/**
 * Helper to convert hex color to RGB tuple
 */
function hexToRgb(hex: string): [number, number, number] {
  const rgb = ColorMatcher.hexToRgb(hex);
  return [rgb.r, rgb.g, rgb.b];
}

