# COEP/CSP Troubleshooting Guide

## Quick Diagnostic Flowchart

```
Issue: FFmpeg or Vimeo not working in production
├── Check 1: Does it work on localhost?
│   ├── No → Check vite.config.ts, might be COEP headers interfering
│   └── Yes → Problem is production-specific (continue below)
│
├── Check 2: Which browser?
│   ├── Chrome only → Likely needs iframe credentialless attribute
│   ├── Safari only → Rare, check console for specific errors
│   └── Both → CSP or COEP configuration issue
│
├── Check 3: What's failing?
│   ├── FFmpeg → Check CSP connect-src for unpkg.com
│   ├── Vimeo → Check iframe credentialless attribute (Chrome)
│   └── Both → Check COEP header value
│
└── Check 4: Console errors?
    ├── "Refused to connect" → CSP connect-src issue
    ├── "COEP violation" → Check COEP value and iframe attributes
    └── "Failed to fetch" → Network issue or CSP blocking
```

## Error Messages & Solutions

### Error: "Refused to connect to 'https://unpkg.com/...ffmpeg-core.wasm'"

**Full Error:**
```
Refused to connect to 'https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm/ffmpeg-core.wasm' 
because it violates the following Content Security Policy directive: "connect-src 'self'"
```

**Diagnosis:** CSP is missing `unpkg.com` in `connect-src` directive.

**Solution:**
1. Open `vercel.json`
2. Find `Content-Security-Policy` header
3. Locate `connect-src` directive
4. Ensure it includes `https://unpkg.com`

**Example:**
```json
"connect-src 'self' https://*.supabase.co https://unpkg.com"
```

**Common Mistake:** Adding `unpkg.com` to `script-src` but forgetting `connect-src`.

---

### Error: "Failed to load FFmpeg: TypeError: Failed to fetch"

**Full Error:**
```
Failed to load FFmpeg: TypeError: Failed to fetch
❌ FFmpeg MP4 export failed: Error: Failed to initialize FFmpeg: TypeError: Failed to fetch
```

**Diagnosis:** Either CSP blocking or COEP preventing SharedArrayBuffer.

**Solution:**
1. Check console for specific CSP errors (see above)
2. Verify COEP header: `Cross-Origin-Embedder-Policy: credentialless`
3. Verify COOP header: `Cross-Origin-Opener-Policy: same-origin`
4. Check Network tab > Headers for the HTML document

---

### Error: Vimeo iframe blank/not loading (Chrome only)

**Symptoms:**
- Works on localhost
- Works in Safari production
- Blank in Chrome production
- No console errors (sometimes)

**Diagnosis:** Chrome requires explicit `credentialless` attribute on iframes when parent has `COEP: credentialless`.

**Solution:**
1. Open `src/components/features/WelcomeDialog.tsx`
2. Find the `<iframe>` tag
3. Add: `{...({ credentialless: 'true' } as any)}`

**Example:**
```tsx
<iframe
  src="https://player.vimeo.com/video/123456"
  {...({ credentialless: 'true' } as any)}
  allow="autoplay; fullscreen"
/>
```

---

### Error: "SharedArrayBuffer is not defined"

**Diagnosis:** COEP/COOP headers not set correctly or at all.

**Solution:**
1. Verify `vercel.json` has both:
   - `Cross-Origin-Embedder-Policy: credentialless`
   - `Cross-Origin-Opener-Policy: same-origin`
2. Check Network tab > Headers on the HTML document
3. Ensure headers are applied to `"source": "/(.*)"` pattern

---

## Browser DevTools Checklist

### Network Tab Investigation

1. **Load the preview URL**
2. **Open DevTools > Network tab**
3. **Reload page**
4. **Click on the HTML document (usually first row)**
5. **Check Response Headers tab**

**Expected Headers:**
```
Cross-Origin-Embedder-Policy: credentialless
Cross-Origin-Opener-Policy: same-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; connect-src 'self' https://*.supabase.co https://unpkg.com; worker-src 'self' blob:; frame-src https://player.vimeo.com https://www.youtube.com; ...
```

**Missing or Wrong?** → Problem is in `vercel.json` headers configuration

### Console Tab Investigation

**For FFmpeg Issues:**
1. Try to export a video
2. Check console for errors
3. Look for keywords: "CSP", "connect", "unpkg", "wasm"

