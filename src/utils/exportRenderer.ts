import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { Font } from 'opentype.js';
import type { 
  ExportDataBundle, 
  ImageExportSettings, 
  VideoExportSettings, 
  SessionExportSettings,
  TextExportSettings,
  JsonExportSettings,
  HtmlExportSettings,
  ReactExportSettings,
  InkExportSettings,
  OpenTuiExportSettings,
  BubbleteaExportSettings,
  ExportProgress 
} from '../types/export';
import type { Cell } from '../types';
import type { TypographySettings } from './canvasSizeConversion';
import type { FontMetrics } from './fontMetrics';
import { setupTextRendering } from './canvasTextRendering';
import { calculateAdaptiveGridColor } from './gridColor';
import { applyPostEffectsToCanvas } from '../hooks/usePostEffectsRenderer';
import { 
  generateSvgHeader, 
  generateSvgGrid, 
  generateSvgContentGrouped,
  convertTextToPath,
  minifySvg,
  sanitizeFontStackForSvg
} from './svgExportUtils';
import { getPostEffect } from '../registry/postEffectRegistry';
import { evaluatePostEffectBlock, getActivePostEffects } from './postEffectsPipeline';
import type { PostEffectTrack } from '../types/postEffect';
import { FULLSCREEN_VERTEX_SHADER } from './webgl/commonShaders';

interface JsonExportFrameColors {
  foreground?: Record<string, string> | string;
  background?: Record<string, string> | string;
}

interface JsonExportFrameEntry {
  title: string;
  duration: number;
  content: string[] | string;
  contentString?: string;
  colors?: JsonExportFrameColors;
}

interface JsonExportMetadata {
  exportedAt: string;
  exportVersion: string;
  appVersion: string;
  description: string;
  title: string;
  frameCount: number;
  canvasSize: {
    width: number;
    height: number;
  };
}

interface JsonExportStructure {
  metadata?: JsonExportMetadata;
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
  };
  typography: TypographySettings;
  animation: {
    frameRate: number;
    looping: boolean;
    currentFrame: number;
  };
  frames: JsonExportFrameEntry[];
}

/**
 * High-quality export renderer for ASCII Motion
 * Handles image (PNG/JPEG/SVG), MP4, and Session exports with optimal quality settings
 */
export class ExportRenderer {
  private progressCallback?: (progress: ExportProgress) => void;

  constructor(progressCallback?: (progress: ExportProgress) => void) {
    this.progressCallback = progressCallback;
  }

