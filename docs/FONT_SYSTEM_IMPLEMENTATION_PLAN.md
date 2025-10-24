# Font System Implementation Plan

## Project Overview
Implement a comprehensive font selection system with manual font choice, system font detection, bundled web fonts, and backwards compatibility for .asciimtn files and cloud storage.

---

## ✅ Phase 1: Core Font System & Export Fixes (COMPLETE)

### 1.1 Font Constants & Utilities ✅
- [x] Create `src/constants/fonts.ts` with curated monospace fonts
- [x] Define `MonospaceFont` interface with id, name, description, fontStack
- [x] Implement `getFontById()` and `getFontStack()` utilities
- [x] Set `DEFAULT_FONT_ID = 'auto'` for cross-platform compatibility

### 1.2 Font Metrics Refactoring ✅
- [x] Remove hardcoded `OPTIMAL_FONT_STACK` from `fontMetrics.ts`
- [x] Make `fontStack` a required parameter in `calculateFontMetrics()`
- [x] Update all callers to pass fontStack explicitly

### 1.3 Canvas Context Updates ✅
- [x] Add `selectedFontId: string` to CanvasState
- [x] Add `setSelectedFontId: (fontId: string) => void` to CanvasActions
- [x] Implement font selection state in CanvasProvider
- [x] Recalculate fontMetrics when selectedFontId changes

### 1.4 Export Renderer Fixes ✅
**Critical Bug Fix: Quote Escaping in Font Stacks**
- [x] Fix PNG/JPEG exports (renderFrame line 1896) - remove quote wrapping
- [x] Fix SVG exports (line 224) - use unquoted font stack
- [x] Fix React component exports (line 1273) - use unquoted font stack
- [x] Fix HTML exports - ensure consistent font handling

### 1.5 Canvas Renderer Fix ✅
- [x] Update `useCanvasRenderer.ts` line 138 to use unquoted fontStack
- [x] Verify canvas display matches export output

**Result:** All raster and vector exports now match canvas font rendering!

---

## ✅ Phase 2: UI & Session Format (COMPLETE)

### 2.1 Typography Settings UI ✅
- [x] Add Font Family dropdown to CanvasSettings.tsx
- [x] Display all 8 fonts with descriptions
- [x] Show selected font description below dropdown
- [x] Update Reset button to include `setSelectedFontId(DEFAULT_FONT_ID)`

### 2.2 Session Export Format ✅
- [x] Update ExportDataBundle type to include `selectedFontId`
- [x] Update exportRenderer.ts to save `selectedFontId` in typography section
- [x] Update exportDataCollector.ts to include `selectedFontId` from CanvasContext

### 2.3 Session Import with Migration ✅
- [x] Make `selectedFontId` optional in TypographySettings interface
- [x] Update sessionImporter.ts to accept `setSelectedFontId` callback
- [x] Add migration logic: defaults to 'auto' if missing from old files
- [x] Update ImportModal.tsx to pass all 4 typography callbacks

### 2.4 Cloud Storage Compatibility ✅
- [x] Update premium package TypographySettings type
- [x] Fix useCloudProjectActions.ts to include `selectedFontId` in save
- [x] Fix cloud load to pass typography callbacks (including setSelectedFontId)
- [x] Move CanvasProvider to App wrapper for proper context scope
- [x] Verify JSONB column handles new field (no schema changes needed)

**Result:** Backwards-compatible session format working in local files and cloud!

---

## 🚧 Phase 3: Font Detection & Feedback (IN PROGRESS)

### 3.1 Font Availability Detection
- [ ] Create `src/utils/fontDetection.ts` utility
- [ ] Implement `isFontAvailable(fontName: string): Promise<boolean>`
  - Use canvas text measurement technique
  - Compare serif vs sans-serif baseline measurements
- [ ] Implement `detectAvailableFont(fontStack: string): Promise<string>`
  - Parse font stack into individual font names
  - Test each font for availability
  - Return first available font name
- [ ] Cache detection results in memory (avoid re-checking)

### 3.2 Font Display Indicator
- [ ] Add `actualFont` state to CanvasContext
- [ ] Run detection when `selectedFontId` changes
- [ ] Display badge in typography dropdown showing actual font
  - "Using: SF Mono" (green) - requested font available
  - "Using: SF Mono (fallback)" (yellow) - fallback in use
  - Position below font selector dropdown

### 3.3 Font Fallback Warning
- [ ] Show warning icon when fallback is active
- [ ] Add tooltip explaining which font was requested vs which is active
- [ ] Example: "Consolas not available on macOS. Using SF Mono instead."

**Expected Behavior:**
```
Selected: Consolas
Detected: SF Mono (fallback)
⚠️ Consolas is not installed on your system
```

