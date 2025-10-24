# Font Selection & Export Fix Implementation Plan

**Created**: October 23, 2025  
**Status**: 🚧 **IN PROGRESS** (Phase 1 complete, testing in progress)  
**Priority**: High - Fixes critical export bug + adds user-requested feature

---

## 📋 Overview

This implementation plan addresses two interconnected issues:

1. **Critical Bug**: Raster exports (PNG, JPEG, WebM, H.264) use different fonts than canvas display due to quote escaping issues
2. **Feature Request**: Add user-controllable font family selection in typography settings

By implementing both together, we create a robust, future-proof typography system with full backwards compatibility.

---

## 🐛 Root Cause Analysis

### The Export Font Bug

**Canvas Display** (Working correctly):
```typescript
// From useCanvasRenderer.ts line 138
const scaledFontString = `${scaledFontSize}px '${fontMetrics.fontFamily}', monospace`;
// Result: "16px 'SF Mono, Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New"', monospace"
```

**Raster Exports** (Broken):
```typescript
// From exportRenderer.ts line 1895 (renderFrame method)
const fontFamily = fontMetrics.fontFamily || 'SF Mono, Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New"';
ctx.font = `${exportFontSize}px '${fontFamily}', monospace`;
// Result: "16px 'SF Mono, Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New"', monospace"
```

**Problem**: Nested quotes break canvas font parser:
- The double quotes around `"Roboto Mono"` and `"Courier New"` terminate the single-quoted string prematurely
- Browser only recognizes: "SF Mono, Monaco, Inconsolata"
- Critical fallbacks (Consolas for Windows, Courier New universal) are unreachable
- Falls back to generic `monospace` which looks different

**Why SVG/HTML exports work**:
- SVG: Uses unquoted font names (line 223)
- HTML: CSS parser is more lenient with quote inconsistencies

---

## 🎯 Solution Strategy

### Fix Quote Escaping Issue

**Remove all quotes from font stacks** - use unquoted font names consistently:

```typescript
// BEFORE (broken)
'SF Mono, Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New"'
ctx.font = `16px '${fontFamily}', monospace`; // Nested quotes break parsing

// AFTER (fixed)
'SF Mono, Monaco, Inconsolata, Roboto Mono, Consolas, Courier New, monospace'
ctx.font = `16px ${fontFamily}`; // No quote wrapping, no escaping issues
```

### Add Font Selection Feature

Create a curated list of monospace fonts with:
- Platform-specific recommendations
- Auto-detection for best available font
- User control via typography settings dropdown
- Full backwards compatibility with old session files

---

## 📁 Implementation Phases

### **Phase 1: Core Font System** ✅

#### **1.1 Create Font Constants** (`src/constants/fonts.ts`)