  /**
   * Export current frame as an image (PNG or JPEG)
   */
  async exportImage(
    data: ExportDataBundle,
    settings: ImageExportSettings,
    filename: string
  ): Promise<void> {
    this.updateProgress('Preparing image export...', 0);

    try {
      const currentFrame = data.frames[data.currentFrameIndex]?.data || data.canvasData;

      const exportCanvas = this.createExportCanvas(
        data.canvasDimensions.width,
        data.canvasDimensions.height,
        settings.sizeMultiplier,
        data.fontMetrics,
        data.typography
      );

      this.updateProgress('Rendering canvas...', 30);

      await this.renderFrame(
        exportCanvas.canvas,
        currentFrame,
        data.canvasDimensions.width,
        data.canvasDimensions.height,
        {
          backgroundColor: data.canvasBackgroundColor,
          showGrid: settings.includeGrid && data.showGrid,
          fontMetrics: data.fontMetrics,
          typography: data.typography,
          sizeMultiplier: settings.sizeMultiplier,
          theme: data.uiState.theme,
          scale: exportCanvas.scale
        }
      );

      // Apply post effects if enabled and available (raster formats only, not SVG)
      if (settings.includePostEffects !== false && settings.format !== 'svg' && data.postEffectTracks) {
        applyPostEffectsToCanvas(
          exportCanvas.canvas,
          data.postEffectTracks,
          data.currentFrameIndex,
          data.frameRate,
          data.canvasBackgroundColor,
        );
      }

      this.updateProgress('Converting to image...', 70);

      const mimeType = settings.format === 'jpg' ? 'image/jpeg' : 'image/png';
      const quality = settings.format === 'jpg' ? Math.min(Math.max(settings.quality, 10), 100) / 100 : undefined;
      const blob = await this.canvasToBlob(exportCanvas.canvas, mimeType, quality);

      this.updateProgress('Saving file...', 90);

      const extension = settings.format === 'jpg' ? 'jpg' : 'png';
      saveAs(blob, `${filename}.${extension}`);

      this.updateProgress('Export complete!', 100);
    } catch (error) {
      console.error('Image export failed:', error);
      throw new Error(`Image export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export current frame as SVG (Scalable Vector Graphics)
   */
  async exportSvg(
    data: ExportDataBundle,
    settings: ImageExportSettings,
    filename: string
  ): Promise<void> {
    this.updateProgress('Preparing SVG export...', 0);

    try {
      const currentFrame = data.frames[data.currentFrameIndex]?.data || data.canvasData;
      const svgSettings = settings.svgSettings!;

      // Load font if text-as-outlines is enabled
      let font: Font | undefined;
      if (svgSettings.textAsOutlines) {
        this.updateProgress('Loading font for outlines...', 5);
        const { fontLoader } = await import('./font/fontLoader');
        const fontId = svgSettings.outlineFont || 'jetbrains-mono';
        
        try {
          const loadedFont = await fontLoader.loadFont(fontId, { cache: true, timeout: 10000 });
          font = loadedFont.font;
        } catch {
          // Font loading failed, will fall back to pixel tracing
          font = undefined;
        }
      }

      // Calculate dimensions using typography settings
      const actualFontSize = data.typography?.fontSize || data.fontMetrics?.fontSize || 16;
      const characterSpacing = data.typography?.characterSpacing || 1.0;
      const lineSpacing = data.typography?.lineSpacing || 1.0;
      
      const baseCharWidth = actualFontSize * 0.6; // Standard monospace aspect ratio
      const baseCharHeight = actualFontSize;
      
      const cellWidth = baseCharWidth * characterSpacing;
      const cellHeight = baseCharHeight * lineSpacing;
      
      const canvasWidth = data.canvasDimensions.width * cellWidth;
      const canvasHeight = data.canvasDimensions.height * cellHeight;

      // Sanitize the font stack for desktop app compatibility — use the actually
      // detected font when available to avoid Adobe apps choking on uninstalled fonts
      const rawFontStack = data.fontMetrics?.fontFamily || 'SF Mono, Monaco, Cascadia Code, Consolas, JetBrains Mono, Fira Code, Monaspace Neon, Geist Mono, Courier New, monospace';
      const fontStack = sanitizeFontStackForSvg(rawFontStack, data.typography?.actualFont);

      this.updateProgress('Generating SVG structure...', 20);

      // Start SVG with header and embedded text style
      let svg = generateSvgHeader(
        canvasWidth, 
        canvasHeight, 
        svgSettings.includeBackground ? data.canvasBackgroundColor : undefined,
        { fontFamily: fontStack, fontSize: actualFontSize }
      );

      // Add metadata as SVG comments
      if (data.metadata.projectName || data.metadata.projectDescription) {
        svg += '  <!-- ASCII Motion Export -->\n';
        if (data.metadata.projectName) {
          svg += `  <!-- Project: ${data.metadata.projectName} -->\n`;
        }
        if (data.metadata.projectDescription) {
          svg += `  <!-- Description: ${data.metadata.projectDescription} -->\n`;
        }
        svg += `  <!-- Exported: ${new Date().toISOString()} -->\n`;
      }

      // Add grid if enabled
      if (svgSettings.includeGrid) {
        this.updateProgress('Rendering grid...', 30);
        const gridColor = calculateAdaptiveGridColor(
          data.canvasBackgroundColor, 
          data.uiState.theme as 'light' | 'dark'
        );
        svg += generateSvgGrid(
          data.canvasDimensions.width,
          data.canvasDimensions.height,
          cellWidth,
          cellHeight,
          gridColor
        );
      }

      this.updateProgress('Rendering characters...', 50);

      // Content group
      svg += '  <g id="content">\n';

      if (svgSettings.textAsOutlines) {
        // Text-as-outlines: render each cell individually with path conversion
        let cellCount = 0;
        const totalCells = currentFrame.size;
        
        currentFrame.forEach((cell, key) => {
          const [x, y] = key.split(',').map(Number);
          
          if (cell.char) {
            svg += convertTextToPath(
              cell.char,
              x, y,
              cell.color || '#ffffff',
              cell.bgColor,
              cellWidth,
              cellHeight,
              actualFontSize,
              fontStack,
              font
            );
          }
          
          cellCount++;
          if (cellCount % 100 === 0) {
            const progress = 50 + Math.floor((cellCount / totalCells) * 30);
            this.updateProgress(`Rendering characters... (${cellCount}/${totalCells})`, progress);
          }
        });
      } else {
        // Row-based grouped rendering — dramatically fewer SVG elements
        // for compatibility with After Effects and other desktop apps
        svg += generateSvgContentGrouped(
          currentFrame,
          data.canvasDimensions.width,
          data.canvasDimensions.height,
          cellWidth,
          cellHeight
        );
      }

      svg += '  </g>\n';
      svg += '</svg>';

      this.updateProgress('Formatting SVG...', 85);

      // Minify if not prettify (SVG is already prettified during generation)
      if (!svgSettings.prettify) {
        svg = minifySvg(svg);
      }

      this.updateProgress('Saving file...', 95);

      // Create blob and download
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      saveAs(blob, `${filename}.svg`);

      this.updateProgress('Export complete!', 100);
    } catch (error) {
      console.error('SVG export failed:', error);
      throw new Error(`SVG export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export frames as an image sequence packaged in a .zip file.
   * Supports PNG, JPEG, and SVG formats.
   */
  async exportImageSequence(
    data: ExportDataBundle,
    settings: ImageExportSettings,
    filename: string
  ): Promise<void> {
    this.updateProgress('Preparing image sequence export...', 0);

    try {
      const totalFrames = data.frames.length;
      if (totalFrames === 0) {
        throw new Error('No frames available for export');
      }

      // Determine frame range
      let startFrame = 0;
      let endFrame = totalFrames - 1;

      if (settings.sequenceRange && settings.sequenceRange !== 'all') {
        startFrame = Math.max(0, settings.sequenceRange.start);
        endFrame = Math.min(totalFrames - 1, settings.sequenceRange.end);
      }

      const frameCount = endFrame - startFrame + 1;
      // Dynamic zero-padding based on total frame count
      const padLength = Math.max(String(frameCount).length, 1);
      const extension = settings.format === 'jpg' ? 'jpg' : settings.format === 'svg' ? 'svg' : 'png';

      const zip = new JSZip();

      // Pre-load font for SVG text-as-outlines if needed
      let svgFont: Font | undefined;
      if (settings.format === 'svg' && settings.svgSettings?.textAsOutlines) {
        this.updateProgress('Loading font for outlines...', 2);
        const { fontLoader } = await import('./font/fontLoader');
        const fontId = settings.svgSettings.outlineFont || 'jetbrains-mono';
        try {
          const loadedFont = await fontLoader.loadFont(fontId, { cache: true, timeout: 10000 });
          svgFont = loadedFont.font;
        } catch {
          svgFont = undefined;
        }
      }

      // Reusable canvas for raster exports
      let exportCanvas: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; scale: number } | null = null;
      if (settings.format !== 'svg') {
        exportCanvas = this.createExportCanvas(
          data.canvasDimensions.width,
          data.canvasDimensions.height,
          settings.sizeMultiplier,
          data.fontMetrics,
          data.typography
        );
      }

      for (let i = startFrame; i <= endFrame; i++) {
        const frameIndex = i - startFrame;
        const frameNumber = frameIndex + 1; // 1-indexed
        const paddedNumber = String(frameNumber).padStart(padLength, '0');
        const frameFilename = `${filename}_${paddedNumber}.${extension}`;

        const progressPercent = Math.round((frameIndex / frameCount) * 90) + 5;
        this.updateProgress(`Rendering frame ${frameNumber}/${frameCount}...`, progressPercent);

        const frameData = data.frames[i]?.data || data.canvasData;

        if (settings.format === 'svg') {
          // Generate SVG for this frame
          const svgContent = this.renderFrameAsSvg(
            frameData,
            data,
            settings,
            svgFont
          );
          zip.file(frameFilename, svgContent);
        } else {
          // Render raster frame
          await this.renderFrame(
            exportCanvas!.canvas,
            frameData,
            data.canvasDimensions.width,
            data.canvasDimensions.height,
            {
              backgroundColor: data.canvasBackgroundColor,
              showGrid: settings.includeGrid && data.showGrid,
              fontMetrics: data.fontMetrics,
              typography: data.typography,
              sizeMultiplier: settings.sizeMultiplier,
              theme: data.uiState.theme,
              scale: exportCanvas!.scale
            }
          );

          // Apply post effects if enabled
          if (settings.includePostEffects !== false && data.postEffectTracks) {
            applyPostEffectsToCanvas(
              exportCanvas!.canvas,
              data.postEffectTracks,
              i,
              data.frameRate,
              data.canvasBackgroundColor,
            );
          }

          const mimeType = settings.format === 'jpg' ? 'image/jpeg' : 'image/png';
          const quality = settings.format === 'jpg' ? Math.min(Math.max(settings.quality, 10), 100) / 100 : undefined;
          const blob = await this.canvasToBlob(exportCanvas!.canvas, mimeType, quality);
          zip.file(frameFilename, blob);
        }
      }

      this.updateProgress('Creating zip file...', 95);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `${filename}_sequence.zip`);

      this.updateProgress('Export complete!', 100);
    } catch (error) {
      console.error('Image sequence export failed:', error);
      throw new Error(`Image sequence export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Render a single frame as SVG string (used by image sequence export)
   */
  private renderFrameAsSvg(
    frameData: Map<string, Cell>,
    data: ExportDataBundle,
    settings: ImageExportSettings,
    font?: Font
  ): string {
    const svgSettings = settings.svgSettings!;

    const actualFontSize = data.typography?.fontSize || data.fontMetrics?.fontSize || 16;
    const characterSpacing = data.typography?.characterSpacing || 1.0;
    const lineSpacing = data.typography?.lineSpacing || 1.0;

    const baseCharWidth = actualFontSize * 0.6;
    const baseCharHeight = actualFontSize;

    const cellWidth = baseCharWidth * characterSpacing;
    const cellHeight = baseCharHeight * lineSpacing;

    const canvasWidth = data.canvasDimensions.width * cellWidth;
    const canvasHeight = data.canvasDimensions.height * cellHeight;

    const rawFontStack = data.fontMetrics?.fontFamily || 'SF Mono, Monaco, Cascadia Code, Consolas, JetBrains Mono, Fira Code, Monaspace Neon, Geist Mono, Courier New, monospace';
    const fontStack = sanitizeFontStackForSvg(rawFontStack, data.typography?.actualFont);

    let svg = generateSvgHeader(
      canvasWidth,
      canvasHeight,
      svgSettings.includeBackground ? data.canvasBackgroundColor : undefined,
      { fontFamily: fontStack, fontSize: actualFontSize }
    );

    if (svgSettings.includeGrid) {
      const gridColor = calculateAdaptiveGridColor(
        data.canvasBackgroundColor,
        data.uiState.theme as 'light' | 'dark'
      );
      svg += generateSvgGrid(
        data.canvasDimensions.width,
        data.canvasDimensions.height,
        cellWidth,
        cellHeight,
        gridColor
      );
    }

    svg += '  <g id="content">\n';

    if (svgSettings.textAsOutlines) {
      frameData.forEach((cell, key) => {
        const [x, y] = key.split(',').map(Number);

        if (cell.char) {
          svg += convertTextToPath(
            cell.char,
            x, y,
            cell.color || '#ffffff',
            cell.bgColor,
            cellWidth,
            cellHeight,
            actualFontSize,
            fontStack,
            font
          );
        }
      });
    } else {
      svg += generateSvgContentGrouped(
        frameData,
        data.canvasDimensions.width,
        data.canvasDimensions.height,
        cellWidth,
        cellHeight
      );
    }

    svg += '  </g>\n';
    svg += '</svg>';

    if (!svgSettings.prettify) {
      svg = minifySvg(svg);
    }

    return svg;
  }

  /**
   * Export animation as video (WebM/MP4)
   */
  async exportVideo(
    data: ExportDataBundle, 
    settings: VideoExportSettings, 
    filename: string
  ): Promise<void> {
    this.updateProgress('Preparing video export...', 0);

    // Resolve 'auto' frame rate to the project's frame rate
    const resolvedFrameRate = settings.frameRate === 'auto' ? (data.frameRate || 12) : settings.frameRate;
    const resolvedSettings = {
      ...settings,
      frameRate: resolvedFrameRate,
    } as VideoExportSettings & { frameRate: number };

    try {
      // Check if we have frames to export
      if (data.frames.length === 0) {
        throw new Error('No frames to export');
      }

      // Check WebCodecs support for WebM
      if (resolvedSettings.format === 'webm' && !this.supportsWebCodecs()) {
        throw new Error('WebCodecs is not supported in your browser. Please use a modern Chrome, Edge, or Safari browser, or switch to MP4 format.');
      }

      this.updateProgress('Setting up video encoder...', 10);

      if (resolvedSettings.format === 'webm') {
        await this.exportWebMVideo(data, resolvedSettings, filename);
      } else {
        // MP4 fallback using canvas frame capture and blob creation
        await this.exportMP4Fallback(data, resolvedSettings, filename);
      }
      
    } catch (error) {
      console.error('Video export failed:', error);
      throw error;
    }
  }

  /**
  /**
   * Export complete session as JSON file.
   * When layer data is available (v2), writes SessionDataV2 format
   * preserving full layer structure, keyframes, and transforms.
   * Otherwise falls back to v1 flat-frame format.
   */
  async exportSession(
    data: ExportDataBundle, 
    settings: SessionExportSettings, 
    filename: string
  ): Promise<void> {
    this.updateProgress('Preparing session export...', 0);

    try {
      this.updateProgress('Serializing data...', 30);

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
          metadata: settings.includeMetadata ? {
            exportedAt: new Date().toISOString(),
            exportVersion: '2.1.0',
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
          metadata: settings.includeMetadata ? {
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

      this.updateProgress('Converting to JSON...', 70);

      // Convert to JSON string
      const jsonString = JSON.stringify(sessionData, null, 2);
      
      this.updateProgress('Creating file...', 90);

      // Create blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      saveAs(blob, `${filename}.asciimtn`);
      
      this.updateProgress('Export complete!', 100);
    } catch (error) {
      console.error('Session export failed:', error);
      throw new Error(`Session export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export animation frames as simple text
   */
  async exportText(
    data: ExportDataBundle, 
    settings: TextExportSettings, 
    filename: string
  ): Promise<void> {
    this.updateProgress('Preparing text export...', 0);

    try {
      this.updateProgress('Processing frames...', 20);

      const textLines: string[] = [];

      // Add metadata header if requested
      if (settings.includeMetadata) {
        textLines.push('ASCII Motion Text Export');
        if (data.metadata.projectName) {
          textLines.push(`Project: ${data.metadata.projectName}`);
        }
        if (data.metadata.projectDescription) {
          textLines.push(`Description: ${data.metadata.projectDescription}`);
        }
        textLines.push(`Version: ${data.metadata.version}`);
        textLines.push(`Export Date: ${data.metadata.exportDate}`);
        textLines.push(`Frames: ${data.frames.length}`);
        textLines.push(`Canvas Size: ${data.canvasDimensions.width}x${data.canvasDimensions.height}`);
        textLines.push('');
        textLines.push('---');
        textLines.push('');
      }

      // Process each frame
      for (let frameIndex = 0; frameIndex < data.frames.length; frameIndex++) {
        const frame = data.frames[frameIndex];
        const frameData = frame.data;

        this.updateProgress(`Processing frame ${frameIndex + 1}...`, 20 + (frameIndex / data.frames.length) * 60);

        // Convert frame to 2D array of characters
        const grid: string[][] = [];
        for (let y = 0; y < data.canvasDimensions.height; y++) {
          grid[y] = [];
          for (let x = 0; x < data.canvasDimensions.width; x++) {
            const cellKey = `${x},${y}`;
            const cell = frameData.get(cellKey);
            grid[y][x] = cell?.char || ' '; // Use space for empty cells
          }
        }

        // Apply cropping settings
        const processedGrid = this.cropGrid(grid, settings);

        // Convert grid to text lines
        const frameTextLines = processedGrid.map(row => {
          let line = row.join('');
          // Apply trailing space removal if enabled
          if (settings.removeTrailingSpaces) {
            line = line.replace(/\s+$/, '');
          }
          return line;
        });

        // Add frame text to output
        textLines.push(...frameTextLines);

        // Add frame separator (except for last frame)
        if (frameIndex < data.frames.length - 1) {
          textLines.push('');
          textLines.push(',');
          textLines.push('');
        }
      }

      this.updateProgress('Creating text file...', 90);

      // Join all lines with newlines and create blob
      const textContent = textLines.join('\n');
      const blob = new Blob([textContent], { type: 'text/plain; charset=utf-8' });
      
      this.updateProgress('Saving file...', 95);
      
      saveAs(blob, `${filename}.txt`);
      
      this.updateProgress('Export complete!', 100);
    } catch (error) {
      console.error('Text export failed:', error);
      throw new Error(`Text export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export project data as human-readable JSON
   */
  async exportJson(
    data: ExportDataBundle, 
    settings: JsonExportSettings, 
    filename: string
  ): Promise<void> {
    this.updateProgress('Preparing JSON export...', 0);

    try {
      this.updateProgress('Serializing project data...', 30);

      // Create frames with text content and separate color data
      const frames: JsonExportFrameEntry[] = [];

      data.frames.forEach((frame, index) => {
        this.updateProgress(`Processing frame ${index + 1}...`, 30 + (index / data.frames.length) * 40);
        
        // Build frame content as text lines
        const lines: string[] = [];
        const foregroundColors: { [key: string]: string } = {};
        const backgroundColors: { [key: string]: string } = {};

        // Process each row
        for (let y = 0; y < data.canvasDimensions.height; y++) {
          let line = '';
          
          for (let x = 0; x < data.canvasDimensions.width; x++) {
            const cellKey = `${x},${y}`;
            const cell = frame.data.get(cellKey);
            
            const character = cell?.char || ' ';
            const fgColor = cell?.color || '#FFFFFF';
            const bgColor = cell?.bgColor || 'transparent';

            // Add character to line
            line += character;

            // Store color data only for non-empty/non-space cells
            if (character !== ' ' && character !== '') {
              if (fgColor !== '#FFFFFF') {
                foregroundColors[`${x},${y}`] = fgColor;
              }
              if (bgColor !== 'transparent' && bgColor !== '#000000') {
                backgroundColors[`${x},${y}`] = bgColor;
              }
            }
          }
          
          // Remove trailing spaces from line
          lines.push(line.replace(/\s+$/, ''));
        }

        // Remove trailing empty lines
        while (lines.length > 0 && lines[lines.length - 1] === '') {
          lines.pop();
        }

        const contentLines = [...lines];
        const joinedContent = contentLines.join('\n');
        const content = settings.humanReadable ? contentLines : joinedContent;

        const frameEntry: JsonExportFrameEntry = {
          title: `Frame ${index}`,
          duration: frame.duration,
          content
        };

        if (settings.humanReadable) {
          frameEntry.contentString = joinedContent;
        }

        const colorEntries: JsonExportFrameColors = {};
        let hasColorData = false;

        if (Object.keys(foregroundColors).length > 0) {
          colorEntries.foreground = settings.humanReadable
            ? JSON.stringify(foregroundColors)
            : foregroundColors;
          hasColorData = true;
        }

        if (Object.keys(backgroundColors).length > 0) {
          colorEntries.background = settings.humanReadable
            ? JSON.stringify(backgroundColors)
            : backgroundColors;
          hasColorData = true;
        }

        if (hasColorData) {
          frameEntry.colors = colorEntries;
        }

        frames.push(frameEntry);
      });

      // Create the final JSON structure
      const metadata: JsonExportMetadata | undefined = settings.includeMetadata
        ? {
            exportedAt: new Date().toISOString(),
            exportVersion: '1.0.0',
            appVersion: data.metadata.version,
            description: data.metadata.projectDescription || 'ASCII Motion Animation - Human Readable Format',
            title: data.metadata.projectName || filename,
            frameCount: data.frames.length,
            canvasSize: {
              width: data.canvasDimensions.width,
              height: data.canvasDimensions.height
            }
          }
        : undefined;

      const jsonData: JsonExportStructure = {
        ...(metadata ? { metadata } : {}),
        canvas: {
          width: data.canvasDimensions.width,
          height: data.canvasDimensions.height,
          backgroundColor: data.canvasBackgroundColor
        },
        typography: {
          fontSize: data.typography.fontSize,
          characterSpacing: data.typography.characterSpacing,
          lineSpacing: data.typography.lineSpacing
        },
        animation: {
          frameRate: data.frameRate,
          looping: data.looping,
          currentFrame: data.currentFrameIndex
        },
        frames
      };

      this.updateProgress('Converting to JSON...', 80);

      // Convert to JSON string with formatting
      const jsonString = settings.humanReadable 
        ? JSON.stringify(jsonData, null, 2)
        : JSON.stringify(jsonData);
      
      this.updateProgress('Creating file...', 90);

      // Create blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      saveAs(blob, `${filename}.json`);
      
      this.updateProgress('Export complete!', 100);
    } catch (error) {
      console.error('JSON export failed:', error);
      throw new Error(`JSON export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export animation as standalone HTML file with inline CSS/JS
   */
  async exportHtml(
    data: ExportDataBundle, 
    settings: HtmlExportSettings, 
    filename: string
  ): Promise<void> {
    this.updateProgress('Preparing HTML export...', 0);

    try {
      this.updateProgress('Generating HTML structure...', 20);

      // Prepare frame data as JSON for JavaScript
      const frameDataJson = JSON.stringify(data.frames.map(frame => {
        const frameGrid: string[][] = [];
        const colorGrid: string[][] = [];
        const bgColorGrid: string[][] = [];
        
        // Initialize grids
        for (let y = 0; y < data.canvasDimensions.height; y++) {
          frameGrid[y] = [];
          colorGrid[y] = [];
          bgColorGrid[y] = [];
          for (let x = 0; x < data.canvasDimensions.width; x++) {
            const cellKey = `${x},${y}`;
            const cell = frame.data.get(cellKey);
            frameGrid[y][x] = cell?.char || ' ';
            colorGrid[y][x] = cell?.color || '#FFFFFF';
            bgColorGrid[y][x] = cell?.bgColor || 'transparent';
          }
        }
        
        return {
          id: frame.id,
          name: frame.name,
          duration: frame.duration,
          characters: frameGrid,
          colors: colorGrid,
          backgrounds: bgColorGrid
        };
      }));

      this.updateProgress('Building CSS styles...', 40);

      // Build shader bundle if post effects are enabled
      const htmlShaderBundle = (settings.includePostEffects !== false && data.postEffectTracks)
        ? this.buildShaderExportBundle(data.postEffectTracks, data.frames.length)
        : null;

      // Canvas dimensions for shader overlay
      const htmlFontSize = settings.fontSize || data.typography?.fontSize || 16;
      const htmlCharSpacing = data.typography?.characterSpacing ?? 1.0;
      const htmlLineSpacing = data.typography?.lineSpacing ?? 1.0;
      const htmlBaseCharW = htmlFontSize * 0.6;
      const htmlBaseCharH = htmlFontSize;
      const htmlCellW = htmlBaseCharW * htmlCharSpacing;
      const htmlCellH = htmlBaseCharH * htmlLineSpacing;
      const htmlCanvasW = Number((htmlCellW * data.canvasDimensions.width).toFixed(2));
      const htmlCanvasH = Number((htmlCellH * data.canvasDimensions.height).toFixed(2));
      const htmlFontFamily = data.fontMetrics?.fontFamily || 'SF Mono, Monaco, Cascadia Code, Consolas, monospace';

      const animationDuration = (data.frames.reduce((sum, frame) => sum + frame.duration, 0) / 1000) / settings.animationSpeed;

      // Generate complete HTML document
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename} - ASCII Motion Animation</title>
  <style>
    :root {
      color-scheme: dark;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 32px 24px;
      background-color: ${settings.backgroundColor};
      font-family: ${settings.fontFamily}, monospace;
      font-size: ${settings.fontSize}px;
      line-height: 1;
      color: #f8f9fb;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
    }

    .layout {
      width: min(100%, 960px);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }

    .animation-shell {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .animation-stage {
      position: relative;
      --cols: ${data.canvasDimensions.width};
      --rows: ${data.canvasDimensions.height};
      background-color: ${data.canvasBackgroundColor};
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 6px;
      padding: 16px;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.25) inset;
    }

    .animation-canvas {
      position: relative;
      display: block;
      white-space: pre;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      min-width: calc(var(--cols) * 1ch);
      min-height: calc(var(--rows) * 1em);
    }

    .frame {
      position: absolute;
      inset: 0;
      display: none;
      white-space: pre;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      pointer-events: none;
    }
        
    .frame.active {
      display: block;
    }

    .controls {
      display: flex;
      justify-content: center;
      width: 100%;
    }

    .playback-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(14, 14, 16, 0.65);
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.35);
    }

    .playback-button {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.18);
      background: rgba(22,22,26,0.9);
      color: #f8f9fb;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 150ms ease, border-color 150ms ease, transform 120ms ease;
    }

    .playback-button svg {
      width: 20px;
      height: 20px;
      display: block;
    }

    .playback-button:hover:not(:disabled),
    .playback-button:focus-visible {
      background: rgba(255,255,255,0.12);
      border-color: rgba(255,255,255,0.28);
      outline: none;
    }

    .playback-button:active:not(:disabled) {
      transform: translateY(1px);
    }

    .playback-button:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }

    .playback-button.is-primary,
    .playback-button.is-active {
      background: rgba(139, 92, 246, 0.9);
      border-color: rgba(139, 92, 246, 0.95);
      color: #fff;
    }

    .playback-button.is-primary:hover:not(:disabled),
    .playback-button.is-active:hover:not(:disabled) {
      background: rgba(167, 139, 250, 0.95);
      border-color: rgba(167, 139, 250, 1);
    }

    .playback-divider {
      width: 1px;
      height: 24px;
      background: rgba(255,255,255,0.14);
      margin: 0 4px;
    }

    .frame-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: rgba(255,255,255,0.7);
    }

    .frame-value {
      padding: 4px 12px;
      min-width: 3.75rem;
      border-radius: 8px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.18);
      color: #f8f9fb;
      font-variant-numeric: tabular-nums;
      font-feature-settings: "tnum" 1;
      text-align: center;
      display: inline-flex;
      justify-content: center;
      align-items: center;
    }

    .info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: center;
      font-size: 12px;
      color: rgba(255,255,255,0.72);
      text-align: center;
    }
  </style>
</head>
<body>
  <main class="layout">
    <div class="animation-shell">
      <div class="animation-stage" id="animationStage">
        <div class="animation-canvas" id="animationCanvas"></div>${htmlShaderBundle ? `
        <canvas id="shaderCanvas" width="${htmlCanvasW}" height="${htmlCanvasH}" style="position:absolute;top:16px;left:16px;width:${htmlCanvasW}px;height:${htmlCanvasH}px;pointer-events:none;"></canvas>` : ''}
      </div>

      <div class="controls">
        <div class="playback-controls" role="group" aria-label="Playback controls">
          <button class="playback-button" id="control-prev" aria-label="Previous frame" type="button"></button>
          <button class="playback-button" id="control-play" aria-label="Play animation" type="button"></button>
          <button class="playback-button" id="control-stop" aria-label="Stop animation" type="button"></button>
          <button class="playback-button" id="control-next" aria-label="Next frame" type="button"></button>
          <div class="playback-divider" aria-hidden="true"></div>
          <div class="frame-indicator">
            <span class="frame-label">Frame:</span>
            <span class="frame-value" id="frame-indicator">1 / 1</span>
          </div>
          <button class="playback-button" id="control-loop" aria-label="Toggle loop" aria-pressed="false" type="button"></button>
        </div>
      </div>

      <div class="info">
        ${settings.includeMetadata ? `
        ${data.metadata.projectName ? `<div><strong>${data.metadata.projectName}</strong></div>` : '<div>ASCII Motion Animation</div>'}
        ${data.metadata.projectDescription ? `<div>${data.metadata.projectDescription}</div>` : ''}
        <div>Frames: ${data.frames.length} | Duration: ${animationDuration.toFixed(1)}s</div>
        <div>Resolution: ${data.canvasDimensions.width}×${data.canvasDimensions.height}</div>
        <div>Exported: ${new Date().toLocaleDateString()}</div>
        ` : ''}
      </div>
    </div>
  </main>

    <script>
      const frameData = ${frameDataJson};
      const playbackSpeed = Math.max(${settings.animationSpeed}, 0.1);
      let currentFrameIndex = 0;
      let animationTimeout = null;
      let isPlaying = false;
  let isLooping = true;
      let activeFrameElement = null;

      const animationCanvas = document.getElementById('animationCanvas');
      const controls = {
        prev: document.getElementById('control-prev'),
        play: document.getElementById('control-play'),
        stop: document.getElementById('control-stop'),
        next: document.getElementById('control-next'),
        loop: document.getElementById('control-loop'),
        frameValue: document.getElementById('frame-indicator')
      };

      const ICONS = {
        skipBack: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 20 4 12l6-8"></path><path d="M20 19V5"></path></svg>',
        play: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v18l15-9Z"></path></svg>',
        stop: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"></rect></svg>',
        skipForward: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 4 6 8-6 8"></path><path d="M4 5v14"></path></svg>',
        loop: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"></path><path d="M3 11v-1a4 4 0 0 1 4-4h14"></path><path d="M7 22l-4-4 4-4"></path><path d="M21 13v1a4 4 0 0 1-4 4H3"></path></svg>'
      };

      const iconAssignments = [
        ['prev', ICONS.skipBack],
        ['play', ICONS.play],
        ['stop', ICONS.stop],
        ['next', ICONS.skipForward],
        ['loop', ICONS.loop]
      ];

      iconAssignments.forEach(([key, icon]) => {
        const button = controls[key];
        if (button) {
          button.innerHTML = icon;
        }
      });

      function initializeFrames() {
        if (!animationCanvas) return;

        animationCanvas.innerHTML = '';

        frameData.forEach((frame, index) => {
          const frameDiv = document.createElement('div');
          frameDiv.className = 'frame';
          frameDiv.id = 'frame-' + index;

          let frameContent = '';
          for (let y = 0; y < frame.characters.length; y++) {
            for (let x = 0; x < frame.characters[y].length; x++) {
              const char = frame.characters[y][x];
              const color = frame.colors[y][x];
              const bgColor = frame.backgrounds[y][x];

              if (char !== ' ' || bgColor !== 'transparent') {
                const span = '<span style="color: ' + color +
                  (bgColor !== 'transparent' ? '; background-color: ' + bgColor : '') +
                  '">' + (char === ' ' ? '&nbsp;' : char.replace(/</g, '&lt;').replace(/>/g, '&gt;')) + '</span>';
                frameContent += span;
              } else {
                frameContent += '&nbsp;';
              }
            }
            if (y < frame.characters.length - 1) {
              frameContent += '\\n';
            }
          }

          frameDiv.innerHTML = frameContent;
          animationCanvas.appendChild(frameDiv);
        });
      }

      function updateFrameIndicator() {
        if (!controls.frameValue) return;

        const totalFrames = frameData.length;
        if (totalFrames === 0) {
          controls.frameValue.textContent = '0 / 0';
          return;
        }

        const totalDigits = Math.max(1, String(totalFrames).length);
        const currentValue = String(currentFrameIndex + 1).padStart(totalDigits, '0');
        const totalValue = String(totalFrames).padStart(totalDigits, '0');

        controls.frameValue.textContent = currentValue + ' / ' + totalValue;
      }

      function updatePlayButton() {
        if (!controls.play) return;
        controls.play.innerHTML = ICONS.play;
        controls.play.classList.remove('is-primary');
        controls.play.setAttribute('aria-label', 'Play animation');
      }

      function updateLoopButton() {
        if (!controls.loop) return;
        controls.loop.classList.toggle('is-active', isLooping);
        controls.loop.setAttribute('aria-pressed', String(isLooping));
        controls.loop.setAttribute('aria-label', isLooping ? 'Disable loop' : 'Enable loop');
      }

      function updateControlStates() {
        const totalFrames = frameData.length;
        const hasFrames = totalFrames > 0;

        if (controls.prev) {
          controls.prev.disabled = !hasFrames || isPlaying || currentFrameIndex === 0;
        }
        if (controls.next) {
          controls.next.disabled = !hasFrames || isPlaying || currentFrameIndex >= totalFrames - 1;
        }
        if (controls.stop) {
          controls.stop.disabled = !hasFrames || !isPlaying;
        }
        if (controls.play) {
          controls.play.disabled = !hasFrames || isPlaying;
        }

        updatePlayButton();
        updateLoopButton();
      }

      function clearAnimationTimer() {
        if (animationTimeout !== null) {
          clearTimeout(animationTimeout);
          animationTimeout = null;
        }
      }

      function showFrame(index) {
        if (index < 0 || index >= frameData.length) return;
        const nextFrame = document.getElementById('frame-' + index);
        if (!nextFrame) return;

        nextFrame.classList.add('active');

        if (activeFrameElement && activeFrameElement !== nextFrame) {
          activeFrameElement.classList.remove('active');
        }

        activeFrameElement = nextFrame;
        currentFrameIndex = index;
        updateFrameIndicator();
        updateControlStates();${htmlShaderBundle ? `
        renderShaderFrame(index);` : ''}
      }

      function scheduleNextFrame() {
        if (!isPlaying || frameData.length === 0) return;

        const currentFrame = frameData[currentFrameIndex];
        const duration = Math.max((currentFrame?.duration || 100) / playbackSpeed, 16);

        animationTimeout = window.setTimeout(() => {
          animationTimeout = null;

          if (!isPlaying) {
            return;
          }

          let nextIndex = currentFrameIndex + 1;

          if (nextIndex >= frameData.length) {
            if (isLooping) {
              nextIndex = 0;
            } else {
              stopAnimation({ reset: false });
              return;
            }
          }

          showFrame(nextIndex);
          scheduleNextFrame();
        }, duration);
      }

      function startAnimation() {
        if (frameData.length === 0 || isPlaying) return;
        isPlaying = true;
        updateControlStates();
        scheduleNextFrame();
      }

      function stopAnimation({ reset = true } = {}) {
        const wasPlaying = isPlaying;

        if (!wasPlaying && !reset) {
          updateControlStates();
          return;
        }

        isPlaying = false;
        clearAnimationTimer();

        if (reset && frameData.length > 0) {
          showFrame(0);
          return;
        }

        updateControlStates();
      }

      function goToPreviousFrame() {
        if (isPlaying || currentFrameIndex === 0) return;
        showFrame(currentFrameIndex - 1);
      }

      function goToNextFrame() {
        if (isPlaying || currentFrameIndex >= frameData.length - 1) return;
        showFrame(currentFrameIndex + 1);
      }

      if (controls.prev) {
        controls.prev.addEventListener('click', goToPreviousFrame);
      }
      if (controls.play) {
        controls.play.addEventListener('click', () => {
          if (!isPlaying) {
            startAnimation();
          }
        });
      }
      if (controls.stop) {
        controls.stop.addEventListener('click', () => stopAnimation({ reset: true }));
      }
      if (controls.next) {
        controls.next.addEventListener('click', goToNextFrame);
      }
      if (controls.loop) {
        controls.loop.addEventListener('click', () => {
          isLooping = !isLooping;
          updateLoopButton();
        });
      }

      window.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          stopAnimation({ reset: false });
        }
      });
