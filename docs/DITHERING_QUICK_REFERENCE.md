# Dithering Quick Reference Guide

## What is Dithering?

Dithering is a technique used when converting images with many colors to a limited color palette. It creates the illusion of additional colors by arranging available colors in patterns that the eye blends together.

## Available Dithering Methods

### 1. Closest Match (No Dithering)
**When to use**: Pixel art, clean color mapping, limited palettes  
**Characteristics**: 
- No pattern, just nearest color
- Sharp color boundaries
- Fastest processing

**Best for**:
- ✓ Pixel art style
- ✓ Clean, crisp edges
- ✓ Simple graphics

### 2. Noise Dithering
**When to use**: Photographic images, organic textures  
**Characteristics**:
- Pseudo-random noise pattern
- Position-based (deterministic)
- Natural, organic look
- Breaks up color banding

**Best for**:
- ✓ Photographs
- ✓ Natural textures
- ✓ Gradients
- ✓ Avoiding visible patterns

**Pattern Example** (conceptual):
```
█ ░ ▒ █ ░ ▓ ▒ █
░ ▓ █ ░ ▒ █ ░ ▒
▒ █ ░ ▓ █ ▒ ▓ ░
█ ░ ▒ █ ░ ▓ ▒ █
```
Random-looking but consistent

### 3. Bayer 2×2
**When to use**: Retro/vintage effects, limited palettes  
**Characteristics**:
- 2×2 repeating matrix pattern
- Visible, structured dithering
- 4 distinct threshold levels
- Classic halftone look

**Best for**:
- ✓ Retro/vintage aesthetic
- ✓ 2-8 color palettes
- ✓ Newspaper/comic book look
- ✓ High contrast images

**Pattern Example** (2×2 matrix):
```
0 2   0 2   0 2   0 2
3 1   3 1   3 1   3 1
0 2   0 2   0 2   0 2
3 1   3 1   3 1   3 1
```
Checkerboard-like structure

**Visual representation** with 2 colors (█ = dark, ░ = light):
```
Gradient with Bayer 2×2:
100% █ █ █ █ █ █ █ █
75%  █ █ █ ░ █ █ █ ░
50%  █ ░ █ ░ █ ░ █ ░
25%  ░ █ ░ ░ ░ █ ░ ░
0%   ░ ░ ░ ░ ░ ░ ░ ░
```

### 4. Bayer 4×4
**When to use**: Professional halftone, smoother gradients  
**Characteristics**:
- 4×4 repeating matrix pattern
- Less visible than 2×2
- 16 distinct threshold levels
- Smoother color transitions

**Best for**:
- ✓ Professional halftone printing
- ✓ 8-16 color palettes
- ✓ Smooth gradients
- ✓ Medium-detail images

**Pattern Example** (4×4 matrix):
```
 0  8  2 10    0  8  2 10
12  4 14  6   12  4 14  6
 3 11  1  9    3 11  1  9
15  7 13  5   15  7 13  5
```
More threshold levels, finer pattern

**Visual representation** with 2 colors (█ = dark, ░ = light):
```
Gradient with Bayer 4×4:
100% █ █ █ █ █ █ █ █ █ █ █ █
75%  █ █ █ █ █ ░ █ █ █ █ █ ░
50%  █ ░ █ █ █ ░ █ ░ █ █ █ ░
25%  ░ █ ░ ░ ░ █ ░ █ ░ ░ ░ █
0%   ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░
```

### 5. By Index
**When to use**: Gradient effects, brightness-based mapping  
**Characteristics**:
- Maps colors by brightness
- No dithering, smooth gradients
- Uses palette like a gradient ramp

**Best for**:
- ✓ Gradient overlays
- ✓ Brightness-to-color mapping
- ✓ Stylized color effects

## Comparison Chart