---

## 🔜 Phase 4: Bundled Web Fonts (PLANNED)

### 4.1 Font File Setup
- [ ] Create `public/fonts/` directory structure
- [ ] Add JetBrains Mono (OFL license)
  - Download from https://www.jetbrains.com/lp/mono/
  - Include woff2 format for modern browsers
  - Regular weight (400) only to minimize size
- [ ] Add Fira Code (OFL license)
  - Download from https://github.com/tonsky/FiraCode
  - Include woff2 format
  - Regular weight (400)
- [ ] Add Source Code Pro (OFL license)
  - Download from https://github.com/adobe-fonts/source-code-pro
  - Include woff2 format
  - Regular weight (400)

### 4.2 CSS Font Loading
- [ ] Create `src/styles/bundled-fonts.css`
- [ ] Add @font-face declarations with `font-display: swap`
- [ ] Use CSS Font Loading API for lazy loading
- [ ] Implement loading only when user selects bundled font

### 4.3 Font Constants Update
- [ ] Add JetBrains Mono to MONOSPACE_FONTS array
  ```typescript
  {
    id: 'jetbrains-mono',
    name: 'JetBrains Mono',
    description: 'Modern coding font with ligatures (bundled)',
    fontStack: 'JetBrains Mono, SF Mono, Monaco, Consolas, monospace',
    isBundled: true,
    fileSize: '~120KB'
  }
  ```
- [ ] Add Fira Code (with ligature note)
- [ ] Add Source Code Pro
- [ ] Update MonospaceFont interface to include `isBundled?: boolean`

### 4.4 Lazy Loading Implementation
- [ ] Create `src/utils/fontLoader.ts`
- [ ] Implement `loadBundledFont(fontId: string): Promise<void>`
  ```typescript
  // Use CSS Font Loading API
  const font = new FontFace('JetBrains Mono', 'url(/fonts/jetbrains-mono.woff2)');
  await font.load();
  document.fonts.add(font);
  ```
