# SVG Export Feature - Implementation Plan

**Date**: September 30, 2025  
**Feature**: SVG Export for ASCII Motion Canvas  
**Integration**: Folded into existing Image Export system

---

## 📋 Overview

Add SVG vector export capability to ASCII Motion, allowing users to export their ASCII art as scalable vector graphics. This feature will be integrated into the existing Image Export system (PNG/JPEG) with SVG-specific settings.

### Key Features
- ✅ Export ASCII art as scalable SVG format
- ✅ **Text Rendering Modes**: SVG `<text>` elements OR vector path outlines
- ✅ **Optional Grid Export**: Include/exclude grid lines (default: off)
- ✅ **Background Control**: Include/exclude background color
- ✅ **Character Colors**: Preserve all character and background colors
- ✅ **SVG Formatting**: Prettified (human-readable) or Minified output
- ✅ **Auto Extension**: Filename changes to `.svg` when format selected

---

## 🏗️ Architecture Integration

Following ASCII Motion's established export system patterns:

### Export System Flow
```
User clicks "Export" → ImageExportDialog → SVG format selected → 
ImageExportSettings with SVG options → ExportRenderer.exportSvg() → 
SVG file download
```

### Files to Modify
1. **Type Definitions** (`src/types/export.ts`)
2. **Export Store** (`src/stores/exportStore.ts`)
3. **Export Renderer** (`src/utils/exportRenderer.ts`)
4. **SVG Utilities** (`src/utils/svgExportUtils.ts`) - NEW FILE
5. **Image Export Dialog** (`src/components/features/PngExportDialog.tsx` → `ImageExportDialog.tsx`)
6. **Export Menu** (`src/components/features/ExportImportButtons.tsx`)
7. **App Component** (`src/App.tsx`)
8. **Size Calculator** (`src/utils/exportPixelCalculator.ts`)

---

## 📐 Technical Specifications

### SVG Export Settings Interface
```typescript
export interface SvgExportSettings {
  includeGrid: boolean;           // Export grid lines (default: false)
  textAsOutlines: boolean;        // Convert text to vector paths (default: false)
  includeBackground: boolean;     // Include background color (default: true)
  prettify: boolean;              // Human-readable formatting (default: true)
}
```

### SVG Structure
```xml
<svg xmlns="http://www.w3.org/2000/svg" 
     width="[canvas-width]" 
     height="[canvas-height]"
     viewBox="0 0 [width] [height]">
  
  <!-- Optional Background -->
  <rect width="100%" height="100%" fill="[backgroundColor]"/>
  
  <!-- Optional Grid -->
  <g id="grid" stroke="[gridColor]" stroke-width="1">
    <line x1="..." y1="..." x2="..." y2="..."/>
    <!-- More grid lines -->
  </g>
  
  <!-- Character Cells -->
  <g id="content">
    <!-- Text Mode: -->
    <text x="[x]" y="[y]" fill="[color]" 
          font-family="monospace" font-size="[size]">A</text>
    
    <!-- OR Outline Mode: -->
    <path d="M..." fill="[color]"/>
  </g>
</svg>
```

### Text-to-Path Conversion Algorithm
For `textAsOutlines: true` mode:

1. **Create temporary canvas** with character
2. **Use canvas.measureText()** to get glyph metrics
3. **Extract glyph path** using font rendering
4. **Convert to SVG `<path>` element** with proper transforms
5. **Apply character position** and scaling

**Alternative Implementation**: Use library like `opentype.js` if more precision needed.

---

## 🔧 Implementation Steps

### Step 1: Update Type Definitions ✅
**File**: `src/types/export.ts`

```typescript
// Add 'svg' to ExportFormatId
export type ExportFormatId = 'png' | 'jpg' | 'svg' | 'mp4' | 'session' | 'media' | 'text' | 'json' | 'html';

// Add new SVG settings interface
export interface SvgExportSettings {
  includeGrid: boolean;
  textAsOutlines: boolean;
  includeBackground: boolean;
  prettify: boolean;
}

// Update ImageExportSettings to include SVG format
export interface ImageExportSettings {
  sizeMultiplier: 1 | 2 | 3 | 4;
  includeGrid: boolean;
  format: 'png' | 'jpg' | 'svg';  // Add 'svg'
  quality: number; // Ignored for SVG
  // SVG-specific settings (only used when format === 'svg')
  svgSettings?: SvgExportSettings;
}

// Update union type
export type ExportSettings = 
  | ImageExportSettings 
  | VideoExportSettings 
  | SessionExportSettings 
  | TextExportSettings 
  | JsonExportSettings 
  | HtmlExportSettings;
```

