# ASCII Motion - Effects System Implementation Guide

## 🚨 **MANDATORY: This document follows the required documentation update protocol** 🚨

**Implementation Status**: Planning Phase  
**Date**: September 28, 2025  
**Phase**: Pre-implementation documentation (Required by COPILOT_INSTRUCTIONS.md)

## 📋 **Overview**

This document provides a comprehensive plan for implementing a collapsible Effects system in ASCII Motion's right side panel. The system will include overlay sidepanels with the same animation patterns as MediaImportPanel and GradientPanel, providing professional image editing effects for ASCII art canvases.

## 🎯 **Feature Requirements**

### **Core Effects List (Initial Implementation)**
1. **Levels** - Classic brightness/contrast controls with color range targeting
2. **Hue & Saturation** - Hue shift, saturation, and lightness adjustments with color range support
3. **Remap Colors** - Visual color replacement tool showing current canvas colors as swatches
4. **Remap Characters** - Character replacement tool showing current canvas characters as buttons

### **User Experience Requirements**
- **Collapsible section** under Color Palette in right panel with "Effects" header
- **Effect buttons** with leading icons and effect names
- **Overlay sidepanels** that slide in from right with MediaImportPanel/GradientPanel animation
- **Canvas targeting** - apply to entire canvas by default
- **Timeline targeting** - optional toggle to apply to entire timeline's canvas data
- **Live preview** during adjustment (optional)
- **Apply/Cancel** workflow for all effects

## 🏗️ **Architecture Design**

### **1. Store Architecture (useEffectsStore)**

Following the established Zustand patterns in ASCII Motion:

```typescript
// src/stores/effectsStore.ts
interface EffectsState {
  // UI State
  isOpen: boolean;                    // Panel visibility
  activeEffect: EffectType | null;    // Currently open effect panel
  applyToTimeline: boolean;           // Timeline vs canvas targeting
  
  // Effect Settings State
  levelsSettings: LevelsEffectSettings;
  hueSaturationSettings: HueSaturationEffectSettings;
  remapColorsSettings: RemapColorsEffectSettings;
  remapCharactersSettings: RemapCharactersEffectSettings;
  
  // Canvas Analysis Cache
  canvasColors: string[];             // Cached unique colors from canvas
  canvasCharacters: string[];         // Cached unique characters from canvas
  lastCanvasHash: string;            // For invalidating cache
  
  // Actions
  openEffectPanel: (effect: EffectType) => void;
  closeEffectPanel: () => void;
  setApplyToTimeline: (apply: boolean) => void;
  updateEffectSettings: (effect: EffectType, settings: Partial<any>) => void;
  resetEffectSettings: (effect: EffectType) => void;
  applyEffect: (effect: EffectType) => void;
  
  // Canvas Analysis
  analyzeCanvas: () => void;
  getUniqueColors: () => string[];
  getUniqueCharacters: () => string[];
}

type EffectType = 'levels' | 'hue-saturation' | 'remap-colors' | 'remap-characters';
```

### **2. Component Architecture**

#### **A. Main Effects Section (Right Panel Integration)**

```typescript
// src/components/features/EffectsSection.tsx
// Integrates into ColorPicker component structure
// Follows MainCharacterPaletteSection patterns

interface EffectsSectionProps {
  className?: string;
}

const EFFECT_DEFINITIONS = [
  {
    id: 'levels' as const,
    name: 'Levels',
    icon: BarChart3,
    description: 'Adjust brightness, contrast, and color ranges'
  },
  {
    id: 'hue-saturation' as const,
    name: 'Hue & Saturation',
    icon: Palette,
    description: 'Modify hue, saturation, and lightness'
  },
  {
    id: 'remap-colors' as const,
    name: 'Remap Colors',
    icon: RefreshCcw,
    description: 'Replace colors with visual color picker'
  },
  {
    id: 'remap-characters' as const,
    name: 'Remap Characters',
    icon: Type,
    description: 'Replace characters with visual character selector'
  }
];
```

#### **B. Overlay Panel System (Sliding Animation)**