- [ ] Add loading state indicator in UI
- [ ] Cache loaded fonts (don't reload on subsequent use)
- [ ] Preload bundled fonts on idle (requestIdleCallback)

### 4.5 UI Updates for Bundled Fonts
- [ ] Show "📦 Bundled" badge next to bundled font names
- [ ] Display file size in description
- [ ] Add loading spinner when font is being downloaded
- [ ] Show "Downloaded ✓" indicator after first load

**Expected UI:**
```
Font Family
┌─────────────────────────────────────┐
│ SF Mono (System)                  ▼ │
├─────────────────────────────────────┤
│ SF Mono (System)                    │
│ Monaco (System)                     │
│ Consolas (System)                   │
│ JetBrains Mono 📦 (~120KB)         │ ← Bundled
│ Fira Code 📦 (~140KB)              │ ← Bundled
│ Source Code Pro 📦 (~110KB)        │ ← Bundled
│ Auto (Best Available)               │
└─────────────────────────────────────┘

Using: JetBrains Mono ✓ Downloaded
```

---

## 📋 Phase 5: Testing & Documentation (PLANNED)

### 5.1 Cross-Platform Testing
- [ ] Test on macOS (SF Mono, Monaco available)
- [ ] Test on Windows (Consolas, Cascadia available)
- [ ] Test on Linux (system fonts may vary)
- [ ] Verify fallback behavior on each platform

### 5.2 Export Validation
- [ ] Verify PNG exports use correct font
- [ ] Verify JPEG exports use correct font
- [ ] Verify WebM/H.264 exports use correct font
- [ ] Verify SVG exports embed correct font stack
- [ ] Verify React component exports use correct font

### 5.3 Session Compatibility Testing
- [ ] Import old .asciimtn files (pre-font-selection)
- [ ] Verify migration to 'auto' works
- [ ] Import new .asciimtn files with selectedFontId
- [ ] Verify font selection restores correctly
- [ ] Test cloud save/load with different fonts

### 5.4 Performance Testing
- [ ] Measure bundle size impact of bundled fonts
- [ ] Verify lazy loading prevents initial load penalty
- [ ] Test font detection speed (should be <100ms)
- [ ] Verify font switching doesn't cause lag

### 5.5 Documentation
- [ ] Update USER_GUIDE.md with font selection feature
- [ ] Document system fonts vs bundled fonts
- [ ] Explain fallback behavior
- [ ] Add screenshots of font selector UI
- [ ] Document .asciimtn format changes (optional selectedFontId)

---

## 🎯 Success Criteria

### Functionality
- ✅ Manual font selection works in UI
- ✅ Selected font persists in .asciimtn files
- ✅ Selected font persists in cloud storage
- ✅ Exports match canvas font rendering
- ✅ Backwards compatibility with old files
- 🔜 Font detection shows actual font in use
- 🔜 Fallback warning appears when needed
- 🔜 Bundled fonts load on demand
- 🔜 No performance impact when using system fonts

### User Experience
- ✅ Clear font descriptions in dropdown
- ✅ Reset button returns to Auto
- 🔜 Visual feedback for font availability
- 🔜 Loading indicators for bundled fonts
- 🔜 Badge system (System/Bundled) is clear
- 🔜 File size shown for bundled fonts

### Code Quality
- ✅ Zero TypeScript errors
- ✅ Proper separation of concerns
- ✅ Reusable utilities (getFontStack, etc.)
- 🔜 Font detection cached efficiently
- 🔜 Lazy loading prevents bundle bloat
- 🔜 All edge cases handled

---

## 📦 Current Font Inventory

### System Fonts (0 KB bundle impact)
1. **SF Mono** - macOS/iOS default, excellent rendering
2. **Monaco** - Classic macOS terminal font
3. **Consolas** - Windows developer favorite
4. **Cascadia Code** - Modern Windows terminal font
5. **Roboto Mono** - Android/Linux common
6. **Inconsolata** - Popular open-source option
7. **Courier New** - Universal fallback
8. **Auto** - Best available (smart detection)

### Bundled Fonts (Planned: ~370KB total)
1. **JetBrains Mono** (~120KB) - Modern, ligatures, excellent coding
2. **Fira Code** (~140KB) - Popular, ligatures, GitHub favorite
3. **Source Code Pro** (~110KB) - Adobe's clean monospace

---

## 🔧 Technical Architecture

```
┌─────────────────────────────────────────┐
│  fonts.ts (Single Source of Truth)     │
│  - System fonts (8)                     │
│  - Bundled fonts (3) with isBundled    │
│  - getFontStack() - clean strings      │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  fontDetection.ts (Detection Layer)     │
│  - isFontAvailable() - canvas test     │
│  - detectAvailableFont() - find first  │
│  - Cache results in memory             │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  fontLoader.ts (Lazy Loading)          │
│  - loadBundledFont() - CSS Font API    │
│  - Track loaded state                  │
│  - Preload on idle                     │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  CanvasContext (State Management)       │
│  - selectedFontId                       │
│  - actualFont (detected)                │
│  - fontMetrics (recalculated)          │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  Export/Import (Persistence)            │
│  - Session files: typography.selectedFontId │
│  - Cloud storage: JSONB column          │
│  - Migration: defaults to 'auto'        │
└─────────────────────────────────────────┘
```

---

## 📊 Bundle Size Impact

| Component | Size | Loading Strategy |
|-----------|------|------------------|
| System Fonts | 0 KB | OS-provided |
| Font Detection | ~2 KB | Always loaded |
| Font Loader | ~3 KB | Always loaded |
| JetBrains Mono | ~120 KB | Lazy (on selection) |
| Fira Code | ~140 KB | Lazy (on selection) |
| Source Code Pro | ~110 KB | Lazy (on selection) |
| **Initial Impact** | **~5 KB** | Minimal overhead |
| **Max Impact** | **~375 KB** | If all 3 fonts loaded |

**Strategy:** Only load bundled fonts when user explicitly selects them. Most users will use system fonts (0 KB impact).

---

## 🐛 Known Issues & Edge Cases

### Resolved ✅
- ✅ Quote escaping broke canvas font parser
- ✅ Exports used different fonts than canvas
- ✅ Cloud save stripped selectedFontId
- ✅ CanvasProvider scope caused context errors

### Active 🔧
- 🔧 No indication when fallback fonts are used
- 🔧 User can't tell which font is actually rendering

### To Address 🔜
- 🔜 First load of bundled font shows brief flash
- 🔜 Font detection runs on every component mount (needs caching)

---

## 📅 Timeline Estimate

- ✅ Phase 1: Core Font System - **COMPLETE**
- ✅ Phase 2: UI & Session Format - **COMPLETE**
- 🚧 Phase 3: Font Detection - **2-3 hours**
- 🔜 Phase 4: Bundled Web Fonts - **3-4 hours**
- 🔜 Phase 5: Testing & Docs - **2-3 hours**

**Total Remaining:** ~8-10 hours of development

---

## 🎉 Milestone Achievements

- ✅ Manual font selection implemented
- ✅ Export bug fixed (fonts now match canvas)
- ✅ Backwards-compatible session format
- ✅ Cloud storage integration working
- ✅ Zero breaking changes for existing users
- ✅ All lint checks passing
- ✅ App loads without errors

**Next Milestone:** Font detection with user feedback
