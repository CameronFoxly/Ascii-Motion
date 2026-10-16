import type { ExportDataBundle } from '../types/export';

/**
 * Build the native `.asciimtn` session object exactly as File → Save writes it.
 * Shared by the session exporter and the MCP bridge (`get_document`), so the
 * bridge never maintains a second serializer.
 */
export function buildSessionDocument(
  data: ExportDataBundle,
  options: { includeMetadata?: boolean } = {},
): Record<string, unknown> {
  // Shared tool/palette/typography/UI state for both v1 and v2
  const sharedState = {
    tools: {
      activeTool: data.toolState.activeTool,
      selectedCharacter: data.toolState.selectedCharacter,
      selectedColor: data.toolState.selectedColor,
      selectedBgColor: data.toolState.selectedBgColor,
      paintBucketContiguous: data.toolState.paintBucketContiguous,
      rectangleFilled: data.toolState.rectangleFilled
    },
    ui: {
      theme: data.uiState.theme,
      zoom: data.uiState.zoom,
      panOffset: data.uiState.panOffset,
      fontMetrics: data.fontMetrics
    },
    typography: {
      fontSize: data.typography.fontSize,
      characterSpacing: data.typography.characterSpacing,
      lineSpacing: data.typography.lineSpacing,
      selectedFontId: data.typography.selectedFontId
    },
    palettes: data.paletteState ? {
      activePaletteId: data.paletteState.activePaletteId,
      customPalettes: data.paletteState.customPalettes,
      recentColors: data.paletteState.recentColors
    } : undefined,
    characterPalettes: data.characterPaletteState ? {
      activePaletteId: data.characterPaletteState.activePaletteId,
      customPalettes: data.characterPaletteState.customPalettes.map(palette => ({
        ...palette,
        characters: [...palette.characters]
      })),
      mappingMethod: data.characterPaletteState.mappingMethod,
      invertDensity: data.characterPaletteState.invertDensity,
      characterSpacing: data.characterPaletteState.characterSpacing
    } : undefined
  };

  let sessionData: Record<string, unknown>;


  if (data.sessionDataV2) {
    // ─── V2 FORMAT: Full layer structure with keyframes ───
    sessionData = {
      ...data.sessionDataV2,
      // Enrich with project name/description
      name: data.metadata.projectName || data.name || 'Untitled Project',
      description: data.metadata.projectDescription || data.description,
      metadata: options.includeMetadata ? {
        exportedAt: new Date().toISOString(),
        exportVersion: '2.2.0',
        userAgent: navigator.userAgent
      } : undefined,
      // Attach shared state that the timeline store doesn't track
      ...sharedState,
    };
  } else {
    // ─── V1 FORMAT: Flat frames (legacy / no layers) ───
    sessionData = {
      version: '1.0.0',
      name: data.metadata.projectName || data.name || 'Untitled Project',
      description: data.metadata.projectDescription || data.description,
      metadata: options.includeMetadata ? {
        exportedAt: new Date().toISOString(),
        exportVersion: '1.0.0',
        userAgent: navigator.userAgent
      } : undefined,
      canvas: {
        width: data.canvasDimensions.width,
        height: data.canvasDimensions.height,
        canvasBackgroundColor: data.canvasBackgroundColor,
        showGrid: data.showGrid
      },
      animation: {
        frames: data.frames.map(frame => ({
          id: frame.id,
          name: frame.name,
          duration: frame.duration,
          data: Object.fromEntries(frame.data.entries())
        })),
        currentFrameIndex: data.currentFrameIndex,
        frameRate: data.frameRate,
        looping: data.looping
      },
      ...sharedState,
    };
  }

  return sessionData;
}