```typescript
// src/components/features/EffectsPanel.tsx
// Follows MediaImportPanel and GradientPanel patterns exactly
// Fixed right-side overlay with slide animation

interface EffectsPanelProps {
  // No props needed - uses store state
}

// Panel Animation Pattern (from existing code)
const panelClasses = cn(
  "fixed inset-y-0 right-0 w-80 bg-background border-l border-border shadow-lg z-50",
  "flex flex-col overflow-hidden",
  PANEL_ANIMATION.TRANSITION,
  isOpen ? "translate-x-0" : "translate-x-full"
);
```

#### **C. Individual Effect Panels**

Each effect gets its own component with consistent structure:

```typescript
// src/components/features/effects/LevelsEffectPanel.tsx
// src/components/features/effects/HueSaturationEffectPanel.tsx  
// src/components/features/effects/RemapColorsEffectPanel.tsx
// src/components/features/effects/RemapCharactersEffectPanel.tsx

// Common Panel Structure:
// - Header with effect name and close button
// - Scrollable content area with collapsible sections
// - Footer with Apply to Timeline toggle, Cancel, and Apply buttons
```

### **3. Integration Points**

#### **A. Right Panel Integration (App.tsx)**

```typescript
// Add EffectsSection to ColorPicker component
<ColorPicker>
  {/* Existing color palette sections */}
  
  <div className="relative -mx-4 h-px">
    <Separator className="absolute inset-0" />
  </div>
  
  <EffectsSection />
</ColorPicker>

// Add EffectsPanel to overlay dialogs
<EffectsPanel />
<MediaImportPanel />
<GradientPanel />
```

#### **B. Canvas Processing Integration**

```typescript
// src/utils/effectsProcessor.ts
// Integrates with existing canvas operations

class EffectsProcessor {
  static applyLevels(
    canvasData: Map<string, Cell>, 
    settings: LevelsEffectSettings,
    targetRange?: ColorRange
  ): Map<string, Cell>
  
  static applyHueSaturation(
    canvasData: Map<string, Cell>,
    settings: HueSaturationEffectSettings,
    targetRange?: ColorRange
  ): Map<string, Cell>
  
  static remapColors(
    canvasData: Map<string, Cell>,
    colorMappings: Record<string, string>
  ): Map<string, Cell>
  
  static remapCharacters(
    canvasData: Map<string, Cell>,
    characterMappings: Record<string, string>  
  ): Map<string, Cell>
}
```

## 🎨 **UI/UX Design Patterns**

### **1. Effects Section Design**

```typescript
// Follows MainCharacterPaletteSection layout exactly
<Collapsible open={isEffectsSectionOpen} onOpenChange={setIsEffectsSectionOpen}>
  <CollapsibleHeader isOpen={isEffectsSectionOpen}>
    <div className="flex items-center gap-2">
      <Wand2 className="w-4 h-4" />
      Effects
    </div>
  </CollapsibleHeader>
  
  <CollapsibleContent className="collapsible-content">
    <div className="space-y-2">
      {EFFECT_DEFINITIONS.map(effect => (
        <Button
          key={effect.id}
          variant="outline"
          size="sm"
          onClick={() => openEffectPanel(effect.id)}
          className="w-full justify-start gap-2 h-8"
        >
          <effect.icon className="w-3 h-3" />
          {effect.name}
        </Button>
      ))}
    </div>
    
    {/* Timeline toggle - shown when effects are available */}
    <div className="mt-3 pt-2 border-t border-border/50">
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <Switch
          checked={applyToTimeline}
          onCheckedChange={setApplyToTimeline}
          size="sm"
        />
        <span>Apply to entire timeline</span>
      </label>
      <div className="text-xs text-muted-foreground mt-1">
        {applyToTimeline 
          ? 'Effects will be applied to all frames' 
          : 'Effects will be applied to current canvas only'
        }
      </div>
    </div>
  </CollapsibleContent>
</Collapsible>
```

### **2. Overlay Panel Animation**

Following exact patterns from MediaImportPanel and GradientPanel:

