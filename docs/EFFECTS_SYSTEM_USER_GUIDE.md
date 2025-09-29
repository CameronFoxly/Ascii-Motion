# Effects System User Guide

The ASCII Motion Effects System provides powerful tools to enhance and transform your ASCII art with professional-quality effects. This guide covers all features and provides usage examples.

## Overview

The Effects system includes four main effect types:
- **Levels**: Adjust brightness, contrast, and color ranges
- **Hue & Saturation**: Modify hue, saturation, and lightness  
- **Remap Colors**: Replace specific colors with new colors
- **Remap Characters**: Replace specific characters with new characters

## Accessing Effects

1. **Open the Effects Panel**: In the right sidebar, expand the "Effects" section below the color palette
2. **Choose an Effect**: Click any of the four effect buttons to open the effect panel
3. **Live Preview**: Effects automatically show a live preview on the canvas
4. **Apply or Cancel**: Use the Apply button to make changes permanent, or Cancel to revert

## Effect Types

### 1. Levels Effect

**Purpose**: Adjust the brightness and contrast of your ASCII art by controlling input and output color ranges.

**Controls**:
- **Shadows Input** (0-255): Controls the darkest colors
- **Midtones Input** (0-128-255): Controls middle brightness colors  
- **Highlights Input** (0-255): Controls the brightest colors
- **Output Min/Max** (0-255): Sets the final color range

**Usage Example**:
1. Open Levels effect
2. Drag Shadows Input right to brighten dark colors
3. Drag Highlights Input left to darken bright colors  
4. Adjust Output Min/Max to limit the final color range
5. Click Apply to save changes

**Tips**:
- Use for increasing contrast in faded ASCII art
- Great for making colors more vibrant
- The live preview shows changes instantly

### 2. Hue & Saturation Effect

**Purpose**: Modify the color properties of your ASCII art without changing brightness.

**Controls**:
- **Hue** (-180° to +180°): Shifts colors around the color wheel
- **Saturation** (-100% to +100%): Controls color intensity
- **Lightness** (-100% to +100%): Controls brightness

**Usage Example**:
1. Open Hue & Saturation effect
2. Drag Hue slider to change colors (red → green → blue → red)
3. Increase Saturation to make colors more vivid
4. Adjust Lightness to brighten or darken overall
5. Click Apply to save changes

**Tips**:
- Perfect for color scheme changes
- Use negative saturation to create grayscale effects
- Hue changes affect all colors uniformly

### 3. Remap Colors Effect

**Purpose**: Replace specific colors in your ASCII art with different colors.

**Features**:
- **Canvas Color Picking**: Click any color in the analysis section to select it
- **Color Mappings**: Define multiple from→to color relationships
- **Match Options**: 
  - Exact color match (recommended)
  - Include transparent colors

**Usage Example**:
1. Open Remap Colors effect
2. In the canvas analysis, click a color you want to change
3. Choose a replacement color using the color picker
4. Click "Add Mapping" to create the rule
5. Repeat for additional colors
6. Click Apply to save all mappings

**Tips**:
- Great for changing color schemes
- Use canvas color picking for exact matches
- You can create multiple mappings at once
- Remove unwanted mappings with the X button

### 4. Remap Characters Effect  

**Purpose**: Replace specific characters in your ASCII art with different characters.

**Features**:
- **Canvas Character Picking**: Click any character in the analysis section
- **Character Mappings**: Define from→to character relationships
- **Preserve Spacing**: Keep spaces and tabs unchanged (recommended)

**Usage Example**:
1. Open Remap Characters effect
2. In the canvas analysis, click a character you want to change
3. Type the replacement character in the "To Character" field
4. Click "Add Mapping" to create the rule
5. Repeat for additional characters
6. Click Apply to save all mappings

**Tips**:
- Perfect for changing ASCII art style (e.g., dots to stars)
- Enable "Preserve Spacing" to maintain layout
- Characters are limited to single characters only
- Great for converting between different ASCII character sets