**For Vimeo Issues:**
1. Open Welcome Dialog
2. Check console for errors
3. Look for keywords: "iframe", "COEP", "credentialless"

---

## Testing Matrix

Use this checklist after making changes to security headers:

| Test | Chrome (local) | Chrome (prod) | Safari (local) | Safari (prod) |
|------|----------------|---------------|----------------|---------------|
| FFmpeg export | ✅ | ✅ | ✅ | ✅ |
| Vimeo playback | ✅ | ✅ | ✅ | ✅ |
| No console errors | ✅ | ✅ | ✅ | ✅ |

**How to Test:**
1. **Localhost:** `npm run dev` → Test both features
2. **Production:** `npm run deploy:preview` → Test in both browsers

---

## Configuration Files Quick Reference

| File | Purpose | Notes |
|------|---------|-------|
| `vercel.json` | Production COEP/CSP | Must include unpkg.com in both script-src AND connect-src |
| `vite.config.ts` | Development config | No COEP headers (easier iframe testing) |
| `WelcomeDialog.tsx` | Vimeo iframe | Must have `credentialless="true"` for Chrome |

---

## When to Use Each COEP Policy

### credentialless ✅ (Current)
**Use when:**
- Need SharedArrayBuffer (FFmpeg)
- Need cross-origin iframes (Vimeo, YouTube)
- Want both to work together

**Pros:**
- FFmpeg works
- Iframes work (with `credentialless` attribute)

**Cons:**
- Browser compatibility varies
- Chrome is stricter than Safari

### require-corp ❌ (Too Strict)
**Use when:**
- Only need SharedArrayBuffer
- No cross-origin content needed

**Pros:**
- Better security
- Well-supported

**Cons:**
- Blocks all iframes (Vimeo, YouTube)
- Requires CORP headers from all resources

### unsafe-none ❌ (Breaks FFmpeg)
**Use when:**
- Don't need SharedArrayBuffer
- Only need iframes

**Pros:**
- Iframes work without issues

**Cons:**
- SharedArrayBuffer disabled
- FFmpeg won't work

---

## Emergency Rollback

If production breaks due to COEP/CSP changes:

1. **Revert vercel.json:**
   ```bash
   git checkout HEAD~1 vercel.json
   git commit -m "Revert COEP changes"
   npm run deploy:preview
   ```

2. **Or use working commit:**
   ```bash
   git log --oneline | grep -i "coep\|csp"
   git checkout <commit-hash> vercel.json
   ```

3. **Last resort - remove COEP entirely:**
   ```json
   // In vercel.json, remove COEP header temporarily
   {
     "key": "Cross-Origin-Embedder-Policy",
     "value": "unsafe-none"  // Disables FFmpeg but unblocks everything
   }
   ```

---

## Getting Help

If this guide doesn't solve your issue:

1. **Check full documentation:** `docs/COEP_CONFIGURATION_GUIDE.md`
2. **Check vercel.json reference:** `docs/VERCEL_JSON_REFERENCE.md`
3. **Check recent commits:** `git log --oneline | grep -i "coep\|csp\|ffmpeg\|vimeo"`
4. **Check browser compatibility:** Different Chrome/Safari versions may behave differently

---

## Prevention Checklist

Before committing changes to security headers:

- [ ] Test FFmpeg export in Chrome (localhost + production)
- [ ] Test FFmpeg export in Safari (localhost + production)
- [ ] Test Vimeo playback in Chrome (localhost + production)
- [ ] Test Vimeo playback in Safari (localhost + production)
- [ ] Check console for no COEP/CSP violations
- [ ] Verify Network tab shows correct headers
- [ ] Document what you changed and why
- [ ] Consider browser compatibility differences

---

## Summary

**Most Common Issues:**
1. Missing `unpkg.com` in CSP `connect-src` → FFmpeg fails
2. Missing iframe `credentialless` attribute → Vimeo fails in Chrome
3. Wrong COEP value (`require-corp`) → Iframes blocked entirely

**Quick Fixes:**
1. Always include `unpkg.com` in BOTH `script-src` AND `connect-src`
2. Always add `credentialless="true"` to cross-origin iframes
3. Use `COEP: credentialless` (not `require-corp` or `unsafe-none`)
4. Test in both Chrome and Safari on both localhost and production
