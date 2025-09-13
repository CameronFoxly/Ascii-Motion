# Color Palette System Overhaul - Implementat## Phase 5: Import/Export System
**Status: ✅ Complete**
- [x] Create import dialog with drag-and-drop file upload
- [x] Add JSON validation and error handling  
- [x] Create export dialog with file download
- [x] Add palette preview in import/export flows
- [x] Integrate with ColorPicker component

**Implementation Details:**
- **ImportPaletteDialog.tsx**: Full JSON validation, file upload, drag-and-drop, error handling, palette preview
- **ExportPaletteDialog.tsx**: JSON export, file download, clipboard copy, palette preview
- **Integration**: Connected to ColorPicker import/export buttons
- **Validation**: Comprehensive JSON validation with detailed error messageslan

## Project Overview

This document outlines the complete overhaul of the color palette system in ASCII Motion, transforming it from a simple ANSI color grid to a comprehensive palette management system similar to Photoshop's color workflow.

## Current System Analysis

### Current State (After Git Revert)
- **Colors**: Simple ANSI_COLORS object with 17 predefined colors (16 ANSI + transparent)
- **UI**: Basic Text/BG tabs with 6-column color grid
- **Selection**: Direct color value assignment (`selectedColor`/`selectedBgColor`)
- **No palette management**: Fixed ANSI colors only
- **No color editing**: Static color values

### Current Files
```
src/
├── components/features/ColorPicker.tsx     # Simple ANSI color grid
├── constants/colors.ts                     # ANSI_COLORS definition
└── stores/toolStore.ts                     # selectedColor/selectedBgColor
```

## Design Requirements Summary

### 1. **Photoshop-Style Layout**
- **Large foreground/background color squares** above the palette section
- **Palette/swatches section** below with dropdown selector and color grid
- Click squares to open advanced color picker overlay

### 2. **Advanced Color Picker Overlay (Reusable Component)**
- Full HSV, RGB, HEX controls with real-time sync
- Color wheel for visual color selection  
- Eyedropper tool for picking colors from screen
- Recent colors history
- Current vs. new color comparison preview
- No alpha/transparency controls

### 3. **Palette Management System**
- **Preset palettes**: ANSI, Web-safe, Material Design, Retro/vintage, Artist-focused
- **Custom palette creation**: "Custom..." option appears when editing presets
- **Drag-and-drop reordering** with visual feedback
- **Single-click select, double-click edit** workflow
- **Management buttons**: left/right arrows, settings icon, add/remove

### 4. **Import/Export System**
- **Simple JSON format**: `{"name": "My Palette", "colors": ["#ff0000", "#00ff00", ...]}`
- **Visual preview** before import/export
- **Validation with error handling** for malformed files
- **File naming** for exports

### 5. **Transparent Color Handling**
- **Background only**: Transparent appears first in background palettes always
- **System-managed**: Outside custom palette export/import
- **No custom transparent**: Users cannot create transparent variants

## Technical Architecture

### New File Structure
```
src/
├── components/features/
│   ├── ColorPicker.tsx                    # Enhanced main component
│   ├── ColorPickerOverlay.tsx             # Advanced color picker modal
│   ├── ForegroundBackgroundSelector.tsx   # Large color squares
│   ├── PaletteSelector.tsx                # Dropdown + management
│   ├── PaletteSwatches.tsx                # Color grid with drag-drop
│   ├── RecentColors.tsx                   # Color history component
│   └── ColorImportExport.tsx              # Import/export dialogs
├── stores/
│   └── paletteStore.ts                    # Palette state management
├── types/
│   └── palette.ts                         # Type definitions
├── constants/
│   └── defaultPalettes.ts                 # Preset palette definitions
├── utils/
│   ├── colorConversion.ts                 # HSV/RGB/HEX conversions
│   ├── paletteValidation.ts               # JSON validation
│   └── colorHistory.ts                    # Recent colors management
└── hooks/
    ├── useColorPicker.ts                  # Color picker state
    ├── usePaletteManagement.ts            # Palette operations
    └── useColorHistory.ts                 # Recent colors logic
```

### Type Definitions

```typescript
// Core types
export interface PaletteColor {
  id: string;
  value: string; // hex color
  name?: string;
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: PaletteColor[];
  isPreset: boolean;
  isCustom: boolean;
}

export interface ColorPickerState {
  isOpen: boolean;
  mode: 'foreground' | 'background';
  currentColor: string;
  previewColor: string;
  recentColors: string[];
}

// Export format
export interface PaletteExportFormat {
  name: string;
  colors: string[];
}
```

### Store Architecture