| Method | Pattern Type | Visibility | Speed | Best Palette Size | Aesthetic |
|--------|-------------|------------|-------|-------------------|-----------|
| Closest Match | None | N/A | Fastest | Any | Clean, sharp |
| Noise Dithering | Pseudo-random | Low | Medium | 8-32 colors | Natural, organic |
| Bayer 2×2 | Ordered 2×2 | High | Fast | 2-8 colors | Retro, visible |
| Bayer 4×4 | Ordered 4×4 | Medium | Fast | 8-16 colors | Professional |
| By Index | Gradient | N/A | Fastest | Any | Stylized |

## Usage Tips

### For Different Image Types

**Photographs**:
1. First choice: Noise Dithering (with 16+ color palette)
2. Second choice: Bayer 4×4 (with 8-16 color palette)

**Pixel Art**:
1. First choice: Closest Match (clean pixels)
2. Second choice: By Index (for gradient effects)

**Logos/Graphics**:
1. First choice: Closest Match (sharp edges)
2. Second choice: Bayer 2×2 (retro look)

**Vintage/Retro Effects**:
1. First choice: Bayer 2×2 (visible pattern)
2. Second choice: Bayer 4×4 (subtle pattern)

### Palette Size Recommendations

**2-4 colors**: 
- Bayer 2×2 for patterns
- Closest Match for clean pixels

**5-8 colors**:
- Bayer 2×2 for retro look
- Noise Dithering for photos

**9-16 colors**:
- Bayer 4×4 for balanced results
- Noise Dithering for naturalistic look

**17+ colors**:
- Noise Dithering (dithering less necessary)
- Closest Match (often sufficient)

## Technical Notes

### Dither Strength
Currently hardcoded to `0.5` (50%). This controls how aggressive the dithering effect is:
- Lower values (0.0-0.3): Subtle dithering
- Medium values (0.4-0.6): Balanced dithering
- Higher values (0.7-1.0): Aggressive dithering

### Determinism
All dithering methods use position-based algorithms:
- Same image + same settings = identical output
- Re-importing produces consistent results
- Previews match final output

### Performance
Speed ranking (fastest to slowest):
1. Closest Match, By Index (no dithering calculation)
2. Bayer 2×2 (simple modulo and array lookup)
3. Bayer 4×4 (slightly more complex)
4. Noise Dithering (sine calculations)

Difference is negligible for most use cases.

## Examples in ASCII

### Gradient Comparison (Dark to Light)

**Closest Match** (no dithering):
```
████████████████████████
████████████████████████
░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░
```

**Noise Dithering**:
```
████████████████████████
██ █ ███ █████ ██ ██████
░█░ ░░ ░░░ ░ ░░░░ ░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░
```

**Bayer 2×2**:
```
████████████████████████
█ █ █ █ █ █ █ █ █ █ █ █
░█░█░█░█░█░█░█░█░█░█░█░█
░░░░░░░░░░░░░░░░░░░░░░░░
```

**Bayer 4×4**:
```
████████████████████████
█ █ █ █ █ █ █ █ █ █ █ █
░█ █ ░█ █ ░█ █ ░█ █ ░█ █
░ ░█░ ░█░ ░█░ ░█░ ░█░ ░█
░░░░░░░░░░░░░░░░░░░░░░░░
```

## Workflow Recommendations

### Standard Workflow
1. Import image with default "Closest Match"
2. If you see harsh color banding, try "Noise Dithering"
3. If you want a specific aesthetic, try Bayer 2×2 or 4×4
4. Adjust palette size if dithering looks too busy

### Quick Decision Tree
```
Does image have harsh color banding?
├─ No → Use "Closest Match" (clean, fast)
└─ Yes → Do you want a retro/vintage look?
    ├─ Yes → Use "Bayer 2×2" or "Bayer 4×4"
    └─ No → Use "Noise Dithering" (natural)
```

## Future Possibilities

Possible future enhancements:
- Floyd-Steinberg error diffusion dithering
- Atkinson dithering (lighter Floyd-Steinberg)
- Adjustable dither strength slider in UI
- Per-channel dithering (R, G, B independently)
- Custom dithering matrices
- Dithering presets ("Vintage Newspaper", "Halftone", etc.)