```typescript
// Animation state management (from GradientPanel.tsx)
const [shouldRender, setShouldRender] = useState(isOpen);
const [isAnimating, setIsAnimating] = useState(isOpen);

useEffect(() => {
  if (isOpen) {
    setShouldRender(true);
    requestAnimationFrame(() => {
      setIsAnimating(true);
    });
  } else if (shouldRender) {
    setIsAnimating(false);
    const timer = setTimeout(() => {
      setShouldRender(false);
    }, animationDurationMs);
    return () => clearTimeout(timer);
  }
}, [isOpen, shouldRender, animationDurationMs]);

// Render pattern
if (!shouldRender) return null;

return (
  <div className={cn(
    "fixed inset-y-0 right-0 w-80 bg-background border-l border-border shadow-lg z-50",
    PANEL_ANIMATION.TRANSITION,
    isAnimating ? "translate-x-0" : "translate-x-full"
  )}>
```

### **3. Effect Panel Layouts**

#### **Levels Effect Panel**
```typescript
// Sections: Input Levels, Output Levels, Color Range Targeting
<CollapsibleContent>
  {/* Input Levels */}
  <div className="space-y-3">
    <Label>Input Range</Label>
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs w-16">Shadows</Label>
        <Slider value={[shadowsInput]} onValueChange={handleShadowsInput} />
        <span className="text-xs w-8">{shadowsInput}</span>
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs w-16">Midtones</Label>
        <Slider value={[midtonesInput]} onValueChange={handleMidtonesInput} />
        <span className="text-xs w-8">{midtonesInput}</span>
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs w-16">Highlights</Label>
        <Slider value={[highlightsInput]} onValueChange={handleHighlightsInput} />
        <span className="text-xs w-8">{highlightsInput}</span>
      </div>
    </div>
  </div>
  
  {/* Output Levels */}
  <div className="space-y-3">
    <Label>Output Range</Label>
    <div className="flex items-center gap-2">
      <Label className="text-xs w-16">Min</Label>
      <Slider value={[outputMin]} onValueChange={handleOutputMin} />
      <span className="text-xs w-8">{outputMin}</span>
    </div>
    <div className="flex items-center gap-2">
      <Label className="text-xs w-16">Max</Label>
      <Slider value={[outputMax]} onValueChange={handleOutputMax} />
      <span className="text-xs w-8">{outputMax}</span>
    </div>
  </div>
  
  {/* Color Range Targeting */}
  <div className="space-y-2">
    <Label>Target Colors</Label>
    <Select value={colorRange} onValueChange={setColorRange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Colors</SelectItem>
        <SelectItem value="text">Text Colors Only</SelectItem>
        <SelectItem value="background">Background Colors Only</SelectItem>
        <SelectItem value="custom">Custom Range...</SelectItem>
      </SelectContent>
    </Select>
  </div>
</CollapsibleContent>
```

#### **Remap Colors Effect Panel**
```typescript
// Unique feature: Shows current canvas colors as swatches
<CollapsibleContent>
  <div className="space-y-3">
    <Label>Canvas Colors ({uniqueColors.length} found)</Label>
    <div className="grid grid-cols-6 gap-2">
      {uniqueColors.map(color => (
        <div key={color} className="space-y-1">
          {/* Original color swatch */}
          <div 
            className="w-8 h-6 rounded border border-border cursor-pointer"
            style={{ backgroundColor: color }}
            onClick={() => setRemapSource(color)}
            title={`Original: ${color}`}
          />
          <ArrowDown className="w-3 h-3 mx-auto text-muted-foreground" />
          {/* New color swatch (editable) */}
          <div 
            className="w-8 h-6 rounded border border-border cursor-pointer"
            style={{ backgroundColor: remapTargets[color] || color }}
            onClick={() => openColorPicker(color)}
            title={`New: ${remapTargets[color] || color}`}
          />
        </div>
      ))}
    </div>
    
    {/* Color picker integration */}
    <ColorPickerOverlay
      isOpen={colorPickerOpen}
      onOpenChange={setColorPickerOpen}
      title={`Replace ${remapSource}`}
      initialColor={remapTargets[remapSource] || remapSource}
      onColorChange={handleColorRemap}
      anchorPosition="effects-panel"
    />
  </div>
</CollapsibleContent>
```