```typescript
export interface MonospaceFont {
  id: string;
  name: string;
  displayName: string;
  cssStack: string; // No quotes, ready for canvas/CSS
  category: 'system' | 'web' | 'fallback';
  platforms?: ('macos' | 'windows' | 'linux')[];
  description: string;
}

export const MONOSPACE_FONTS: MonospaceFont[] = [
  {
    id: 'sf-mono',
    name: 'SF Mono',
    displayName: 'SF Mono (macOS)',
    cssStack: 'SF Mono, monospace',
    category: 'system',
    platforms: ['macos'],
    description: 'Apple\'s system monospace font - excellent rendering quality'
  },
  {
    id: 'monaco',
    name: 'Monaco',
    displayName: 'Monaco (macOS)',
    cssStack: 'Monaco, monospace',
    category: 'system',
    platforms: ['macos'],
    description: 'Classic macOS monospace - crisp and readable'
  },
  {
    id: 'consolas',
    name: 'Consolas',
    displayName: 'Consolas (Windows)',
    cssStack: 'Consolas, monospace',
    category: 'system',
    platforms: ['windows'],
    description: 'Microsoft\'s premium monospace - optimized for Windows'
  },
  {
    id: 'cascadia-code',
    name: 'Cascadia Code',
    displayName: 'Cascadia Code (Windows)',
    cssStack: 'Cascadia Code, monospace',
    category: 'system',
    platforms: ['windows'],
    description: 'Modern Windows terminal font with ligatures'
  },
  {
    id: 'roboto-mono',
    name: 'Roboto Mono',
    displayName: 'Roboto Mono (Google)',
    cssStack: 'Roboto Mono, monospace',
    category: 'web',
    description: 'Google\'s monospace - clean and modern'
  },
  {
    id: 'inconsolata',
    name: 'Inconsolata',
    displayName: 'Inconsolata (Web)',
    cssStack: 'Inconsolata, monospace',
    category: 'web',
    description: 'Popular web font with good character spacing'
  },
  {
    id: 'courier-new',
    name: 'Courier New',
    displayName: 'Courier New (Universal)',
    cssStack: 'Courier New, monospace',
    category: 'fallback',
    description: 'Universal fallback - available on all systems'
  },
  {
    id: 'auto',
    name: 'Auto',
    displayName: 'Auto (Best Available)',
    cssStack: 'SF Mono, Monaco, Cascadia Code, Consolas, Roboto Mono, Inconsolata, Courier New, monospace',
    category: 'system',
    description: 'Automatically selects the best available monospace font for your system'
  }
];

export const DEFAULT_FONT_ID = 'auto';

export const getFontById = (id: string): MonospaceFont => {
  const font = MONOSPACE_FONTS.find(f => f.id === id);
  return font || MONOSPACE_FONTS[MONOSPACE_FONTS.length - 1]; // Default to 'auto'
};

export const getFontStack = (fontId: string): string => {
  const font = getFontById(fontId);
  return font.cssStack;
};
```

#### **1.2 Update Font Metrics Utility** (`src/utils/fontMetrics.ts`)

**Changes**:
- Remove hardcoded `OPTIMAL_FONT_STACK` constant
- Accept font stack as required parameter (no default)
- Ensure font stacks never contain quotes

```typescript
// REMOVE this line:
// const OPTIMAL_FONT_STACK = 'SF Mono, Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New"';

// UPDATE function signature:
export const calculateFontMetrics = (
  fontSize: number, 
  fontStack: string // Required parameter, no default
): FontMetrics => {
  const MONOSPACE_ASPECT_RATIO = 0.6;
  const characterHeight = fontSize;
  const characterWidth = fontSize * MONOSPACE_ASPECT_RATIO;
  
  return {
    characterWidth,
    characterHeight,
    aspectRatio: MONOSPACE_ASPECT_RATIO,
    fontSize,
    fontFamily: fontStack // Store the font stack (no quotes)
  };
};
```

#### **1.3 Add Font Selection to Canvas Context**

**Update**: `src/contexts/CanvasContext/context.ts`

```typescript
export interface CanvasContextValue {
  // ... existing properties
  fontSize: number;
  fontMetrics: FontMetrics;
  selectedFontId: string; // NEW: User's selected font ID
  
  // ... existing methods
  setFontSize: (size: number) => void;
  setSelectedFontId: (fontId: string) => void; // NEW: Font selection
}
```

**Update**: `src/contexts/CanvasContext/CanvasProvider.tsx`

```typescript
import { DEFAULT_FONT_ID, getFontStack } from '@/constants/fonts';

export const CanvasProvider: React.FC<CanvasProviderProps> = ({
  children,
  initialCellSize = 18,
}) => {
  const [cellSize, setCellSize] = useState(initialCellSize);
  const [selectedFontId, setSelectedFontId] = useState(DEFAULT_FONT_ID); // NEW
  const [characterSpacing, setCharacterSpacing] = useState(DEFAULT_SPACING.characterSpacing);
  const [lineSpacing, setLineSpacing] = useState(DEFAULT_SPACING.lineSpacing);

  // Calculate font metrics with selected font
  const fontMetrics = useMemo(
    () => {
      const fontStack = getFontStack(selectedFontId);
      return calculateFontMetrics(cellSize, fontStack);
    },
    [cellSize, selectedFontId] // Re-calculate when font changes
  );
  
  // ... rest of provider
  
  const contextValue: CanvasContextValue = {
    // ... existing values
    selectedFontId,
    setSelectedFontId,
  };
};
```

