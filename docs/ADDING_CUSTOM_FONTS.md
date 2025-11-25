# Adding Custom Fonts to ASCII Motion

This guide covers how to properly add custom fonts to ASCII Motion so they work correctly across the main application, community gallery, and all rendering contexts.

## Overview

ASCII Motion has **two separate font systems** that must be kept in sync:

1. **Main App Font System** (`packages/web/src/`) - Used by the editor and main application
2. **Community Gallery Font System** (`packages/premium/src/community/`) - Used by the community gallery for optimized canvas rendering

Both systems must be updated when adding new fonts, or fonts will appear broken in one context or the other.

---

## Prerequisites

### Font Format Requirements

- **Format**: Web fonts (`.woff2`, `.woff`, `.ttf`, or `.otf`)
- **Monospace**: Must be monospace fonts for proper ASCII art rendering
- **License**: Ensure you have proper licensing for web distribution
- **Hosting**: Fonts should be self-hosted in the `/public/fonts/` directory

### Font Naming Considerations

- Font names with **spaces** require special handling (see below)
- Use lowercase kebab-case for font IDs (e.g., `ibm-vga`, `ibm-dos`)
- Keep font family names exact as defined in the font file

---

## Step-by-Step Guide

### 1. Add Font Files to Public Directory

Place font files in the appropriate location:

```
public/fonts/your-font-family/
  ├── regular.woff2
  ├── bold.woff2 (optional)
  └── italic.woff2 (optional)
```

**Example:**
```
public/fonts/px437-ibm-vga-9x14/
  └── Px437_IBM_VGA_9x14.woff2
```

### 2. Define CSS @font-face Declaration

Add the font-face declaration to your global CSS file:

**File:** `packages/web/src/index.css`

```css
@font-face {
  font-family: 'Px437 IBM VGA 9x14';
  src: url('/fonts/px437-ibm-vga-9x14/Px437_IBM_VGA_9x14.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
```

**Important Notes:**
- Use the exact `font-family` name as defined in the font file
- Use relative URLs starting with `/fonts/`
- Set `font-display: swap` for better loading performance
- If the font name contains spaces, keep them in the CSS (quoting not needed in @font-face)

### 3. Update Main App Font Constants

Add the font to the main application's font system:

**File:** `packages/web/src/constants/fonts.ts`

```typescript
export const FONT_OPTIONS = [
  // ... existing fonts
  { 
    id: 'ibm-vga', 
    name: 'IBM VGA 9x14',
    stack: '"Px437 IBM VGA 9x14", monospace' // ⚠️ QUOTE font names with spaces!
  },
  { 
    id: 'ibm-dos', 
    name: 'IBM DOS ISO8',
    stack: '"Px437 IBM DOS ISO8", monospace' // ⚠️ QUOTE font names with spaces!
  },
] as const;
```

**Critical Rules:**
- `id`: Lowercase kebab-case, used in sessionData
- `name`: Human-readable display name for UI dropdowns
- `stack`: CSS font-family stack for rendering
  - **MUST quote font names containing spaces** (e.g., `"Px437 IBM VGA 9x14"`)
  - Always include fallback (e.g., `, monospace`)
  - Without quotes, browsers silently fall back to default fonts

**Why Quoting Matters:**
```typescript
// ❌ WRONG - Browser will ignore and use fallback
stack: 'Px437 IBM VGA 9x14, monospace'

// ✅ CORRECT - Browser will use the custom font
stack: '"Px437 IBM VGA 9x14", monospace'
```

### 4. Update Community Gallery Font Mapping

Add the font to the community gallery's optimized rendering system:

**File:** `packages/premium/src/community/utils/fontMapping.ts`

```typescript
export function getFontStack(fontId: string): string {
  const fontMap: Record<string, string> = {
    // ... existing fonts
    'ibm-vga': '"Px437 IBM VGA 9x14", monospace', // ⚠️ MUST match fonts.ts exactly!
    'ibm-dos': '"Px437 IBM DOS ISO8", monospace', // ⚠️ MUST match fonts.ts exactly!
  };

  return fontMap[fontId] || fontMap['auto'];
}
```

**Critical Rules:**
- Font ID must match exactly from `fonts.ts`
- Font stack must match exactly from `fonts.ts` (including quotes!)
- Gallery uses direct canvas rendering, so font names with spaces **require quotes**
- Without quotes, canvas `ctx.font` silently falls back to default

### 5. Preload Fonts (Optional but Recommended)

Add font preloading for better performance:

**File:** `index.html`

```html
<head>
  <!-- Preload critical fonts -->
  <link 
    rel="preload" 
    href="/fonts/px437-ibm-vga-9x14/Px437_IBM_VGA_9x14.woff2" 
    as="font" 
    type="font/woff2" 
    crossorigin
  />
</head>
```

### 6. Invalidate SessionStorage Cache

When updating font structures, increment the cache version to force fresh data loading:

**File:** `packages/premium/src/community/pages/ProjectDetailPage.tsx`

```typescript
// Find this line and increment the version number
const CACHE_VERSION = 'v3'; // Increment from v2 → v3
```

**When to Increment:**
- Adding new fonts with different ID schemes
- Changing font stack formats
- Updating typography data structures

---

## Font System Architecture

### Main App Flow

```
User selects font in dropdown
  ↓
fonts.ts provides font.stack
  ↓
Applied to canvas via ctx.font = `${fontSize}px ${fontStack}`
  ↓
Browser renders using loaded @font-face
```

### Community Gallery Flow

```
Project loads with sessionData.typography.selectedFontId
  ↓
fontMapping.ts maps fontId → fontStack
  ↓
directCanvasRenderer.ts loads font via document.fonts.load()
  ↓
Applied to canvas via ctx.font = `${fontSize}px ${fontStack}`
  ↓
Browser renders using loaded @font-face
```

**Key Difference:** Gallery uses `document.fonts.load()` API to ensure fonts are ready before rendering frames.

---

## Common Issues & Solutions

### Issue: Font Not Displaying in Editor

**Symptoms:** Dropdown shows font name, but renders with fallback font

**Solutions:**
1. Check browser DevTools Network tab - is font file loading?
2. Verify @font-face `font-family` matches exactly
3. Check `fonts.ts` stack has quotes around names with spaces
4. Inspect element and verify computed `font-family` in DevTools

### Issue: Font Not Displaying in Community Gallery

**Symptoms:** Gallery cards show fallback font, console may show `[DirectRenderer] Font loaded and ready: SF Mono...` instead of custom font

**Solutions:**
1. Verify font is in `fontMapping.ts` with correct ID
2. Check font stack has quotes around names with spaces
3. Check console for `[DirectRenderer] Font loaded and ready:` log
4. Verify sessionData has correct `typography.selectedFontId`

### Issue: Font Works in Gallery Card but Not ProjectDetailPage

**Symptoms:** Gallery card animation uses correct font, but detail page shows fallback

**Solutions:**
1. Check sessionStorage cache - clear browser storage or increment `CACHE_VERSION`
2. Verify both components use same `loadPublishedProject` function
3. Check console logs for both contexts to compare loaded fontId

### Issue: Canvas Text Rendering Incorrectly

**Symptoms:** Text appears in wrong font, spacing issues, or misalignment

**Solutions:**
1. Ensure font is truly monospace (all chars same width)
2. Verify `font-display: swap` is set (prevents invisible text)
3. Check `document.fonts.load()` resolves before first render
4. Inspect canvas font measurement: `ctx.measureText('M').width`

---

## Font Loading Optimization

### Async Font Loading in Gallery

The community gallery uses async font loading to prevent rendering before fonts are ready:

```typescript
// In directCanvasRenderer.ts
async function loadFont(fontFamily: string, fontSize: number): Promise<void> {
  try {
    await document.fonts.load(`${fontSize}px ${fontFamily}`);
    console.log('[DirectRenderer] Font loaded and ready:', fontStack);
  } catch (err) {
    console.warn('[DirectRenderer] Font load warning:', err);
  }
}
```

This is called automatically before rendering any frames, ensuring fonts are ready.

### Font Display Strategy

Use `font-display: swap` for all custom fonts:

```css
@font-face {
  font-family: 'Custom Font';
  font-display: swap; /* Show fallback immediately, swap when ready */
}
```

**Options:**
- `swap`: Best for UI - shows fallback immediately
- `block`: Brief invisible period, then font appears (can cause FOIT)
- `optional`: Font used only if cached (not recommended for custom fonts)

---

## Testing Checklist

When adding a new font, test these scenarios:

### Main Application
- [ ] Font appears in typography dropdown
- [ ] Font renders correctly in canvas editor
- [ ] Font persists after save/load
- [ ] Font works in all drawing tools (brush, text, shapes)
- [ ] Font exports correctly to JSON
- [ ] Font exports correctly to video