```typescript
interface PaletteStore {
  // State
  palettes: ColorPalette[];
  activePaletteId: string;
  selectedColorId: string | null;
  recentColors: string[];
  
  // UI State
  colorPickerState: ColorPickerState;
  dragState: { isDragging: boolean; draggedId: string | null; };
  
  // Actions
  setActivePalette: (id: string) => void;
  createCustomPalette: (name: string, colors: string[]) => void;
  updatePalette: (id: string, updates: Partial<ColorPalette>) => void;
  deletePalette: (id: string) => void;
  reorderColors: (paletteId: string, fromIndex: number, toIndex: number) => void;
  
  // Color Management
  addColor: (paletteId: string, color: string) => void;
  removeColor: (paletteId: string, colorId: string) => void;
  updateColor: (paletteId: string, colorId: string, newColor: string) => void;
  
  // Import/Export
  exportPalette: (paletteId: string) => PaletteExportFormat;
  importPalette: (data: PaletteExportFormat) => boolean;
  validateImportData: (data: any) => boolean;
}
```

## Implementation Phases

### Phase 1: Core Architecture & Types (2-3 hours)
1. **Create type definitions** (`types/palette.ts`)
2. **Set up palette store** (`stores/paletteStore.ts`)
3. **Create default palettes** (`constants/defaultPalettes.ts`)
4. **Add utility functions** (`utils/colorConversion.ts`, `utils/paletteValidation.ts`)

### Phase 2: Color Picker Overlay (3-4 hours)
1. **Install additional shadcn components** (dialog, popover, slider, input)
2. **Create ColorPickerOverlay component** with:
   - HSV/RGB/HEX controls with real-time sync
   - Color wheel implementation
   - Eyedropper integration
   - Current vs. preview color comparison
   - Recent colors display
3. **Create RecentColors component**
4. **Add color conversion utilities**

### Phase 3: Foreground/Background Selector (1-2 hours)
1. **Create ForegroundBackgroundSelector component**
2. **Large clickable color squares** (similar to Photoshop)
3. **Integration with ColorPickerOverlay**
4. **Visual indicators for active selection**

### Phase 4: Enhanced Palette Management (3-4 hours)
1. **Create PaletteSelector component** (dropdown with management buttons)
2. **Create PaletteSwatches component** with:
   - Drag-and-drop reordering using HTML5 drag API
   - Single-click select, double-click edit
   - Visual selection indicators
   - Management buttons (arrows, add, remove, settings)
3. **Implement drag-and-drop visual feedback**

### Phase 5: Import/Export System (2-3 hours)
1. **Create ColorImportExport component**
2. **JSON validation with user-friendly error messages**
3. **Visual preview before import/export**
4. **File download/upload handling**
5. **Custom palette creation from imported data**

### Phase 6: Integration & Testing (2-3 hours)
1. **Update main ColorPicker.tsx** to orchestrate all components
2. **Ensure backward compatibility** with existing toolStore
3. **Add transparent color special handling**
4. **Comprehensive testing of all workflows**
5. **Performance optimization** for large palettes

## Default Palette Presets

### Palette Definitions
```typescript
export const DEFAULT_PALETTES: ColorPalette[] = [
  {
    id: 'ansi-16',
    name: 'ANSI 16-Color',
    colors: [/* Current ANSI_COLORS as PaletteColor[] */],
    isPreset: true,
    isCustom: false
  },
  {
    id: 'web-safe',
    name: 'Web Safe Colors',
    colors: [/* 216 web-safe colors */],
    isPreset: true,
    isCustom: false
  },
  {
    id: 'material-design',
    name: 'Material Design',
    colors: [/* Material color palette */],
    isPreset: true,
    isCustom: false
  },
  {
    id: 'retro-8bit',
    name: 'Retro 8-bit',
    colors: [/* Classic gaming colors */],
    isPreset: true,
    isCustom: false
  },
  {
    id: 'earth-tones',
    name: 'Earth Tones',
    colors: [/* Natural, earthy colors */],
    isPreset: true,
    isCustom: false
  },
  {
    id: 'cool-blues',
    name: 'Cool Blues',
    colors: [/* Blue spectrum for artists */],
    isPreset: true,
    isCustom: false
  },
  {
    id: 'warm-reds',
    name: 'Warm Reds',
    colors: [/* Red/orange spectrum */],
    isPreset: true,
    isCustom: false
  }
];
```

## Component Integration Plan

