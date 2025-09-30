# SVG Text-to-Outlines Implementation Plan
## Using opentype.js for True Vector Font Paths

**Created**: 2025-09-30  
**Status**: Planning Phase  
**Priority**: High - Quality Enhancement

---

## 📋 Executive Summary

Replace the current pixel-tracing text-to-outlines implementation with professional-grade vector font path extraction using opentype.js. This will provide Illustrator/Figma-quality SVG exports with mathematically accurate glyph outlines.

---

## 🎯 Goals

### Primary Objectives
1. **True Vector Paths**: Extract actual font glyph paths from font files, not pixel approximations
2. **Professional Quality**: Match the quality of Illustrator's "Create Outlines" feature
3. **Monospace Accuracy**: Maintain perfect character spacing and alignment for ASCII art
4. **Backward Compatibility**: Maintain all existing SVG export features (grid, background, prettify, etc.)

### Success Criteria
- [ ] SVG exports contain mathematically accurate glyph paths
- [ ] Character spacing and positioning match text-based rendering exactly
- [ ] Font fallback chain works correctly when fonts are unavailable
- [ ] No performance degradation compared to current implementation
- [ ] All existing export options continue to work

---

## 🏗️ Architecture Overview

### Current Implementation
```
exportRenderer.ts (exportSvg)
  └─> svgExportUtils.ts (convertTextToPath)
      └─> Marching squares pixel tracing
          └─> Canvas rendering → Pixel sampling → Path approximation
```

### Proposed Implementation
```
exportRenderer.ts (exportSvg)
  └─> svgExportUtils.ts (convertTextToPath)
      └─> fontLoader.ts (getFontForFamily)
          ├─> Load font file (system or embedded)
          └─> Cache loaded fonts
      └─> opentypePathConverter.ts (convertGlyphToSvgPath)
          ├─> Look up glyph in font
          ├─> Extract true vector path
          └─> Transform path to SVG coordinates
```

---

## 📦 Dependencies

### New Package
```json
{
  "dependencies": {
    "opentype.js": "^1.3.4"
  },
  "devDependencies": {
    "@types/opentype.js": "^1.3.8"
  }
}
```

### Font Files Strategy
**Challenge**: opentype.js requires actual font files (.ttf, .otf, .woff) to extract paths.

**Options**:

#### Option A: Bundle Common Monospace Fonts (Recommended)
- **Pros**: Guaranteed availability, consistent results, full control
- **Cons**: Increases bundle size (~100-500KB per font)
- **Implementation**: Include open-source monospace fonts in `/public/fonts/`

**Recommended Fonts to Bundle**:
1. **Roboto Mono** (Open Font License) - Primary choice, excellent quality
2. **JetBrains Mono** (OFL) - Backup option, popular with developers
3. **Fira Code** (OFL) - Another high-quality option

#### Option B: System Font Access (Future Enhancement)
- **Pros**: No bundle size increase, uses user's fonts
- **Cons**: Browser security restrictions, requires File System Access API
- **Status**: Not available in all browsers yet

#### Option C: Hybrid Approach (Selected Strategy)
1. Bundle 1-2 high-quality open-source monospace fonts
2. Use bundled font when text-as-outlines is enabled
3. Fall back to pixel tracing if font loading fails
4. Add UI indicator showing which font will be used for outlines

---

## 🗂️ File Structure

### New Files
```
src/
  utils/
    font/
      fontLoader.ts              # Font file loading and caching
      opentypePathConverter.ts   # Glyph-to-SVG-path conversion
      fontRegistry.ts            # Available fonts registry and metadata
      types.ts                   # Font-related TypeScript types

public/
  fonts/
    roboto-mono/
      RobotoMono-Regular.ttf
      RobotoMono-Bold.ttf
      LICENSE.txt
    jetbrains-mono/
      JetBrainsMono-Regular.ttf
      LICENSE.txt
```

### Modified Files
```
src/
  utils/
    svgExportUtils.ts          # Update convertTextToPath to use opentype.js
    exportRenderer.ts          # Pass font metadata to conversion
  types/
    export.ts                  # Add font-related export settings
  stores/
    exportStore.ts             # Add outline font selection settings
  components/
    features/
      ImageExportDialog.tsx    # Add font selection for outlines
```

---

## 🔧 Implementation Steps

### Phase 1: Setup & Dependencies (1-2 hours)
**Tasks**:
1. Install opentype.js and types
2. Download and verify license for Roboto Mono and JetBrains Mono
3. Add font files to `/public/fonts/` directory
4. Update `.gitattributes` to handle binary font files
5. Create font loading infrastructure

**Files**:
- `package.json` - Add dependencies
- `/public/fonts/*` - Add font files with licenses
- `src/utils/font/fontRegistry.ts` - Create font metadata registry

