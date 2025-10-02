# Brush Tool User Guide

## Overview
The brush system provides advanced drawing capabilities for the pencil tool, allowing you to draw with customizable brush sizes and shapes that appear visually accurate on the canvas.

## Features

### 1. **Brush Size Control (1-20)**
Control the size of your brush stroke:
- **Slider**: Drag to adjust brush size from 1 to 20
- **Plus Button (+)**: Increase brush size by 1
- **Minus Button (-)**: Decrease brush size by 1
- **Size Display**: Current size shown numerically above controls

### 2. **Brush Shapes**
Choose from four different brush patterns:

#### **Circle** (○)
- Creates circular brush patterns
- Accounts for cell aspect ratio to appear visually circular
- Best for: Organic shapes, smooth curves, general drawing

#### **Square** (□)
- Creates square brush patterns  
- Compensates for aspect ratio to appear visually square
- Best for: Blocky designs, pixel art style, structured patterns

#### **Horizontal Line** (—)
- Creates horizontal line brush strokes
- Width determined by brush size
- Best for: Horizontal details, underlines, striping

#### **Vertical Line** (⋮)
- Creates vertical line brush strokes
- Height determined by brush size
- Best for: Vertical details, columns, borders

### 3. **Brush Preview Box**
The preview box (11x7 grid) shows exactly what will be drawn:
- **1:1 Scale**: Preview matches actual canvas cell dimensions
- **Real-time Update**: Changes instantly when adjusting size or shape
- **Aspect Ratio Accurate**: Shows true visual appearance accounting for cell proportions

### 4. **Canvas Hover Preview** ✨ New!
See your brush pattern on the canvas before you draw:
- **Live Preview**: Purple outline shows exactly which cells will be affected
- **Follows Cursor**: Preview updates as you move your mouse
- **Accurate Representation**: Shows the exact same pattern as the preview box
- **Smart Behavior**:
  - Appears only when pencil tool is active
  - Clears when mouse leaves canvas
  - Hides during active drawing
  - Updates immediately when changing brush settings

## How to Use

### Basic Drawing
1. **Select Pencil Tool**: Click pencil icon or press `P`
2. **Choose Brush Shape**: Click desired shape button (Circle, Square, Horizontal, Vertical)
3. **Adjust Size**: Use slider or +/- buttons to set size
4. **Preview**: Hover over canvas to see where brush will draw
5. **Draw**: Click or drag to draw with your brush

### Line Drawing
- **Hold Shift + Click**: Draw straight lines between points using current brush pattern
- **Preview Line**: While holding Shift, hover to see line preview before clicking

### Brush Settings Tips
- **Size 1**: Single cell (pencil-like precision)
- **Size 5-10**: Medium brush for general work
- **Size 15-20**: Large brush for filling areas quickly
- **Circle**: Most versatile shape for general use
- **Square**: Better for blocky, geometric designs
- **Lines**: Specialized for directional details

## Visual Examples

```
Size 1 Circle:    Size 3 Circle:    Size 5 Circle:
     @                @@@              @@@@@
                     @@@@@            @@@@@@@
                      @@@             @@@@@@@
                                       @@@@@
                                        @@@

Size 3 Square:    Size 3 Horizontal:  Size 3 Vertical:
    @@@               @@@                @
    @@@                                  @
    @@@                                  @
```

## Tool Behavior Integration

The brush system respects all existing tool behavior settings:

### **Affects Controls**
Located in a separate dark container above brush controls:
- **Character (T)**: Whether brush affects character content
- **Color (palette icon)**: Whether brush affects text color
- **Background (square icon)**: Whether brush affects background color

### **Drawing Behavior**
- Brush works with drag-to-draw functionality
- Continuous smooth strokes when dragging
- Gap-filling ensures no missed cells between strokes
- Undo/redo works per brush stroke

## Keyboard Shortcuts
- `P`: Select pencil tool
- `Shift + Click`: Draw straight line with brush
- `Cmd/Ctrl + Z`: Undo last brush stroke
- `Cmd/Ctrl + Shift + Z`: Redo brush stroke

## Technical Notes

### Aspect Ratio Handling
Canvas cells are narrower than they are tall (~0.6 width/height ratio). The brush system compensates:
- **Circles**: Stretched horizontally to appear circular
- **Squares**: More horizontal cells than vertical to appear square
- **Preview Accuracy**: Both preview box and canvas hover use identical calculations

### Performance
- Hover preview only recalculates when necessary
- Brush pattern cached until settings change
- Optimized for smooth drawing even with large brushes

## Troubleshooting

**Preview not showing?**
- Ensure pencil tool is selected
- Make sure mouse is over canvas
- Check that you're not actively drawing (preview hides during drawing)

**Brush looks elliptical instead of circular?**
- This is expected on export if the target font isn't monospace
- On canvas, circles should appear visually circular
- Aspect ratio is calculated for the canvas font metrics

**Preview doesn't match what I draw?**
- This should not happen - please report if you see this
- Both preview box and canvas hover use the same calculation

## Future Enhancements
The hover preview system is extensible and may be added to other tools:
- Rectangle tool: Preview bounds before drawing
- Ellipse tool: Preview shape before drawing
- Paint bucket: Preview fill area before applying
- Line tool: Preview line path from start point

---

*Last updated: October 2, 2025*
