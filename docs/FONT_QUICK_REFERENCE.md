# Quick Reference: Adding Fonts to ASCII Motion

## 5-Step Font Addition Process

### 1. Add Font Files
```
public/fonts/your-font/
  └── YourFont-Regular.woff2
```

### 2. Add @font-face
**File:** `packages/web/src/index.css`
```css
@font-face {
  font-family: 'Your Font Name';
  src: url('/fonts/your-font/YourFont-Regular.woff2') format('woff2');
  font-display: swap;
}
```

### 3. Update Main App
**File:** `packages/web/src/constants/fonts.ts`
```typescript
{ 
  id: 'your-font', 
  name: 'Your Font Name',
  stack: '"Your Font Name", monospace'  // Quote if name has spaces!
}
```

### 4. Update Community Gallery
**File:** `packages/premium/src/community/utils/fontMapping.ts`
```typescript
'your-font': '"Your Font Name", monospace',  // Must match fonts.ts exactly!
```

### 5. Increment Cache Version (if needed)
**File:** `packages/premium/src/community/pages/ProjectDetailPage.tsx`
```typescript
const CACHE_VERSION = 'v3';  // Increment if data structure changed
```

---

## Critical Rules

### ✅ DO
- Quote font names with spaces: `"Font Name", monospace`
- Keep font stacks identical between `fonts.ts` and `fontMapping.ts`
- Use lowercase kebab-case for font IDs: `my-font`
- Test in both editor and gallery
- Clear browser cache when testing

### ❌ DON'T
- Forget quotes on font names with spaces (silent fallback!)
- Set canvas width/height in JSX (conflicts with sizing logic)
- Assume fonts work everywhere if they work in editor
- Skip cache version increment when changing data structure

---

## Testing Command

```bash
# Quick test in browser console
document.fonts.check('16px "Your Font Name"');
// Should return: true
```

---

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Font works in editor, not gallery | Missing from `fontMapping.ts` | Add to `fontMapping.ts` |
| Font fallback everywhere | Missing quotes around name | Add quotes: `"Font Name"` |
| Gallery card works, detail page doesn't | Stale cache | Increment `CACHE_VERSION` |
| Canvas null errors | Async race condition | Add null checks after async |
| Wrong size on first load | JSX dimensions conflict | Remove width/height from JSX |

---

## Debug Logs to Check

1. **Font Loading:** `[DirectRenderer] Font loaded and ready: <stack>`
2. **Font ID:** `[ProjectDetail] Loaded sessionData with fontId: <id>`
3. **Gallery Card:** `[GalleryCard] Animation loaded successfully: {fontId: '<id>'}`

---

## Full Documentation

- **Complete Guide:** `/docs/ADDING_CUSTOM_FONTS.md`
- **Gallery System:** `/packages/premium/docs/COMMUNITY_GALLERY_FONTS.md`
