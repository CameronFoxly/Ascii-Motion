# Effects System Developer Guide

## 🎯 **Adding New Effects to ASCII Motion**

This guide provides step-by-step instructions for developers to add new effects to the ASCII Motion effects system. Follow these patterns to ensure consistency with the existing codebase and user experience.

## 📋 **Prerequisites**

Before adding a new effect, ensure you understand:
- TypeScript and React with hooks
- Zustand state management patterns
- ASCII Motion's existing component structure
- Canvas rendering and cell manipulation

## 🏗️ **Step-by-Step Implementation**

### **Step 1: Define Effect Types**

Add your new effect to the type definitions:

```typescript
// src/types/effects.ts

// Add to the EffectType union
export type EffectType = 
  | 'levels' 
  | 'hue-saturation' 
  | 'remap-colors' 
  | 'remap-characters'
  | 'your-new-effect';  // Add your effect here

// Create settings interface for your effect
export interface YourNewEffectSettings {
  // Define all configurable properties
  intensity: number;
  mode: 'light' | 'medium' | 'heavy';
  enableFeature: boolean;
  colorRange: {
    min: string;
    max: string;
  };
  // ... other settings
}
```

### **Step 2: Add Default Settings**

Create default values for your effect:

```typescript
// src/constants/effectsDefaults.ts

export const DEFAULT_YOUR_NEW_EFFECT_SETTINGS: YourNewEffectSettings = {
  intensity: 50,
  mode: 'medium',
  enableFeature: true,
  colorRange: {
    min: '#000000',
    max: '#ffffff'
  }
};

// Add to the effect registry
export const AVAILABLE_EFFECTS = [
  // ... existing effects
  {
    id: 'your-new-effect' as const,
    name: 'Your New Effect',
    icon: YourEffectIcon, // Import from lucide-react
    description: 'Brief description of what your effect does'
  }
];
```

### **Step 3: Update Effects Store**

Integrate your effect into the central store:

```typescript
// src/stores/effectsStore.ts

import { DEFAULT_YOUR_NEW_EFFECT_SETTINGS } from '../constants/effectsDefaults';

export interface EffectsState {
  // ... existing state
  yourNewEffectSettings: YourNewEffectSettings;
  
  // ... existing properties
}

export const useEffectsStore = create<EffectsState & EffectsActions>((set, get) => ({
  // ... existing state
  yourNewEffectSettings: DEFAULT_YOUR_NEW_EFFECT_SETTINGS,
  
  // Add update action
  updateYourNewEffectSettings: (updates: Partial<YourNewEffectSettings>) => {
    set(state => ({
      yourNewEffectSettings: { ...state.yourNewEffectSettings, ...updates }
    }));
    
    // Trigger preview update if active
    const { isPreviewActive, previewEffect } = get();
    if (isPreviewActive && previewEffect === 'your-new-effect') {
      get().updatePreview();
    }
  },
  
  // Add reset functionality
  resetEffectSettings: (effectType: EffectType) => {
    switch (effectType) {
      // ... existing cases
      case 'your-new-effect':
        set({ yourNewEffectSettings: DEFAULT_YOUR_NEW_EFFECT_SETTINGS });
        break;
    }
  }
}));
```

### **Step 4: Create Effect Panel Component**

Build the UI component following established patterns:

