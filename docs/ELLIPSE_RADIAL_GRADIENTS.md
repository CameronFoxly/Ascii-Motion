# Elliptical Radial Gradients

## Overview
The gradient fill tool now supports elliptical radial gradients in addition to circular ones. This allows for more flexible gradient shapes that can stretch along different axes.

## Features

### Automatic Ellipse Control Point
- When creating a radial gradient, an ellipse control point is automatically generated
- The ellipse point is positioned perpendicular to the line from start to end point
- Default distance equals the radius (end point distance from start point)
- Creates a true circle when cell aspect ratio is 1:1

### Interactive Ellipse Control
- Red control point distinguishes ellipse control from standard end point (white)
- Drag the ellipse point to adjust the secondary radius of the elliptical gradient
- Independent movement allows for any ellipse shape and orientation

### Proportional Movement
- When dragging the end point, the ellipse point moves proportionally
- Maintains perpendicular relationship to preserve ellipse orientation
- Ensures consistent gradient behavior during radius adjustments

## Implementation Details

### Mathematical Model
- Uses standard ellipse distance formula: `sqrt((proj1² / r1²) + (proj2² / r2²))`
- Projects point coordinates onto both radius vectors (end point and ellipse point)
- Normalizes distances by respective radius lengths
- Maintains backward compatibility with circular gradients when no ellipse point is set

### State Management
- `ellipsePoint: { x: number; y: number } | null` added to GradientState
- Automatic calculation during point setting for radial gradients
- Reset behavior includes ellipse point cleanup
- Drag state supports `'ellipse'` type alongside existing controls

### UI Components
- InteractiveGradientOverlay renders ellipse control point for radial gradients only
- Red border color differentiates from white end point control
- Hit testing supports ellipse point interaction
- Drag handling includes ellipse point movement with proportional updates

## Usage

1. Select the Gradient Fill tool
2. Set gradient type to "Radial" 
3. Click to place start point
4. Click to place end point (creates automatic ellipse point)
5. Drag the red ellipse control point to adjust ellipse shape
6. Drag the white end point to adjust main radius (ellipse point follows proportionally)

## Technical Notes

### Aspect Ratio Handling
- Cell aspect ratio correction applies to circular gradients (no ellipse point)
- Elliptical gradients use raw coordinates for intentional distortion control
- Backward compatible with existing circular gradient behavior

### Performance
- Ellipse calculations only performed when ellipse point is present
- Fallback to optimized circular gradient math when ellipse point is null
- No performance impact on linear gradients

### Future Enhancements
- Visual ellipse outline preview during interaction
- Numerical input controls for precise ellipse dimensions
- Preset ellipse ratios (2:1, 3:2, golden ratio, etc.)
- Rotation angle control independent of control point positions