### ColorPicker.tsx (Main Component)
```tsx
export const ColorPicker: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Photoshop-style color selector */}
      <ForegroundBackgroundSelector />
      
      {/* Palette management */}
      <div className="space-y-2">
        <PaletteSelector />
        <PaletteSwatches />
      </div>
      
      {/* Modals */}
      <ColorPickerOverlay />
      <ColorImportExport />
    </div>
  );
};
```

## Technical Considerations

### Performance
- **Lazy loading** of color picker overlay
- **Virtualization** for large palettes (100+ colors)
- **Debounced color updates** during dragging
- **Memoization** of expensive color calculations

### Accessibility
- **Keyboard navigation** for all color operations
- **Screen reader support** with proper ARIA labels
- **High contrast mode** compatibility
- **Focus management** in modals

### Browser Compatibility
- **HTML5 drag-and-drop** with touch fallbacks
- **File API** for import/export
- **Color input** with custom fallback
- **Canvas eyedropper** with permission handling

## Success Criteria

### Functional Requirements
- [ ] **Foreground/background color selection** with large clickable squares
- [ ] **Advanced color picker** with HSV/RGB/HEX controls and color wheel
- [x] **Preset palette system** with easy maintenance pattern ✅ **Phase 1 Complete**
- [ ] **Custom palette creation** and management
- [ ] **Drag-and-drop color reordering** with visual feedback
- [ ] **Import/export system** with JSON validation
- [ ] **Transparent color handling** (background only, system-managed)

### Technical Requirements
- [ ] **Reusable color picker component** for use throughout the app
- [x] **Type-safe implementation** with comprehensive TypeScript types ✅ **Phase 1 Complete**
- [ ] **Backward compatibility** with existing color selection system
- [ ] **Performance optimization** for smooth interactions
- [x] **Comprehensive error handling** with user-friendly messages ✅ **Phase 1 Complete**

## Phase 1 Status: ✅ COMPLETE

**Files Created:**
- `src/types/palette.ts` - Complete type definitions with validation
- `src/utils/colorConversion.ts` - HSV/RGB/HEX conversion utilities
- `src/utils/paletteValidation.ts` - JSON import/export validation
- `src/constants/defaultPalettes.ts` - 7 preset palettes (216 web-safe colors!)
- `src/stores/paletteStore.ts` - Full Zustand store with persistence

**Components Installed:**
- `input.tsx`, `select.tsx`, `dropdown-menu.tsx` added to existing UI components

## Phase 2-4 Status: ✅ COMPLETE

**Files Created:**
- `src/components/features/ColorPickerOverlay.tsx` - Advanced color picker with HSV/RGB/HEX controls, color wheel, eyedropper, recent colors
- `src/components/features/ForegroundBackgroundSelector.tsx` - Photoshop-style large color squares with swap/reset functionality
- `src/components/features/ColorPicker.tsx` - **COMPLETELY ENHANCED** - Integrated all components with palette management

**Features Implemented:**
- ✅ **Photoshop-style foreground/background selector** - Large clickable squares with visual indicators
- ✅ **Advanced color picker overlay** - HSV/RGB/HEX sliders, color wheel, eyedropper support, recent colors
- ✅ **Palette dropdown selector** - Shows all preset + custom palettes
- ✅ **Enhanced color grid** - Single-click select, double-click edit with tooltips
- ✅ **Color management buttons** - Add, remove, reorder, import, export for custom palettes
- ✅ **Smart transparent handling** - Appears first in background colors only
- ✅ **Real-time color sync** - Updates tool colors immediately
- ✅ **Recent colors tracking** - Automatically tracks frequently used colors

## Risk Assessment

### High Risk
- **Eyedropper implementation**: Browser permissions and cross-platform compatibility
- **Drag-and-drop on mobile**: Touch event handling complexity

### Medium Risk
- **Color conversion accuracy**: HSV/RGB/HEX precision during real-time updates
- **File import security**: JSON validation and malicious data handling

### Low Risk
- **UI component integration**: Well-established patterns with shadcn/ui
- **Store management**: Standard Zustand patterns

## Timeline Estimate

**Total: 13-19 hours** (2-3 development sessions)

- Phase 1: 2-3 hours
- Phase 2: 3-4 hours
- Phase 3: 1-2 hours
- Phase 4: 3-4 hours
- Phase 5: 2-3 hours
- Phase 6: 2-3 hours

## Next Steps

1. **Review and approve this plan**
2. **Begin Phase 1**: Set up core architecture and types
3. **Install required dependencies**: Additional shadcn/ui components
4. **Create development branch**: `feature/color-palette-overhaul`
5. **Implement incrementally** with testing at each phase

---

*This plan serves as the complete roadmap for the color palette system overhaul. Each phase builds upon the previous one, ensuring a systematic and maintainable implementation.*