**Validation**:
- [ ] Fonts load correctly in development
- [ ] Font licenses are properly attributed
- [ ] Build process includes font files in output

---

### Phase 2: Font Loading System (2-3 hours)
**Tasks**:
1. Create font loader utility with caching
2. Implement font family detection and mapping
3. Add error handling and fallbacks
4. Create font preloading on app initialization

**Key Functions**:
```typescript
// fontLoader.ts

interface LoadedFont {
  font: opentype.Font;
  family: string;
  fileName: string;
}

class FontLoader {
  private fontCache: Map<string, LoadedFont>;
  
  async loadFont(fontPath: string): Promise<opentype.Font>
  async getFontForFamily(family: string): Promise<opentype.Font | null>
  preloadBundledFonts(): Promise<void>
  clearCache(): void
}
```

**Error Handling**:
- Network failures loading font files
- Invalid/corrupted font files
- Missing glyphs in font
- Browser compatibility issues

**Validation**:
- [ ] Fonts load and cache correctly
- [ ] Font family matching works (e.g., "Roboto Mono" → RobotoMono-Regular.ttf)
- [ ] Cache prevents redundant loads
- [ ] Graceful fallbacks on errors

---

### Phase 3: Glyph Path Conversion (3-4 hours)
**Tasks**:
1. Create glyph-to-SVG-path converter
2. Implement coordinate transformation (font units → SVG pixels)
3. Handle font metrics (baseline, ascender, descender)
4. Maintain character positioning accuracy

**Key Functions**:
```typescript
// opentypePathConverter.ts

interface GlyphPathOptions {
  char: string;
  x: number;           // Cell x position
  y: number;           // Cell y position
  cellWidth: number;
  cellHeight: number;
  fontSize: number;
}

function convertGlyphToSvgPath(
  font: opentype.Font,
  options: GlyphPathOptions
): string | null {
  // 1. Get glyph from font
  // 2. Extract glyph path
  // 3. Transform to SVG coordinates
  // 4. Apply centering within cell
  // 5. Return SVG path data
}
```

**Coordinate System Handling**:
```
Font Coordinate System:        SVG Coordinate System:
- Origin at baseline           - Origin at top-left
- Y increases upward           - Y increases downward
- Units in font design units   - Units in pixels

Transformation Required:
1. Scale from font units to pixels
2. Flip Y-axis
3. Center in cell (x, y)
4. Apply baseline offset
```

**Validation**:
- [ ] Character paths are accurate
- [ ] Characters center correctly in cells
- [ ] Baseline alignment is correct
- [ ] Character spacing matches text rendering

---

### Phase 4: Integration with SVG Export (2-3 hours)
**Tasks**:
1. Update `convertTextToPath` in `svgExportUtils.ts`
2. Add font selection to export settings
3. Update `exportRenderer.ts` to pass font data
4. Implement fallback to pixel tracing if font load fails

**Modified Functions**:
```typescript
// svgExportUtils.ts

export async function convertTextToPath(
  char: string,
  x: number,
  y: number,
  color: string,
  bgColor: string | undefined,
  cellWidth: number,
  cellHeight: number,
  fontSize: number,
  fontFamily: string,
  font?: opentype.Font // New optional parameter
): Promise<string> {
  // Try opentype.js path extraction first
  if (font) {
    const path = convertGlyphToSvgPath(font, {
      char, x, y, cellWidth, cellHeight, fontSize
    });
    
    if (path) {
      return renderSvgPath(path, color, bgColor);
    }
  }
  
  // Fallback to pixel tracing
  return convertTextToPathPixelTracing(...);
}
```

**Validation**:
- [ ] SVG export uses opentype paths when available
- [ ] Fallback works when font unavailable
- [ ] All export options still work (grid, background, prettify)
- [ ] Performance is acceptable

---

### Phase 5: UI Enhancements (1-2 hours)
**Tasks**:
1. Add font selection dropdown to ImageExportDialog
2. Show which font will be used for outlines
3. Add loading indicator for font preparation
4. Display warning if selected font unavailable

**UI Changes in ImageExportDialog**:
```tsx
{svgSettings.textAsOutlines && (
  <div className="space-y-2">
    <Label>Outline Font</Label>
    <Select
      value={svgSettings.outlineFont}
      onValueChange={(value) => handleSvgSettingChange('outlineFont', value)}
    >
      <SelectItem value="roboto-mono">Roboto Mono (Recommended)</SelectItem>
      <SelectItem value="jetbrains-mono">JetBrains Mono</SelectItem>
      <SelectItem value="auto">Auto-detect from Canvas</SelectItem>
    </Select>
    <p className="text-xs text-muted-foreground">
      Font used for converting text to vector paths
    </p>
  </div>
)}
```

