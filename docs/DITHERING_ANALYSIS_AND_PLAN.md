# Dithering Analysis and Implementation Plan

## Current State Analysis

### Current Dithering Implementation

The media import feature currently has a "dithering" option for both text and background color mapping modes. Here's how it works:

**Location**: `src/utils/asciiConverter.ts` - `ColorMatcher.ditherColor()`

```typescript
static ditherColor(r: number, g: number, b: number, palette: string[], ditherStrength: number = 0.1): string {
  // Add some noise for dithering effect
  const noise = () => (Math.random() - 0.5) * ditherStrength * 255;
  const ditheredR = Math.max(0, Math.min(255, r + noise()));
  const ditheredG = Math.max(0, Math.min(255, g + noise()));
  const ditheredB = Math.max(0, Math.min(255, b + noise()));
  
  return this.findClosestColor(ditheredR, ditheredG, ditheredB, palette);
}
```

**Current Algorithm**: 
- Uses **random noise** to add variation to RGB values before finding closest color
- Random values are generated using `Math.random()` (not position-based)
- `ditherStrength` is currently hardcoded to `0.5` in MediaImportPanel
- The noise adds randomness to break up color banding

**Problems with Current Implementation**:
1. Uses pure randomness, not deterministic/position-based
2. Creates inconsistent results (re-processing same image produces different output)
3. Doesn't create structured dithering patterns (Floyd-Steinberg, Bayer, etc.)
4. The name "Dithering" is too generic - doesn't indicate it's noise-based

### Existing Bayer Dithering in Codebase

The gradient system (`src/utils/gradientEngine.ts`) already has Bayer dithering implementations:

**Bayer 2x2 Matrix**:
```
[0, 2]
[3, 1]
```

**Bayer 4x4 Matrix**:
```
[0,  8,  2,  10]
[12, 4,  14, 6]
[3,  11, 1,  9]
[15, 7,  13, 5]
```

**Algorithm**:
- Uses cell coordinates (x, y) to index into the matrix
- Creates ordered, deterministic dithering patterns
- Strength control (0-100) blends between no dithering and full dithering
- Position-based threshold determines which of two colors to use

**Noise Dithering in Gradient System**:
```typescript
const noise1 = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
const noise2 = Math.sin(x * 93.9898 + y * 47.233) * 25643.2831;
const noise = ((noise1 - Math.floor(noise1)) + (noise2 - Math.floor(noise2))) / 2;
```
- Uses pseudo-random noise based on **2D coordinates** (deterministic)
- Creates consistent results when re-processing
- Better than pure `Math.random()` for dithering

### How Dithering Fits into Import Feature

**Color Mapping Modes**:
1. **Closest Match** - Finds nearest color in palette using Euclidean distance
2. **Dithering** (current) - Adds random noise then finds closest
3. **By Index** - Maps colors by brightness to palette indices

**Integration Points**:
- `TextColorMappingSection.tsx` - UI for text color mapping mode selection
- `BackgroundColorMappingSection.tsx` - UI for background color mapping mode selection
- `asciiConverter.ts` - Core conversion logic that applies the algorithms
- `importStore.ts` - Settings storage for mapping modes

**Usage Flow**:
1. User selects mapping mode in UI (`'closest' | 'dithering' | 'by-index'`)
2. Settings stored in `importStore`
3. During conversion, `ASCIIConverter.convertFrame()` checks mode
4. Calls appropriate `ColorMatcher` method for each pixel

## Implementation Plan

### Goals
1. Rename "Dithering" to "Noise Dithering" for clarity
2. Add "Bayer 2x2" dithering option
3. Add "Bayer 4x4" dithering option
4. Make noise dithering deterministic (position-based like gradients)
5. Use same `ditherStrength` concept (currently hardcoded to 0.5)

### Technical Approach

#### 1. Update Type Definitions

**File**: `src/stores/importStore.ts`

Change mapping mode types from:
```typescript
textColorMappingMode: 'closest' | 'dithering' | 'by-index';
backgroundColorMappingMode: 'closest' | 'dithering' | 'by-index';
```