${htmlShaderBundle ? `
      // Canvas-based shader rendering
      var shaderCanvas = document.getElementById('shaderCanvas');
      var _shaderRenderCanvas = document.createElement('canvas');
      _shaderRenderCanvas.width = ${htmlCanvasW};
      _shaderRenderCanvas.height = ${htmlCanvasH};
      var _shaderCtx = _shaderRenderCanvas.getContext('2d');
      var _shaderCellW = ${Number(htmlCellW.toFixed(4))};
      var _shaderCellH = ${Number(htmlCellH.toFixed(4))};
      var _shaderFontSize = ${htmlFontSize};
      var _shaderFontFamily = ${JSON.stringify(htmlFontFamily)};
      var _shaderBgColor = ${JSON.stringify(data.canvasBackgroundColor)};

      function renderShaderFrame(index) {
        if (!_shaderCtx || !shaderCanvas) return;
        var frame = frameData[index];
        if (!frame) return;

        // Render frame to offscreen canvas
        if (_shaderBgColor && _shaderBgColor !== 'transparent') {
          _shaderCtx.fillStyle = _shaderBgColor;
          _shaderCtx.fillRect(0, 0, ${htmlCanvasW}, ${htmlCanvasH});
        } else {
          _shaderCtx.clearRect(0, 0, ${htmlCanvasW}, ${htmlCanvasH});
        }
        _shaderCtx.textAlign = 'center';
        _shaderCtx.textBaseline = 'middle';
        _shaderCtx.font = _shaderFontSize + 'px ' + _shaderFontFamily;
        _shaderCtx.imageSmoothingEnabled = false;

        for (var y = 0; y < frame.characters.length; y++) {
          for (var x = 0; x < frame.characters[y].length; x++) {
            var ch = frame.characters[y][x];
            var color = frame.colors[y][x];
            var bg = frame.backgrounds[y][x];

            if (bg && bg !== 'transparent') {
              _shaderCtx.fillStyle = bg;
              _shaderCtx.fillRect(x * _shaderCellW, y * _shaderCellH, _shaderCellW, _shaderCellH);
            }
            if (ch && ch !== ' ') {
              _shaderCtx.fillStyle = color || '#ffffff';
              _shaderCtx.fillText(ch, x * _shaderCellW + _shaderCellW / 2, y * _shaderCellH + _shaderCellH / 2);
            }
          }
        }

        // Copy to shader canvas, apply shaders, copy back to visible canvas
        var sCtx = shaderCanvas.getContext('2d');
        if (sCtx) {
          sCtx.clearRect(0, 0, shaderCanvas.width, shaderCanvas.height);
          sCtx.drawImage(_shaderRenderCanvas, 0, 0);
        }
        if (typeof window._applyShaders === 'function') {
          window._applyShaders(shaderCanvas, index, index / ${data.frameRate || 12}, _shaderBgColor);
        }
      }

${this.generateWebGLShaderRuntime(htmlShaderBundle!)}
` : ''}
      window.onload = function() {
        initializeFrames();

        if (frameData.length > 0) {
          showFrame(0);
          startAnimation();
        } else {
          updateFrameIndicator();
          updateControlStates();
        }

      };
    </script>