### Community Gallery
- [ ] Font appears in published projects list
- [ ] Font renders on gallery card playback
- [ ] Font renders on project detail page
- [ ] Font survives page refresh (check cache)
- [ ] Font works in project detail overlay
- [ ] Font renders in static preview generation

### Cross-Browser
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari

### Performance
- [ ] Font loads in < 1s on fast connection
- [ ] Font doesn't block initial render
- [ ] No FOUT (Flash of Unstyled Text) visible
- [ ] Multiple fonts don't cause layout shift

---

## Quick Reference: Font Addition Checklist

```
✅ Add font files to /public/fonts/
✅ Add @font-face to packages/web/src/index.css
✅ Add font to packages/web/src/constants/fonts.ts (with quotes if needed)
✅ Add font to packages/premium/src/community/utils/fontMapping.ts (exact match)
✅ (Optional) Add preload to index.html
✅ (If structure changed) Increment CACHE_VERSION in ProjectDetailPage.tsx
✅ Test in editor
✅ Test in gallery cards
✅ Test in project detail page
✅ Test after page refresh
```

---

## Example: Complete Font Addition

Here's a complete example adding "JetBrains Mono":

**1. Add font file:**
```
public/fonts/jetbrains-mono/
  └── JetBrainsMono-Regular.woff2
```

**2. Add @font-face:**
```css
/* packages/web/src/index.css */
@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/jetbrains-mono/JetBrainsMono-Regular.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
```

**3. Add to fonts.ts:**
```typescript
/* packages/web/src/constants/fonts.ts */
export const FONT_OPTIONS = [
  // ... existing fonts
  { 
    id: 'jetbrains-mono', 
    name: 'JetBrains Mono',
    stack: '"JetBrains Mono", monospace' // Quote because name has space
  },
] as const;
```

**4. Add to fontMapping.ts:**
```typescript
/* packages/premium/src/community/utils/fontMapping.ts */
export function getFontStack(fontId: string): string {
  const fontMap: Record<string, string> = {
    // ... existing fonts
    'jetbrains-mono': '"JetBrains Mono", monospace', // Must match fonts.ts exactly!
  };
  return fontMap[fontId] || fontMap['auto'];
}
```

**5. (Optional) Preload:**
```html
<!-- index.html -->
<link rel="preload" href="/fonts/jetbrains-mono/JetBrainsMono-Regular.woff2" as="font" type="font/woff2" crossorigin />
```

Done! Font is now available everywhere.

---

## Troubleshooting Font Issues

### Debug Logs

Enable these debug logs to diagnose font loading:

**Gallery Font Loading:**
```typescript
// In directCanvasRenderer.ts - already present
console.log('[DirectRenderer] Font loaded and ready:', fontStack);
```

**SessionData Font ID:**
```typescript
// In ProjectDetailPage.tsx - already present
console.log('[ProjectDetail] Loaded sessionData with fontId:', data.sessionData.typography?.selectedFontId);
```

**Gallery Card Font ID:**
```typescript
// In GalleryCard.tsx - already present
console.log('[GalleryCard] Animation loaded successfully:', {
  fontId: fullProject.sessionData?.typography?.selectedFontId
});
```

### Browser DevTools Inspection

**Check computed font:**
1. Inspect canvas element
2. Open DevTools Computed tab
3. Search for `font-family`
4. Verify custom font is listed first (not fallback)

**Check font loading:**
1. Open DevTools Network tab
2. Filter by "Font" type
3. Verify font file loads (status 200)
4. Check file size is reasonable (< 500KB)

**Check font readiness:**
```javascript
// Run in browser console
document.fonts.check('16px "Px437 IBM VGA 9x14"'); // Should return true
```

---

## Additional Resources

- [MDN: CSS @font-face](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face)
- [MDN: font-display](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display)
- [MDN: FontFace API](https://developer.mozilla.org/en-US/docs/Web/API/FontFace)
- [Web Font Loading Best Practices](https://web.dev/font-best-practices/)

---

## Summary

Adding fonts to ASCII Motion requires updating **two separate systems**:

1. **Main App** (`fonts.ts`) - For editor and UI
2. **Community Gallery** (`fontMapping.ts`) - For optimized canvas rendering

**Critical Rule:** Font names with spaces **must be quoted** in both font stacks:
```typescript
'"Px437 IBM VGA 9x14", monospace'  // ✅ Correct
'Px437 IBM VGA 9x14, monospace'    // ❌ Wrong - silently falls back
```

Follow this guide and the checklist to ensure fonts work correctly across all contexts.