**Validation**:
- [ ] Font selection UI is intuitive
- [ ] Selected font is used in export
- [ ] Loading states are clear
- [ ] Warnings display appropriately

---

### Phase 6: Testing & Quality Assurance (2-3 hours)
**Tasks**:
1. Test with various character sets (ASCII, Unicode, special chars)
2. Test fallback scenarios (missing fonts, network errors)
3. Performance testing with large canvases
4. Cross-browser compatibility testing
5. File size comparison vs. text-based SVG

**Test Cases**:
```
1. Basic ASCII characters (a-z, A-Z, 0-9)
2. Special characters (!@#$%^&*()[]{}...)
3. Box-drawing characters (─│┌┐└┘├┤┬┴┼)
4. Unicode characters (if supported by font)
5. Empty cells and whitespace
6. Very large canvases (100x100 characters)
7. All export options combined
8. Missing font fallback
9. Network offline scenario
```

**Performance Benchmarks**:
- Target: < 2 seconds for 50x50 character canvas
- Memory: < 50MB additional for font cache
- Bundle size increase: < 500KB

**Validation**:
- [ ] All characters render correctly
- [ ] Performance meets targets
- [ ] Fallbacks work reliably
- [ ] No memory leaks
- [ ] Cross-browser compatible

---

### Phase 7: Documentation (1 hour)
**Tasks**:
1. Update `DEVELOPMENT.md` with font system architecture
2. Create `FONT_LOADING_SYSTEM.md` in `/docs`
3. Update `README.md` with font licensing attribution
4. Document font selection in user guide
5. Add code comments for future maintainers

**Documentation Files**:
- `docs/FONT_LOADING_SYSTEM.md` - Technical documentation
- `docs/SVG_EXPORT_GUIDE.md` - User guide for SVG export options
- `README.md` - Font license attributions
- Code comments in all new files

**Validation**:
- [ ] All new features documented
- [ ] Font licenses properly attributed
- [ ] Code is well-commented
- [ ] Examples provided

---

## 📊 Technical Details

### Font Loading Strategy
```typescript
// Preload fonts on app initialization
async function initializeFonts() {
  const fontLoader = new FontLoader();
  
  // Load bundled fonts in parallel
  await Promise.all([
    fontLoader.loadFont('/fonts/roboto-mono/RobotoMono-Regular.ttf'),
    fontLoader.loadFont('/fonts/jetbrains-mono/JetBrainsMono-Regular.ttf')
  ]);
  
  console.log('Fonts preloaded for SVG export');
}
```

### Coordinate Transformation Math
```typescript
function transformFontPathToSvg(
  glyphPath: opentype.Path,
  fontSize: number,
  cellX: number,
  cellY: number,
  cellWidth: number,
  cellHeight: number,
  font: opentype.Font
): string {
  // Font units to pixels scale
  const scale = fontSize / font.unitsPerEm;
  
  // Calculate centering offsets
  const glyphWidth = glyph.advanceWidth * scale;
  const offsetX = cellX * cellWidth + (cellWidth - glyphWidth) / 2;
  const offsetY = (cellY + 1) * cellHeight - (cellHeight - fontSize) / 2;
  
  // Transform commands
  const commands = glyphPath.commands.map(cmd => {
    const x = offsetX + cmd.x * scale;
    const y = offsetY - cmd.y * scale; // Flip Y-axis
    
    switch(cmd.type) {
      case 'M': return `M${x},${y}`;
      case 'L': return `L${x},${y}`;
      case 'Q': return `Q${cmd.x1*scale},${cmd.y1*scale} ${x},${y}`;
      case 'C': return `C${cmd.x1*scale},${cmd.y1*scale} ${cmd.x2*scale},${cmd.y2*scale} ${x},${y}`;
      case 'Z': return 'Z';
    }
  });
  
  return commands.join(' ');
}
```

### Type Definitions
```typescript
// src/utils/font/types.ts

export interface FontMetadata {
  id: string;
  name: string;
  fileName: string;
  path: string;
  license: string;
  weight: 'regular' | 'bold';
}

export interface FontLoadOptions {
  preload?: boolean;
  cache?: boolean;
}

export interface GlyphExportOptions {
  char: string;
  position: { x: number; y: number };
  cellSize: { width: number; height: number };
  fontSize: number;
  color: string;
  backgroundColor?: string;
}
```

### Export Settings Update
```typescript
// src/types/export.ts

export interface SvgExportSettings {
  includeGrid: boolean;
  textAsOutlines: boolean;
  includeBackground: boolean;
  prettify: boolean;
  outlineFont?: 'roboto-mono' | 'jetbrains-mono' | 'auto'; // New
}
```

---

## 🚨 Risks & Mitigation