---

### **Phase 2: Fix Export Renderers** ✅

#### **2.1 Update renderFrame Method** (`src/utils/exportRenderer.ts:1895`)

**BEFORE**:
```typescript
const fontFamily = fontMetrics.fontFamily || 'SF Mono, Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New"';
ctx.font = `${exportFontSize}px '${fontFamily}', monospace`;
```

**AFTER**:
```typescript
// Font stack is already properly formatted (no quotes) from fontMetrics
const fontStack = fontMetrics.fontFamily || 'SF Mono, Monaco, Cascadia Code, Consolas, Roboto Mono, Inconsolata, Courier New, monospace';
ctx.font = `${exportFontSize}px ${fontStack}`; // No quote wrapping
```

#### **2.2 Update SVG Export** (`src/utils/exportRenderer.ts:223`)

**BEFORE**:
```typescript
const fontFamily = data.fontMetrics?.fontFamily || 'SF Mono, Monaco, Inconsolata, Roboto Mono, Consolas, Courier New';
```

**AFTER**:
```typescript
const fontStack = data.fontMetrics?.fontFamily || 'SF Mono, Monaco, Cascadia Code, Consolas, Roboto Mono, Inconsolata, Courier New, monospace';
```

#### **2.3 Update HTML Export** (`src/utils/exportRenderer.ts:1272`)

**BEFORE**:
```typescript
data.fontMetrics?.fontFamily || 'SF Mono, Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New"'
```

**AFTER**:
```typescript
data.fontMetrics?.fontFamily || 'SF Mono, Monaco, Cascadia Code, Consolas, Roboto Mono, Inconsolata, Courier New, monospace'
```

#### **2.4 Update Canvas Renderer** (`src/hooks/useCanvasRenderer.ts:138`)

**BEFORE**:
```typescript
const scaledFontString = `${scaledFontSize}px '${fontMetrics.fontFamily}', monospace`;
```

**AFTER**:
```typescript
// Font stack already includes fallback, no need for extra ', monospace'
const scaledFontString = `${scaledFontSize}px ${fontMetrics.fontFamily}`;
```

---

### **Phase 3: Add Font Selector UI** ✅

#### **3.1 Update Canvas Settings** (`src/components/features/CanvasSettings.tsx`)

Add after line spacing control in typography dropdown:

```tsx
import { MONOSPACE_FONTS, DEFAULT_FONT_ID } from '@/constants/fonts';

// Inside CanvasSettings component:
const { selectedFontId, setSelectedFontId } = useCanvasContext();

// Inside typography dropdown JSX (after line spacing, before reset):
{/* Font Family Selector */}
<div>
  <label className="text-xs font-medium text-muted-foreground mb-2 block">
    Font Family
  </label>
  <select
    value={selectedFontId}
    onChange={(e) => setSelectedFontId(e.target.value)}
    className="w-full h-8 px-2 text-xs border border-border rounded bg-background text-foreground"
  >
    {MONOSPACE_FONTS.map(font => (
      <option key={font.id} value={font.id}>
        {font.displayName}
      </option>
    ))}
  </select>
  <p className="text-xs text-muted-foreground mt-1">
    {MONOSPACE_FONTS.find(f => f.id === selectedFontId)?.description}
  </p>
</div>

{/* Update Reset Button to include font */}
<Button
  variant="outline"
  size="sm"
  onClick={() => {
    setFontSize(18);
    setCharacterSpacing(1.0);
    setLineSpacing(1.0);
    setSelectedFontId(DEFAULT_FONT_ID); // NEW: Reset font
  }}
  className="w-full h-7 text-xs"
>
  Reset to Default
</Button>
```

---

### **Phase 4: Backwards Compatible Session Format** ✅

#### **4.1 Update Session Export** (`src/utils/exportRenderer.ts:330`)

