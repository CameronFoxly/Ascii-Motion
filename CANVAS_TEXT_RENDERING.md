# Canvas Text Rendering Implementation

## Overview

This document outlines the final implementation for crisp, professional-quality text rendering in ASCII Motion's canvas editor. After extensive testing of multiple approaches, we've achieved optimal text quality that matches modern code editors like VS Code.

## Problem Statement

The original implementation suffered from blurry, poor-quality text rendering on the canvas compared to surrounding UI elements. Users reported that characters appeared fuzzy regardless of zoom level or font size.

## Approaches Tested

### 1. High-DPI Canvas Scaling ❌
- **Approach**: Render canvas at 2x resolution, scale down with CSS
- **Results**: Caused mouse coordinate offset issues, overly large canvas display
- **Issues**: Complex coordinate calculations, performance concerns

### 2. Pixel-Perfect Rendering ❌  
- **Approach**: Disable image smoothing, use `image-rendering: pixelated`
- **Results**: Text appeared chunky and pixelated, poor visual quality
- **Issues**: Unprofessional appearance, harsh edges

### 3. Crisp Edges Compromise ❌
- **Approach**: Use `image-rendering: crisp-edges` with moderate smoothing
- **Results**: Still produced rough, jagged text edges
- **Issues**: Not smooth enough for professional use

## Final Solution ✅

### Core Strategy
**Smooth Text Rendering with Layered Grid Background**

The optimal approach combines high-quality text antialiasing with a layered rendering system that places the grid behind content rather than overlaying it.

### Key Components

#### 1. CSS Configuration (`src/index.css`)
```css
canvas {
  /* Use auto rendering for smoothest text */
  image-rendering: auto;
  
  /* High quality font smoothing */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  
  /* Prevent blur from fractional positioning */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
```

#### 2. Canvas Context Setup (`src/utils/canvasDPI.ts`)
```typescript
export const setupTextRendering = (ctx: CanvasRenderingContext2D): void => {
  // Enable high-quality image smoothing for smooth text
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Enable font optimization
  ctx.textRendering = 'optimizeLegibility';
  ctx.fontKerning = 'normal';
  
  // Cross-browser smoothing
  ctx.mozImageSmoothingEnabled = true;
  ctx.webkitImageSmoothingEnabled = true;
  ctx.msImageSmoothingEnabled = true;
};
```

#### 3. Modern Font Stack (`src/utils/fontMetrics.ts`)
```typescript
const fontFamily = 'SF Mono, Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New"';
```

**Priority Order:**
1. **SF Mono** - macOS system monospace (excellent rendering)
2. **Monaco** - macOS classic monospace
3. **Inconsolata** - Popular web monospace font
4. **Roboto Mono** - Google's high-quality monospace
5. **Consolas** - Windows system monospace
6. **Courier New** - Universal fallback

#### 4. Layered Rendering System (`src/hooks/useCanvasRenderer.ts`)

**Rendering Order:**
1. **Background**: Canvas background color
2. **Grid Layer**: Continuous grid lines as background
3. **Onion Skin**: Previous/next frame overlays
4. **Content Layer**: Text characters and cell backgrounds
5. **Overlay Layer**: Selection highlights, cursors, etc.

```typescript
// Grid rendered as background layer
const drawGridBackground = useCallback((ctx: CanvasRenderingContext2D) => {
  if (!showGrid) return;
  
  ctx.strokeStyle = drawingStyles.gridLineColor;
  ctx.lineWidth = 1; // Sharp 1-pixel lines
  
  // Draw continuous grid lines across entire canvas
  for (let x = 0; x <= width; x++) {
    const lineX = Math.round(x * effectiveCellWidth + panOffset.x) + 0.5;
    ctx.beginPath();
    ctx.moveTo(lineX, panOffset.y);
    ctx.lineTo(lineX, height * effectiveCellHeight + panOffset.y);
    ctx.stroke();
  }
  // ... horizontal lines
}, [width, height, effectiveCellWidth, effectiveCellHeight, panOffset, drawingStyles, showGrid]);
```

#### 5. Pixel-Aligned Positioning

All drawing coordinates are rounded to prevent sub-pixel positioning:

```typescript
const drawCell = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, cell: Cell) => {
  // Round pixel positions to ensure crisp rendering
  const pixelX = Math.round(x * effectiveCellWidth + panOffset.x);
  const pixelY = Math.round(y * effectiveCellHeight + panOffset.y);
  const cellWidth = Math.round(effectiveCellWidth);
  const cellHeight = Math.round(effectiveCellHeight);
  
  // Text positioning with rounded coordinates
  const centerX = Math.round(pixelX + cellWidth / 2);
  const centerY = Math.round(pixelY + cellHeight / 2);
  
  ctx.fillText(cell.char, centerX, centerY);
}, [/* dependencies */]);
```

## Results

### Visual Quality
- ✅ **Smooth, readable text** - No pixelation or jagged edges
- ✅ **Professional appearance** - Matches VS Code and other editors
- ✅ **Subtle grid background** - Enhances without competing with content
- ✅ **Sharp overlays** - Crisp selection highlights and cursors

### Technical Benefits  
- ✅ **Accurate mouse coordinates** - No offset issues
- ✅ **Optimal performance** - Efficient layered rendering
- ✅ **Cross-browser compatibility** - Works across all modern browsers
- ✅ **Maintainable code** - Clean separation of rendering layers

### User Experience
- ✅ **Text editor feel** - Familiar, professional interface
- ✅ **Improved readability** - Easy to work with ASCII art
- ✅ **Visual hierarchy** - Grid supports rather than distracts from content

## Implementation Notes

### Grid Line Rendering
- **Line width**: 1 pixel for crisp lines
- **Positioning**: 0.5 pixel offset for sharp 1-pixel lines
- **Color**: Subtle transparency that doesn't overwhelm content
- **Method**: Continuous lines across canvas, not per-cell borders

### Text Rendering
- **Smoothing**: High-quality antialiasing enabled
- **Positioning**: All coordinates rounded to pixel boundaries
- **Font optimization**: `optimizeLegibility` and `fontKerning` enabled
- **Cross-browser**: Vendor-specific smoothing properties set

### Performance Optimizations
- **Layered rendering**: Grid drawn once as background
- **Rounded coordinates**: Prevents sub-pixel calculations
- **Efficient font stack**: Modern fonts with good rendering characteristics

## Maintenance

### Adding New Rendering Features
When adding new canvas rendering features:

1. **Follow the layer system**: Place new elements in appropriate rendering layer
2. **Round all coordinates**: Use `Math.round()` for pixel alignment
3. **Maintain text quality**: Don't disable smoothing for text rendering
4. **Test across browsers**: Verify rendering quality on different platforms

### Font Stack Updates
To update the font stack:

1. **Prioritize system fonts**: SF Mono on macOS, Consolas on Windows
2. **Include web fonts**: Popular choices like Inconsolata, Roboto Mono
3. **Maintain fallback**: Always include Courier New as final fallback
4. **Test rendering**: Verify quality across different fonts

### Performance Monitoring
Monitor for:
- Canvas rendering performance with large grids
- Memory usage with complex layer rendering
- Text rendering quality at different zoom levels
- Mouse coordinate accuracy during interaction

## Future Considerations

### Potential Improvements
1. **Dynamic font loading**: Load optimal fonts based on platform detection
2. **Zoom-dependent rendering**: Adjust techniques based on zoom level
3. **High-DPI detection**: Enhanced rendering for high-DPI displays
4. **Accessibility**: Text contrast and size optimization features

### Known Limitations
1. **Browser variations**: Some browsers may render fonts slightly differently
2. **Font availability**: Rendering quality depends on available system fonts
3. **Performance scaling**: Very large canvases may require optimization
4. **Mobile devices**: Touch interfaces may need specific optimizations

## Conclusion

The final implementation successfully achieves professional-quality text rendering that rivals modern code editors. The combination of smooth text antialiasing, layered grid rendering, and pixel-aligned positioning provides an optimal user experience for ASCII art creation and editing.

The approach balances visual quality, performance, and maintainability while ensuring accurate mouse interaction and cross-browser compatibility. This foundation supports future enhancements and provides a solid base for the ASCII Motion editor.
