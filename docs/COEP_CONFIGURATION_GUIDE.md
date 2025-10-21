# COEP Configuration Guide

## Overview

This document explains the Cross-Origin-Embedder-Policy (COEP) configuration for Ascii Motion, including why it's needed, how it's configured, and troubleshooting steps for cross-browser compatibility issues.

## Why COEP is Required

Ascii Motion requires `SharedArrayBuffer` support for FFmpeg video exports. Modern browsers require specific security headers to enable `SharedArrayBuffer`:

1. **Cross-Origin-Embedder-Policy (COEP)**: Ensures cross-origin resources are loaded with explicit permission
2. **Cross-Origin-Opener-Policy (COOP)**: Isolates the browsing context from other windows

Without these headers, FFmpeg cannot initialize and video exports will fail.

## Current Configuration

### Production (vercel.json)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "credentialless"
        },
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; connect-src 'self' https://*.supabase.co https://unpkg.com; frame-src https://player.vimeo.com https://www.youtube.com; worker-src 'self' blob:; ..."
        }
      ]
    }
  ]
}
```

### Development (vite.config.ts)

```typescript
export default defineConfig({
  server: {
    // No COEP headers in development for easier iframe testing
    // headers: {
    //   'Cross-Origin-Embedder-Policy': 'credentialless',
    //   'Cross-Origin-Opener-Policy': 'same-origin',
    // },
  },
});
```

**Why no COEP in development?** 
- Easier testing of iframes (Vimeo, YouTube)
- Localhost doesn't have the same cross-origin restrictions
- Both FFmpeg and iframes work without COEP on localhost

## COEP Policy Options

### Option 1: `require-corp` (Strict)
```
Cross-Origin-Embedder-Policy: require-corp
```

**Pros:**
- Strongest security
- Well-supported in all browsers

**Cons:**
- Blocks ALL cross-origin resources unless they send `Cross-Origin-Resource-Policy: cross-origin`
- Breaks iframes (Vimeo, YouTube) unless they explicitly opt-in
- Vimeo/YouTube don't send CORP headers, so they're blocked

**Result:** ❌ FFmpeg works, but iframes are completely blocked

### Option 2: `credentialless` (Balanced) ✅ Current Choice
```
Cross-Origin-Embedder-Policy: credentialless
```

**Pros:**
- Enables `SharedArrayBuffer` for FFmpeg
- Allows cross-origin iframes to load without credentials
- More permissive than `require-corp`

**Cons:**
- Newer policy with varying browser support
- Chrome is stricter than Safari
- Requires iframe `credentialless` attribute for Chrome

**Result:** ✅ Both FFmpeg and iframes work with proper configuration

### Option 3: `unsafe-none` (Permissive)
```
Cross-Origin-Embedder-Policy: unsafe-none
```

**Pros:**
- No restrictions on cross-origin resources
- Iframes work without issues

**Cons:**
- ❌ Disables `SharedArrayBuffer` completely
- FFmpeg won't work at all

**Result:** ❌ Not viable for our use case

## Browser Compatibility

### Safari
- ✅ More lenient with `credentialless` policy
- ✅ Allows iframes without explicit `credentialless` attribute
- ✅ Both FFmpeg and Vimeo work with standard configuration

### Chrome
- ⚠️ Stricter enforcement of `credentialless` policy
- ❌ Blocks iframes unless they have `credentialless="true"` attribute
- ✅ Works correctly with iframe attribute added

### Solution for Chrome

Add the `credentialless` attribute to all cross-origin iframes:

```tsx
<iframe
  src="https://player.vimeo.com/video/123456"
  {...({ credentialless: 'true' } as any)}
  // other props
/>
```

**Note:** TypeScript doesn't recognize `credentialless` as a valid iframe attribute yet, so we use a type assertion.

## Content Security Policy (CSP) Requirements

The CSP must allow FFmpeg to load from unpkg.com CDN:

### Script Loading (script-src)
```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com
```
Allows FFmpeg JavaScript to load from unpkg.com

### Resource Fetching (connect-src)
```
connect-src 'self' https://*.supabase.co https://unpkg.com
```
**Critical:** Allows FFmpeg to fetch WASM files from unpkg.com

### Workers (worker-src)
```
worker-src 'self' blob:
```
Allows FFmpeg to spawn Web Workers for video processing

### Iframes (frame-src)
```
frame-src https://player.vimeo.com https://www.youtube.com
```
Allows Vimeo and YouTube embeds in Welcome Dialog

### Media Files (media-src)
```
media-src 'self' blob:
```
**Critical:** Allows video/image previews during import

**Why blob URLs?** When users import videos or images, the browser creates temporary blob URLs to display previews in the import dialog. Without `media-src blob:`, these previews will be blocked by CSP.

## Common Issues and Solutions

### Issue 1: FFmpeg Fails to Initialize

**Symptoms:**
```
Failed to load FFmpeg: TypeError: Failed to fetch
Failed to initialize FFmpeg: TypeError: Failed to fetch
```

**Cause:** CSP blocking FFmpeg WASM file from unpkg.com

**Solution:** Add `https://unpkg.com` to `connect-src` directive in CSP