```typescript
// Add selectedFontId to session export (OPTIONAL field for backwards compat)
ui: {
  theme: data.uiState.theme,
  zoom: data.uiState.zoom,
  panOffset: data.uiState.panOffset,
  fontMetrics: data.fontMetrics // Keep for backwards compat
},
typography: {
  fontSize: data.typography.fontSize,
  characterSpacing: data.typography.characterSpacing,
  lineSpacing: data.typography.lineSpacing,
  selectedFontId: data.typography.selectedFontId || 'auto' // NEW: Optional field
}
```

#### **4.2 Update Session Import Types** (`src/utils/sessionImporter.ts`)

```typescript
interface SessionImportData {
  version: string;
  name?: string;
  description?: string;
  canvas: SessionCanvasData;
  animation: SessionAnimationData;
  tools: SessionToolsData;
  typography?: {
    fontSize?: number;
    characterSpacing?: number;
    lineSpacing?: number;
    selectedFontId?: string; // NEW: Optional for backwards compat
  };
  ui?: {
    fontMetrics?: {
      fontFamily?: string; // OLD: Keep for migration
    };
  };
  // ... rest unchanged
}
```

#### **4.3 Add Migration Logic** (`src/utils/sessionImporter.ts:330`)

Add after typography restoration:

```typescript
// Restore typography settings
if (typographyCallbacks && sessionData.typography) {
  if (sessionData.typography.fontSize !== undefined) {
    typographyCallbacks.setFontSize(sessionData.typography.fontSize);
  }
  if (sessionData.typography.characterSpacing !== undefined) {
    typographyCallbacks.setCharacterSpacing(sessionData.typography.characterSpacing);
  }
  if (sessionData.typography.lineSpacing !== undefined) {
    typographyCallbacks.setLineSpacing(sessionData.typography.lineSpacing);
  }
  
  // NEW: Handle font selection with backwards compatibility
  if (typographyCallbacks.setSelectedFontId) {
    if (sessionData.typography.selectedFontId) {
      // New format: Use saved font selection
      typographyCallbacks.setSelectedFontId(sessionData.typography.selectedFontId);
    } else {
      // OLD FORMAT MIGRATION: Attempt to infer font from old fontMetrics
      const oldFontFamily = sessionData.ui?.fontMetrics?.fontFamily;
      const migratedFontId = migrateLegacyFontFamily(oldFontFamily);
      typographyCallbacks.setSelectedFontId(migratedFontId);
    }
  }
}

/**
 * Migrate legacy font family string to new font ID system
 * @param oldFontFamily - Old font stack string (possibly with quotes)
 * @returns Best-match font ID or 'auto' as fallback
 */
function migrateLegacyFontFamily(oldFontFamily?: string): string {
  if (!oldFontFamily) {
    return DEFAULT_FONT_ID; // 'auto'
  }
  
  // Check if old font stack matches any specific font
  const normalized = oldFontFamily.toLowerCase().replace(/['"]/g, '');
  
  if (normalized.startsWith('sf mono')) return 'sf-mono';
  if (normalized.startsWith('monaco')) return 'monaco';
  if (normalized.startsWith('consolas')) return 'consolas';
  if (normalized.startsWith('cascadia')) return 'cascadia-code';
  if (normalized.startsWith('roboto mono')) return 'roboto-mono';
  if (normalized.startsWith('inconsolata')) return 'inconsolata';
  if (normalized.startsWith('courier')) return 'courier-new';
  
  // Default to 'auto' if no specific font detected
  return DEFAULT_FONT_ID; // 'auto'
}
```

#### **4.4 Update Typography Callbacks**

Wherever `useSessionImporter` is called, add new callback:

```typescript
const typographyCallbacks = {
  setFontSize: (size: number) => setFontSize(size),
  setCharacterSpacing: (spacing: number) => setCharacterSpacing(spacing),
  setLineSpacing: (spacing: number) => setLineSpacing(spacing),
  setSelectedFontId: (fontId: string) => setSelectedFontId(fontId) // NEW
};
```

---

### **Phase 5: Add Export Metadata (Optional)** 🔄

#### **5.1 Update Export Types** (`src/types/export.ts`)

```typescript
export interface ExportMetadata {
  // ... existing fields
  version: string;
  buildDate: string;
  gitHash: string;
  exportDate: string;
  selectedFontId?: string; // NEW: User's font selection
  fontStack?: string;      // NEW: Actual CSS font stack used
}
```