To:
```typescript
textColorMappingMode: 'closest' | 'noise-dither' | 'bayer2x2' | 'bayer4x4' | 'by-index';
backgroundColorMappingMode: 'closest' | 'noise-dither' | 'bayer2x2' | 'bayer4x4' | 'by-index';
```

Update default values from `'dithering'` to `'noise-dither'` (or keep as `'closest'`).

#### 2. Update UI Components

**Files**: 
- `src/components/features/TextColorMappingSection.tsx`
- `src/components/features/BackgroundColorMappingSection.tsx`

Update Select dropdown options:
```tsx
<SelectContent>
  <SelectItem value="closest" className="text-xs">
    Closest Match
  </SelectItem>
  <SelectItem value="noise-dither" className="text-xs">
    Noise Dithering
  </SelectItem>
  <SelectItem value="bayer2x2" className="text-xs">
    Bayer 2x2
  </SelectItem>
  <SelectItem value="bayer4x4" className="text-xs">
    Bayer 4x4
  </SelectItem>
  <SelectItem value="by-index" className="text-xs">
    By Index
  </SelectItem>
</SelectContent>
```

Update handler type signatures:
```typescript
const handleMappingModeChange = (mode: 'closest' | 'noise-dither' | 'bayer2x2' | 'bayer4x4' | 'by-index') => {
  // ...
}
```

#### 3. Update Conversion Logic

**File**: `src/utils/asciiConverter.ts`

##### Update ConversionSettings Interface:
```typescript
export interface ConversionSettings {
  // ...
  textColorMappingMode: 'closest' | 'noise-dither' | 'bayer2x2' | 'bayer4x4' | 'by-index';
  backgroundColorMappingMode: 'closest' | 'noise-dither' | 'bayer2x2' | 'bayer4x4' | 'by-index';
  // ...
}
```

##### Add New ColorMatcher Methods:

**Noise Dithering (position-based)**:
```typescript
static ditherColorNoise(
  r: number, g: number, b: number, 
  palette: string[], 
  ditherStrength: number,
  x: number, y: number
): string {
  // Position-based pseudo-random noise (deterministic)
  const noise1 = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  const noise2 = Math.sin(x * 93.9898 + y * 47.233) * 25643.2831;
  const noise = ((noise1 - Math.floor(noise1)) + (noise2 - Math.floor(noise2))) / 2;
  
  // Convert ditherStrength (0-1) to noise amplitude
  const amplitude = ditherStrength * 255;
  const offset = (noise - 0.5) * amplitude;
  
  const ditheredR = Math.max(0, Math.min(255, r + offset));
  const ditheredG = Math.max(0, Math.min(255, g + offset));
  const ditheredB = Math.max(0, Math.min(255, b + offset));
  
  return this.findClosestColor(ditheredR, ditheredG, ditheredB, palette);
}
```

**Bayer 2x2 Dithering**:
```typescript
static ditherColorBayer2x2(
  r: number, g: number, b: number,
  palette: string[],
  ditherStrength: number,
  x: number, y: number
): string {
  const bayer2x2 = [
    [0, 2],
    [3, 1]
  ];
  
  const matrixX = Math.abs(x) % 2;
  const matrixY = Math.abs(y) % 2;
  const threshold = bayer2x2[matrixY][matrixX] / 4; // Normalize to 0-1
  
  // Apply threshold to each color channel
  const offset = (threshold - 0.5) * ditherStrength * 255;
  
  const ditheredR = Math.max(0, Math.min(255, r + offset));
  const ditheredG = Math.max(0, Math.min(255, g + offset));
  const ditheredB = Math.max(0, Math.min(255, b + offset));
  
  return this.findClosestColor(ditheredR, ditheredG, ditheredB, palette);
}
```