#### **Remap Characters Effect Panel**
```typescript
// Similar to colors but with character buttons
<CollapsibleContent>
  <div className="space-y-3">
    <Label>Canvas Characters ({uniqueCharacters.length} found)</Label>
    <div className="grid grid-cols-8 gap-2">
      {uniqueCharacters.map(char => (
        <div key={char} className="space-y-1">
          {/* Original character button */}
          <Button 
            variant="outline"
            size="sm"
            className="w-6 h-6 p-0 font-mono text-xs"
            onClick={() => setRemapSource(char)}
            title={`Original: "${char}"`}
          >
            {char === ' ' ? '␣' : char}
          </Button>
          <ArrowDown className="w-3 h-3 mx-auto text-muted-foreground" />
          {/* New character button (editable) */}
          <Button 
            variant="outline"
            size="sm"
            className="w-6 h-6 p-0 font-mono text-xs"
            onClick={() => openCharacterPicker(char)}
            title={`New: "${remapTargets[char] || char}"`}
          >
            {(remapTargets[char] || char) === ' ' ? '␣' : (remapTargets[char] || char)}
          </Button>
        </div>
      ))}
    </div>
    
    {/* Character picker integration */}
    <CharacterPicker
      isOpen={characterPickerOpen}
      onOpenChange={setCharacterPickerOpen}
      onCharacterSelect={handleCharacterRemap}
      anchorPosition="effects-panel"
    />
  </div>
</CollapsibleContent>
```

## 🔧 **Implementation Phases**

### **Phase 1: Foundation (Store & Basic UI)**
- [ ] Create `useEffectsStore` with basic state management
- [ ] Create `EffectsSection` component with collapsible header
- [ ] Add effect buttons with icons and descriptions
- [ ] Integrate into right panel (ColorPicker component)
- [ ] Test collapsible behavior and timeline toggle

### **Phase 2: Overlay Panel System**
- [ ] Create `EffectsPanel` with slide animation matching MediaImportPanel
- [ ] Implement panel open/close transitions
- [ ] Add header with effect name and close button
- [ ] Create scrollable content area with footer
- [ ] Test panel animations and z-index layering

### **Phase 3: Canvas Analysis Utilities**
- [ ] Create `canvasAnalyzer.ts` utility for extracting unique colors/characters
- [ ] Implement caching system with canvas hash invalidation
- [ ] Add timeline analysis for multi-frame effects
- [ ] Test performance with large canvases and timelines

### **Phase 4: Individual Effect Panels**
- [ ] Implement `LevelsEffectPanel` with input/output sliders
- [ ] Create `HueSaturationEffectPanel` with color range targeting
- [ ] Build `RemapColorsEffectPanel` with visual color swatches
- [ ] Develop `RemapCharactersEffectPanel` with character buttons

### **Phase 5: Effects Processing Engine**
- [ ] Create `effectsProcessor.ts` with transformation algorithms
- [ ] Implement levels adjustment with brightness/contrast calculations
- [ ] Add hue/saturation manipulation with HSL color space conversion
- [ ] Build color/character remapping with efficient Map operations
- [ ] Add timeline processing for multi-frame effects

### **Phase 6: Integration & Polish**
- [ ] Connect panels to processing engine
- [ ] Add live preview during adjustments (optional)
- [ ] Implement apply/cancel workflow
- [ ] Add reset to defaults functionality
- [ ] Test with various canvas sizes and frame counts

### **Phase 7: Documentation & Testing**
- [ ] Update `COPILOT_INSTRUCTIONS.md` with Effects system patterns
- [ ] Update `DEVELOPMENT.md` with architecture decisions
- [ ] Create comprehensive testing checklist
- [ ] Document extension points for future effects

## 🚀 **Technical Implementation Details**

