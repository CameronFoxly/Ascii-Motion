# Effects System User Guide

The ASCII Motion Effects System provides powerful, easy-to-use tools to transform your ASCII art with professional-quality effects. All effects feature live preview and intuitive interfaces designed for both beginners and advanced users.

## 🎯 **Quick Start**

### **Accessing Effects**
1. **Open Effects**: In the right sidebar, click the "Effects" section below the Color Palette
2. **Choose Effect**: Click any of the 5 effect buttons (Levels, Hue & Saturation, Remap Colors, Remap Characters, Scatter)  
3. **Live Preview**: Changes appear instantly on canvas with 80% opacity overlay
4. **Apply or Cancel**: Click "Apply" to make permanent, or "Cancel"/"X" to revert changes

### **Effect Panel Features**
- **Auto-Start Preview**: Preview begins automatically when opening any effect
- **Live Preview Toggle**: Blue section at top with On/Off button (Eye/EyeOff icon)
- **Timeline Toggle**: Apply effects to current frame or entire timeline  
- **Individual Resets**: Reset specific settings without affecting others
- **Keyboard Support**: Press Escape to cancel and close any effect panel

## 🎨 **Available Effects**

### **1. Levels Effect**
*Adjust brightness, contrast, and gamma for overall tonal correction*

**Controls**:
- **Brightness** (-100 to +100): Overall lightness adjustment
- **Contrast** (-100 to +100): Difference between light and dark areas
- **Gamma** (0.1 to 3.0): Non-linear brightness adjustment (default: 1.0)

**How to Use**:
1. Open Levels effect panel
2. Adjust Brightness slider for overall lightness
3. Adjust Contrast slider to increase/decrease tonal range
4. Fine-tune with Gamma slider for natural-looking adjustments
5. Watch live preview and click Apply when satisfied

**Best For**:
- Brightening dark ASCII art
- Adding punch to flat, low-contrast images
- Fine-tuning overall appearance

---

### **2. Hue & Saturation Effect**  
*Shift colors and adjust color intensity without affecting brightness*

**Controls**:
- **Hue** (-180° to +180°): Shifts all colors around the color wheel
- **Saturation** (-100% to +100%): Controls color intensity/vividness
- **Lightness** (-100% to +100%): Adjusts perceived brightness

**How to Use**:
1. Open Hue & Saturation effect panel
2. Drag Hue slider to shift color palette (red→green→blue→red)
3. Adjust Saturation to make colors more vivid or muted
4. Fine-tune with Lightness for brightness without losing color
5. Watch live preview and click Apply when satisfied

**Best For**:
- Creating color variations of the same artwork
- Adjusting mood (warm vs cool colors)
- Creating monochromatic or sepia effects
- Fixing color balance issues

---

### **3. Remap Colors Effect**
*Replace specific colors with new colors using visual color mapping*