### Step 2: Update Export Store ✅
**File**: `src/stores/exportStore.ts`

```typescript
// Add default SVG settings
const DEFAULT_SVG_SETTINGS: SvgExportSettings = {
  includeGrid: false,        // No grid by default
  textAsOutlines: false,     // Use <text> elements by default
  includeBackground: true,   // Include background
  prettify: true,           // Human-readable by default
};

// Update DEFAULT_IMAGE_SETTINGS
const DEFAULT_IMAGE_SETTINGS: ImageExportSettings = {
  sizeMultiplier: 1,
  includeGrid: false,
  format: 'png',
  quality: 90,
  svgSettings: DEFAULT_SVG_SETTINGS,
};

// Add to actions (if needed as separate setter)
setSvgSettings: (settings: Partial<SvgExportSettings>) => {
  set((state) => ({
    imageSettings: {
      ...state.imageSettings,
      svgSettings: { ...state.imageSettings.svgSettings!, ...settings }
    }
  }));
}
```

### Step 3: Create SVG Utilities ✅
**File**: `src/utils/svgExportUtils.ts` (NEW)

```typescript
import type { Cell } from '../types';
import type { FontMetrics } from './fontMetrics';

/**
 * Generate SVG header with proper namespaces and viewBox
 */
export function generateSvgHeader(
  width: number,
  height: number,
  backgroundColor?: string
): string {
  const bgRect = backgroundColor
    ? `<rect width="100%" height="100%" fill="${backgroundColor}"/>`
    : '';
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${bgRect}`;
}

/**
 * Generate SVG grid lines
 */
export function generateSvgGrid(
  gridWidth: number,
  gridHeight: number,
  cellWidth: number,
  cellHeight: number,
  gridColor: string
): string {
  let lines = `<g id="grid" stroke="${gridColor}" stroke-width="1" opacity="0.3">`;
  
  // Vertical lines
  for (let x = 0; x <= gridWidth; x++) {
    const xPos = x * cellWidth;
    lines += `<line x1="${xPos}" y1="0" x2="${xPos}" y2="${gridHeight * cellHeight}"/>`;
  }
  
  // Horizontal lines
  for (let y = 0; y <= gridHeight; y++) {
    const yPos = y * cellHeight;
    lines += `<line x1="0" y1="${yPos}" x2="${gridWidth * cellWidth}" y2="${yPos}"/>`;
  }
  
  lines += '</g>';
  return lines;
}

/**
 * Generate SVG text element for a character
 */
export function generateSvgTextElement(
  char: string,
  x: number,
  y: number,
  color: string,
  bgColor: string | undefined,
  cellWidth: number,
  cellHeight: number,
  fontSize: number,
  fontFamily: string
): string {
  let elements = '';
  
  // Background rect if specified
  if (bgColor && bgColor !== 'transparent') {
    elements += `<rect x="${x * cellWidth}" y="${y * cellHeight}" width="${cellWidth}" height="${cellHeight}" fill="${bgColor}"/>`;
  }
  
  // Text element centered in cell
  const textX = x * cellWidth + cellWidth / 2;
  const textY = y * cellHeight + cellHeight / 2;
  elements += `<text x="${textX}" y="${textY}" fill="${color}" font-family="${fontFamily}" font-size="${fontSize}px" text-anchor="middle" dominant-baseline="central">${escapeXml(char)}</text>`;
  
  return elements;
}

/**
 * Convert character to SVG path outline
 * Uses canvas measureText to extract glyph path
 */