### **File Structure**
```
src/
├── stores/
│   └── effectsStore.ts                     # Main effects state management
├── components/
│   └── features/
│       ├── EffectsSection.tsx              # Right panel integration
│       ├── EffectsPanel.tsx                # Main overlay panel
│       └── effects/                        # Individual effect panels
│           ├── LevelsEffectPanel.tsx
│           ├── HueSaturationEffectPanel.tsx  
│           ├── RemapColorsEffectPanel.tsx
│           └── RemapCharactersEffectPanel.tsx
├── utils/
│   ├── canvasAnalyzer.ts                   # Canvas color/character extraction
│   ├── effectsProcessor.ts                 # Effect transformation algorithms
│   └── colorSpaceConversions.ts           # RGB/HSL/HSV utilities
├── types/
│   └── effects.ts                          # Effect-related TypeScript types
└── constants/
    └── effectsDefaults.ts                  # Default effect settings
```

### **Performance Considerations**
- **Canvas Analysis Caching**: Cache unique colors/characters with hash-based invalidation
- **Efficient Processing**: Use Map operations for O(1) lookups during remapping
- **Timeline Batching**: Process frames in chunks to avoid blocking UI
- **Memory Management**: Clear effect previews and temporary data when panels close

### **Accessibility Features**
- **Keyboard Navigation**: All effect controls accessible via keyboard
- **Color Blind Support**: Include color names/hex values in tooltips
- **Screen Reader Support**: Proper ARIA labels for all interactive elements
- **Focus Management**: Proper focus handling when panels open/close

## 🔗 **Integration with Existing Systems**

### **Canvas Store Integration**
```typescript
// useCanvasStore extends existing functionality
interface CanvasState {
  // ... existing state
  
  // Effects integration
  applyEffectToCanvas: (processor: EffectProcessor) => void;
  previewEffect: (processor: EffectProcessor, temporary: boolean) => void;
  revertPreview: () => void;
}
```

### **Animation Store Integration**  
```typescript
// useAnimationStore extends for timeline effects
interface AnimationState {
  // ... existing state
  
  // Effects integration
  applyEffectToTimeline: (processor: EffectProcessor) => void;
  applyEffectToFrameRange: (processor: EffectProcessor, start: number, end: number) => void;
}
```

### **Tool Store Integration**
```typescript
// History system integration for undo/redo
interface EffectAction extends HistoryAction {
  type: 'EFFECT_APPLIED';
  effectType: EffectType;
  settings: any;
  targetScope: 'canvas' | 'timeline';
  affectedFrames?: number[];
}
```

## ✅ **Success Criteria**

### **Functional Requirements**
- [ ] Effects section appears in right panel with collapsible behavior
- [ ] Effect buttons launch overlay panels with proper animations
- [ ] All four initial effects work correctly with canvas data
- [ ] Timeline toggle applies effects to all frames when enabled
- [ ] Color/character remap effects show actual canvas content
- [ ] Apply/Cancel workflow preserves user control

### **Performance Requirements**  
- [ ] Canvas analysis completes in <100ms for typical canvases
- [ ] Timeline effects complete in <5s for 50-frame animations
- [ ] Panel animations are smooth (60fps) without frame drops
- [ ] Memory usage remains reasonable during effect processing

### **UX Requirements**
- [ ] Effects follow established ASCII Motion design patterns
- [ ] Panel animations match MediaImportPanel/GradientPanel exactly
- [ ] Tooltips and descriptions provide clear guidance
- [ ] Effects can be easily extended with new types in future

## 🔧 **Extension Points for Future Effects**

The system is designed for easy extension:

```typescript
// Adding new effects requires:
// 1. Add effect type to EffectType union
// 2. Add settings interface to EffectsState
// 3. Create effect panel component
// 4. Add effect definition to EFFECT_DEFINITIONS
// 5. Implement processor function

// Example future effects:
// - Blur/Sharpen
// - Noise/Dithering  
// - Color Quantization
// - ASCII Density Remapping
// - Character Style Transformations (upper/lower case)
// - Frame-to-Frame Effects (motion blur, trails)
```

---

## 📋 **Next Steps**

1. **Review and approve** this implementation plan
2. **Begin Phase 1** with store and basic UI implementation
3. **Iterate** through phases with testing at each step
4. **Document** architectural decisions in COPILOT_INSTRUCTIONS.md
5. **Maintain** consistent patterns with existing codebase

This comprehensive plan ensures the Effects system integrates seamlessly with ASCII Motion's existing architecture while providing a professional, extensible foundation for future enhancements.