### Risk 1: Font File Size
**Risk**: Bundled fonts increase initial load time
**Impact**: Medium
**Mitigation**: 
- Use WOFF2 format (best compression)
- Lazy-load fonts only when text-as-outlines is enabled
- Subset fonts to include only common characters
- Consider CDN hosting

### Risk 2: Missing Glyphs
**Risk**: Character not available in selected font
**Impact**: Low
**Mitigation**:
- Check glyph availability before conversion
- Fall back to alternative font
- Ultimate fallback to pixel tracing
- Show warning in UI

### Risk 3: Performance
**Risk**: Path extraction slower than pixel tracing
**Impact**: Low
**Mitigation**:
- Implement font caching
- Process characters in parallel
- Show progress indicator
- Benchmark and optimize

### Risk 4: Browser Compatibility
**Risk**: opentype.js not working in all browsers
**Impact**: Low
**Mitigation**:
- Test in all major browsers
- Maintain pixel tracing fallback
- Document browser requirements

### Risk 5: Font Licensing
**Risk**: License violations for bundled fonts
**Impact**: High
**Mitigation**:
- Only use OFL or MIT licensed fonts
- Include full license texts
- Attribute properly in UI/documentation
- Regular license compliance audits

---

## 📈 Success Metrics

### Quality Metrics
- [ ] SVG path accuracy: > 99% match to original glyph
- [ ] Character spacing error: < 0.5 pixels
- [ ] Baseline alignment error: < 0.5 pixels

### Performance Metrics
- [ ] Font load time: < 500ms (cached)
- [ ] Export time (50x50): < 2 seconds
- [ ] Memory usage: < 50MB additional

### User Experience Metrics
- [ ] Clear font selection UI
- [ ] Helpful error messages
- [ ] Progress indication during export
- [ ] Professional quality output

---

## 🔄 Rollback Plan

If implementation fails or causes issues:

1. **Keep pixel tracing as fallback** - Already implemented
2. **Feature flag** - Add `ENABLE_OPENTYPE_OUTLINES` environment variable
3. **UI toggle** - Allow users to choose tracing method
4. **Remove fonts** - Can remove bundled fonts to reduce size
5. **Revert commits** - All changes in feature branch

---

## 📅 Estimated Timeline

| Phase | Task | Hours | Dependencies |
|-------|------|-------|--------------|
| 1 | Setup & Dependencies | 1-2 | None |
| 2 | Font Loading System | 2-3 | Phase 1 |
| 3 | Glyph Path Conversion | 3-4 | Phase 2 |
| 4 | SVG Export Integration | 2-3 | Phase 3 |
| 5 | UI Enhancements | 1-2 | Phase 4 |
| 6 | Testing & QA | 2-3 | Phase 5 |
| 7 | Documentation | 1 | Phase 6 |
| **Total** | | **12-17 hours** | |

---

## 🎓 Learning Resources

### opentype.js Documentation
- Official Docs: https://opentype.js.org/
- GitHub: https://github.com/opentypejs/opentype.js
- API Reference: https://opentype.js.org/api.html

### Font Resources
- Google Fonts: https://fonts.google.com/
- Font Squirrel (OFL fonts): https://www.fontsquirrel.com/
- Open Font License: https://scripts.sil.org/OFL

### SVG Path Specification
- MDN Path Data: https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
- W3C SVG Spec: https://www.w3.org/TR/SVG/paths.html

---

## ✅ Final Checklist

Before declaring implementation complete:

- [ ] All phases completed
- [ ] All validation checks passed
- [ ] Tests written and passing
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] Performance benchmarks met
- [ ] Cross-browser testing complete
- [ ] License attributions in place
- [ ] User guide updated
- [ ] Rollback plan tested

---

## 📝 Notes for Implementation

### Critical Implementation Details

1. **Font Coordinate System**: OpenType fonts use a bottom-up coordinate system with origin at baseline. SVG uses top-down with origin at top-left. Must flip Y-axis and adjust baseline.

2. **Centering Characters**: ASCII art requires perfect character centering. Calculate exact offsets based on glyph advance width and font metrics.

3. **Path Commands**: OpenType path commands must be converted to SVG path syntax (M, L, Q, C, Z).

4. **Error Handling**: Every font operation can fail. Always have fallbacks ready.

5. **Caching Strategy**: Cache loaded fonts in memory, not localStorage (binary data too large).

### Best Practices

- **Progressive Enhancement**: Text rendering works, then pixel tracing, then opentype paths
- **Graceful Degradation**: If opentype fails, fall back to pixel tracing
- **User Feedback**: Show what's happening during font loading and export
- **Type Safety**: Full TypeScript types for all font operations
- **Testing**: Test with edge cases (empty strings, unicode, special chars)

---

**Status**: Ready for implementation approval and execution