**Features**:
- **Auto-Population**: Automatically detects all colors used in your canvas
- **Frequency Sorting**: Most-used colors appear first for easy access
- **Visual Interface**: From/To color swatches with arrow indicators
- **Color Picker Integration**: Click any "To" color to open advanced color picker
- **Hex Input**: Direct hex code entry (#FFFFFF) with validation
- **Individual Reset**: Reset each color mapping independently

**How to Use**:
1. Open Remap Colors effect panel  
2. Canvas colors automatically populate in From→To grid
3. Click any "To Color" swatch to open color picker
4. Or type hex codes directly in input fields  
5. Use individual reset buttons (↻) to reset specific mappings
6. Use main Reset All button to reset all colors
7. Click Apply to make changes permanent

**Best For**:
- Changing color schemes without redrawing
- Creating color variations for A/B testing
- Fixing individual color issues
- Adapting artwork for different backgrounds

---

### **4. Remap Characters Effect**
*Replace specific characters with new characters using visual character mapping*

**Features**:
- **Auto-Population**: Automatically detects all characters used in your canvas
- **Frequency Sorting**: Most-used characters appear first
- **Visual Interface**: From/To character buttons with arrow indicators  
- **Character Picker Integration**: Click any "To Character" to open character selector
- **Space Handling**: Space characters shown as '␣' for visibility
- **Individual Reset**: Reset each character mapping independently

**How to Use**:
1. Open Remap Characters effect panel
2. Canvas characters automatically populate in From→To grid
3. Click any "To Character" button to open character picker
4. Browse categories: Basic, Extended, Symbols, Math, etc.
5. Use individual reset buttons (↻) to reset specific mappings  
6. Use main Reset All button to reset all characters
7. Click Apply to make changes permanent

**Best For**:
- Changing ASCII art style (solid blocks ↔ outline characters)
- Creating variations with different character sets
- Replacing hard-to-read characters
- Converting between ASCII art conventions

---

### **5. Scatter Effect**
*Randomly scatter ASCII characters across the canvas with customizable patterns*

**Controls**:
- **Strength** (0-100): Controls maximum displacement distance (0 = no scatter, 100 = up to 10 cells)
- **Scatter Pattern**: Choose from 4 different scatter algorithms
- **Random Seed**: Deterministic seed for consistent, reproducible results

**Scatter Patterns**:
- **Noise (Random Smooth)**: Perlin-like noise with smooth, coherent displacement patterns
- **Bayer 2×2 (Ordered Pattern)**: Ordered dithering pattern using 2×2 matrix for structured scatter
- **Bayer 4×4 (Detailed Pattern)**: More detailed ordered pattern using 4×4 matrix for complex structure
- **Gaussian (Natural Distribution)**: Bell-curve distribution for organic, natural-looking scatter

**How to Use**:
1. Open Scatter effect panel
2. Adjust Strength slider to control scatter intensity
3. Select Scatter Pattern from dropdown menu
4. Optionally modify Random Seed (or click Shuffle icon for new seed)
5. Watch live preview update (debounced for performance)
6. Click Apply to make changes permanent

**Best For**:
- Creating glitch or distortion effects
- Adding visual noise for artistic effect
- Simulating signal interference or degradation
- Creating textured backgrounds from solid fills
- Generating organic randomness while maintaining structure

**Pattern Comparison**:
- **Noise**: Best for smooth, flowing distortions
- **Bayer 2×2**: Creates regular, grid-like patterns with predictable structure
- **Bayer 4×4**: More complex patterns with finer detail and variation
- **Gaussian**: Most natural-looking randomness, great for organic scatter

**Pro Tips**:
- **Use Same Seed**: Record your seed value to recreate exact scatter patterns
- **Low Strength**: Subtle scatter (10-30) creates realistic noise without destroying readability
- **High Strength**: Extreme scatter (70-100) for abstract or chaotic effects
- **Pattern Layering**: Apply scatter multiple times with different patterns for complex textures
- **Timeline Consistency**: Use same seed across frames for consistent animation scatter

## 💡 **Tips & Best Practices**

### **General Usage**
- **Start Small**: Make subtle adjustments first, then increase if needed
- **Use Live Preview**: Take advantage of real-time preview to see results instantly
- **Combine Effects**: Apply multiple effects in sequence for complex transformations
- **Save Frequently**: Apply effects you're happy with before experimenting further

### **Color Effects (Levels, Hue & Saturation)**
- **Levels First**: Apply Levels adjustments before Hue & Saturation for best results
- **Gamma Power**: Use Gamma for natural-looking brightness adjustments
- **Subtle Hue Shifts**: Small hue changes (±30°) often look more natural
- **Saturation Balance**: Too much saturation can make colors appear artificial

### **Remap Effects (Colors, Characters)**
- **Analyze First**: Let auto-population show you what's actually in your canvas
- **Frequency Focus**: Start with the most-used colors/characters for biggest impact
- **Test Combinations**: Try different character combinations for varied artistic styles
- **Preserve Contrast**: When remapping colors, maintain good contrast for readability

### **Timeline Effects**
- **Timeline Toggle**: Enable "Apply to entire timeline" for consistent effects across all frames
- **Preview Single Frame**: Leave toggle off to preview effect on current frame first
- **Performance**: Timeline effects take longer but ensure consistency across animation

## 🚀 **Advanced Workflows**

### **Color Scheme Creation**
1. Start with base artwork using placeholder colors
2. Use Remap Colors to systematically replace with final palette
3. Use Hue & Saturation for fine-tuning color mood
4. Apply Levels for final contrast adjustments

### **Style Transformation**
1. Create original artwork with basic characters
2. Use Remap Characters to experiment with different character sets
3. Try solid blocks for filled look, or line characters for outline style
4. Combine with color remapping for complete style transformation

### **Animation Consistency**
1. Enable "Apply to entire timeline" toggle
2. Apply effects to ensure consistency across all frames
3. Use Timeline preview to check smooth animation flow
4. Make frame-specific adjustments if needed

The Effects System is designed to enhance your creative workflow while maintaining the quality and precision that ASCII Motion is known for. Experiment with different combinations to discover unique artistic possibilities!
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