```tsx
// src/components/features/effects/YourNewEffectPanel.tsx

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Slider } from '../../ui/slider';
import { Switch } from '../../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { useEffectsStore } from '../../../stores/effectsStore';
import { useCanvasStore } from '../../../stores/canvasStore';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';

export function YourNewEffectPanel() {
  const {
    yourNewEffectSettings,
    updateYourNewEffectSettings,
    resetEffectSettings,
    isPreviewActive,
    previewEffect,
    startPreview,
    stopPreview,
    updatePreview
  } = useEffectsStore();
  
  const { cells } = useCanvasStore();
  
  const isCurrentlyPreviewing = isPreviewActive && previewEffect === 'your-new-effect';
  
  // Auto-start preview when panel opens
  useEffect(() => {
    if (!isCurrentlyPreviewing) {
      startPreview('your-new-effect');
    }
    
    return () => {
      if (isCurrentlyPreviewing) {
        stopPreview();
      }
    };
  }, []);
  
  // Update preview when settings change
  useEffect(() => {
    if (isCurrentlyPreviewing) {
      updatePreview().catch(error => {
        console.error('Preview update failed:', error);
      });
    }
  }, [yourNewEffectSettings, isCurrentlyPreviewing, updatePreview]);
  
  // Toggle preview
  const handleTogglePreview = useCallback(() => {
    if (isCurrentlyPreviewing) {
      stopPreview();
    } else {
      startPreview('your-new-effect');
    }
  }, [isCurrentlyPreviewing, startPreview, stopPreview]);
  
  // Reset to defaults
  const handleReset = useCallback(() => {
    resetEffectSettings('your-new-effect');
  }, [resetEffectSettings]);
  
  // Setting update handlers
  const handleIntensityChange = useCallback((value: number[]) => {
    updateYourNewEffectSettings({ intensity: value[0] });
  }, [updateYourNewEffectSettings]);
  
  const handleModeChange = useCallback((mode: 'light' | 'medium' | 'heavy') => {
    updateYourNewEffectSettings({ mode });
  }, [updateYourNewEffectSettings]);
  
  const handleFeatureToggle = useCallback((enableFeature: boolean) => {
    updateYourNewEffectSettings({ enableFeature });
  }, [updateYourNewEffectSettings]);
  
  return (
    <div className="space-y-4">
      
      {/* Live Preview Toggle - Consistent across all effects */}
      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-blue-900 dark:text-blue-100">Live Preview</Label>
          <div className="text-xs text-blue-700 dark:text-blue-300">
            {isCurrentlyPreviewing ? 'Changes are shown on canvas' : 'Preview is disabled'}
          </div>
        </div>
        <Button
          onClick={handleTogglePreview}
          variant={isCurrentlyPreviewing ? "default" : "outline"}
          size="sm"
          className="h-8 gap-1"
        >
          {isCurrentlyPreviewing ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {isCurrentlyPreviewing ? 'On' : 'Off'}
        </Button>
      </div>
      
      {/* Main Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Your New Effect Settings</Label>
          <Button
            onClick={handleReset}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
        
        {/* Intensity Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <Label>Intensity</Label>
            <span className="text-muted-foreground">{yourNewEffectSettings.intensity}%</span>
          </div>
          <Slider
            value={[yourNewEffectSettings.intensity]}
            onValueChange={handleIntensityChange}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
        
        {/* Mode Selection */}
        <div className="space-y-2">
          <Label className="text-xs">Mode</Label>
          <Select value={yourNewEffectSettings.mode} onValueChange={handleModeChange}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="heavy">Heavy</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Feature Toggle */}
        <div className="flex items-center justify-between text-xs">
          <span>Enable Advanced Feature</span>
          <Switch
            checked={yourNewEffectSettings.enableFeature}
            onCheckedChange={handleFeatureToggle}
          />
        </div>
        
      </div>
      
    </div>
  );
}
```

### **Step 5: Add Processing Logic**

Implement the effect processing function:

```typescript
// src/utils/effectsProcessing.ts

// Add your processing function
function processYourNewEffect(
  cells: Cell[][],
  settings: YourNewEffectSettings
): Cell[][] {
  return cells.map(row =>
    row.map(cell => {
      // Your effect logic here
      let newColor = cell.color;
      let newChar = cell.char;
      
      // Example: Modify color based on intensity
      if (settings.enableFeature) {
        const intensity = settings.intensity / 100;
        
        // Apply your transformation logic
        switch (settings.mode) {
          case 'light':
            // Light processing
            break;
          case 'medium':
            // Medium processing
            break;
          case 'heavy':
            // Heavy processing
            break;
        }
      }
      
      return {
        ...cell,
        color: newColor,
        char: newChar
      };
    })
  );
}

// Add to main processing function
export async function processEffect(
  effect: EffectType,
  settings: any,
  cells: Cell[][],
  frameIndex?: number
): Promise<Cell[][]> {
  
  switch (effect) {
    // ... existing cases
    
    case 'your-new-effect':
      return processYourNewEffect(cells, settings as YourNewEffectSettings);
      
    default:
      throw new Error(`Unknown effect type: ${effect}`);
  }
}
```

### **Step 6: Register Effect Panel**

Add your panel to the main effects panel component:

```tsx
// src/components/features/EffectsPanel.tsx

import { YourNewEffectPanel } from './effects/YourNewEffectPanel';

// Add to the rendering logic
const renderEffectPanel = () => {
  switch (activeEffect) {
    // ... existing cases
    
    case 'your-new-effect':
      return <YourNewEffectPanel />;
      
    default:
      return null;
  }
};
```

## 🎨 **UX Pattern Guidelines**

### **Consistent UI Structure**
All effect panels should follow this structure:
1. **Live Preview Toggle** (blue section at top)
2. **Main Controls** (sliders, inputs, selects)  
3. **Advanced Options** (toggles, secondary controls)
4. **Reset Button** (top-right of sections)