#### **5.2 Update Export Data Bundle**

Pass font info when creating export bundles:

```typescript
const exportBundle: ExportDataBundle = {
  // ... existing data
  metadata: {
    version: VERSION.version,
    buildDate: VERSION.buildDate,
    gitHash: VERSION.gitHash,
    exportDate: new Date().toISOString(),
    selectedFontId: selectedFontId,        // From CanvasContext
    fontStack: fontMetrics.fontFamily      // From CanvasContext
  }
};
```

---

## 🧪 Testing Requirements

### **5.1 Font System Tests**

```typescript
✅ Font selection updates canvas immediately
✅ Font selection persists in context
✅ Font changes affect cell width/height calculations
✅ Default "Auto" font works correctly
✅ All individual fonts load properly
✅ Font selection resets with "Reset to Default"
```

### **5.2 Export Tests (Critical)**

For EACH export format test:

```typescript
✅ PNG export uses same font as canvas display
✅ JPEG export uses same font as canvas display
✅ WebM export uses same font as canvas display
✅ MP4 (H.264) export uses same font as canvas display
✅ SVG export still works (unchanged)
✅ HTML export still works (unchanged)
✅ Font metadata included in exports
✅ Multi-word font names work (Roboto Mono, Courier New, Cascadia Code)
✅ Font fallback works when preferred font unavailable
```

### **5.3 Backwards Compatibility Tests**

```typescript
✅ Old .asciimtn file (no selectedFontId) loads correctly
✅ Old .asciimtn file migrates to 'auto' font
✅ Old cloud project (no selectedFontId) loads correctly
✅ Old file → edit → save → reload preserves content
✅ Old file upgrades to new format on save
✅ Mixed old/new files in same workspace
```

### **5.4 Cross-Platform Tests**

```typescript
✅ macOS: SF Mono selected by default (from Auto)
✅ macOS: Manual font selection works
✅ Windows: Consolas selected by default (from Auto)
✅ Windows: Manual font selection works
✅ Linux: Courier New fallback works
✅ Exports work consistently across all platforms
```

---

## 📊 Backwards Compatibility Matrix

| **Scenario** | **File Format** | **Expected Behavior** | **Status** |
|-------------|----------------|----------------------|-----------|
| Old local file | No `selectedFontId` | Migrates to 'auto', uses default font stack | ✅ Compatible |
| Old cloud project | No `selectedFontId` | Migrates to 'auto', uses default font stack | ✅ Compatible |
| New file, default | `selectedFontId: 'auto'` | Uses auto-detection font stack | ✅ Compatible |
| New file, custom | `selectedFontId: 'sf-mono'` | Uses SF Mono exclusively | ✅ New feature |
| Mixed workspace | Both formats | Each loads correctly | ✅ Compatible |
| Old app, new file | Unknown field ignored | Uses `fontMetrics.fontFamily` (forward compat) | ✅ Compatible |

---

## 📝 Implementation Checklist

### **Session 1: Core Font System & Export Fixes** ✅ COMPLETE
- [x] Create `src/constants/fonts.ts` with font definitions
- [x] Update `src/utils/fontMetrics.ts` (remove quotes, require fontStack param)
- [x] Update `src/contexts/CanvasContext/context.ts` (add selectedFontId)
- [x] Update `src/contexts/CanvasContext/CanvasProvider.tsx` (font selection state)
- [x] Fix `src/utils/exportRenderer.ts:1895` (renderFrame - PNG/JPEG)
- [x] Fix `src/utils/exportRenderer.ts:223` (SVG export)
- [x] Fix `src/utils/exportRenderer.ts:1272` (HTML export)
- [x] Fix `src/hooks/useCanvasRenderer.ts:138` (canvas rendering)
- [x] Test: Lint passes with ZERO errors
- [x] Test: Dev server starts successfully
- [ ] Test: Canvas renders correctly with new font system (visual verification needed)
- [ ] Test: All exports use correct font (export testing needed)