## Live Preview System

The live preview system shows effect changes on your canvas in real-time without modifying your actual data.

**How it Works**:
1. **Auto-Start**: Preview automatically starts when you open an effect panel
2. **Real-Time Updates**: Changes update immediately as you adjust settings
3. **Non-Destructive**: Your original canvas data is never modified until you Apply
4. **Toggle Control**: Use the preview toggle button to turn preview on/off

**Preview Controls**:
- **Live Preview Toggle**: Blue section in each effect panel
- **On State**: Shows "Changes are shown on canvas" 
- **Off State**: Shows "Preview is disabled"
- **Eye Icon**: Indicates preview status

## Application Modes

### Single Frame Mode (Default)
- Effects apply only to the current canvas/frame
- Best for static ASCII art or individual frame editing
- Changes appear immediately

### Timeline Mode  
- Effects apply to all frames in your animation
- Toggle "Apply to entire timeline" at the bottom of effect panels
- Useful for consistent effects across animations
- Processing may take longer for complex animations

## Canvas Analysis

Each effect panel includes intelligent canvas analysis:

**Color Analysis** (Levels, Hue & Saturation, Remap Colors):
- Shows unique colors found in your canvas
- Displays usage frequency for each color
- Click colors to select them for remapping
- Provides statistics like fill percentage

**Character Analysis** (Remap Characters):  
- Shows unique characters found in your canvas
- Displays usage frequency for each character
- Click characters to select them for remapping
- Special display for spaces (shown as ␣)

## History and Undo/Redo

The Effects system is fully integrated with ASCII Motion's history system:

- **Undo Support**: Use Ctrl+Z (Cmd+Z on Mac) to undo effect applications
- **Redo Support**: Use Ctrl+Y (Cmd+Y on Mac) to redo undone effects  
- **History Tracking**: Each effect application creates a history entry
- **State Preservation**: Canvas and animation state is fully preserved

## Performance Tips

- **Preview Performance**: Preview updates happen in real-time, so complex effects on large canvases may be slower
- **Timeline Effects**: Applying to entire timeline processes all frames - expect longer processing times
- **Canvas Size**: Larger canvases will take longer to process
- **Color/Character Count**: More unique colors/characters mean longer analysis times

## Keyboard Shortcuts

- **Ctrl+Z / Cmd+Z**: Undo last effect application  
- **Ctrl+Y / Cmd+Y**: Redo undone effect
- **Escape**: Close current effect panel (cancels preview)

## Troubleshooting

**Preview not showing changes**:
- Check that Live Preview is enabled (blue toggle section)
- Verify your settings are actually different from defaults
- Try toggling preview off and on

**Effect not applying**:
- Ensure you have canvas data to apply effects to
- Check that you're not trying to apply to empty canvas
- Verify timeline mode is set correctly for your needs

**Performance issues**:
- Turn off preview for large canvases while adjusting settings
- Apply effects to individual frames instead of entire timeline
- Close other applications to free up system resources

## Best Practices

1. **Use Preview**: Always preview effects before applying
2. **Start Small**: Test effects on small sections first  
3. **Save Often**: Save your project before applying complex effects
4. **Experiment**: Try combining multiple effects for unique results
5. **Canvas Analysis**: Use the color/character picking features for precise control
6. **History**: Remember you can always undo - don't be afraid to experiment!

## Advanced Techniques

### Color Scheme Changes
1. Use Remap Colors to replace primary colors
2. Follow with Hue & Saturation for fine-tuning
3. Apply Levels for final contrast adjustments

### Character Style Conversion  
1. Identify common characters with Remap Characters analysis
2. Map to desired style (e.g., geometric to organic shapes)
3. Use Preserve Spacing to maintain layout

### Animation Effects
1. Set "Apply to entire timeline" for consistent effects
2. Preview on individual frames first
3. Consider performance impact on complex animations

---

The Effects System transforms ASCII Motion into a powerful digital art tool. Experiment with different combinations and settings to create unique visual effects!