# Scatter Effect - Blend Colors Feature

## Overview
Added a new "Blend Colors" option to the Scatter effect that blends the colors of swapped cells based on their displacement distance. This creates smoother, more organic color transitions when scattering cells.

## How It Works

### Color Blending Algorithm
When **Blend Colors** is enabled:

1. **Weight Calculation**: For each cell swap, the blend weight is calculated based on how far the cell moved from its original position:
   ```
   blendWeight = 1 - (actualDistance / maxDisplacement)
   ```
   - Cells closer to their original position get more of their original color (weight closer to 1)
   - Cells farther away get more of the destination cell's color (weight closer to 0)

2. **Canvas Background Color Integration**: When blending with empty cells:
   - Uses the canvas background color (from canvas settings) as the blend target
   - If canvas background is set to "transparent", falls back to black (#000000)
   - This ensures proper color blending on both light and dark backgrounds
   - Prevents cells from appearing too dark when the canvas has a light background

3. **Color Interpolation**: Both the text color and background color are blended using linear RGB interpolation:
   ```
   blendedColor = color1 + t * (color2 - color1)
   where t = 1 - blendWeight
   ```

4. **Transparent Handling**: The blending gracefully handles transparent colors:
   - If both colors are transparent, result is transparent
   - If one color is transparent, the non-transparent color is used
   - RGB interpolation only occurs when both colors are valid hex values

### Visual Effect
- **Without Blend Colors**: Characters swap positions exactly, maintaining their original colors
- **With Blend Colors**: Characters swap positions and their colors smoothly blend based on displacement distance, creating a more organic, motion-blur-like effect

## Implementation Details

### Files Modified

#### 1. `src/types/effects.ts`
Added `blendColors` boolean property to `ScatterEffectSettings`:
```typescript
export interface ScatterEffectSettings {
  strength: number;
  scatterType: 'noise' | 'bayer-2x2' | 'bayer-4x4' | 'gaussian';
  seed: number;
  blendColors: boolean; // NEW
}
```

#### 2. `src/constants/effectsDefaults.ts`
Added default value (disabled by default):
```typescript
export const DEFAULT_SCATTER_SETTINGS: ScatterEffectSettings = {
  strength: 50,
  scatterType: 'noise',
  seed: Math.floor(Math.random() * 10000),
  blendColors: false // NEW
};
```

#### 3. `src/utils/effectsProcessing.ts`
Enhanced `processScatterEffect()` function:
- Modified swap pairs to track displacement distance: `Array<[string, string, number]>`
- Added conditional color blending logic when `blendColors` is true
- **Canvas background color integration**: Accepts `canvasBackgroundColor` parameter
- When blending with empty cells, uses canvas background color instead of leaving colors unchanged
- Fallback to black (#000000) when canvas background is transparent
- Implemented `blendColorPair()` helper function for RGB interpolation
- Reused existing `hexToRgb()` and `rgbToHex()` utility functions

Key changes:
```typescript
// Function signature updated to accept canvas background color
async function processScatterEffect(
  cells: Map<string, Cell>,
  settings: ScatterEffectSettings,
  canvasBackgroundColor: string = '#000000'
): Promise<...>

// Calculate actual distance for blend weight
const distance = Math.sqrt(displacement.dx ** 2 + displacement.dy ** 2);
swapPairs.push([pos1, pos2, distance]);

// Determine effective background for empty cells
const effectiveCanvasBg = canvasBackgroundColor === 'transparent' ? '#000000' : canvasBackgroundColor;

// When applying swaps with blending enabled
const blendWeight = 1 - (distance / maxDisplacement);

// Blending with existing cell
const blendedCell = cell2 ? {
  ...cell1,
  color: blendColorPair(cell1.color, cell2.color, blendWeight),
  bgColor: blendColorPair(cell1.bgColor, cell2.bgColor, blendWeight)
} : {
  // Blending with empty cell - use canvas background color
  ...cell1,
  color: blendColorPair(cell1.color, effectiveCanvasBg, blendWeight),
  bgColor: blendColorPair(cell1.bgColor, effectiveCanvasBg, blendWeight)
};
```

Also updated:
- `processEffect()`: Added `canvasBackgroundColor` parameter (default '#000000')
- `processEffectOnFrames()`: Added `canvasBackgroundColor` parameter and passes it through

#### 4. `src/stores/effectsStore.ts`
Updated to retrieve and pass canvas background color:
```typescript
// Get canvas background color for blend operations
const canvasBackgroundColor = useCanvasStore.getState().canvasBackgroundColor;

// Pass to effect processing
const result = await processEffect(
  state.previewEffect,
  currentCells,
  effectSettings,
  canvasBackgroundColor
);
```

Updated both preview generation and effect application code paths to pass the canvas background color.

#### 5. `src/components/features/effects/ScatterEffectPanel.tsx`
Added UI toggle control:
- Imported `Switch` component from shadcn/ui
- Added `handleBlendColorsChange` callback handler
- Added toggle UI with label and description after the Pattern selector

```tsx
<div className="flex items-center justify-between space-x-2">
  <div className="space-y-0.5">
    <Label htmlFor="blend-colors" className="text-xs cursor-pointer">
      Blend Colors
    </Label>
    <p className="text-xs text-muted-foreground">
      Blend colors based on displacement distance
    </p>
  </div>
  <Switch
    id="blend-colors"
    checked={scatterSettings.blendColors}
    onCheckedChange={handleBlendColorsChange}
  />
</div>
```

## Usage

### For Users
1. Open the **Effects Panel** and select the **Scatter** effect
2. Configure your scatter settings (strength, pattern type, seed if applicable)
3. Toggle **Blend Colors** on to enable color blending
4. Observe the preview - colors now blend smoothly based on displacement
5. Click **Apply** to apply the effect to the canvas

### Pattern Behavior
The blend effect works with all scatter patterns:
- **Noise**: Creates smooth, organic color gradients
- **Bayer 2×2 / 4×4**: Creates ordered color transitions following the dither pattern
- **Gaussian**: Creates natural, bell-curve color distributions

## Technical Notes

### Performance
- Color blending adds minimal overhead (simple RGB interpolation)
- Blend calculations are only performed when `blendColors` is enabled
- Preview updates remain debounced at 300ms for smooth interaction

### Color Space
- Blending is performed in RGB color space
- Linear interpolation is used (no gamma correction)
- This is consistent with the existing gradient system implementation

### Edge Cases Handled
- Transparent colors don't interpolate (gracefully fall back to non-transparent color)
- Empty cell swaps now blend with canvas background color (not black)
- Canvas background set to "transparent" falls back to black for blending calculations
- Invalid hex colors fall back to original color
- Works correctly on both light and dark canvas backgrounds

## Future Enhancements (Potential)
- Add blend mode options (multiply, screen, overlay, etc.)
- Add blend strength slider (0-100% blend intensity)
- Consider HSL/HSV color space blending for more perceptually uniform results
- Add "blend characters" option to interpolate between character Unicode values

## Testing
- ✅ Blend toggle updates settings correctly
- ✅ Color blending applies during preview
- ✅ Color blending applies when effect is finalized
- ✅ Transparent colors handled gracefully
- ✅ Empty cell swaps blend with canvas background color
- ✅ Works correctly on light backgrounds (white/light gray)
- ✅ Works correctly on dark backgrounds (black/dark gray)
- ✅ Canvas background "transparent" falls back to black
- ✅ All scatter patterns work with blending
- ✅ No TypeScript errors
- ✅ Dev server compiles successfully
