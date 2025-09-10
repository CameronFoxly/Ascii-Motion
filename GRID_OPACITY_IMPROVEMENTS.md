# Grid Overlay Opacity Improvements

## Problem
The grid overlay in the ASCII Motion canvas was too harsh at 100% opacity on all background colors except pure black and white. This made the grid visually distracting when using colored backgrounds.

## Solution
Implemented dynamic grid color calculation with adaptive opacity based on background color luminance and saturation.

### Key Improvements

1. **Adaptive Opacity**: Grid opacity now adjusts automatically based on background color
2. **Luminance-Based Contrast**: Uses color luminance to determine if dark or light grid lines are needed
3. **Saturation Awareness**: Higher saturation backgrounds get slightly more opaque grids for better visibility
4. **Special Handling**: Pure black and white backgrounds maintain their optimized appearance

### Implementation Details

#### New Utility: `src/utils/gridColor.ts`
- `calculateAdaptiveGridColor()`: Main function for dynamic grid color calculation
- Luminance calculation based on standard color theory
- Handles edge cases (transparent, invalid colors)

#### Updated Canvas Renderer: `src/hooks/useCanvasRenderer.ts`
- Replaced binary color logic with adaptive calculation
- Grid color now updates automatically when background changes
- Maintains performance through memoized calculations

### Technical Details

#### Color Calculation Algorithm
1. **Parse** background color from hex to RGB
2. **Calculate** luminance using standard formula: `0.2126*R + 0.7152*G + 0.0722*B`
3. **Determine** grid color based on luminance:
   - Light backgrounds (luminance > 0.5): Dark grid with adaptive opacity
   - Dark backgrounds (luminance ≤ 0.5): Light grid with adaptive opacity
4. **Adjust** opacity based on color saturation for better visibility

#### Opacity Ranges
- **Pure black/white**: Full opacity (1.0) for crisp appearance
- **Colored backgrounds**: 0.12 - 0.25 opacity range
- **Transparent**: Very subtle (0.08 opacity)

### Benefits

1. **Better Visual Hierarchy**: Grid no longer competes with content
2. **Improved Usability**: Less eye strain when working with colored backgrounds
3. **Consistent Experience**: Grid remains visible but subtle across all color choices
4. **Professional Appearance**: Matches modern design tool standards

### Testing
You can test the improvement by:
1. Changing the canvas background color to various colors
2. Observing how the grid automatically adjusts its opacity
3. Comparing with pure black/white backgrounds which maintain their optimized appearance

The grid should now provide helpful visual guidance without being visually overwhelming on any background color.