**Bayer 4x4 Dithering**:
```typescript
static ditherColorBayer4x4(
  r: number, g: number, b: number,
  palette: string[],
  ditherStrength: number,
  x: number, y: number
): string {
  const bayer4x4 = [
    [0,  8,  2,  10],
    [12, 4,  14, 6],
    [3,  11, 1,  9],
    [15, 7,  13, 5]
  ];
  
  const matrixX = Math.abs(x) % 4;
  const matrixY = Math.abs(y) % 4;
  const threshold = bayer4x4[matrixY][matrixX] / 16; // Normalize to 0-1
  
  // Apply threshold to each color channel
  const offset = (threshold - 0.5) * ditherStrength * 255;
  
  const ditheredR = Math.max(0, Math.min(255, r + offset));
  const ditheredG = Math.max(0, Math.min(255, g + offset));
  const ditheredB = Math.max(0, Math.min(255, b + offset));
  
  return this.findClosestColor(ditheredR, ditheredG, ditheredB, palette);
}
```

##### Update convertFrame Method:

Replace the current dithering checks with mode-based dispatch:

```typescript
// Determine text (foreground) color
let color: string;
if (settings.enableTextColorMapping && settings.textColorPalette.length > 0) {
  switch (settings.textColorMappingMode) {
    case 'noise-dither':
      color = ColorMatcher.ditherColorNoise(
        adjustedR, adjustedG, adjustedB, 
        settings.textColorPalette, 
        settings.ditherStrength,
        x, y
      );
      break;
    case 'bayer2x2':
      color = ColorMatcher.ditherColorBayer2x2(
        adjustedR, adjustedG, adjustedB,
        settings.textColorPalette,
        settings.ditherStrength,
        x, y
      );
      break;
    case 'bayer4x4':
      color = ColorMatcher.ditherColorBayer4x4(
        adjustedR, adjustedG, adjustedB,
        settings.textColorPalette,
        settings.ditherStrength,
        x, y
      );
      break;
    case 'by-index':
      color = ColorMatcher.mapColorByIndex(adjustedR, adjustedG, adjustedB, settings.textColorPalette);
      break;
    default: // 'closest'
      color = ColorMatcher.findClosestColor(adjustedR, adjustedG, adjustedB, settings.textColorPalette);
  }
} else {
  color = settings.defaultTextColor;
}

// Same pattern for background color...
```

#### 4. Deprecate Old Method

Mark the old `ditherColor()` method as deprecated but keep it for backward compatibility:
```typescript
/**
 * @deprecated Use ditherColorNoise, ditherColorBayer2x2, or ditherColorBayer4x4 instead
 */
static ditherColor(r: number, g: number, b: number, palette: string[], ditherStrength: number = 0.1): string {
  // ... existing implementation
}
```

### Migration Strategy

**Existing Users**:
- Old settings with `textColorMappingMode: 'dithering'` will need migration
- Add migration logic in `importStore.ts` to convert `'dithering'` → `'noise-dither'`
- Or just update defaults and let users re-select their preference

**Default Setting**:
- Keep default as `'closest'` (safest, no dithering)
- Or change to `'noise-dither'` if we want to maintain current behavior

### Testing Plan

1. **Visual Testing**:
   - Import test image with each dithering mode
   - Verify Bayer patterns are visible and structured
   - Verify noise dithering looks similar to old dithering but is deterministic
   - Test with 2-color palette (black/white) to see dithering patterns clearly
   - Test with 8-color palette to see color blending

2. **Consistency Testing**:
   - Import same image twice with same settings
   - Verify identical output (especially for Bayer and noise modes)
   - Old random dithering would produce different results

3. **UI Testing**:
   - Verify all 5 options appear in dropdowns
   - Verify selection persists in session
   - Verify switching between modes works correctly

4. **Performance Testing**:
   - Measure if Bayer dithering is faster than noise (likely yes)
   - Ensure no significant slowdown from added options

## Summary

This enhancement will:
- ✅ Clarify that current "dithering" is noise-based
- ✅ Add industry-standard Bayer pattern dithering (2x2 and 4x4)
- ✅ Make all dithering deterministic (position-based)
- ✅ Give users more artistic control over color mapping
- ✅ Reuse proven algorithms from gradient system
- ✅ Maintain backward compatibility

The Bayer patterns are particularly useful for:
- Retro/vintage aesthetic (classic halftone printing look)
- Reducing file size in exports (structured patterns compress better)
- Creating specific artistic effects (ordered vs. random noise)
