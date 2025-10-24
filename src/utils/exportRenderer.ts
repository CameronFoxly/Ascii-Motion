import { saveAs } from 'file-saver';
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
  ExportProgress 
} from '../types/export';
import type { Cell } from '../types';
import type { TypographySettings } from './canvasSizeConversion';
import type { FontMetrics } from './fontMetrics';
import { setupTextRendering } from './canvasTextRendering';
import { calculateAdaptiveGridColor } from './gridColor';
import { 
  generateSvgHeader, 
  generateSvgGrid, 
  generateSvgTextElement, 
  convertTextToPath,
  minifySvg
} from './svgExportUtils';

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

      this.updateProgress('Generating SVG structure...', 20);

      // Start SVG with header
      let svg = generateSvgHeader(
        canvasWidth, 
        canvasHeight, 
        svgSettings.includeBackground ? data.canvasBackgroundColor : undefined
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

      // Font stack is already properly formatted (no quotes) from fontMetrics
      const fontStack = data.fontMetrics?.fontFamily || 'SF Mono, Monaco, Cascadia Code, Consolas, Roboto Mono, Inconsolata, Courier New, monospace';

      // Render each cell
      let cellCount = 0;
      const totalCells = currentFrame.size;
      
      currentFrame.forEach((cell, key) => {
        const [x, y] = key.split(',').map(Number);
        
        if (cell.char) {
          if (svgSettings.textAsOutlines) {
            svg += convertTextToPath(
              cell.char,
              x, y,
              cell.color || '#ffffff',
              cell.bgColor,
              cellWidth,
              cellHeight,
              actualFontSize,
              fontStack,
              font // Pass the loaded font for opentype.js conversion
            );
          } else {
            svg += generateSvgTextElement(
              cell.char,
              x, y,
              cell.color || '#ffffff',
              cell.bgColor,
              cellWidth,
              cellHeight,
              actualFontSize,
              fontStack
            );
          }
        }
        
        cellCount++;
        if (cellCount % 100 === 0) {
          const progress = 50 + Math.floor((cellCount / totalCells) * 30);
          this.updateProgress(`Rendering characters... (${cellCount}/${totalCells})`, progress);
        }
      });

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
   * Export animation as video (WebM/MP4)
   */
  async exportVideo(
    data: ExportDataBundle, 
    settings: VideoExportSettings, 
    filename: string
  ): Promise<void> {
    this.updateProgress('Preparing video export...', 0);

    try {
      // Check if we have frames to export
      if (data.frames.length === 0) {
        throw new Error('No frames to export');
      }

      // Check WebCodecs support for WebM
      if (settings.format === 'webm' && !this.supportsWebCodecs()) {
        throw new Error('WebCodecs is not supported in your browser. Please use a modern Chrome, Edge, or Safari browser, or switch to MP4 format.');
      }

      this.updateProgress('Setting up video encoder...', 10);

      if (settings.format === 'webm') {
        await this.exportWebMVideo(data, settings, filename);
      } else {
        // MP4 fallback using canvas frame capture and blob creation
        await this.exportMP4Fallback(data, settings, filename);
      }
      
    } catch (error) {
      console.error('Video export failed:', error);
      throw error;
    }
  }

  /**
   * Export complete session as JSON file
   */
  async exportSession(
    data: ExportDataBundle, 
    settings: SessionExportSettings, 
    filename: string
  ): Promise<void> {
    this.updateProgress('Preparing session export...', 0);

    try {
      this.updateProgress('Serializing data...', 30);

      // Create session data structure
      const sessionData = {
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
        <div class="animation-canvas" id="animationCanvas"></div>
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
        updateControlStates();
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

      const framesPayload = data.frames.map((frame) => {
        const cells: Array<{ x: number; y: number; char: string; color: string; bgColor?: string }> = [];

        frame.data.forEach((cell, key) => {
          if (!cell || !cell.char) {
            return;
          }

          const [x, y] = key.split(',').map(Number);
          const cellEntry: { x: number; y: number; char: string; color: string; bgColor?: string } = {
            x,
            y,
            char: cell.char,
            color: cell.color || '#ffffff'
          };

          if (cell.bgColor && cell.bgColor !== 'transparent') {
            cellEntry.bgColor = cell.bgColor;
          }

          cells.push(cellEntry);
        });

        cells.sort((a, b) => (a.y - b.y) || (a.x - b.x));

        return {
          duration: Math.max(frame.duration, 16),
          cells
        };
      });

      const framesJson = JSON.stringify(framesPayload, null, 2);
      // Font stack is already properly formatted (no quotes) from fontMetrics
      const fontStack =
        data.fontMetrics?.fontFamily || 'SF Mono, Monaco, Cascadia Code, Consolas, Roboto Mono, Inconsolata, Courier New, monospace';

      this.updateProgress('Generating component code...', 60);

      const componentCode = this.generateReactComponentCode({
        componentName,
        framesJson,
        isTypescript: settings.typescript,
        includeControls: settings.includeControls,
        canvasWidth: canvasPixelWidth,
        canvasHeight: canvasPixelHeight,
        cellWidth,
        cellHeight,
        fontSize,
        fontFamily: fontStack,
        backgroundColor: settings.includeBackground ? data.canvasBackgroundColor : null
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
    isTypescript: boolean;
    includeControls: boolean;
    canvasWidth: number;
    canvasHeight: number;
    cellWidth: number;
    cellHeight: number;
    fontSize: number;
    fontFamily: string;
    backgroundColor: string | null;
  }): string {
    const {
      componentName,
      framesJson,
      isTypescript,
      includeControls,
      canvasWidth,
      canvasHeight,
      cellWidth,
      cellHeight,
      fontSize,
      fontFamily,
      backgroundColor
    } = options;

    const cellWidthLiteral = Number(cellWidth.toFixed(4));
    const cellHeightLiteral = Number(cellHeight.toFixed(4));
    const fontFamilyLiteral = JSON.stringify(fontFamily);
    const backgroundLiteral = backgroundColor ? JSON.stringify(backgroundColor) : 'null';

    const hooksImport = `import { useEffect, useRef, useCallback${includeControls ? ', useState' : ''} } from 'react';`;

    const typeBlock = isTypescript
      ? `type CellData = {\n  x: number;\n  y: number;\n  char: string;\n  color: string;\n  bgColor?: string;\n};\n\n` +
        `type Frame = {\n  duration: number;\n  cells: CellData[];\n};\n\n` +
        `type AsciiMotionComponentProps = {\n  showControls?: boolean;\n  autoPlay?: boolean;\n  onReady?: (api: {\n    play: () => void;\n    pause: () => void;\n    togglePlay: () => void;\n    restart: () => void;\n  }) => void;\n};`
      : `/**\n * @typedef {{ x: number, y: number, char: string, color: string, bgColor?: string }} CellData\n * @typedef {{ duration: number, cells: CellData[] }} Frame\n */\n\n/**\n * @typedef {Object} AsciiMotionComponentProps\n * @property {boolean} [showControls]\n * @property {boolean} [autoPlay]\n * @property {(api: { play: () => void; pause: () => void; togglePlay: () => void; restart: () => void; }) => void} [onReady]\n */`;

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
      '    if (cell.bgColor) {',
      '      context.fillStyle = cell.bgColor;',
      '      context.fillRect(cell.x * CELL_WIDTH, cell.y * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);',
      '    }',
      '',
      "    context.fillStyle = cell.color || '#ffffff';",
      '    context.fillText(',
      '      cell.char,',
      '      cell.x * CELL_WIDTH + CELL_WIDTH / 2,',
      '      cell.y * CELL_HEIGHT + CELL_HEIGHT / 2',
      '    );',
      '  }'
    ];

    if (includeControls) {
      effectLines.push('');
      effectLines.push('  setActiveFrame(index);');
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
    lines.push(framesDeclaration);
    lines.push('');
    lines.push(`const CANVAS_WIDTH = ${canvasWidth};`);
    lines.push(`const CANVAS_HEIGHT = ${canvasHeight};`);
    lines.push(`const CELL_WIDTH = ${cellWidthLiteral};`);
    lines.push(`const CELL_HEIGHT = ${cellHeightLiteral};`);
    lines.push(`const FONT_SIZE = ${fontSize};`);
    lines.push(`const FONT_FAMILY = ${fontFamilyLiteral};`);
    lines.push(`const BACKGROUND_COLOR = ${backgroundLiteral};`);
    lines.push('');
    lines.push(componentBlock);
    lines.push('');
    lines.push(`export default ${componentName};`);

    return lines.join('\n') + '\n';
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
    const fontStack = fontMetrics.fontFamily || 'SF Mono, Monaco, Cascadia Code, Consolas, Roboto Mono, Inconsolata, Courier New, monospace';
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
    
    // Pre-calculate video frame counts for each animation frame
    const frameVideoFrameCounts = originalFrames.map(frame => 
      this.calculateVideoFramesForDuration(frame.duration, settings.frameRate)
    );
    
    const totalVideoFrames = frameVideoFrameCounts.reduce((sum, count) => sum + count, 0) * loopMultiplier;
    
    let globalVideoFrameIndex = 0;
    
    // Generate frames for all loops
    for (let loop = 0; loop < loopMultiplier; loop++) {
      for (let animFrameIndex = 0; animFrameIndex < originalFrames.length; animFrameIndex++) {
        const animationFrame = originalFrames[animFrameIndex];
        const videoFrameCount = frameVideoFrameCounts[animFrameIndex];
        
        // Create high-resolution canvas for this animation frame
        const frameCanvas = this.createExportCanvas(
          data.canvasDimensions.width,
          data.canvasDimensions.height,
          settings.sizeMultiplier,
          data.fontMetrics,
          data.typography
        );
        
        // Render the animation frame once
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
        // Duplicate this canvas for the required number of video frames
        for (let videoFrameIndex = 0; videoFrameIndex < videoFrameCount; videoFrameIndex++) {
          // Clone the canvas for each video frame
          const clonedCanvas = this.cloneCanvas(frameCanvas.canvas);
          videoFrames.push(clonedCanvas);
          
          globalVideoFrameIndex++;
          
          // Update progress (spread across 20-50% range)
          const progress = 20 + (globalVideoFrameIndex / totalVideoFrames) * 30;
          this.updateProgress(
            `Rendering video frame ${globalVideoFrameIndex}/${totalVideoFrames} (anim frame ${animFrameIndex + 1}/${originalFrames.length}, loop ${loop + 1}/${loopMultiplier})...`, 
            progress
          );
        }
        
        // Clean up the original canvas
        frameCanvas.canvas.width = 0;
        frameCanvas.canvas.height = 0;
      }
    }
    
    return videoFrames;
  }

  /**
   * Calculate how many video frames an animation frame should occupy based on its duration
   */
  private calculateVideoFramesForDuration(durationMs: number, videoFrameRate: number): number {
    // Convert duration to seconds, then multiply by frame rate
    const durationSeconds = durationMs / 1000;
    const videoFrameCount = Math.max(1, Math.round(durationSeconds * videoFrameRate));
    return videoFrameCount;
  }

  /**
   * Clone a canvas element
   */
  private cloneCanvas(originalCanvas: HTMLCanvasElement): HTMLCanvasElement {
    const clonedCanvas = document.createElement('canvas');
    clonedCanvas.width = originalCanvas.width;
    clonedCanvas.height = originalCanvas.height;
    
    const clonedCtx = clonedCanvas.getContext('2d');
    const originalCtx = originalCanvas.getContext('2d');
    
    if (clonedCtx && originalCtx) {
      clonedCtx.drawImage(originalCanvas, 0, 0);
    }
    
    return clonedCanvas;
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
        frameRate: settings.frameRate
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
        framerate: settings.frameRate,
        bitrate: this.getBitrateForQuality(settings.quality, frames[0].width, frames[0].height)
      });

      // Encode each frame
      for (let i = 0; i < frames.length; i++) {
        const canvas = frames[i];
        
        // Create VideoFrame from canvas
        const frame = new VideoFrame(canvas, {
          timestamp: (i * 1000000) / settings.frameRate // microseconds
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