### **Color Guidelines**
- **Primary Actions**: Use default button variant
- **Secondary Actions**: Use outline or ghost variants
- **Preview Section**: Always use blue theme (`bg-blue-50 dark:bg-blue-950/30`)
- **Borders**: Use `border-muted/30` for subtle separation

### **Accessibility**
- Include proper ARIA labels
- Ensure keyboard navigation works
- Provide tooltips for complex controls
- Use semantic HTML elements

### **Performance Considerations**
- Debounce rapid slider changes
- Use `useCallback` for all event handlers
- Minimize re-renders with `useMemo` when needed
- Handle async operations properly

## 🧪 **Testing Your Effect**

### **Manual Testing Checklist**
- [ ] Effect panel opens and closes correctly
- [ ] Live preview starts automatically
- [ ] All controls update settings and preview
- [ ] Reset button restores defaults
- [ ] Apply/Cancel buttons work correctly
- [ ] Timeline toggle affects all frames
- [ ] Undo/redo works after applying

### **Edge Cases**
- [ ] Empty canvas handling
- [ ] Large canvas performance
- [ ] Invalid color values
- [ ] Extreme setting values
- [ ] Rapid setting changes

### **Browser Testing**
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if possible)
- [ ] Mobile responsive behavior

## 📚 **Code Style Guidelines**

### **Naming Conventions**
- Effect types: `kebab-case` ('your-new-effect')
- Components: `PascalCase` (YourNewEffectPanel)
- Settings: `camelCase` (yourNewEffectSettings)
- Functions: `camelCase` (processYourNewEffect)

### **File Organization**
```
src/
├── types/effects.ts                    # Add type definitions
├── constants/effectsDefaults.ts        # Add defaults and registry
├── stores/effectsStore.ts             # Add store integration
├── utils/effectsProcessing.ts         # Add processing function
└── components/features/effects/
    └── YourNewEffectPanel.tsx         # Create panel component
```

### **Import Organization**
```tsx
// 1. React imports
import { useCallback, useEffect } from 'react';

// 2. UI component imports
import { Button } from '../../ui/button';

// 3. Store imports
import { useEffectsStore } from '../../../stores/effectsStore';

// 4. Icon imports
import { Eye, EyeOff } from 'lucide-react';

// 5. Type imports (if needed)
import type { YourNewEffectSettings } from '../../../types/effects';
```

## 🚀 **Advanced Patterns**

### **Canvas Analysis Integration**
If your effect needs to analyze canvas content:

```tsx
// In your effect panel component
const { analyzeCanvas, canvasAnalysis, isAnalyzing } = useEffectsStore();

useEffect(() => {
  analyzeCanvas();
}, [cells, analyzeCanvas]);

// Use analysis results
const canvasColors = canvasAnalysis?.uniqueColors || [];
const canvasCharacters = canvasAnalysis?.uniqueCharacters || [];
```

### **Complex State Management**
For effects with complex internal state:

```tsx
// Use local state for UI-only values
const [localUIState, setLocalUIState] = useState(defaultValue);

// Debounce expensive operations
const debouncedUpdate = useMemo(
  () => debounce((value: number) => {
    updateYourNewEffectSettings({ intensity: value });
  }, 100),
  [updateYourNewEffectSettings]
);
```

### **Custom Validation**
For effects requiring input validation:

```tsx
const validateAndUpdateSetting = useCallback((value: string, setting: keyof YourNewEffectSettings) => {
  // Validation logic
  if (isValidValue(value)) {
    updateYourNewEffectSettings({ [setting]: value });
  }
}, [updateYourNewEffectSettings]);
```

## ✅ **Final Checklist**

Before submitting your new effect:

- [ ] **Types Added**: Effect type and settings interface defined
- [ ] **Defaults Created**: Default settings and effect registry entry
- [ ] **Store Updated**: State, actions, and reset functionality
- [ ] **Panel Created**: Following established UX patterns
- [ ] **Processing Added**: Effect logic implemented and integrated
- [ ] **Registration Complete**: Panel added to main effects component
- [ ] **Testing Done**: Manual testing and edge case validation
- [ ] **Documentation Updated**: User guide and implementation docs
- [ ] **Code Review**: Style guidelines followed, imports organized
- [ ] **Performance Validated**: No memory leaks or performance regressions

Following these patterns ensures your new effect integrates seamlessly with ASCII Motion's effects system and provides users with a consistent, professional experience.