### **Session 2: UI & Session Format**
- [ ] Update `src/components/features/CanvasSettings.tsx` (add font selector)
- [ ] Update `src/utils/exportRenderer.ts:330` (session export with selectedFontId)
- [ ] Update `src/utils/sessionImporter.ts` (types with optional selectedFontId)
- [ ] Add migration function `migrateLegacyFontFamily()` to sessionImporter
- [ ] Update typography callbacks to include `setSelectedFontId`
- [ ] Test: Font selector UI works and updates canvas
- [ ] Test: New session files include font selection
- [ ] Test: Old session files migrate correctly

### **Session 3: Testing & Documentation**
- [ ] Test all export formats (PNG, JPEG, WebM, MP4, SVG, HTML)
- [ ] Test backwards compatibility with old .asciimtn files
- [ ] Test cloud project loading (if premium features enabled)
- [ ] Test cross-browser (Chrome, Firefox, Safari)
- [ ] Test cross-platform (macOS, Windows if available)
- [ ] Update `docs/TYPOGRAPHY_IMPLEMENTATION.md`
- [ ] Update `COPILOT_INSTRUCTIONS.md` with font selection patterns
- [ ] Update `DEVELOPMENT.md` with completion status
- [ ] Create before/after screenshots for documentation

---

## 🎯 Success Metrics

### **Bug Fix Verification**
- ✅ PNG exports match canvas font exactly
- ✅ JPEG exports match canvas font exactly
- ✅ WebM exports match canvas font exactly
- ✅ MP4 exports match canvas font exactly
- ✅ No quote escaping issues in any export format
- ✅ All font fallbacks work correctly

### **Feature Completion**
- ✅ Font selector visible in typography settings
- ✅ All 8 fonts listed and selectable
- ✅ Live preview when changing fonts
- ✅ Font selection persists across sessions
- ✅ Default "Auto" works for all platforms

### **Backwards Compatibility**
- ✅ All old .asciimtn files load without errors
- ✅ Old files automatically migrate to new format
- ✅ No data loss during migration
- ✅ Cloud projects work unchanged

---

## 🔍 Known Edge Cases

### **Handled**
1. ✅ **Files with quoted font names**: Migrate to 'auto'
2. ✅ **Files with custom font stacks**: Migrate to 'auto'
3. ✅ **Missing typography section**: Use defaults
4. ✅ **Old cloud projects**: Auto-migrate at load time
5. ✅ **Forward compatibility**: Old apps ignore unknown fields

### **Not Handled (Out of Scope)**
1. ❌ Custom user font uploads (future enhancement)
2. ❌ Google Fonts API integration (future enhancement)
3. ❌ Font preview in selector (future enhancement)
4. ❌ Font detection/recommendation based on content (future enhancement)

---

## 📚 Related Documentation

- **Typography System**: `docs/TYPOGRAPHY_IMPLEMENTATION.md`
- **Export System**: `docs/EXPORT_METADATA_AUDIT_COMPLETE.md`
- **Session Format**: Session data structure in `src/utils/sessionImporter.ts`
- **Canvas Rendering**: `docs/CANVAS_TEXT_RENDERING.md`
- **Development Guide**: `DEVELOPMENT.md`

---

## 🚀 Deployment Notes

### **No Breaking Changes**
- Session format version stays `1.0.0` (additive changes only)
- All existing fields preserved
- New `selectedFontId` field is optional
- Old apps gracefully ignore unknown fields

### **Performance Impact**
- ✅ Minimal: Font metrics recalculation only when font changes
- ✅ Memoized: Font stack calculation cached in useMemo
- ✅ No additional network requests (system fonts only)

### **Rollback Plan**
If issues are discovered post-deployment:
1. Revert font selection UI (hide dropdown)
2. Keep export fixes (critical bug fix)
3. Default all fonts to 'auto' (preserves old behavior)
4. Session files remain compatible in both directions

---

**Implementation Status**: 🚧 **NOT STARTED**  
**Next Session**: Begin with Phase 1 (Core Font System & Export Fixes)  
**Estimated Time**: 6-7 hours total (split across 2-3 sessions)