</body>
</html>`;

      this.updateProgress('Creating file...', 90);

      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      saveAs(blob, `${filename}.html`);
      
      this.updateProgress('Export complete!', 100);
    } catch (error) {
      console.error('HTML export failed:', error);
      throw new Error(`HTML export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export animation as a reusable React component file (TSX/JSX)
   */
  async exportReactComponent(
    data: ExportDataBundle,
    settings: ReactExportSettings
  ): Promise<void> {
    this.updateProgress('Preparing React component export...', 0);

    try {
      const requestedName = settings.fileName?.trim() || 'ascii-motion-animation';
      const sanitizedFileName = this.sanitizeReactFileName(requestedName) || 'ascii-motion-animation';
      const componentName = this.toPascalCase(sanitizedFileName);

      const fontSize = data.typography?.fontSize ?? data.fontMetrics?.fontSize ?? 16;
      const characterSpacing = data.typography?.characterSpacing ?? 1.0;
      const lineSpacing = data.typography?.lineSpacing ?? 1.0;

      const baseCharWidth = fontSize * 0.6;
      const baseCharHeight = fontSize;

      const cellWidth = baseCharWidth * characterSpacing;
      const cellHeight = baseCharHeight * lineSpacing;

      const canvasPixelWidth = Number((cellWidth * data.canvasDimensions.width).toFixed(2));
      const canvasPixelHeight = Number((cellHeight * data.canvasDimensions.height).toFixed(2));

      this.updateProgress('Serializing animation data...', 20);

      // ── Optimization 1: Build color dictionary ──
      // Collect all unique colors across all frames
      const colorSet = new Set<string>();
      for (const frame of data.frames) {
        frame.data.forEach((cell) => {
          if (cell?.color) colorSet.add(cell.color);
          if (cell?.bgColor && cell.bgColor !== 'transparent') colorSet.add(cell.bgColor);
        });
      }
      const colorPalette = Array.from(colorSet).sort();
      const colorIndex = new Map<string, number>();
      colorPalette.forEach((c, i) => colorIndex.set(c, i));

      // ── Optimization 2: Compact cell format (arrays instead of objects) ──
      // Format: [x, y, "char", colorIdx] or [x, y, "char", colorIdx, bgColorIdx]
      const rawFrames = data.frames.map((frame) => {
        const cells: Array<(number | string)[]> = [];
        frame.data.forEach((cell, key) => {
          if (!cell || !cell.char) return;
          const [x, y] = key.split(',').map(Number);
          const cIdx = colorIndex.get(cell.color || '#ffffff') ?? 0;
          if (cell.bgColor && cell.bgColor !== 'transparent') {
            const bgIdx = colorIndex.get(cell.bgColor)!;
            cells.push([x, y, cell.char, cIdx, bgIdx]);
          } else {
            cells.push([x, y, cell.char, cIdx]);
          }
        });
        cells.sort((a, b) => ((a[1] as number) - (b[1] as number)) || ((a[0] as number) - (b[0] as number)));
        return { duration: Math.max(frame.duration, 16), cells };
      });

      // ── Optimization 3: Frame deduplication ──
      // Merge consecutive frames with identical cell data into a single entry with accumulated duration
      const hashFrame = (cells: Array<(number | string)[]>): string => {
        return JSON.stringify(cells);
      };

      const framesPayload: Array<{ duration: number; cells: Array<(number | string)[]> }> = [];
      for (let i = 0; i < rawFrames.length; i++) {
        const frame = rawFrames[i];
        const hash = hashFrame(frame.cells);
        if (framesPayload.length > 0) {
          const prev = framesPayload[framesPayload.length - 1];
          const prevHash = hashFrame(prev.cells);
          if (hash === prevHash) {
            // Identical to previous — extend duration
            prev.duration += frame.duration;
            continue;
          }
        }
        framesPayload.push({ duration: frame.duration, cells: frame.cells });
      }

      const paletteJson = JSON.stringify(colorPalette);
      const framesJson = JSON.stringify(framesPayload);
      // Font stack is already properly formatted (no quotes) from fontMetrics
      const fontStack =
        data.fontMetrics?.fontFamily || 'SF Mono, Monaco, Cascadia Code, Consolas, JetBrains Mono, Fira Code, Monaspace Neon, Geist Mono, Courier New, monospace';

      this.updateProgress('Generating component code...', 60);

      // Build shader bundle if post effects are enabled
      const shaderBundle = (settings.includePostEffects !== false && data.postEffectTracks)
        ? this.buildShaderExportBundle(data.postEffectTracks, data.frames.length)
        : null;

      const componentCode = this.generateReactComponentCode({
        componentName,
        framesJson,
        paletteJson,
        isTypescript: settings.typescript,
        includeControls: settings.includeControls,
        canvasWidth: canvasPixelWidth,
        canvasHeight: canvasPixelHeight,
        cellWidth,
        cellHeight,
        fontSize,
        fontFamily: fontStack,
        backgroundColor: settings.includeBackground ? data.canvasBackgroundColor : null,
        shaderBundle,
        frameRate: data.frameRate,
      });

      this.updateProgress('Saving file...', 90);

      const extension = settings.typescript ? 'tsx' : 'jsx';
      const blob = new Blob([componentCode], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `${sanitizedFileName}.${extension}`);

      this.updateProgress('Export complete!', 100);
    } catch (error) {
      console.error('React component export failed:', error);
      throw new Error(`React component export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private sanitizeReactFileName(value: string): string {
    if (!value) {
      return '';
    }

    return value
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9\-_]/g, '')
      .replace(/-+/g, '-')
      .replace(/_+/g, '_')
      .replace(/^[-_]+|[-_]+$/g, '')
      .toLowerCase();
  }

  private toPascalCase(value: string): string {
    if (!value) {
      return 'AsciiMotionAnimation';
    }

    const segments = value
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1));

    const name = segments.length > 0 ? segments.join('') : 'AsciiMotionAnimation';
    return /^[A-Za-z]/.test(name) ? name : `Ascii${name}`;
  }

  private generateReactComponentCode(options: {
    componentName: string;
    framesJson: string;
    paletteJson: string;
    isTypescript: boolean;
    includeControls: boolean;
    canvasWidth: number;
    canvasHeight: number;
    cellWidth: number;
    cellHeight: number;
    fontSize: number;
    fontFamily: string;
    backgroundColor: string | null;
    shaderBundle: ReturnType<ExportRenderer['buildShaderExportBundle']>;
    frameRate: number;
  }): string {
    const {
      componentName,
      framesJson,
      paletteJson,
      isTypescript,
      includeControls,
      canvasWidth,
      canvasHeight,
      cellWidth,
      cellHeight,
      fontSize,
      fontFamily,
      backgroundColor,
      shaderBundle,
      frameRate,
    } = options;

    const cellWidthLiteral = Number(cellWidth.toFixed(4));
    const cellHeightLiteral = Number(cellHeight.toFixed(4));
    const fontFamilyLiteral = JSON.stringify(fontFamily);
    const backgroundLiteral = backgroundColor ? JSON.stringify(backgroundColor) : 'null';

    const hooksImport = `import { useEffect, useRef, useCallback${includeControls ? ', useState' : ''} } from 'react';`;

    const typeBlock = isTypescript
      ? `// Compact cell format: [x, y, char, colorIndex, bgColorIndex?]\ntype CellData = (number | string)[];\n\ntype Frame = {\n  duration: number;\n  cells: CellData[];\n};\n\n` +
        `type AsciiMotionComponentProps = {\n  showControls?: boolean;\n  autoPlay?: boolean;\n  onReady?: (api: {\n    play: () => void;\n    pause: () => void;\n    togglePlay: () => void;\n    restart: () => void;\n  }) => void;\n};`
      : `/**\n * Compact cell format: [x, y, char, colorIndex, bgColorIndex?]\n * @typedef {(number|string)[]} CellData\n * @typedef {{ duration: number, cells: CellData[] }} Frame\n */\n\n/**\n * @typedef {Object} AsciiMotionComponentProps\n * @property {boolean} [showControls]\n * @property {boolean} [autoPlay]\n * @property {(api: { play: () => void; pause: () => void; togglePlay: () => void; restart: () => void; }) => void} [onReady]\n */`;

    const paletteDeclaration = isTypescript
      ? `const COLORS: string[] = ${paletteJson};`
      : `const COLORS = ${paletteJson};`;

    const framesDeclaration = isTypescript
      ? `const FRAMES: Frame[] = ${framesJson};`
      : `const FRAMES = ${framesJson};`;

    const canvasRefDeclaration = isTypescript
      ? 'const canvasRef = useRef<HTMLCanvasElement | null>(null);'
      : 'const canvasRef = useRef(null);';

    const animationFrameRefDeclaration = isTypescript
      ? 'const animationFrameRef = useRef<number | null>(null);'
      : 'const animationFrameRef = useRef(null);';

    const frameIndexRefDeclaration = isTypescript
      ? 'const frameIndexRef = useRef<number>(0);'
      : 'const frameIndexRef = useRef(0);';

    const frameElapsedRefDeclaration = isTypescript
      ? 'const frameElapsedRef = useRef<number>(0);'
      : 'const frameElapsedRef = useRef(0);';

    const lastTimestampRefDeclaration = isTypescript
      ? 'const lastTimestampRef = useRef<number>(0);'
      : 'const lastTimestampRef = useRef(0);';

    const restartRefDeclaration = isTypescript
      ? 'const restartRef = useRef<() => void>(() => {});'
      : 'const restartRef = useRef(() => {});';

    const isPlayingRefDeclaration = isTypescript
      ? 'const isPlayingRef = useRef<boolean>(initialAutoPlay);'
      : 'const isPlayingRef = useRef(initialAutoPlay);';

    const drawFrameSignature = isTypescript ? '(index: number)' : '(index)';
    const stepSignature = isTypescript ? '(timestamp: number)' : '(timestamp)';

    const stateLines: string[] = [];
    if (includeControls) {
      if (isTypescript) {
        stateLines.push('const [isPlaying, setIsPlaying] = useState<boolean>(initialAutoPlay);');
        stateLines.push('const [activeFrame, setActiveFrame] = useState<number>(0);');
      } else {
        stateLines.push('const [isPlaying, setIsPlaying] = useState(initialAutoPlay);');
        stateLines.push('const [activeFrame, setActiveFrame] = useState(0);');
      }
    }

    const pushIndentedBlock = (target: string[], lines: string[], indent: number) => {
      lines.forEach((line) => {
        if (line === '') {
          target.push('');
        } else {
          target.push(`${' '.repeat(indent)}${line}`);
        }
      });
    };

    const componentLines: string[] = [];
    componentLines.push(`const ${componentName} = (props${isTypescript ? ': AsciiMotionComponentProps = {}' : ' = {}'}) => {`);
    componentLines.push('  const { showControls = true, autoPlay = true, onReady } = props;');
    if (includeControls) {
      componentLines.push('  const controlsVisible = showControls !== false;');
    }
    componentLines.push('  const initialAutoPlay = autoPlay !== false;');
    componentLines.push(`  ${canvasRefDeclaration}`);
    componentLines.push(`  ${animationFrameRefDeclaration}`);
    componentLines.push(`  ${frameIndexRefDeclaration}`);
    componentLines.push(`  ${frameElapsedRefDeclaration}`);
    componentLines.push(`  ${lastTimestampRefDeclaration}`);
    componentLines.push(`  ${restartRefDeclaration}`);
    componentLines.push(`  ${isPlayingRefDeclaration}`);

    stateLines.forEach((line) => {
      componentLines.push(`  ${line}`);
    });

    const updatePlayingStateLines = includeControls
      ? [
          `const updatePlayingState = useCallback(${isTypescript ? '(value: boolean)' : '(value)'} => {`,
          '  isPlayingRef.current = value;',
          '  setIsPlaying(value);',
          '}, []);'
        ]
      : [
          `const updatePlayingState = useCallback(${isTypescript ? '(value: boolean)' : '(value)'} => {`,
          '  isPlayingRef.current = value;',
          '}, []);'
        ];

    updatePlayingStateLines.forEach((line) => {
      componentLines.push(`  ${line}`);
    });

    const actionBlocks = [
      ['const play = useCallback(() => {', '  updatePlayingState(true);', '}, [updatePlayingState]);'],
      ['const pause = useCallback(() => {', '  updatePlayingState(false);', '}, [updatePlayingState]);'],
      ['const togglePlay = useCallback(() => {', '  updatePlayingState(!isPlayingRef.current);', '}, [updatePlayingState]);'],
      ['const restart = useCallback(() => {', '  if (restartRef.current) {', '    restartRef.current();', '  }', '}, []);']
    ];

    actionBlocks.forEach((block) => {
      block.forEach((line) => componentLines.push(`  ${line}`));
    });

    componentLines.push('');
    componentLines.push('  useEffect(() => {');
    componentLines.push('    if (isPlayingRef.current !== initialAutoPlay) {');
    componentLines.push('      updatePlayingState(initialAutoPlay);');
    componentLines.push('    }');
    componentLines.push('  }, [initialAutoPlay, updatePlayingState]);');
    componentLines.push('');
    componentLines.push('  useEffect(() => {');

    const effectLines: string[] = [
      'const canvas = canvasRef.current;',
      'if (!canvas) {',
      '  return;',
      '}',
      '',
      "const context = canvas.getContext('2d');",
      'if (!context) {',
      '  return;',
      '}',
      '',
      'const devicePixelRatio = window.devicePixelRatio || 1;',
      'canvas.width = CANVAS_WIDTH * devicePixelRatio;',
      'canvas.height = CANVAS_HEIGHT * devicePixelRatio;',
      "canvas.style.width = CANVAS_WIDTH + 'px';",
      "canvas.style.height = CANVAS_HEIGHT + 'px';",
      'context.resetTransform();',
      'context.scale(devicePixelRatio, devicePixelRatio);',
      "context.textAlign = 'center';",
      "context.textBaseline = 'middle';",
      "context.font = FONT_SIZE + 'px ' + FONT_FAMILY;",
      'context.imageSmoothingEnabled = false;',
      '',
      'frameIndexRef.current = 0;',
      'frameElapsedRef.current = 0;',
      'lastTimestampRef.current = 0;',
      '',
      `const drawFrame = ${drawFrameSignature} => {`,
      '  const frame = FRAMES[index];',
      '',
      '  if (BACKGROUND_COLOR) {',
      '    context.fillStyle = BACKGROUND_COLOR;',
      '    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);',
      '  } else {',
      '    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);',
      '  }',
      '',
      '  if (!frame) {',
      '    return;',
      '  }',
      '',
      '  for (const cell of frame.cells) {',
      '    const x = cell[0];',
      '    const y = cell[1];',
      '    const char = cell[2];',
      '    const color = COLORS[cell[3]];',
      '    const bgColor = cell.length > 4 ? COLORS[cell[4]] : null;',
      '',
      '    if (bgColor) {',
      '      context.fillStyle = bgColor;',
      '      context.fillRect(x * CELL_WIDTH, y * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);',
      '    }',
      '',
      "    context.fillStyle = color || '#ffffff';",
      '    context.fillText(',
      '      char,',
      '      x * CELL_WIDTH + CELL_WIDTH / 2,',
      '      y * CELL_HEIGHT + CELL_HEIGHT / 2',
      '    );',
      '  }'
    ];

    if (includeControls) {
      effectLines.push('');
      effectLines.push('  setActiveFrame(index);');
    }

    // Add shader post-processing call at the end of drawFrame
    if (shaderBundle) {
      effectLines.push('');
      effectLines.push('  if (typeof window._applyShaders === "function") {');
      effectLines.push(`    window._applyShaders(canvas, index, index / ${frameRate || 12}, BACKGROUND_COLOR);`);
      effectLines.push('  }');
    }

    effectLines.push('};');
    effectLines.push('');
    effectLines.push('drawFrame(frameIndexRef.current);');
    effectLines.push('');
    effectLines.push('if (FRAMES.length === 0) {');
    effectLines.push('  restartRef.current = () => {');
    effectLines.push('    drawFrame(0);');
    if (includeControls) {
      effectLines.push('    setActiveFrame(0);');
    }
    effectLines.push('  };');
    effectLines.push('  return;');
    effectLines.push('}');
    effectLines.push('');
    effectLines.push(`const step = ${stepSignature} => {`);
    effectLines.push('  if (FRAMES.length === 0) {');
    effectLines.push('    return;');
    effectLines.push('  }');
    effectLines.push('');
    effectLines.push('  if (lastTimestampRef.current === 0) {');
    effectLines.push('    lastTimestampRef.current = timestamp;');
    effectLines.push('  }');
    effectLines.push('');
    effectLines.push('  const delta = timestamp - lastTimestampRef.current;');
    effectLines.push('  lastTimestampRef.current = timestamp;');
    effectLines.push('');
    effectLines.push('  if (isPlayingRef.current) {');
    effectLines.push('    frameElapsedRef.current += delta;');
    effectLines.push('');
    effectLines.push('    let nextIndex = frameIndexRef.current;');
    effectLines.push('    let remaining = frameElapsedRef.current;');
    effectLines.push('    let duration = FRAMES[nextIndex]?.duration ?? 16;');
    effectLines.push('');
    effectLines.push('    while (remaining >= duration && FRAMES.length > 0) {');
    effectLines.push('      remaining -= duration;');
    effectLines.push('      nextIndex = (nextIndex + 1) % FRAMES.length;');
    effectLines.push('      duration = FRAMES[nextIndex]?.duration ?? duration;');
    effectLines.push('    }');
    effectLines.push('');
    effectLines.push('    frameElapsedRef.current = remaining;');
    effectLines.push('');
    effectLines.push('    if (nextIndex !== frameIndexRef.current) {');
    effectLines.push('      frameIndexRef.current = nextIndex;');
    effectLines.push('      drawFrame(nextIndex);');
    effectLines.push('    } else {');
    effectLines.push('      drawFrame(frameIndexRef.current);');
    effectLines.push('    }');
    effectLines.push('  } else {');
    effectLines.push('    drawFrame(frameIndexRef.current);');
    effectLines.push('  }');
    effectLines.push('');
    effectLines.push('  animationFrameRef.current = window.requestAnimationFrame(step);');
    effectLines.push('};');
    effectLines.push('');
    effectLines.push('animationFrameRef.current = window.requestAnimationFrame(step);');
    effectLines.push('');
    effectLines.push('restartRef.current = () => {');
    effectLines.push('  frameIndexRef.current = 0;');
    effectLines.push('  frameElapsedRef.current = 0;');
    effectLines.push('  lastTimestampRef.current = 0;');
    effectLines.push('  drawFrame(0);');
    if (includeControls) {
      effectLines.push('  setActiveFrame(0);');
    }
    effectLines.push('};');
    effectLines.push('');
    effectLines.push('return () => {');
    effectLines.push('  if (animationFrameRef.current !== null) {');
    effectLines.push('    window.cancelAnimationFrame(animationFrameRef.current);');
    effectLines.push('    animationFrameRef.current = null;');
    effectLines.push('  }');
    effectLines.push('};');

    pushIndentedBlock(componentLines, effectLines, 4);
    componentLines.push('  }, []);');

    componentLines.push('');
    componentLines.push('  useEffect(() => {');
    componentLines.push('    if (typeof onReady === "function") {');
    componentLines.push('      onReady({');
    componentLines.push('        play,');
    componentLines.push('        pause,');
    componentLines.push('        togglePlay,');
    componentLines.push('        restart,');
    componentLines.push('      });');
    componentLines.push('    }');
    componentLines.push('  }, [onReady, play, pause, togglePlay, restart]);');

    if (includeControls) {
      componentLines.push('');
      componentLines.push('  const hasFrames = FRAMES.length > 0;');
      componentLines.push('');
      componentLines.push('  const handleTogglePlay = () => {');
      componentLines.push('    if (!hasFrames) {');
      componentLines.push('      return;');
      componentLines.push('    }');
      componentLines.push('    togglePlay();');
      componentLines.push('  };');
      componentLines.push('');
      componentLines.push('  const handleRestart = () => {');
      componentLines.push('    if (!hasFrames) {');
      componentLines.push('      return;');
      componentLines.push('    }');
      componentLines.push('    restart();');
      componentLines.push('    updatePlayingState(true);');
      componentLines.push('  };');
      componentLines.push('');
      componentLines.push("  const playLabel = isPlaying ? 'Pause' : 'Play';");
    }

    componentLines.push('  return (');
    componentLines.push('    <div');
    componentLines.push('      style={{');
    componentLines.push("        display: 'inline-flex',");
    componentLines.push("        flexDirection: 'column',");
    componentLines.push("        alignItems: 'center'");
    componentLines.push('      }}');
    componentLines.push('    >');
    componentLines.push('      <canvas');
    componentLines.push('        ref={canvasRef}');
    componentLines.push('        width={CANVAS_WIDTH}');
    componentLines.push('        height={CANVAS_HEIGHT}');
    componentLines.push('        style={{');
    componentLines.push("          width: CANVAS_WIDTH + 'px',");
    componentLines.push("          height: CANVAS_HEIGHT + 'px',");
    componentLines.push("          backgroundColor: BACKGROUND_COLOR || 'transparent',");
    componentLines.push("          imageRendering: 'pixelated'");
    componentLines.push('        }}');
    componentLines.push('      />');

    if (includeControls) {
      componentLines.push('      {controlsVisible && (');
      componentLines.push('        <div');
      componentLines.push('          style={{');
      componentLines.push("            marginTop: '12px',");
      componentLines.push("            display: 'flex',");
      componentLines.push("            alignItems: 'center',");
      componentLines.push("            gap: '12px'");
      componentLines.push('          }}');
      componentLines.push('        >');
      componentLines.push('          <button');
      componentLines.push('            type="button"');
      componentLines.push('            onClick={handleTogglePlay}');
      componentLines.push('            disabled={!hasFrames}');
      componentLines.push('            style={{');
      componentLines.push("              padding: '6px 12px',");
      componentLines.push("              borderRadius: '8px',");
      componentLines.push("              border: '1px solid rgba(0, 0, 0, 0.2)',");
      componentLines.push("              background: isPlaying ? '#f1f5f9' : '#111827',");
      componentLines.push("              color: isPlaying ? '#111827' : '#f9fafb',");
      componentLines.push("              cursor: hasFrames ? 'pointer' : 'not-allowed'");
      componentLines.push('            }}');
      componentLines.push('          >');
      componentLines.push('            {playLabel}');
      componentLines.push('          </button>');
      componentLines.push('          <button');
      componentLines.push('            type="button"');
      componentLines.push('            onClick={handleRestart}');
      componentLines.push('            disabled={!hasFrames}');
      componentLines.push('            style={{');
      componentLines.push("              padding: '6px 12px',");
      componentLines.push("              borderRadius: '8px',");
      componentLines.push("              border: '1px solid rgba(0, 0, 0, 0.2)',");
      componentLines.push("              background: '#0f172a',");
      componentLines.push("              color: '#f9fafb',");
      componentLines.push("              cursor: hasFrames ? 'pointer' : 'not-allowed'");
      componentLines.push('            }}');
      componentLines.push('          >');
      componentLines.push('            Restart');
      componentLines.push('          </button>');
      componentLines.push('          <span');
      componentLines.push("            style={{ fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}");
      componentLines.push('          >');
      componentLines.push("            {hasFrames ? 'Frame ' + (activeFrame + 1) + ' / ' + FRAMES.length : 'No frames'}");
      componentLines.push('          </span>');
      componentLines.push('        </div>');
      componentLines.push('      )}');
    }

    componentLines.push('    </div>');
    componentLines.push('  );');
    componentLines.push('};');

    const componentBlock = componentLines.join('\n');

    const lines: string[] = [];
    lines.push("'use client';");
    lines.push('');
    lines.push(hooksImport);
    lines.push('');
    lines.push(typeBlock);
    lines.push('');
    lines.push(paletteDeclaration);
    lines.push('');
    lines.push(framesDeclaration);
    lines.push('');
    lines.push(`const CANVAS_WIDTH = ${canvasWidth};`);
    lines.push(`const CANVAS_HEIGHT = ${canvasHeight};`);
    lines.push(`const CELL_WIDTH = ${cellWidthLiteral};`);
    lines.push(`const CELL_HEIGHT = ${cellHeightLiteral};`);
    lines.push(`const FONT_SIZE = ${fontSize};`);
    lines.push(`const FONT_FAMILY = ${fontFamilyLiteral};`);
    lines.push(`const BACKGROUND_COLOR = ${backgroundLiteral};`);

    // Embed WebGL shader runtime if shaders are included
    if (shaderBundle) {
      lines.push('');
      lines.push('// WebGL Shader Post-Processing');
      lines.push('if (typeof window !== "undefined") {');
      lines.push(this.generateWebGLShaderRuntime(shaderBundle));
      lines.push('}');
    }

    lines.push('');
    lines.push(componentBlock);
    lines.push('');
    lines.push(`export default ${componentName};`);

    return lines.join('\n') + '\n';
  }

  /**
   * Export animation as an Ink (React for CLIs) component
   */
  async exportInkComponent(
    data: ExportDataBundle,
    settings: InkExportSettings
  ): Promise<void> {
    this.updateProgress('Preparing Ink component export...', 0);

    try {
      const requestedName = settings.fileName?.trim() || 'ascii-motion-cli';
      const sanitizedFileName = this.sanitizeReactFileName(requestedName) || 'ascii-motion-cli';
      const componentName = this.toPascalCase(sanitizedFileName);

      this.updateProgress('Building color dictionary...', 20);

      // Build unique color dictionary
      const colorMap = new Map<string, string>();
      let colorIndex = 0;

      // ANSI color name mapping (approximate to 16-color terminal palette)
      const ansiColorMap: Record<string, string> = {
        '#000000': 'black',
        '#800000': 'red',
        '#008000': 'green',
        '#808000': 'yellow',
        '#000080': 'blue',
        '#800080': 'magenta',
        '#008080': 'cyan',
        '#c0c0c0': 'white',
        '#808080': 'gray',
        '#ff0000': 'redBright',
        '#00ff00': 'greenBright',
        '#ffff00': 'yellowBright',
        '#0000ff': 'blueBright',
        '#ff00ff': 'magentaBright',
        '#00ffff': 'cyanBright',
        '#ffffff': 'whiteBright',
      };

      // Find closest ANSI color for a given hex color
      const toAnsiColor = (hex: string): string => {
        const normalized = hex.toLowerCase();
        if (ansiColorMap[normalized]) {
          return ansiColorMap[normalized];
        }
        // For non-exact matches, find the closest by checking each
        const hexToRgb = (h: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          } : { r: 128, g: 128, b: 128 };
        };
        const target = hexToRgb(normalized);
        let closestColor = 'white';
        let closestDistance = Infinity;
        for (const [ansHex, ansName] of Object.entries(ansiColorMap)) {
          const c = hexToRgb(ansHex);
          const dist = Math.sqrt(
            Math.pow(target.r - c.r, 2) +
            Math.pow(target.g - c.g, 2) +
            Math.pow(target.b - c.b, 2)
          );
          if (dist < closestDistance) {
            closestDistance = dist;
            closestColor = ansName;
          }
        }
        return closestColor;
      };

      // Collect all colors from frames
      data.frames.forEach((frame) => {
        frame.data.forEach((cell) => {
          if (cell.color && !colorMap.has(cell.color)) {
            if (settings.colorMode === 'ansi') {
              colorMap.set(cell.color, toAnsiColor(cell.color));
            } else {
              // For both hex and 256 modes, use sequential unique keys
              colorMap.set(cell.color, `c${colorIndex++}`);
            }
          }
          if (cell.bgColor && cell.bgColor !== 'transparent' && !colorMap.has(cell.bgColor)) {
            if (settings.colorMode === 'ansi') {
              colorMap.set(cell.bgColor, toAnsiColor(cell.bgColor));
            } else {
              // For both hex and 256 modes, use sequential unique keys
              colorMap.set(cell.bgColor, `c${colorIndex++}`);
            }
          }
        });
      });

      this.updateProgress('Serializing frame data...', 40);

      // Build frame data with content strings and color maps
      const framesData = data.frames.map((frame) => {
        const rows: string[] = [];
        const fgColors: Record<string, string> = {};
        const bgColors: Record<string, string> = {};

        // Initialize rows
        for (let y = 0; y < data.canvasDimensions.height; y++) {
          rows.push(' '.repeat(data.canvasDimensions.width));
        }

        // Fill in cell data
        frame.data.forEach((cell, key) => {
          if (!cell || !cell.char) return;
          const [x, y] = key.split(',').map(Number);
          if (x < 0 || y < 0 || x >= data.canvasDimensions.width || y >= data.canvasDimensions.height) return;

          // Update row character
          const row = rows[y];
          rows[y] = row.substring(0, x) + cell.char + row.substring(x + 1);

          // Track colors by position
          if (cell.color) {
            const colorKey = settings.colorMode === 'ansi' ? toAnsiColor(cell.color) : colorMap.get(cell.color)!;
            fgColors[`${x},${y}`] = colorKey;
          }
          if (cell.bgColor && cell.bgColor !== 'transparent') {
            const colorKey = settings.colorMode === 'ansi' ? toAnsiColor(cell.bgColor) : colorMap.get(cell.bgColor)!;
            bgColors[`${x},${y}`] = colorKey;
          }
        });

        return {
          duration: Math.max(frame.duration, 16),
          content: rows,
          fgColors,
          bgColors,
        };
      });

      // Deduplicate consecutive identical frames (merge durations)
      const deduplicatedFramesData = this.deduplicateCliFrames(framesData);

      this.updateProgress('Generating component code...', 60);

      const componentCode = this.generateInkComponentCode({
        componentName,
        framesData: deduplicatedFramesData,
        colorMap,
        colorMode: settings.colorMode,
        loopAnimation: settings.loopAnimation,
        includePlaybackControls: settings.includePlaybackControls,
        canvasWidth: data.canvasDimensions.width,
        canvasHeight: data.canvasDimensions.height,
      });

      this.updateProgress('Saving file...', 90);

      const blob = new Blob([componentCode], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `${sanitizedFileName}.tsx`);

      this.updateProgress('Export complete!', 100);
    } catch (error) {
      console.error('Ink component export failed:', error);
      throw new Error(`Ink component export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateInkComponentCode(options: {
    componentName: string;
    framesData: Array<{
      duration: number;
      content: string[];
      fgColors: Record<string, string>;
      bgColors: Record<string, string>;
    }>;
    colorMap: Map<string, string>;
    colorMode: 'ansi' | '256' | 'hex';
    loopAnimation: boolean;
    includePlaybackControls: boolean;
    canvasWidth: number;
    canvasHeight: number;
  }): string {
    const {
      componentName,
      framesData,
      colorMap,
      colorMode,
      loopAnimation,
      includePlaybackControls,
      canvasWidth,
      canvasHeight,
    } = options;

    const lines: string[] = [];

    // Imports
    lines.push("import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';");
    lines.push("import { Box, Text } from 'ink';");
    lines.push('');

    // Dual theme dictionaries
    if (colorMode === 'hex') {
      // Hex mode: Generate COLORS_DARK and COLORS_LIGHT with numeric keys
      lines.push('// Color themes - edit these values to customize for each background type');
      lines.push('// COLORS_DARK is used when hasDarkBackground={true} (default)');
      lines.push('// COLORS_LIGHT is used when hasDarkBackground={false}');
      lines.push('const COLORS_DARK: Record<string, string> = {');
      colorMap.forEach((value, key) => {
        lines.push(`  ${value}: '${key}',`);
      });
      lines.push('};');
      lines.push('');
      lines.push('const COLORS_LIGHT: Record<string, string> = {');
      colorMap.forEach((value, key) => {
        // For light mode, we can try to provide sensible defaults
        // Invert very light colors to dark, and vice versa
        const invertedColor = this.suggestLightModeColor(key);
        lines.push(`  ${value}: '${invertedColor}',`);
      });
      lines.push('};');
      lines.push('');
    } else if (colorMode === '256') {
      // 256-color mode: use hex colors clamped to the xterm-256 palette
      // Ink/chalk uses hex colors, but we clamp them to the 256 palette for terminal compatibility
      lines.push('// Color themes - hex colors clamped to xterm-256 palette');
      lines.push('// COLORS_DARK is used when hasDarkBackground={true} (default)');
      lines.push('// COLORS_LIGHT is used when hasDarkBackground={false}');
      lines.push('// Colors are clamped to the 256-color palette for wide terminal compatibility');
      lines.push('const COLORS_DARK: Record<string, string> = {');
      colorMap.forEach((value, key) => {
        // Convert hex color to 256 palette hex (clamped)
        const clampedHex = this.hexTo256Hex(key);
        lines.push(`  ${value}: '${clampedHex}', // original: ${key}`);
      });
      lines.push('};');
      lines.push('');
      lines.push('const COLORS_LIGHT: Record<string, string> = {');
      colorMap.forEach((value, key) => {
        const invertedColor = this.suggestLightModeColor(key);
        const clampedHex = this.hexTo256Hex(invertedColor);
        lines.push(`  ${value}: '${clampedHex}', // original: ${invertedColor}`);
      });
      lines.push('};');
      lines.push('');
    } else {
      // ANSI mode: Generate semantic theme dictionaries
      // Collect unique ANSI color names used
      const usedAnsiColors = new Set<string>();
      colorMap.forEach((ansiName) => {
        usedAnsiColors.add(ansiName);
      });
      
      lines.push('// Color themes - edit these values to customize for each background type');
      lines.push('// THEME_DARK is used when hasDarkBackground={true} (default)');
      lines.push('// THEME_LIGHT is used when hasDarkBackground={false}');
      lines.push('const THEME_DARK: Record<string, string> = {');
      usedAnsiColors.forEach((ansiName) => {
        lines.push(`  ${ansiName}: '${ansiName}',`);
      });
      lines.push('};');
      lines.push('');
      lines.push('const THEME_LIGHT: Record<string, string> = {');
      usedAnsiColors.forEach((ansiName) => {
        const lightVariant = this.suggestLightModeAnsiColor(ansiName);
        lines.push(`  ${ansiName}: '${lightVariant}',`);
      });
      lines.push('};');
      lines.push('');
    }

    // Types
    lines.push('type FrameData = {');
    lines.push('  duration: number;');
    lines.push('  content: string[];');
    lines.push('  fgColors: Record<string, string>;');
    lines.push('  bgColors: Record<string, string>;');
    lines.push('};');
    lines.push('');

    if (includePlaybackControls) {
      lines.push('type PlaybackAPI = {');
      lines.push('  play: () => void;');
      lines.push('  pause: () => void;');
      lines.push('  restart: () => void;');
      lines.push('};');
      lines.push('');
    }

    lines.push(`type ${componentName}Props = {`);
    lines.push('  hasDarkBackground?: boolean;');
    lines.push('  autoPlay?: boolean;');
    lines.push('  loop?: boolean;');
    if (includePlaybackControls) {
      lines.push('  onReady?: (api: PlaybackAPI) => void;');
    }
    lines.push('};');
    lines.push('');

    // Frame data
    lines.push('const FRAMES: FrameData[] = ' + JSON.stringify(framesData, null, 2) + ';');
    lines.push('');
    lines.push(`const CANVAS_WIDTH = ${canvasWidth};`);
    lines.push(`const CANVAS_HEIGHT = ${canvasHeight};`);
    lines.push(`const DEFAULT_LOOP = ${loopAnimation};`);
    lines.push('');

    // Component
    lines.push(`export const ${componentName}: React.FC<${componentName}Props> = ({`);
    lines.push('  hasDarkBackground = true,');
    lines.push('  autoPlay = true,');
    lines.push('  loop = DEFAULT_LOOP,');
    if (includePlaybackControls) {
      lines.push('  onReady,');
    }
    lines.push('}) => {');
    lines.push('  const [frameIndex, setFrameIndex] = useState(0);');
    lines.push('  const [isPlaying, setIsPlaying] = useState(autoPlay);');
    lines.push('  const frameElapsedRef = useRef(0);');
    lines.push('  const lastTimestampRef = useRef(Date.now());');
    lines.push('');

    // Theme selection
    if (colorMode === 'hex' || colorMode === '256') {
      lines.push('  // Select color theme based on background');
      lines.push('  const colors = useMemo(() => hasDarkBackground ? COLORS_DARK : COLORS_LIGHT, [hasDarkBackground]);');
      lines.push('  const getColor = useCallback((key: string): string => colors[key] || key, [colors]);');
    } else {
      lines.push('  // Select color theme based on background');
      lines.push('  const theme = useMemo(() => hasDarkBackground ? THEME_DARK : THEME_LIGHT, [hasDarkBackground]);');
      lines.push('  const getColor = useCallback((key: string): string => theme[key] || key, [theme]);');
    }
    lines.push('  const defaultFg = hasDarkBackground ? "white" : "black";');
    lines.push('');

    // Playback control functions
    lines.push('  const play = useCallback(() => setIsPlaying(true), []);');
    lines.push('  const pause = useCallback(() => setIsPlaying(false), []);');
    lines.push('  const restart = useCallback(() => {');
    lines.push('    setFrameIndex(0);');
    lines.push('    frameElapsedRef.current = 0;');
    lines.push('    lastTimestampRef.current = Date.now();');
    lines.push('    setIsPlaying(true);');
    lines.push('  }, []);');
    lines.push('');

    // onReady callback
    if (includePlaybackControls) {
      lines.push('  useEffect(() => {');
      lines.push('    if (onReady) {');
      lines.push('      onReady({ play, pause, restart });');
      lines.push('    }');
      lines.push('  }, [onReady, play, pause, restart]);');
      lines.push('');
    }

    // Animation loop
    lines.push('  useEffect(() => {');
    lines.push('    if (!isPlaying || FRAMES.length <= 1) return;');
    lines.push('');
    lines.push('    const interval = setInterval(() => {');
    lines.push('      const now = Date.now();');
    lines.push('      const delta = now - lastTimestampRef.current;');
    lines.push('      lastTimestampRef.current = now;');
    lines.push('      frameElapsedRef.current += delta;');
    lines.push('');
    lines.push('      const currentFrame = FRAMES[frameIndex];');
    lines.push('      if (frameElapsedRef.current >= currentFrame.duration) {');
    lines.push('        frameElapsedRef.current = 0;');
    lines.push('        const nextIndex = frameIndex + 1;');
    lines.push('        if (nextIndex >= FRAMES.length) {');
    lines.push('          if (loop) {');
    lines.push('            setFrameIndex(0);');
    lines.push('          } else {');
    lines.push('            setIsPlaying(false);');
    lines.push('          }');
    lines.push('        } else {');
    lines.push('          setFrameIndex(nextIndex);');
    lines.push('        }');
    lines.push('      }');
    lines.push('    }, 16);');
    lines.push('');
    lines.push('    return () => clearInterval(interval);');
    lines.push('  }, [isPlaying, frameIndex, loop]);');
    lines.push('');

    // Render function
    lines.push('  const frame = FRAMES[frameIndex];');
    lines.push('');
    lines.push('  return (');
    lines.push('    <Box flexDirection="column">');
    lines.push('      {frame.content.map((row, y) => (');
    lines.push('        <Box key={y}>');
    lines.push('          {row.split("").map((char, x) => {');
    lines.push('            const posKey = `${x},${y}`;');
    lines.push('            const fg = frame.fgColors[posKey] ? getColor(frame.fgColors[posKey]) : defaultFg;');
    lines.push('            const bg = frame.bgColors[posKey] ? getColor(frame.bgColors[posKey]) : undefined;');
    lines.push('            return (');
    lines.push('              <Text key={x} color={fg} backgroundColor={bg}>');
    lines.push('                {char}');
    lines.push('              </Text>');
    lines.push('            );');
    lines.push('          })}');
    lines.push('        </Box>');
    lines.push('      ))}');
    lines.push('    </Box>');
    lines.push('  );');
    lines.push('};');
    lines.push('');
    lines.push(`export default ${componentName};`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Suggest a light-mode alternative for a hex color
   * Inverts brightness while preserving hue
   */
  private suggestLightModeColor(hex: string): string {
    // Parse hex color
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // If color is light (luminance > 0.5), darken it for light backgrounds
    // If color is dark, it might work as-is or we lighten slightly
    if (luminance > 0.6) {
      // Darken light colors significantly for light mode
      const factor = 0.3;
      const newR = Math.round(r * factor);
      const newG = Math.round(g * factor);
      const newB = Math.round(b * factor);
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    } else if (luminance < 0.2) {
      // Very dark colors - keep them or slightly lighten
      return hex;
    }
    
    // Medium colors - keep as is, they often work on both
    return hex;
  }

  /**
   * Suggest a light-mode alternative for an ANSI color name
   */
  private suggestLightModeAnsiColor(ansiColor: string): string {
    // Map bright/light colors to their darker counterparts for light backgrounds
    const lightModeMap: Record<string, string> = {
      'white': 'black',
      'whiteBright': 'blackBright',
      'gray': 'blackBright',
      'black': 'black',
      'blackBright': 'black',
      // Bright variants often work on light backgrounds, but regular colors are safer
      'redBright': 'red',
      'greenBright': 'green', 
      'yellowBright': 'yellow',
      'blueBright': 'blue',
      'magentaBright': 'magenta',
      'cyanBright': 'cyan',
      // Regular colors generally work fine on light backgrounds
      'red': 'red',
      'green': 'green',
      'yellow': 'yellow',
      'blue': 'blue',
      'magenta': 'magenta',
      'cyan': 'cyan',
    };
    
    return lightModeMap[ansiColor] || ansiColor;
  }

  /**
   * Export as OpenTUI Component (.tsx)
   * Generates a self-contained React component for OpenTUI terminal UI
   */
  async exportOpenTuiComponent(
    data: ExportDataBundle,
    settings: OpenTuiExportSettings
  ): Promise<void> {
    this.updateProgress('Preparing OpenTUI component export...', 0);

    try {
      const requestedName = settings.fileName?.trim() || 'ascii-motion-tui';
      const sanitizedFileName = this.sanitizeReactFileName(requestedName) || 'ascii-motion-tui';
      const componentName = this.toPascalCase(sanitizedFileName);

      this.updateProgress('Building color dictionary...', 20);

      // Build unique color dictionary
      const colorMap = new Map<string, string>();
      let colorIndex = 0;

      // OpenTUI uses CSS-style color names with "bright" prefix (not camelCase like Ink)
      // e.g., "brightcyan" not "cyanBright"
      const opentuiColorMap: Record<string, string> = {
        '#000000': 'black',
        '#800000': 'red',
        '#008000': 'green',
        '#808000': 'yellow',
        '#000080': 'blue',
        '#800080': 'magenta',
        '#008080': 'cyan',
        '#c0c0c0': 'white',
        '#808080': 'gray',
        '#ff0000': 'brightred',
        '#00ff00': 'brightgreen',
        '#ffff00': 'brightyellow',
        '#0000ff': 'brightblue',
        '#ff00ff': 'brightmagenta',
        '#00ffff': 'brightcyan',
        '#ffffff': 'brightwhite',
      };

      // Find closest color for a given hex color
      const toOpenTuiColor = (hex: string): string => {
        const normalized = hex.toLowerCase();
        if (opentuiColorMap[normalized]) {
          return opentuiColorMap[normalized];
        }
        const hexToRgb = (h: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          } : { r: 128, g: 128, b: 128 };
        };
        const target = hexToRgb(normalized);
        let closestColor = 'white';
        let closestDistance = Infinity;
        for (const [ansHex, ansName] of Object.entries(opentuiColorMap)) {
          const c = hexToRgb(ansHex);
          const dist = Math.sqrt(
            Math.pow(target.r - c.r, 2) +
            Math.pow(target.g - c.g, 2) +
            Math.pow(target.b - c.b, 2)
          );
          if (dist < closestDistance) {
            closestDistance = dist;
            closestColor = ansName;
          }
        }
        return closestColor;
      };

      // Collect all colors from frames
      data.frames.forEach((frame) => {
        frame.data.forEach((cell) => {
          if (cell.color && !colorMap.has(cell.color)) {
            if (settings.colorMode === 'ansi') {
              colorMap.set(cell.color, toOpenTuiColor(cell.color));
            } else {
              // For both hex and 256 modes, use sequential unique keys
              colorMap.set(cell.color, `c${colorIndex++}`);
            }
          }
          if (cell.bgColor && cell.bgColor !== 'transparent' && !colorMap.has(cell.bgColor)) {
            if (settings.colorMode === 'ansi') {
              colorMap.set(cell.bgColor, toOpenTuiColor(cell.bgColor));
            } else {
              // For both hex and 256 modes, use sequential unique keys
              colorMap.set(cell.bgColor, `c${colorIndex++}`);
            }
          }
        });
      });

      this.updateProgress('Serializing frame data...', 40);

      // Build frame data with content strings and color maps
      const framesData = data.frames.map((frame) => {
        const rows: string[] = [];
        const fgColors: Record<string, string> = {};
        const bgColors: Record<string, string> = {};

        // Initialize rows
        for (let y = 0; y < data.canvasDimensions.height; y++) {
          rows.push(' '.repeat(data.canvasDimensions.width));
        }

        // Fill in cell data
        frame.data.forEach((cell, key) => {
          if (!cell || !cell.char) return;
          const [x, y] = key.split(',').map(Number);
          if (x < 0 || y < 0 || x >= data.canvasDimensions.width || y >= data.canvasDimensions.height) return;

          // Update row character
          const row = rows[y];
          rows[y] = row.substring(0, x) + cell.char + row.substring(x + 1);

          // Track colors by position
          if (cell.color) {
            const colorKey = settings.colorMode === 'ansi' ? toOpenTuiColor(cell.color) : colorMap.get(cell.color)!;
            fgColors[`${x},${y}`] = colorKey;
          }
          if (cell.bgColor && cell.bgColor !== 'transparent') {
            const colorKey = settings.colorMode === 'ansi' ? toOpenTuiColor(cell.bgColor) : colorMap.get(cell.bgColor)!;
            bgColors[`${x},${y}`] = colorKey;
          }
        });

        return {
          duration: Math.max(frame.duration, 16),
          content: rows,
          fgColors,
          bgColors,
        };
      });

      // Deduplicate consecutive identical frames (merge durations)
      const deduplicatedFramesData = this.deduplicateCliFrames(framesData);

      this.updateProgress('Generating component code...', 60);

      const componentCode = this.generateOpenTuiComponentCode({
        componentName,
        framesData: deduplicatedFramesData,
        colorMap,
        colorMode: settings.colorMode,
        loopAnimation: settings.loopAnimation,
        includePlaybackControls: settings.includePlaybackControls,
        canvasWidth: data.canvasDimensions.width,
        canvasHeight: data.canvasDimensions.height,
      });

      this.updateProgress('Saving file...', 90);

      const blob = new Blob([componentCode], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `${sanitizedFileName}.tsx`);

      this.updateProgress('Export complete!', 100);
    } catch (error) {
      console.error('OpenTUI component export failed:', error);
      throw new Error(`OpenTUI component export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateOpenTuiComponentCode(options: {
    componentName: string;
    framesData: Array<{
      duration: number;
      content: string[];
      fgColors: Record<string, string>;
      bgColors: Record<string, string>;
    }>;
    colorMap: Map<string, string>;
    colorMode: 'ansi' | '256' | 'hex';
    loopAnimation: boolean;
    includePlaybackControls: boolean;
    canvasWidth: number;
    canvasHeight: number;
  }): string {
    const {
      componentName,
      framesData,
      colorMap,
      colorMode,
      loopAnimation,
      includePlaybackControls,
      canvasWidth,
      canvasHeight,
    } = options;

    const lines: string[] = [];

    // Imports - OpenTUI uses box, text from @opentui/react
    lines.push("import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';");
    lines.push('');

    // Dual theme dictionaries
    if (colorMode === 'hex') {
      lines.push('// Color themes - edit these values to customize for each background type');
      lines.push('// COLORS_DARK is used when hasDarkBackground={true} (default)');
      lines.push('// COLORS_LIGHT is used when hasDarkBackground={false}');
      lines.push('const COLORS_DARK: Record<string, string> = {');
      colorMap.forEach((value, key) => {
        lines.push(`  ${value}: '${key}',`);
      });
      lines.push('};');
      lines.push('');
      lines.push('const COLORS_LIGHT: Record<string, string> = {');
      colorMap.forEach((value, key) => {
        const invertedColor = this.suggestLightModeColor(key);
        lines.push(`  ${value}: '${invertedColor}',`);
      });
      lines.push('};');
      lines.push('');
    } else if (colorMode === '256') {
      // 256-color mode: use hex colors clamped to the xterm-256 palette
      // OpenTUI uses hex colors, but we clamp them to the 256 palette for terminal compatibility
      lines.push('// Color themes - hex colors clamped to xterm-256 palette');
      lines.push('// COLORS_DARK is used when hasDarkBackground={true} (default)');
      lines.push('// COLORS_LIGHT is used when hasDarkBackground={false}');
      lines.push('// Colors are clamped to the 256-color palette for wide terminal compatibility');
      lines.push('const COLORS_DARK: Record<string, string> = {');
      colorMap.forEach((value, key) => {
        // Convert hex color to 256 palette hex (clamped)
        const clampedHex = this.hexTo256Hex(key);
        lines.push(`  ${value}: '${clampedHex}', // original: ${key}`);
      });
      lines.push('};');
      lines.push('');
      lines.push('const COLORS_LIGHT: Record<string, string> = {');
      colorMap.forEach((value, key) => {
        const invertedColor = this.suggestLightModeColor(key);
        const clampedHex = this.hexTo256Hex(invertedColor);
        lines.push(`  ${value}: '${clampedHex}', // original: ${invertedColor}`);
      });
      lines.push('};');
      lines.push('');
    } else {
      // ANSI mode: Generate semantic theme dictionaries
      const usedAnsiColors = new Set<string>();
      colorMap.forEach((ansiName) => {
        usedAnsiColors.add(ansiName);
      });
      
      lines.push('// Color themes - edit these values to customize for each background type');
      lines.push('// THEME_DARK is used when hasDarkBackground={true} (default)');
      lines.push('// THEME_LIGHT is used when hasDarkBackground={false}');
      lines.push('const THEME_DARK: Record<string, string> = {');
      usedAnsiColors.forEach((ansiName) => {
        lines.push(`  ${ansiName}: '${ansiName}',`);
      });
      lines.push('};');
      lines.push('');
      lines.push('const THEME_LIGHT: Record<string, string> = {');
      usedAnsiColors.forEach((ansiName) => {
        const lightVariant = this.suggestLightModeAnsiColor(ansiName);
        lines.push(`  ${ansiName}: '${lightVariant}',`);
      });
      lines.push('};');
      lines.push('');
    }

    // Types
    lines.push('type FrameData = {');
    lines.push('  duration: number;');
    lines.push('  content: string[];');
    lines.push('  fgColors: Record<string, string>;');
    lines.push('  bgColors: Record<string, string>;');
    lines.push('};');
    lines.push('');

    if (includePlaybackControls) {
      lines.push('type PlaybackAPI = {');
      lines.push('  play: () => void;');
      lines.push('  pause: () => void;');
      lines.push('  restart: () => void;');
      lines.push('};');
      lines.push('');
    }

    lines.push(`type ${componentName}Props = {`);
    lines.push('  hasDarkBackground?: boolean;');
    lines.push('  autoPlay?: boolean;');
    lines.push('  loop?: boolean;');
    if (includePlaybackControls) {
      lines.push('  onReady?: (api: PlaybackAPI) => void;');
    }
    lines.push('};');
    lines.push('');

    // Frame data
    lines.push('const FRAMES: FrameData[] = ' + JSON.stringify(framesData, null, 2) + ';');
    lines.push('');
    lines.push(`const CANVAS_WIDTH = ${canvasWidth};`);
    lines.push(`const CANVAS_HEIGHT = ${canvasHeight};`);
    lines.push(`const DEFAULT_LOOP = ${loopAnimation};`);
    lines.push('');

    // Component - using lowercase intrinsic elements for OpenTUI
    lines.push(`export const ${componentName}: React.FC<${componentName}Props> = ({`);
    lines.push('  hasDarkBackground = true,');
    lines.push('  autoPlay = true,');
    lines.push('  loop = DEFAULT_LOOP,');
    if (includePlaybackControls) {
      lines.push('  onReady,');
    }
    lines.push('}) => {');
    lines.push('  const [frameIndex, setFrameIndex] = useState(0);');
    lines.push('  const [isPlaying, setIsPlaying] = useState(autoPlay);');
    lines.push('  const frameElapsedRef = useRef(0);');
    lines.push('  const lastTimestampRef = useRef(Date.now());');
    lines.push('');

    // Theme selection
    if (colorMode === 'hex' || colorMode === '256') {
      lines.push('  // Select color theme based on background');
      lines.push('  const colors = useMemo(() => hasDarkBackground ? COLORS_DARK : COLORS_LIGHT, [hasDarkBackground]);');
      lines.push('  const getColor = useCallback((key: string): string => colors[key] || key, [colors]);');
    } else {
      lines.push('  // Select color theme based on background');
      lines.push('  const theme = useMemo(() => hasDarkBackground ? THEME_DARK : THEME_LIGHT, [hasDarkBackground]);');
      lines.push('  const getColor = useCallback((key: string): string => theme[key] || key, [theme]);');
    }
    lines.push('  const defaultFg = hasDarkBackground ? "white" : "black";');
    lines.push('');

    // Playback control functions
    lines.push('  const play = useCallback(() => setIsPlaying(true), []);');
    lines.push('  const pause = useCallback(() => setIsPlaying(false), []);');
    lines.push('  const restart = useCallback(() => {');
    lines.push('    setFrameIndex(0);');
    lines.push('    frameElapsedRef.current = 0;');
    lines.push('    lastTimestampRef.current = Date.now();');
    lines.push('    setIsPlaying(true);');
    lines.push('  }, []);');
    lines.push('');

    // onReady callback
    if (includePlaybackControls) {
      lines.push('  useEffect(() => {');
      lines.push('    if (onReady) {');
      lines.push('      onReady({ play, pause, restart });');
      lines.push('    }');
      lines.push('  }, [onReady, play, pause, restart]);');
      lines.push('');
    }

    // Animation loop using setInterval
    lines.push('  useEffect(() => {');
    lines.push('    if (!isPlaying || FRAMES.length <= 1) return;');
    lines.push('');
    lines.push('    const interval = setInterval(() => {');
    lines.push('      const now = Date.now();');
    lines.push('      const delta = now - lastTimestampRef.current;');
    lines.push('      lastTimestampRef.current = now;');
    lines.push('      frameElapsedRef.current += delta;');
    lines.push('');
    lines.push('      const currentFrame = FRAMES[frameIndex];');
    lines.push('      if (frameElapsedRef.current >= currentFrame.duration) {');
    lines.push('        frameElapsedRef.current = 0;');
    lines.push('        const nextIndex = frameIndex + 1;');
    lines.push('        if (nextIndex >= FRAMES.length) {');
    lines.push('          if (loop) {');
    lines.push('            setFrameIndex(0);');
    lines.push('          } else {');
    lines.push('            setIsPlaying(false);');
    lines.push('          }');
    lines.push('        } else {');
    lines.push('          setFrameIndex(nextIndex);');
    lines.push('        }');
    lines.push('      }');
    lines.push('    }, 16);');
    lines.push('');
    lines.push('    return () => clearInterval(interval);');
    lines.push('  }, [isPlaying, frameIndex, loop]);');
    lines.push('');

    // Render function using OpenTUI intrinsic elements: box, text, span
    lines.push('  const frame = FRAMES[frameIndex];');
    lines.push('');
    lines.push('  return (');
    lines.push('    <box flexDirection="column">');
    lines.push('      {frame.content.map((row, y) => (');
    lines.push('        <text key={y}>');
    lines.push('          {row.split("").map((char, x) => {');
    lines.push('            const posKey = `${x},${y}`;');
    lines.push('            const fg = frame.fgColors[posKey] ? getColor(frame.fgColors[posKey]) : defaultFg;');
    lines.push('            const bg = frame.bgColors[posKey] ? getColor(frame.bgColors[posKey]) : undefined;');
    lines.push('            return (');
    lines.push('              <span key={x} fg={fg} bg={bg}>');
    lines.push('                {char}');
    lines.push('              </span>');
    lines.push('            );');
    lines.push('          })}');
    lines.push('        </text>');
    lines.push('      ))}');
    lines.push('    </box>');
    lines.push('  );');
    lines.push('};');
    lines.push('');
    lines.push(`export default ${componentName};`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Export animation as a Bubbletea (Go) component
   */
  async exportBubbleteaComponent(
    data: ExportDataBundle,
    settings: BubbleteaExportSettings
  ): Promise<void> {
    this.updateProgress('Preparing Bubbletea component export...', 0);

    try {
      // Sanitize and format names
      const sanitizedFileName = settings.fileName
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .toLowerCase();
      const sanitizedPackageName = settings.packageName
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase();

      this.updateProgress('Processing frames...', 20);

      // Process frames
      const framesData: Array<{
        duration: number;
        content: string[];
        fgColors: Record<string, string>;
        bgColors: Record<string, string>;
      }> = [];

      const colorMap = new Map<string, string>();
      let colorIndex = 0;

      for (let i = 0; i < data.frames.length; i++) {
        const frame = data.frames[i];
        const frameData = frame.data;
        const content: string[] = [];
        const fgColors: Record<string, string> = {};
        const bgColors: Record<string, string> = {};

        // Build content grid
        for (let y = 0; y < data.canvasDimensions.height; y++) {
          let row = '';
          for (let x = 0; x < data.canvasDimensions.width; x++) {
            const key = `${x},${y}`;
            const cell = frameData.get(key);
            const char = cell?.char || ' ';
            row += char;

            // Track foreground color
            if (cell?.color && cell.color !== '#ffffff') {
              fgColors[key] = cell.color;
              if (!colorMap.has(cell.color)) {
                colorMap.set(cell.color, `c${colorIndex++}`);
              }
            }

            // Track background color
            if (cell?.bgColor && cell.bgColor !== 'transparent') {
              bgColors[key] = cell.bgColor;
              if (!colorMap.has(cell.bgColor)) {
                colorMap.set(cell.bgColor, `c${colorIndex++}`);
              }
            }
          }
          content.push(row);
        }

        framesData.push({
          duration: frame.duration,
          content,
          fgColors,
          bgColors,
        });
      }

      // Deduplicate consecutive identical frames (merge durations)
      const deduplicatedFramesData = this.deduplicateCliFrames(framesData);

      this.updateProgress('Generating Go code...', 60);

      // Generate Go code
      const goCode = this.generateBubbleteaCode({
        packageName: sanitizedPackageName,
        framesData: deduplicatedFramesData,
        colorMap,
        colorMode: settings.colorMode,
        playbackStyle: settings.playbackStyle,
        loopAnimation: settings.loopAnimation,
        width: data.canvasDimensions.width,
        height: data.canvasDimensions.height,
        toAnsi16Color: this.hexToAnsi16Color.bind(this),
      });

      this.updateProgress('Downloading file...', 90);

      // Download file
      const blob = new Blob([goCode], { type: 'text/plain; charset=utf-8' });
      saveAs(blob, `${sanitizedFileName}.go`);

      this.updateProgress('Export complete!', 100);
    } catch (error) {
      console.error('Bubbletea export error:', error);
      throw new Error(`Failed to export Bubbletea component: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert hex color to ANSI 16-color code and name
   */
  private hexToAnsi16Color(hex: string): { code: string; name: string } {
    // ANSI 16-color palette mapping
    const ansiColors: Array<{ hex: string; code: string; name: string }> = [
      { hex: '#000000', code: '0', name: 'black' },
      { hex: '#800000', code: '1', name: 'red' },
      { hex: '#008000', code: '2', name: 'green' },
      { hex: '#808000', code: '3', name: 'yellow' },
      { hex: '#000080', code: '4', name: 'blue' },
      { hex: '#800080', code: '5', name: 'magenta' },
      { hex: '#008080', code: '6', name: 'cyan' },
      { hex: '#c0c0c0', code: '7', name: 'white' },
      { hex: '#808080', code: '8', name: 'bright black' },
      { hex: '#ff0000', code: '9', name: 'bright red' },
      { hex: '#00ff00', code: '10', name: 'bright green' },
      { hex: '#ffff00', code: '11', name: 'bright yellow' },
      { hex: '#0000ff', code: '12', name: 'bright blue' },
      { hex: '#ff00ff', code: '13', name: 'bright magenta' },
      { hex: '#00ffff', code: '14', name: 'bright cyan' },
      { hex: '#ffffff', code: '15', name: 'bright white' },
    ];

    // Parse hex color
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // Find closest ANSI color
    let closestColor = ansiColors[0];
    let minDistance = Infinity;

    for (const ansi of ansiColors) {
      const ar = parseInt(ansi.hex.slice(1, 3), 16);
      const ag = parseInt(ansi.hex.slice(3, 5), 16);
      const ab = parseInt(ansi.hex.slice(5, 7), 16);

      const distance = Math.sqrt(
        Math.pow(r - ar, 2) + Math.pow(g - ag, 2) + Math.pow(b - ab, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestColor = ansi;
      }
    }

    return { code: closestColor.code, name: closestColor.name };
  }

  /**
   * Convert hex color to xterm-256 palette code
   * The xterm-256 palette consists of:
   * - 0-15: Standard ANSI 16 colors
   * - 16-231: 6×6×6 RGB color cube (216 colors)
   * - 232-255: Grayscale ramp (24 shades)
   */
  private hexTo256Color(hex: string): number {
    // Parse hex color
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // Check if close to grayscale (r ≈ g ≈ b)
    const isGrayscale = Math.abs(r - g) < 8 && Math.abs(g - b) < 8 && Math.abs(r - b) < 8;
    
    if (isGrayscale) {
      // Use grayscale ramp (232-255) for grays
      // The grayscale ramp goes from rgb(8,8,8) at 232 to rgb(238,238,238) at 255
      const avg = (r + g + b) / 3;
      if (avg < 4) return 16; // Black
      if (avg > 244) return 231; // White
      // Map to grayscale codes 232-255 (24 levels)
      const grayIndex = Math.round((avg - 8) / 10);
      return Math.min(255, Math.max(232, 232 + grayIndex));
    }

    // Use 6×6×6 RGB cube (16-231)
    // Each component maps 0-255 to 0-5
    const cubeR = Math.round(r / 51);
    const cubeG = Math.round(g / 51);
    const cubeB = Math.round(b / 51);
    
    return 16 + (36 * cubeR) + (6 * cubeG) + cubeB;
  }

  /**
   * Convert xterm-256 color code to hex color string
   * Inverse of hexTo256Color - useful for frameworks that need hex but want 256-palette colors
   */
  private color256ToHex(code: number): string {
    // Standard ANSI 16 colors (0-15)
    if (code < 16) {
      const ansi16: string[] = [
        '#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#c0c0c0',
        '#808080', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff'
      ];
      return ansi16[code];
    }
    
    // Grayscale ramp (232-255)
    if (code >= 232) {
      const gray = 8 + (code - 232) * 10;
      const hex = gray.toString(16).padStart(2, '0');
      return `#${hex}${hex}${hex}`;
    }
    
    // 6×6×6 RGB cube (16-231)
    const cubeIndex = code - 16;
    const cubeR = Math.floor(cubeIndex / 36);
    const cubeG = Math.floor((cubeIndex % 36) / 6);
    const cubeB = cubeIndex % 6;
    
    // Each cube step is 0, 95, 135, 175, 215, 255
    const cubeValues = [0, 95, 135, 175, 215, 255];
    const r = cubeValues[cubeR];
    const g = cubeValues[cubeG];
    const b = cubeValues[cubeB];
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Clamp a hex color to the nearest xterm-256 palette color (as hex)
   * Useful for frameworks like OpenTUI that use hex colors but need 256-palette compatibility
   */
  private hexTo256Hex(hex: string): string {
    const code = this.hexTo256Color(hex);
    return this.color256ToHex(code);
  }

  /**
   * Generate Bubbletea Go code
   */
  private generateBubbleteaCode(params: {
    packageName: string;
    framesData: Array<{
      duration: number;
      content: string[];
      fgColors: Record<string, string>;
      bgColors: Record<string, string>;
    }>;
    colorMap: Map<string, string>;
    colorMode: 'hex' | '256' | 'semantic';
    playbackStyle: 'autoplay' | 'keyboard' | 'api';
    loopAnimation: boolean;
    width: number;
    height: number;
    toAnsi16Color: (hex: string) => { code: string; name: string };
  }): string {
    const {
      packageName,
      framesData,
      colorMap,
      colorMode,
      playbackStyle,
      loopAnimation,
      width,
      height,
      toAnsi16Color,
    } = params;

    const lines: string[] = [];

    // Package declaration
    lines.push(`package ${packageName}`);
    lines.push('');

    // Imports
    lines.push('import (');
    lines.push('\t"strings"');
    lines.push('\t"time"');
    lines.push('');
    lines.push('\ttea "github.com/charmbracelet/bubbletea"');
    lines.push('\t"github.com/charmbracelet/lipgloss"');
    lines.push(')');
    lines.push('');

    // Dual theme color dictionaries - similar to Ink/OpenTUI pattern
    if (colorMode === 'hex') {
      lines.push('// Color themes - edit these values to customize for each background type');
      lines.push('// COLORS_DARK is used when HasDarkBackground=true (default)');
      lines.push('// COLORS_LIGHT is used when HasDarkBackground=false');
      lines.push('var COLORS_DARK = map[string]lipgloss.Color{');
      for (const [hex, varName] of colorMap) {
        lines.push(`\t"${varName}": lipgloss.Color("${hex}"),`);
      }
      lines.push('}');
      lines.push('');
      lines.push('var COLORS_LIGHT = map[string]lipgloss.Color{');
      for (const [hex, varName] of colorMap) {
        const invertedColor = this.suggestLightModeColor(hex);
        lines.push(`\t"${varName}": lipgloss.Color("${invertedColor}"),`);
      }
      lines.push('}');
      lines.push('');
    } else if (colorMode === '256') {
      // 256-color mode: Generate xterm-256 color theme dictionaries
      lines.push('// Color themes - xterm-256 color palette');
      lines.push('// COLORS_DARK is used when HasDarkBackground=true (default)');
      lines.push('// COLORS_LIGHT is used when HasDarkBackground=false');
      lines.push('// Values are xterm-256 color codes (0-255)');
      lines.push('var COLORS_DARK = map[string]lipgloss.Color{');
      for (const [hex, varName] of colorMap) {
        const colorCode = this.hexTo256Color(hex);
        lines.push(`\t"${varName}": lipgloss.Color("${colorCode}"), // ${hex}`);
      }
      lines.push('}');
      lines.push('');
      lines.push('var COLORS_LIGHT = map[string]lipgloss.Color{');
      for (const [hex, varName] of colorMap) {
        const invertedColor = this.suggestLightModeColor(hex);
        const invertedCode = this.hexTo256Color(invertedColor);
        lines.push(`\t"${varName}": lipgloss.Color("${invertedCode}"), // ${invertedColor}`);
      }
      lines.push('}');
      lines.push('');
    } else {
      // Semantic mode: Generate ANSI color theme dictionaries
      lines.push('// Color themes - edit these values to customize for each background type');
      lines.push('// THEME_DARK is used when HasDarkBackground=true (default)');
      lines.push('// THEME_LIGHT is used when HasDarkBackground=false');
      lines.push('var THEME_DARK = map[string]lipgloss.Color{');
      for (const [hex, varName] of colorMap) {
        const ansi = toAnsi16Color(hex);
        lines.push(`\t"${varName}": lipgloss.Color("${ansi.code}"), // ${ansi.name}`);
      }
      lines.push('}');
      lines.push('');
      lines.push('var THEME_LIGHT = map[string]lipgloss.Color{');
      for (const [hex, varName] of colorMap) {
        const lightAnsi = toAnsi16Color(this.suggestLightModeColor(hex));
        lines.push(`\t"${varName}": lipgloss.Color("${lightAnsi.code}"), // ${lightAnsi.name}`);
      }
      lines.push('}');
      lines.push('');
    }

    // Frame data structure - now uses string keys for color lookups
    lines.push('// Frame represents a single animation frame');
    lines.push('type Frame struct {');
    lines.push('\tDuration time.Duration');
    lines.push('\tContent  []string');
    lines.push('\tFgColors map[string]string // Maps "x,y" -> color key');
    lines.push('\tBgColors map[string]string // Maps "x,y" -> color key');
    lines.push('}');
    lines.push('');

    // Model - now includes hasDarkBackground for theme selection
    lines.push('// Model is the Bubbletea model for the animation');
    lines.push('type Model struct {');
    lines.push('\tframes            []Frame');
    lines.push('\tframeIndex        int');
    lines.push('\tisPlaying         bool');
    lines.push('\tloop              bool');
    lines.push('\twidth             int');
    lines.push('\theight            int');
    lines.push('\thasDarkBackground bool');
    lines.push('}');
    lines.push('');

    // tickMsg
    lines.push('type tickMsg time.Time');
    lines.push('');

    // New function with hasDarkBackground parameter
    lines.push('// New creates a new animation model');
    lines.push('// Set hasDarkBackground to true for dark terminals, false for light terminals');
    lines.push('func New(hasDarkBackground bool) Model {');
    lines.push('\treturn Model{');
    lines.push('\t\tframes:            frames,');
    lines.push('\t\tframeIndex:        0,');
    lines.push(`\t\tisPlaying:         ${playbackStyle === 'autoplay' ? 'true' : 'false'},`);
    lines.push(`\t\tloop:              ${loopAnimation},`);
    lines.push(`\t\twidth:             ${width},`);
    lines.push(`\t\theight:            ${height},`);
    lines.push('\t\thasDarkBackground: hasDarkBackground,');
    lines.push('\t}');
    lines.push('}');
    lines.push('');

    // NewWithDefaults - convenience function
    lines.push('// NewWithDefaults creates a new animation model with dark background (default)');
    lines.push('func NewWithDefaults() Model {');
    lines.push('\treturn New(true)');
    lines.push('}');
    lines.push('');

    // Init
    lines.push('// Init initializes the model');
    lines.push('func (m Model) Init() tea.Cmd {');
    if (playbackStyle === 'autoplay') {
      lines.push('\treturn m.tick()');
    } else {
      lines.push('\treturn nil');
    }
    lines.push('}');
    lines.push('');

    // tick helper
    lines.push('func (m Model) tick() tea.Cmd {');
    lines.push('\tif !m.isPlaying || len(m.frames) == 0 {');
    lines.push('\t\treturn nil');
    lines.push('\t}');
    lines.push('\treturn tea.Tick(m.frames[m.frameIndex].Duration, func(t time.Time) tea.Msg {');
    lines.push('\t\treturn tickMsg(t)');
    lines.push('\t})');
    lines.push('}');
    lines.push('');

    // Update
    lines.push('// Update handles messages');
    lines.push('func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {');
    lines.push('\tswitch msg := msg.(type) {');
    lines.push('\tcase tea.KeyMsg:');
    if (playbackStyle === 'keyboard') {
      lines.push('\t\tswitch msg.String() {');
      lines.push('\t\tcase "q", "ctrl+c":');
      lines.push('\t\t\treturn m, tea.Quit');
      lines.push('\t\tcase " ":');
      lines.push('\t\t\tm.isPlaying = !m.isPlaying');
      lines.push('\t\t\tif m.isPlaying {');
      lines.push('\t\t\t\treturn m, m.tick()');
      lines.push('\t\t\t}');
      lines.push('\t\tcase "r":');
      lines.push('\t\t\tm.frameIndex = 0');
      lines.push('\t\t\treturn m, m.tick()');
      lines.push('\t\tcase "left", "h":');
      lines.push('\t\t\tif m.frameIndex > 0 {');
      lines.push('\t\t\t\tm.frameIndex--');
      lines.push('\t\t\t}');
      lines.push('\t\tcase "right", "l":');
      lines.push('\t\t\tif m.frameIndex < len(m.frames)-1 {');
      lines.push('\t\t\t\tm.frameIndex++');
      lines.push('\t\t\t}');
      lines.push('\t\t}');
    } else {
      lines.push('\t\tswitch msg.String() {');
      lines.push('\t\tcase "q", "ctrl+c":');
      lines.push('\t\t\treturn m, tea.Quit');
      lines.push('\t\t}');
    }
    lines.push('\tcase tickMsg:');
    lines.push('\t\tif m.isPlaying && len(m.frames) > 0 {');
    lines.push('\t\t\tm.frameIndex++');
    lines.push('\t\t\tif m.frameIndex >= len(m.frames) {');
    lines.push('\t\t\t\tif m.loop {');
    lines.push('\t\t\t\t\tm.frameIndex = 0');
    lines.push('\t\t\t\t} else {');
    lines.push('\t\t\t\t\tm.frameIndex = len(m.frames) - 1');
    lines.push('\t\t\t\t\tm.isPlaying = false');
    lines.push('\t\t\t\t\treturn m, nil');
    lines.push('\t\t\t\t}');
    lines.push('\t\t\t}');
    lines.push('\t\t\treturn m, m.tick()');
    lines.push('\t\t}');
    lines.push('\t}');
    lines.push('\treturn m, nil');
    lines.push('}');
    lines.push('');

    // getColor helper function - selects color from dark or light palette
    const darkColorMap = (colorMode === 'hex' || colorMode === '256') ? 'COLORS_DARK' : 'THEME_DARK';
    const lightColorMap = (colorMode === 'hex' || colorMode === '256') ? 'COLORS_LIGHT' : 'THEME_LIGHT';
    lines.push('// getColor returns the appropriate color for the current background mode');
    lines.push('func (m Model) getColor(colorKey string) lipgloss.TerminalColor {');
    lines.push('\tif m.hasDarkBackground {');
    lines.push(`\t\treturn ${darkColorMap}[colorKey]`);
    lines.push('\t}');
    lines.push(`\treturn ${lightColorMap}[colorKey]`);
    lines.push('}');
    lines.push('');

    // View
    lines.push('// View renders the animation');
    lines.push('func (m Model) View() string {');
    lines.push('\tif len(m.frames) == 0 {');
    lines.push('\t\treturn ""');
    lines.push('\t}');
    lines.push('\tframe := m.frames[m.frameIndex]');
    lines.push('\tvar sb strings.Builder');
    lines.push('');
    lines.push('\tfor y, row := range frame.Content {');
    lines.push('\t\t// Convert to runes to get character indices (not byte offsets)');
    lines.push('\t\tchars := []rune(row)');
    lines.push('\t\tfor x, ch := range chars {');
    lines.push('\t\t\tkey := fmt.Sprintf("%d,%d", x, y)');
    lines.push('\t\t\tstyle := lipgloss.NewStyle()');
    lines.push('\t\t\tif fgKey, ok := frame.FgColors[key]; ok {');
    lines.push('\t\t\t\tstyle = style.Foreground(m.getColor(fgKey))');
    lines.push('\t\t\t}');
    lines.push('\t\t\tif bgKey, ok := frame.BgColors[key]; ok {');
    lines.push('\t\t\t\tstyle = style.Background(m.getColor(bgKey))');
    lines.push('\t\t\t}');
    lines.push('\t\t\tsb.WriteString(style.Render(string(ch)))');
    lines.push('\t\t}');
    lines.push('\t\tif y < len(frame.Content)-1 {');
    lines.push('\t\t\tsb.WriteString("\\n")');
    lines.push('\t\t}');
    lines.push('\t}');
    lines.push('\treturn sb.String()');
    lines.push('}');
    lines.push('');

    // API methods
    lines.push('// Play starts or resumes the animation');
    lines.push('func (m *Model) Play() tea.Cmd {');
    lines.push('\tm.isPlaying = true');
    lines.push('\treturn m.tick()');
    lines.push('}');
    lines.push('');

    lines.push('// Pause stops the animation');
    lines.push('func (m *Model) Pause() {');
    lines.push('\tm.isPlaying = false');
    lines.push('}');
    lines.push('');

    lines.push('// Restart resets to the first frame');
    lines.push('func (m *Model) Restart() tea.Cmd {');
    lines.push('\tm.frameIndex = 0');
    lines.push('\treturn m.tick()');
    lines.push('}');
    lines.push('');

    lines.push('// IsPlaying returns whether the animation is playing');
    lines.push('func (m Model) IsPlaying() bool {');
    lines.push('\treturn m.isPlaying');
    lines.push('}');
    lines.push('');

    lines.push('// CurrentFrame returns the current frame index');
    lines.push('func (m Model) CurrentFrame() int {');
    lines.push('\treturn m.frameIndex');
    lines.push('}');
    lines.push('');

    lines.push('// TotalFrames returns the total number of frames');
    lines.push('func (m Model) TotalFrames() int {');
    lines.push('\treturn len(m.frames)');
    lines.push('}');
    lines.push('');

    // Add fmt import since we use it in View
    const importIndex = lines.findIndex(l => l === 'import (');
    if (importIndex !== -1) {
      lines.splice(importIndex + 1, 0, '\t"fmt"');
    }

    // Frame data
    lines.push('// Frame data');
    lines.push('var frames = []Frame{');
    for (const frame of framesData) {
      lines.push('\t{');
      lines.push(`\t\tDuration: ${Math.round(frame.duration)} * time.Millisecond,`);
      lines.push('\t\tContent: []string{');
      for (const row of frame.content) {
        lines.push(`\t\t\t${JSON.stringify(row)},`);
      }
      lines.push('\t\t},');
      
      // Foreground colors - store color keys (strings) for lookup in COLORS_DARK/COLORS_LIGHT
      if (Object.keys(frame.fgColors).length > 0) {
        lines.push('\t\tFgColors: map[string]string{');
        for (const [key, hex] of Object.entries(frame.fgColors)) {
          const varName = colorMap.get(hex);
          if (varName) {
            lines.push(`\t\t\t"${key}": "${varName}",`);
          }
        }
        lines.push('\t\t},');
      } else {
        lines.push('\t\tFgColors: nil,');
      }

      // Background colors - store color keys (strings) for lookup in COLORS_DARK/COLORS_LIGHT
      if (Object.keys(frame.bgColors).length > 0) {
        lines.push('\t\tBgColors: map[string]string{');
        for (const [key, hex] of Object.entries(frame.bgColors)) {
          const varName = colorMap.get(hex);
          if (varName) {
            lines.push(`\t\t\t"${key}": "${varName}",`);
          }
        }
        lines.push('\t\t},');
      } else {
        lines.push('\t\tBgColors: nil,');
      }
      
      lines.push('\t},');
    }
    lines.push('}');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Crop grid based on text export settings
   */
  private cropGrid(grid: string[][], settings: TextExportSettings): string[][] {
    let processedGrid = [...grid.map(row => [...row])];

    // Remove leading lines
    if (settings.removeLeadingLines) {
      while (processedGrid.length > 0 && processedGrid[0].every(char => char === ' ')) {
        processedGrid.shift();
      }
    }

    // Remove trailing lines
    if (settings.removeTrailingLines) {
      while (processedGrid.length > 0 && processedGrid[processedGrid.length - 1].every(char => char === ' ')) {
        processedGrid.pop();
      }
    }

    // Remove leading spaces (find leftmost non-space character across all rows)
    if (settings.removeLeadingSpaces) {
      let leftmostColumn = Infinity;
      
      // Find the leftmost column with any non-space character
      for (const row of processedGrid) {
        for (let col = 0; col < row.length; col++) {
          if (row[col] !== ' ') {
            leftmostColumn = Math.min(leftmostColumn, col);
            break;
          }
        }
      }

      // Remove leading columns if we found any content
      if (leftmostColumn !== Infinity && leftmostColumn > 0) {
        processedGrid = processedGrid.map(row => row.slice(leftmostColumn));
      }
    }

    return processedGrid;
  }

  /**
   * Create a high-resolution canvas for export with DPI scaling
   */
  private createExportCanvas(
    gridWidth: number,
    gridHeight: number,
    sizeMultiplier: number,
    fontMetrics: FontMetrics,
    typography: TypographySettings
  ): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; scale: number } {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    // Calculate cell dimensions using actual typography settings
    // Use typography.fontSize instead of fontMetrics.fontSize for accurate sizing
    const actualFontSize = typography.fontSize || fontMetrics.fontSize || 16;
    const characterSpacing = typography.characterSpacing || 1.0;
    const lineSpacing = typography.lineSpacing || 1.0;
    
    // Calculate base character dimensions from actual font size
    const baseCharWidth = actualFontSize * 0.6; // Standard monospace aspect ratio
    const baseCharHeight = actualFontSize;
    
    // Apply spacing multipliers and size multiplier
    const baseCellWidth = baseCharWidth * characterSpacing * sizeMultiplier;
    const baseCellHeight = baseCharHeight * lineSpacing * sizeMultiplier;
    
    // Calculate display dimensions
    const displayWidth = Math.max(gridWidth * baseCellWidth, 1);
    const displayHeight = Math.max(gridHeight * baseCellHeight, 1);
    
    // Use device pixel ratio for high-DPI export (minimum 2x for crisp exports)
    const devicePixelRatio = Math.max(window.devicePixelRatio || 1, 2);
    
    // Set canvas internal resolution to match device pixel ratio
    canvas.width = displayWidth * devicePixelRatio;
    canvas.height = displayHeight * devicePixelRatio;
    
    // Scale the drawing context to match the device pixel ratio
    ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // Setup high-quality rendering
    setupTextRendering(ctx);
    
    return { canvas, ctx, scale: devicePixelRatio };
  }

  /**
   * Render a single frame to canvas
   */
  private async renderFrame(
    canvas: HTMLCanvasElement,
    frameData: Map<string, Cell>,
    gridWidth: number,
    gridHeight: number,
    options: {
      backgroundColor: string;
      showGrid: boolean;
      fontMetrics: FontMetrics;
      typography: TypographySettings;
      sizeMultiplier: number;
      theme: 'light' | 'dark';
      scale?: number;
    }
  ): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');

    const { backgroundColor, showGrid, fontMetrics, typography, sizeMultiplier, theme } = options;
    
    // Calculate cell dimensions using actual typography settings
    const actualFontSize = typography.fontSize || fontMetrics.fontSize || 16;
    const characterSpacing = typography.characterSpacing || 1.0;
    const lineSpacing = typography.lineSpacing || 1.0;
    
    // Calculate character dimensions with spacing
    const baseCharWidth = actualFontSize * 0.6; // Standard monospace aspect ratio
    const baseCharHeight = actualFontSize;
    
    const cellWidth = baseCharWidth * characterSpacing * sizeMultiplier;
    const cellHeight = baseCharHeight * lineSpacing * sizeMultiplier;
    
    // Clear canvas with background color
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid if enabled
    if (showGrid) {
      this.drawGrid(ctx, gridWidth, gridHeight, cellWidth, cellHeight, backgroundColor, theme);
    }
    
    // Setup font for text rendering using actual typography settings
    const exportFontSize = actualFontSize * sizeMultiplier;
    // Font stack is already properly formatted (no quotes) from fontMetrics
    const fontStack = fontMetrics.fontFamily || 'SF Mono, Monaco, Cascadia Code, Consolas, JetBrains Mono, Fira Code, Monaspace Neon, Geist Mono, Courier New, monospace';
    ctx.font = `${exportFontSize}px ${fontStack}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw all cells
    frameData.forEach((cell, key) => {
      const [x, y] = key.split(',').map(Number);
      this.drawExportCell(ctx, x, y, cell, cellWidth, cellHeight);
    });
  }

  /**
   * Draw grid lines for export
   */
  private drawGrid(
    ctx: CanvasRenderingContext2D,
    gridWidth: number,
    gridHeight: number,
    cellWidth: number,
    cellHeight: number,
    backgroundColor: string,
    theme: 'light' | 'dark'
  ): void {
    const gridColor = calculateAdaptiveGridColor(backgroundColor, theme);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    
    // Vertical lines
    for (let x = 0; x <= gridWidth; x++) {
      const xPos = x * cellWidth;
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, gridHeight * cellHeight);
    }
    
    // Horizontal lines
    for (let y = 0; y <= gridHeight; y++) {
      const yPos = y * cellHeight;
      ctx.moveTo(0, yPos);
      ctx.lineTo(gridWidth * cellWidth, yPos);
    }
    
    ctx.stroke();
  }

  /**
   * Draw a single cell for export
   */
  private drawExportCell(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    cell: Cell,
    cellWidth: number,
    cellHeight: number
  ): void {
    const pixelX = x * cellWidth;
    const pixelY = y * cellHeight;
    
    // Draw background if specified
    if (cell.bgColor && cell.bgColor !== 'transparent') {
      ctx.fillStyle = cell.bgColor;
      ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
    }
    
    // Draw character
    if (cell.char && cell.char.trim()) {
      ctx.fillStyle = cell.color || '#FFFFFF';
      ctx.fillText(
        cell.char,
        pixelX + cellWidth / 2,
        pixelY + cellHeight / 2
      );
    }
  }

  /**
   * Convert canvas to blob
   */
  private canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
    // Check if canvas has valid dimensions
    if (canvas.width <= 0 || canvas.height <= 0) {
      throw new Error(`Invalid canvas dimensions: ${canvas.width}x${canvas.height}`);
    }

    // Check if canvas is too large (some browsers have limits)
    const maxDimension = 32767; // Common browser limit
    if (canvas.width > maxDimension || canvas.height > maxDimension) {
      throw new Error(`Canvas dimensions too large: ${canvas.width}x${canvas.height}. Max: ${maxDimension}x${maxDimension}`);
    }

    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas - toBlob returned null'));
          }
  }, type, quality);
      } catch (error) {
        reject(new Error(`Canvas toBlob failed: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  }

  /**
   * Check if WebCodecs is supported in the current browser
   */
  private supportsWebCodecs(): boolean {
    return typeof window !== 'undefined' && 
           'VideoEncoder' in window && 
           'VideoFrame' in window;
  }

  /**
   * Export video using WebCodecs API (WebM format)
   */
  private async exportWebMVideo(
    data: ExportDataBundle,
    settings: VideoExportSettings,
    filename: string
  ): Promise<void> {
    this.updateProgress('Creating video frames...', 20);
    
    // Generate frame canvases
    const frameCanvases = await this.generateVideoFrames(data, settings);
    
    if (frameCanvases.length === 0) {
      throw new Error('No frames generated for video export');
    }
    
    this.updateProgress('Encoding video...', 50);
    
    try {
      // Use WebCodecs to create WebM video
      const videoBlob = await this.encodeWebMVideo(frameCanvases, settings);
      
      this.updateProgress('Saving video file...', 90);
      
      saveAs(videoBlob, `${filename}.webm`);
      
      this.updateProgress('Video export complete!', 100);
      
    } catch (error) {
      console.error('❌ Video encoding failed:', error);
      throw error;
    } finally {
      // Clean up canvas resources
      frameCanvases.forEach(canvas => {
        canvas.width = 0;
        canvas.height = 0;
      });
    }
  }

  /**
   * Export video using FFmpeg.wasm (H.264 MP4)
   */
  private async exportMP4Fallback(
    data: ExportDataBundle,
    settings: VideoExportSettings,
    filename: string
  ): Promise<void> {
    this.updateProgress('Initializing FFmpeg...', 10);
    
    try {
      // Dynamic import of FFmpeg
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { fetchFile } = await import('@ffmpeg/util');
      
      const ffmpeg = new FFmpeg();
      
      // Load FFmpeg core with better error handling
      this.updateProgress('Loading FFmpeg core...', 15);
      
      try {
        // Use default FFmpeg loading which handles worker files properly
        await ffmpeg.load();
      } catch (loadError) {
        console.error('Failed to load FFmpeg:', loadError);
        throw new Error(`Failed to initialize FFmpeg: ${loadError instanceof Error ? loadError.message : String(loadError)}`);
      }
      
      this.updateProgress('Generating frames...', 20);
      
      // Generate frame canvases
      const frameCanvases = await this.generateVideoFrames(data, settings);
      
      if (frameCanvases.length === 0) {
        throw new Error('No frames generated for MP4 export');
      }
      
      this.updateProgress('Converting frames to images...', 40);
      
      // Convert canvases to PNG files for FFmpeg
      for (let i = 0; i < frameCanvases.length; i++) {
        const canvas = frameCanvases[i];
        const blob = await this.canvasToBlob(canvas, 'image/png');
        const frameData = await fetchFile(blob);
        
        // Write frame to FFmpeg file system with zero-padded name
        const frameName = `frame${i.toString().padStart(6, '0')}.png`;
        await ffmpeg.writeFile(frameName, frameData);
        
        // Update progress during frame conversion
        const progress = 40 + (i / frameCanvases.length) * 20; // 40-60%
        this.updateProgress(`Converting frame ${i + 1}/${frameCanvases.length}...`, progress);
      }
      
      this.updateProgress('Encoding H.264 MP4 video...', 70);
      
      // Build FFmpeg command based on your specification
      const inputPattern = 'frame%06d.png';
      const outputFilename = 'output.mp4';
      
      // Calculate frame rate (FFmpeg needs frames per second)
      const framerate = settings.frameRate.toString();
      
      // Your FFmpeg command adapted for frame input:
      const ffmpegArgs = [
        '-framerate', framerate,        // Input framerate
        '-i', inputPattern,             // Input pattern
        '-map_metadata', '-1',          // Remove metadata
        '-an',                          // No audio
        '-c:v', 'libx264',             // H.264 codec
        '-crf', settings.crf.toString(), // Quality (CRF value)
        '-profile:v', 'main',           // H.264 profile
        '-pix_fmt', 'yuv420p',         // Pixel format for compatibility
        '-movflags', '+faststart',      // Optimize for web playback
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', // Ensure even dimensions
        outputFilename
      ];
      
      // Execute FFmpeg encoding
      await ffmpeg.exec(ffmpegArgs);
      
      this.updateProgress('Saving MP4 file...', 90);
      
      // Read the output file
      const outputData = await ffmpeg.readFile(outputFilename);
      
      // Create blob from FFmpeg output data
      const uint8Array = new Uint8Array(outputData as unknown as ArrayBuffer);
      const mp4Blob = new Blob([uint8Array.buffer], { type: 'video/mp4' });
      
      saveAs(mp4Blob, `${filename}.mp4`);
      
      this.updateProgress('MP4 export complete!', 100);
      
    } catch (error) {
      console.error('❌ FFmpeg MP4 export failed:', error);
      throw new Error(`MP4 export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate canvas frames for video export
   */
  private async generateVideoFrames(
    data: ExportDataBundle,
    settings: VideoExportSettings
  ): Promise<HTMLCanvasElement[]> {
    const videoFrames: HTMLCanvasElement[] = [];
    const originalFrames = data.frames;
    
    if (originalFrames.length === 0) {
      console.warn('⚠️ No frames found in animation data');
      return videoFrames;
    }

    // Calculate how many loops to generate
    const loopMultiplier = this.getLoopMultiplier(settings.loops);
    
    // Each animation frame = exactly 1 video frame.
    // The video fps controls playback speed:
    // - Auto/project fps: plays at intended speed
    // - Different fps: same frames, different playback speed
    const totalVideoFrames = originalFrames.length * loopMultiplier;
    
    let globalVideoFrameIndex = 0;
    
    // Generate frames for all loops — 1 video frame per animation frame
    for (let loop = 0; loop < loopMultiplier; loop++) {
      for (let animFrameIndex = 0; animFrameIndex < originalFrames.length; animFrameIndex++) {
        const animationFrame = originalFrames[animFrameIndex];
        
        // Create high-resolution canvas for this animation frame
        const frameCanvas = this.createExportCanvas(
          data.canvasDimensions.width,
          data.canvasDimensions.height,
          settings.sizeMultiplier,
          data.fontMetrics,
          data.typography
        );
        
        // Render the animation frame
        await this.renderFrame(
          frameCanvas.canvas,
          animationFrame.data,
          data.canvasDimensions.width,
          data.canvasDimensions.height,
          {
            backgroundColor: data.canvasBackgroundColor,
            showGrid: settings.includeGrid && data.showGrid,
            fontMetrics: data.fontMetrics,
            typography: data.typography,
            sizeMultiplier: settings.sizeMultiplier,
            theme: data.uiState.theme,
            scale: frameCanvas.scale
          }
        );

        // Apply post effects if enabled and available
        if (settings.includePostEffects !== false && data.postEffectTracks) {
          applyPostEffectsToCanvas(
            frameCanvas.canvas,
            data.postEffectTracks,
            animFrameIndex,
            data.frameRate,
            data.canvasBackgroundColor,
          );
        }
        
        // 1 video frame per animation frame
        videoFrames.push(frameCanvas.canvas);
        globalVideoFrameIndex++;
        
        // Update progress (spread across 20-50% range)
        const progress = 20 + (globalVideoFrameIndex / totalVideoFrames) * 30;
        this.updateProgress(
          `Rendering video frame ${globalVideoFrameIndex}/${totalVideoFrames} (anim frame ${animFrameIndex + 1}/${originalFrames.length}, loop ${loop + 1}/${loopMultiplier})...`, 
          progress
        );
      }
    }
    
    return videoFrames;
  }

  /**
   * Deduplicate consecutive identical CLI frames by merging their durations.
   * Compares content rows + color maps to detect identical frames.
   * Used by Ink, OpenTUI, and BubbleTea exports.
   */
  private deduplicateCliFrames(
    frames: Array<{ duration: number; content: string[]; fgColors: Record<string, string>; bgColors: Record<string, string> }>
  ): typeof frames {
    if (frames.length <= 1) return frames;

    const hashFrame = (f: typeof frames[0]): string => {
      return f.content.join('\n') + '|' + JSON.stringify(f.fgColors) + '|' + JSON.stringify(f.bgColors);
    };

    const result: typeof frames = [];
    let prevHash = '';

    for (const frame of frames) {
      const hash = hashFrame(frame);
      if (result.length > 0 && hash === prevHash) {
        // Identical to previous — extend duration
        result[result.length - 1].duration += frame.duration;
      } else {
        result.push({ ...frame });
        prevHash = hash;
      }
    }

    return result;
  }

  /**
   * Convert loop setting to numeric multiplier
   */
  private getLoopMultiplier(loops: VideoExportSettings['loops']): number {
    switch (loops) {
      case 'none': return 1;
      case '2x': return 2;
      case '4x': return 4;
      case '8x': return 8;
      default: return 1;
    }
  }

  /**
   * Encode frames to WebM using WebCodecs
   */
  private async encodeWebMVideo(
    frames: HTMLCanvasElement[],
    settings: VideoExportSettings
  ): Promise<Blob> {
    const { Muxer, ArrayBufferTarget } = await import('webm-muxer');
    
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: 'V_VP9',
        width: frames[0].width,
        height: frames[0].height,
        frameRate: settings.frameRate as number
      }
    });

    // Set up VideoEncoder for WebCodecs encoding
    const encodedChunks: EncodedVideoChunk[] = [];
    
    return new Promise((resolve, reject) => {
      const encoder = new VideoEncoder({
        output: (chunk) => {
          encodedChunks.push(chunk);
          
          // Add encoded chunk directly to muxer
          muxer.addVideoChunk(chunk);
          
          // Update progress
          const progress = 50 + (encodedChunks.length / frames.length) * 30;
          this.updateProgress(`Encoding frame ${encodedChunks.length}/${frames.length}...`, progress);
          
          // Check if we've encoded all frames
          if (encodedChunks.length === frames.length) {
            encoder.close();
            muxer.finalize();
            const buffer = muxer.target.buffer;
            resolve(new Blob([buffer], { type: 'video/webm' }));
          }
        },
        error: (error) => {
          console.error('VideoEncoder error:', error);
          encoder.close();
          reject(error);
        }
      });

      // Configure the encoder
      encoder.configure({
        codec: 'vp09.00.10.08', // VP9 codec
        width: frames[0].width,
        height: frames[0].height,
        framerate: settings.frameRate as number,
        bitrate: this.getBitrateForQuality(settings.quality, frames[0].width, frames[0].height)
      });

      // Encode each frame
      for (let i = 0; i < frames.length; i++) {
        const canvas = frames[i];
        
        // Create VideoFrame from canvas
        const frame = new VideoFrame(canvas, {
          timestamp: (i * 1000000) / (settings.frameRate as number) // microseconds
        });
        
        // Encode the frame
        encoder.encode(frame, { keyFrame: i === 0 || i % 30 === 0 }); // Keyframe every 30 frames
        
        // Clean up the frame
        frame.close();
      }
      
      // Finish encoding
      encoder.flush();
    });
  }

  /**
   * Get bitrate based on quality setting and resolution
   */
  private getBitrateForQuality(quality: VideoExportSettings['quality'], width: number, height: number): number {
    const pixelCount = width * height;
    const baseRate = pixelCount / 1000; // Base rate per 1000 pixels
    
    switch (quality) {
      case 'low':
        return Math.max(500000, baseRate * 200); // Minimum 500kbps
      case 'medium':
        return Math.max(1000000, baseRate * 400); // Minimum 1Mbps  
      case 'high':
        return Math.max(2000000, baseRate * 800); // Minimum 2Mbps
      default:
        return Math.max(1000000, baseRate * 400);
    }
  }

  // ============================================
  // SHADER EXPORT HELPERS
  // ============================================

  /**
   * Build a self-contained shader data bundle for embedding in React/HTML exports.
   * Pre-computes per-frame resolved settings so we don't need to embed
   * keyframe interpolation logic in the exported file.
   */
  private buildShaderExportBundle(
    postEffectTracks: PostEffectTrack[],
    totalFrames: number,
  ): {
    /** Unique shader effect descriptors used across all frames */
    shaders: Array<{
      type: string;
      fragmentShader: string;
      passes: number;
      passShaders: string[];
      properties: Array<{
        path: string;
        valueType: string;
        options?: { value: string | number }[];
      }>;
      passUniforms?: Array<Record<string, unknown>>;
    }>;
    /** Per-frame array: list of { shaderIndex, settings } */
    perFramePasses: Array<Array<{ shaderIndex: number; settings: Record<string, unknown> }>>;
  } | null {
    if (!postEffectTracks || postEffectTracks.length === 0) return null;

    // Collect unique effect types used
    const usedTypes = new Set<string>();
    for (const track of postEffectTracks) {
      usedTypes.add(track.effectBlock.postEffectType);
    }

    // Build shader descriptors (indexed)
    const typeToIndex = new Map<string, number>();
    const shaders: Array<{
      type: string;
      fragmentShader: string;
      passes: number;
      passShaders: string[];
      properties: Array<{
        path: string;
        valueType: string;
        options?: { value: string | number }[];
      }>;
      passUniforms?: Array<Record<string, unknown>>;
    }> = [];

    for (const type of usedTypes) {
      const entry = getPostEffect(type);
      if (!entry) continue;

      typeToIndex.set(type, shaders.length);
      const passes = entry.passes ?? 1;
      const passShaders: string[] = [];
      for (let p = 0; p < passes; p++) {
        passShaders.push(entry.passShaders?.[p] ?? entry.fragmentShader);
      }

      shaders.push({
        type,
        fragmentShader: entry.fragmentShader,
        passes,
        passShaders,
        properties: entry.propertyDefinitions.map((d) => ({
          path: d.path,
          valueType: d.valueType,
          options: d.options,
        })),
        passUniforms: entry.passUniforms,
      });
    }

    if (shaders.length === 0) return null;

    // Pre-compute per-frame passes
    const perFramePasses: Array<Array<{ shaderIndex: number; settings: Record<string, unknown> }>> = [];
    for (let frame = 0; frame < totalFrames; frame++) {
      const activeBlocks = getActivePostEffects(postEffectTracks, frame);
      const framePasses: Array<{ shaderIndex: number; settings: Record<string, unknown> }> = [];

      for (const block of activeBlocks) {
        const idx = typeToIndex.get(block.postEffectType);
        if (idx === undefined) continue;
        const settings = evaluatePostEffectBlock(block, frame);
        framePasses.push({ shaderIndex: idx, settings });
      }

      perFramePasses.push(framePasses);
    }

    return { shaders, perFramePasses };
  }

  /**
   * Generate self-contained vanilla JavaScript code for a WebGL2 post-processing
   * pipeline. This code can be embedded directly in HTML or React exports.
   *
   * The generated code exposes a single function:
   *   applyShaders(canvas, frameIndex, time)
   *
   * It initializes lazily on first call, creating a hidden WebGL2 canvas,
   * compiling shaders, and building the fullscreen quad.
   */
  private generateWebGLShaderRuntime(bundle: NonNullable<ReturnType<ExportRenderer['buildShaderExportBundle']>>): string {
    const vertexShaderStr = JSON.stringify(FULLSCREEN_VERTEX_SHADER);

    // Build the SHADER_DEFS array literal
    const shaderDefsEntries = bundle.shaders.map((s) => {
      const passShadersSerialized = '[' + s.passShaders.map((ps) => JSON.stringify(ps)).join(',\n') + ']';
      const propertiesSerialized = JSON.stringify(s.properties);
      const passUniformsSerialized = s.passUniforms ? JSON.stringify(s.passUniforms) : 'null';
      return `{
    passes: ${s.passes},
    passShaders: ${passShadersSerialized},
    properties: ${propertiesSerialized},
    passUniforms: ${passUniformsSerialized}
  }`;
    });

    const perFrameJson = JSON.stringify(bundle.perFramePasses);

    return `
// ── WebGL Shader Post-Processing Runtime ──
(function() {
  var VERTEX_SRC = ${vertexShaderStr};
  var SHADER_DEFS = [${shaderDefsEntries.join(',\n')}];
  var FRAME_PASSES = ${perFrameJson};

  var gl = null;
  var glCanvas = null;
  var quadVAO = null;
  var programCache = {};
  var fbA = null, fbB = null, texA = null, texB = null;
  var snapFb = null, snapTex = null;
  var inputTex = null;
  var fbW = 0, fbH = 0;

  function hexToRgb(hex) {
    var c = hex.replace('#', '');
    return [parseInt(c.substring(0,2),16)/255, parseInt(c.substring(2,4),16)/255, parseInt(c.substring(4,6),16)/255];
  }

  function initGL() {
    if (gl) return true;
    glCanvas = document.createElement('canvas');
    gl = glCanvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false });
    if (!gl) return false;

    // Fullscreen quad
    var verts = new Float32Array([-1,-1,0,0, 1,-1,1,0, -1,1,0,1, 1,1,1,1]);
    quadVAO = gl.createVertexArray();
    var vbo = gl.createBuffer();
    gl.bindVertexArray(quadVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    gl.bindVertexArray(null);

    inputTex = gl.createTexture();
    return true;
  }

  function getProgram(fragSrc) {
    if (programCache[fragSrc]) return programCache[fragSrc];
    var vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, VERTEX_SRC);
    gl.compileShader(vs);
    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fragSrc);
    gl.compileShader(fs);
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'a_position');
    gl.bindAttribLocation(prog, 1, 'a_texCoord');
    gl.linkProgram(prog);
    programCache[fragSrc] = prog;
    return prog;
  }

  function uploadTex(tex, source) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  function ensureFBs(w, h) {
    if (fbW === w && fbH === h) return;
    [fbA, fbB, snapFb].forEach(function(f) { if (f) gl.deleteFramebuffer(f); });
    [texA, texB, snapTex].forEach(function(t) { if (t) gl.deleteTexture(t); });
    var fbs = [null, null, null], texs = [null, null, null];
    for (var i = 0; i < 3; i++) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      var fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      fbs[i] = fb; texs[i] = t;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    fbA = fbs[0]; fbB = fbs[1]; texA = texs[0]; texB = texs[1];
    snapFb = fbs[2]; snapTex = texs[2];
    fbW = w; fbH = h;
  }

  function setUniformValue(prog, name, value, prop) {
    var loc = gl.getUniformLocation(prog, name);
    if (!loc) return;
    if (prop.valueType === 'number') { gl.uniform1f(loc, value); }
    else if (prop.valueType === 'boolean') { gl.uniform1f(loc, value ? 1.0 : 0.0); }
    else if (prop.valueType === 'color') { var rgb = hexToRgb(value); gl.uniform3fv(loc, rgb); }
    else if (prop.valueType === 'select' || prop.valueType === 'string') {
      if (typeof value === 'number') { gl.uniform1f(loc, value); }
      else if (typeof value === 'string' && prop.options) {
        var idx = -1;
        for (var j = 0; j < prop.options.length; j++) { if (prop.options[j].value === value) { idx = j; break; } }
        gl.uniform1f(loc, idx >= 0 ? idx : 0);
      }
    }
  }

  window._applyShaders = function(canvas, frameIndex, time, bgColor) {
    if (!initGL()) return;
    var passes = FRAME_PASSES[frameIndex];
    if (!passes || passes.length === 0) return;

    var w = canvas.width, h = canvas.height;
    glCanvas.width = w;
    glCanvas.height = h;

    uploadTex(inputTex, canvas);
    ensureFBs(w, h);

    var bgRgb = bgColor ? hexToRgb(bgColor) : [0, 0, 0];

    var curInput = inputTex;
    var curFbIdx = 0;
    var fbs = [fbA, fbB], texs = [texA, texB];
    var totalPasses = 0;
    for (var e = 0; e < passes.length; e++) { totalPasses += SHADER_DEFS[passes[e].shaderIndex].passes; }

    var passCount = 0;
    for (var ei = 0; ei < passes.length; ei++) {
      var entry = passes[ei];
      var def = SHADER_DEFS[entry.shaderIndex];

      // Snapshot curInput for multi-pass u_original to avoid ping-pong corruption
      var effectOriginal = curInput;
      if (def.passes > 1 && (curInput === texA || curInput === texB)) {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, curInput === texA ? fbA : fbB);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, snapFb);
        gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        effectOriginal = snapTex;
      }

      for (var p = 0; p < def.passes; p++) {
        passCount++;
        var isLast = (passCount === totalPasses);
        var fragSrc = def.passShaders[p];
        var prog = getProgram(fragSrc);

        if (isLast) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        } else {
          gl.bindFramebuffer(gl.FRAMEBUFFER, fbs[curFbIdx]);
        }
        gl.viewport(0, 0, w, h);
        gl.useProgram(prog);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, curInput);
        var uTex = gl.getUniformLocation(prog, 'u_texture');
        if (uTex) gl.uniform1i(uTex, 0);

        if (def.passes > 1) {
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, effectOriginal);
          var uOrig = gl.getUniformLocation(prog, 'u_original');
          if (uOrig) gl.uniform1i(uOrig, 1);
        }

        var uRes = gl.getUniformLocation(prog, 'u_resolution');
        if (uRes) gl.uniform2fv(uRes, [w, h]);
        var uTime = gl.getUniformLocation(prog, 'u_time');
        if (uTime) gl.uniform1f(uTime, time || 0);
        var uFrame = gl.getUniformLocation(prog, 'u_frame');
        if (uFrame) gl.uniform1f(uFrame, frameIndex);
        var uBg = gl.getUniformLocation(prog, 'u_bgColor');
        if (uBg) gl.uniform3fv(uBg, bgRgb);

        var overrides = def.passUniforms ? def.passUniforms[p] : null;
        for (var pi = 0; pi < def.properties.length; pi++) {
          var prop = def.properties[pi];
          var uName = 'u_' + prop.path;
          var val = (overrides && overrides[prop.path] !== undefined) ? overrides[prop.path] : entry.settings[prop.path];
          if (val !== undefined) setUniformValue(prog, uName, val, prop);
        }

        gl.bindVertexArray(quadVAO);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindVertexArray(null);

        if (!isLast) {
          curInput = texs[curFbIdx];
          curFbIdx = 1 - curFbIdx;
        }
      }
    }

    // Read back result onto source canvas
    var ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(glCanvas, 0, 0);
      ctx.restore();
    }
  };
})();
`;
  }

  /**
   * Update export progress
   */
  private updateProgress(message: string, percentage: number): void {
    if (this.progressCallback) {
      this.progressCallback({
        message,
        progress: percentage,
        stage: percentage < 100 ? 'processing' : 'complete'
      });
    }
  }
}