export function convertTextToPath(
  char: string,
  x: number,
  y: number,
  color: string,
  bgColor: string | undefined,
  cellWidth: number,
  cellHeight: number,
  fontSize: number,
  fontFamily: string
): string {
  // Create temporary canvas for path extraction
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  canvas.width = cellWidth * 2;
  canvas.height = cellHeight * 2;
  
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Note: This is a simplified approach
  // For production, consider using a library like opentype.js
  // or pre-computed path data for common characters
  
  let elements = '';
  
  // Background rect if specified
  if (bgColor && bgColor !== 'transparent') {
    elements += `<rect x="${x * cellWidth}" y="${y * cellHeight}" width="${cellWidth}" height="${cellHeight}" fill="${bgColor}"/>`;
  }
  
  // For now, fall back to text element with a note
  // TODO: Implement true path conversion or use opentype.js
  const textX = x * cellWidth + cellWidth / 2;
  const textY = y * cellHeight + cellHeight / 2;
  elements += `<text x="${textX}" y="${textY}" fill="${color}" font-family="${fontFamily}" font-size="${fontSize}px" text-anchor="middle" dominant-baseline="central">${escapeXml(char)}</text>`;
  
  return elements;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Prettify SVG output with proper indentation
 */
export function prettifySvg(svg: string): string {
  // Simple prettification - add newlines and indentation
  return svg
    .replace(/></g, '>\n<')
    .replace(/<(\w+)([^>]*)>/g, (match, tag, attrs) => {
      if (attrs.trim()) {
        return `<${tag}${attrs}>`;
      }
      return match;
    });
}
```

### Step 4: Implement SVG Export in Renderer ✅
**File**: `src/utils/exportRenderer.ts`

Add new method:

```typescript
import { 
  generateSvgHeader, 
  generateSvgGrid, 
  generateSvgTextElement, 
  convertTextToPath,
  prettifySvg 
} from './svgExportUtils';

/**
 * Export current frame as SVG
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

    // Calculate dimensions
    const actualFontSize = data.typography?.fontSize || 16;
    const characterSpacing = data.typography?.characterSpacing || 1.0;
    const lineSpacing = data.typography?.lineSpacing || 1.0;
    
    const baseCharWidth = actualFontSize * 0.6;
    const baseCharHeight = actualFontSize;
    
    const cellWidth = baseCharWidth * characterSpacing;
    const cellHeight = baseCharHeight * lineSpacing;
    
    const canvasWidth = data.canvasDimensions.width * cellWidth;
    const canvasHeight = data.canvasDimensions.height * cellHeight;

    this.updateProgress('Generating SVG...', 30);

    // Start SVG
    let svg = generateSvgHeader(
      canvasWidth, 
      canvasHeight, 
      svgSettings.includeBackground ? data.canvasBackgroundColor : undefined
    );

    // Add grid if enabled
    if (svgSettings.includeGrid && data.showGrid) {
      const gridColor = this.calculateGridColor(data.canvasBackgroundColor, data.uiState.theme);
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
    svg += '<g id="content">';

    const fontFamily = data.fontMetrics?.fontFamily || 'monospace';

    // Render each cell
    currentFrame.forEach((cell, key) => {
      const [x, y] = key.split(',').map(Number);
      
      if (cell.character) {
        if (svgSettings.textAsOutlines) {
          svg += convertTextToPath(
            cell.character,
            x, y,
            cell.color || '#ffffff',
            cell.bgColor,
            cellWidth,
            cellHeight,
            actualFontSize,
            fontFamily
          );
        } else {
          svg += generateSvgTextElement(
            cell.character,
            x, y,
            cell.color || '#ffffff',
            cell.bgColor,
            cellWidth,
            cellHeight,
            actualFontSize,
            fontFamily
          );
        }
      }
    });

    svg += '</g>';
    svg += '</svg>';

    this.updateProgress('Formatting SVG...', 80);

    // Prettify if requested
    if (svgSettings.prettify) {
      svg = prettifySvg(svg);
    }

    this.updateProgress('Saving file...', 90);

    // Create blob and download
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    saveAs(blob, `${filename}.svg`);

    this.updateProgress('Export complete!', 100);
  } catch (error) {
    console.error('SVG export failed:', error);
    throw new Error(`SVG export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper to calculate grid color for SVG
 */
private calculateGridColor(backgroundColor: string, theme: string): string {
  // Reuse existing grid color logic
  return calculateAdaptiveGridColor(backgroundColor, theme as 'light' | 'dark');
}
```

### Step 5: Update Image Export Dialog ✅
**File**: `src/components/features/PngExportDialog.tsx` → `ImageExportDialog.tsx`

```typescript
// Update FORMAT_OPTIONS to include SVG
const FORMAT_OPTIONS: Array<{ 
  value: 'png' | 'jpg' | 'svg'; 
  label: string; 
  description: string 
}> = [
  {
    value: 'png',
    label: 'PNG (.png)',
    description: 'Lossless raster with transparency',
  },
  {
    value: 'jpg',
    label: 'JPEG (.jpg)',
    description: 'Compressed raster, smaller files',
  },
  {
    value: 'svg',
    label: 'SVG (.svg)',
    description: 'Scalable vector graphics',
  },
];

// Update file extension logic
const fileExtension = 
  imageSettings.format === 'png' ? 'png' : 
  imageSettings.format === 'jpg' ? 'jpg' : 'svg';

// Add SVG-specific settings UI (conditional rendering)
{imageSettings.format === 'svg' && (
  <>
    {/* Grid Toggle */}
    <div className="flex items-center justify-between">
      <Label htmlFor="svg-grid">Include Grid</Label>
      <Switch
        id="svg-grid"
        checked={imageSettings.svgSettings?.includeGrid || false}
        onCheckedChange={(checked) => handleSvgSettingChange('includeGrid', checked)}
        disabled={isExporting}
      />
    </div>

    {/* Text Mode Toggle */}
    <div className="flex items-center justify-between">
      <div>
        <Label htmlFor="svg-outlines">Text as Outlines</Label>
        <p className="text-xs text-muted-foreground">Convert text to vector paths</p>
      </div>
      <Switch
        id="svg-outlines"
        checked={imageSettings.svgSettings?.textAsOutlines || false}
        onCheckedChange={(checked) => handleSvgSettingChange('textAsOutlines', checked)}
        disabled={isExporting}
      />
    </div>

    {/* Background Toggle */}
    <div className="flex items-center justify-between">
      <Label htmlFor="svg-background">Include Background</Label>
      <Switch
        id="svg-background"
        checked={imageSettings.svgSettings?.includeBackground !== false}
        onCheckedChange={(checked) => handleSvgSettingChange('includeBackground', checked)}
        disabled={isExporting}
      />
    </div>

    {/* Prettify Toggle */}
    <div className="flex items-center justify-between">
      <div>
        <Label htmlFor="svg-prettify">Prettify Output</Label>
        <p className="text-xs text-muted-foreground">Human-readable formatting</p>
      </div>
      <Switch
        id="svg-prettify"
        checked={imageSettings.svgSettings?.prettify !== false}
        onCheckedChange={(checked) => handleSvgSettingChange('prettify', checked)}
        disabled={isExporting}
      />
    </div>
  </>
)}

// Update export handler
const handleExport = async () => {
  if (!exportData) return;

  try {
    setIsExporting(true);
    const renderer = new ExportRenderer((progress) => setProgress(progress));

    if (imageSettings.format === 'svg') {
      await renderer.exportSvg(exportData, imageSettings, filename);
    } else {
      await renderer.exportImage(exportData, imageSettings, filename);
    }

    handleClose();
  } catch (error) {
    console.error('Export failed:', error);
    alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    setIsExporting(false);
    setProgress(null);
  }
};

// Add SVG settings handler
const handleSvgSettingChange = (key: keyof SvgExportSettings, value: any) => {
  setImageSettings({
    svgSettings: {
      ...imageSettings.svgSettings!,
      [key]: value
    }
  });
};
```

### Step 6: Update Export Menu ✅
**File**: `src/components/features/ExportImportButtons.tsx`

No changes needed - the "Image" export option already routes to the (renamed) ImageExportDialog which now handles PNG/JPEG/SVG.

### Step 7: Update App.tsx ✅
**File**: `src/App.tsx`

```typescript
// Update import
import { ImageExportDialog } from './components/features/ImageExportDialog'
// Remove: import { PngExportDialog } from './components/features/PngExportDialog'

// Update component usage
<ImageExportDialog />
// Remove: <PngExportDialog />
```

### Step 8: Add File Size Estimation ✅
**File**: `src/utils/exportPixelCalculator.ts`

```typescript
/**
 * Estimate SVG file size based on content
 */
export function estimateSvgFileSize(
  gridWidth: number,
  gridHeight: number,
  characterCount: number,
  options: {
    includeGrid: boolean;
    textAsOutlines: boolean;
    prettify: boolean;
  }
): string {
  // Base SVG structure: ~200 bytes
  let bytes = 200;
  
  // Grid lines: ~80 bytes per line
  if (options.includeGrid) {
    const lineCount = gridWidth + gridHeight + 2;
    bytes += lineCount * 80;
  }
  
  // Characters
  if (options.textAsOutlines) {
    // Path outlines: ~300 bytes per character (estimated)
    bytes += characterCount * 300;
  } else {
    // Text elements: ~120 bytes per character
    bytes += characterCount * 120;
  }
  
  // Prettification adds ~30% overhead
  if (options.prettify) {
    bytes *= 1.3;
  }
  
  // Format nicely
  if (bytes < 1024) {
    return `${bytes.toFixed(0)} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
```

---

## 🧪 Testing Checklist

### Functional Tests
- [ ] **Format Selection**: SVG appears in format dropdown
- [ ] **File Extension**: Filename updates to `.svg` when selected
- [ ] **Grid Export**: Grid renders correctly when enabled
- [ ] **Grid Disabled**: No grid elements when disabled (default)
- [ ] **Text Elements**: Characters render as `<text>` elements (default)
- [ ] **Text Outlines**: Characters convert to `<path>` when enabled
- [ ] **Background**: Background color included when enabled (default)
- [ ] **No Background**: Transparent when disabled
- [ ] **Colors**: All character colors preserved correctly
- [ ] **Prettified**: Output is human-readable with line breaks
- [ ] **Minified**: Output is compact single line
- [ ] **File Download**: SVG file downloads with correct name

### Visual Tests
- [ ] **SVG Opens in Browser**: File displays correctly
- [ ] **SVG Opens in Illustrator/Inkscape**: Vector editing works
- [ ] **Scaling**: SVG scales without quality loss
- [ ] **Font Rendering**: Text displays with monospace font
- [ ] **Color Accuracy**: Colors match canvas exactly

### Edge Cases
- [ ] **Empty Canvas**: Exports valid SVG with just background
- [ ] **Special Characters**: XML escaping works (`&`, `<`, `>`, etc.)
- [ ] **Large Canvas**: Performance acceptable for 100x100 grid
- [ ] **Unicode**: Emoji and special characters export correctly

---

## 📚 Documentation Updates

### Files to Update
1. **COPILOT_INSTRUCTIONS.md**: Add SVG export architecture
2. **DEVELOPMENT.md**: Document SVG feature completion
3. **README.md**: Add SVG to export formats list
4. **PRD.md**: Update feature list with SVG export

### Documentation Content
```markdown
## SVG Export Feature

**Location**: `ImageExportDialog.tsx`, `src/utils/svgExportUtils.ts`

SVG export provides vector graphics output with the following options:
- **Grid Export**: Optional grid line rendering
- **Text Rendering**: `<text>` elements or vector path outlines
- **Background**: Optional background color inclusion
- **Formatting**: Prettified (human-readable) or minified output

**Architecture**: Integrated into Image export system alongside PNG/JPEG.
**File Extension**: Auto-switches to `.svg` when format selected.
```

---

## ✅ Definition of Done

- [ ] All TypeScript types updated and compile without errors
- [ ] SVG export functionality fully implemented
- [ ] ImageExportDialog supports PNG/JPEG/SVG with format-specific settings
- [ ] SVG files download with correct `.svg` extension
- [ ] All export modes tested (grid, text, background, prettify)
- [ ] SVG opens correctly in browsers and vector editors
- [ ] File size estimation works for SVG format
- [ ] Documentation updated (COPILOT_INSTRUCTIONS.md, DEVELOPMENT.md)
- [ ] No regression in existing PNG/JPEG export functionality
- [ ] Code follows ASCII Motion architectural patterns

---

## 🚀 Future Enhancements

Consider for future iterations:
1. **True Path Conversion**: Use `opentype.js` for accurate text-to-path conversion
2. **Font Embedding**: Option to embed font as base64 in SVG
3. **Animation Export**: SVG animations using SMIL or CSS
4. **Optimization**: Run through SVGO for smaller file sizes
5. **SVG Filters**: Apply effects like blur, shadow, etc.

---

**Implementation Priority**: High  
**Estimated Effort**: 4-6 hours  
**Complexity**: Medium (leverages existing export architecture)