### Issue 2: Vimeo Iframe Blocked in Chrome

**Symptoms:**
- Works in Safari
- Works in localhost
- Blocked in Chrome production/preview

**Cause:** Chrome requires explicit `credentialless` attribute on iframes when parent has `COEP: credentialless`

**Solution:** Add `credentialless="true"` attribute to iframe:
```tsx
<iframe
  {...({ credentialless: 'true' } as any)}
/>
```

### Issue 3: Both FFmpeg and Iframes Fail

**Symptoms:**
- FFmpeg initialization fails
- Iframes don't load
- Console shows COEP violations

**Causes:**
1. Wrong COEP policy (`require-corp` blocks iframes)
2. Missing CSP directives
3. Missing iframe `credentialless` attribute

**Solutions:**
1. Use `COEP: credentialless` instead of `require-corp`
2. Verify CSP includes all required directives
3. Add `credentialless` attribute to iframes

### Issue 4: Video/Image Import Fails

**Symptoms:**
```
Refused to load media from 'blob:https://...' because it violates the following 
Content Security Policy directive: "default-src 'self'". 
Note that 'media-src' was not explicitly set, so 'default-src' is used as a fallback.
```

**Cause:** CSP missing `media-src` directive for blob URLs

**Solution:** Add `media-src 'self' blob:` to CSP:
```json
"Content-Security-Policy": "... media-src 'self' blob:; ..."
```

**Impact:** Without this, video/image import previews won't display in the import dialog.

## Testing Checklist

When making changes to COEP or CSP configuration, test the following:

### Localhost Testing
- [ ] Dev server runs without errors
- [ ] FFmpeg video export works
- [ ] Vimeo video plays in Welcome Dialog
- [ ] No console errors or warnings

### Preview Deployment Testing

**Safari:**
- [ ] FFmpeg video export works
- [ ] Vimeo video plays in Welcome Dialog
- [ ] No COEP violations in console
- [ ] Network tab shows correct headers

**Chrome:**
- [ ] FFmpeg video export works
- [ ] Vimeo video plays in Welcome Dialog
- [ ] No COEP violations in console
- [ ] Network tab shows correct headers

### Header Verification

In browser DevTools > Network tab, check the document response headers:

```
Cross-Origin-Embedder-Policy: credentialless
Cross-Origin-Opener-Policy: same-origin
Content-Security-Policy: [full policy string]
```

## Related Files

- `vercel.json` - Production COEP/CSP configuration
- `vite.config.ts` - Development server configuration (COEP disabled)
- `src/components/features/WelcomeDialog.tsx` - Vimeo iframe with `credentialless` attribute
- `src/lib/export/VideoExporter.ts` - FFmpeg initialization and usage

## References

- [MDN: Cross-Origin-Embedder-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy)
- [MDN: SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)
- [Chrome: COEP credentialless](https://developer.chrome.com/blog/coep-credentialless-origin-trial/)
- [FFmpeg.wasm Documentation](https://ffmpegwasm.netlify.app/)

## Future Considerations

### If COEP Causes Issues

If `COEP: credentialless` causes problems in the future:

1. **Check browser compatibility:** New browser versions may change COEP behavior
2. **Consider separate deployments:** 
   - Marketing site (no COEP) for welcome experience
   - App site (COEP enabled) for FFmpeg features
3. **Monitor browser updates:** Safari and Chrome may converge on `credentialless` implementation
4. **Alternative video export:** Consider server-side video rendering if COEP becomes too restrictive

### Tracking Browser Support

Keep an eye on these resources for COEP updates:
- [Can I Use: Cross-Origin-Embedder-Policy](https://caniuse.com/mdn-http_headers_cross-origin-embedder-policy)
- [Chrome Platform Status](https://chromestatus.com/)
- [WebKit Feature Status](https://webkit.org/status/)
- [Firefox Release Notes](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases)

## Summary

- **Production:** Use `COEP: credentialless` with proper CSP
- **Development:** No COEP headers for easier testing
- **Chrome:** Requires iframe `credentialless` attribute
- **Safari:** More lenient, works without iframe attribute
- **CSP:** Must include `unpkg.com` in both `script-src` AND `connect-src`
- **Testing:** Always test in both Chrome and Safari on preview deployments

This configuration enables both FFmpeg video exports AND embedded content (Vimeo/YouTube) to work across all major browsers.
