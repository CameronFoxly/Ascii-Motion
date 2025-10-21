# vercel.json Configuration Reference

## Overview
This file configures Vercel deployment settings, security headers, and routing for ASCII Motion.

**⚠️ IMPORTANT:** If you modify this file, see `docs/COEP_CONFIGURATION_GUIDE.md` for full context.

## Security Headers Explained

### Cross-Origin-Embedder-Policy: credentialless
**Purpose:** Enables `SharedArrayBuffer` support required by FFmpeg for video exports.

**Why "credentialless"?**
- Allows FFmpeg to work with SharedArrayBuffer
- Permits cross-origin iframes (Vimeo, YouTube) without credentials
- More permissive than `require-corp` which blocks all iframes

**Alternative:** `require-corp` (too strict, blocks Vimeo/YouTube)

### Cross-Origin-Opener-Policy: same-origin
**Purpose:** Isolates the browsing context from other windows, required for SharedArrayBuffer.

### Content-Security-Policy (CSP)
**Purpose:** Controls what resources can be loaded from which origins.

#### Critical Directives for FFmpeg:

1. **script-src**: `'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com`
   - Allows FFmpeg JavaScript to load from unpkg.com CDN

2. **connect-src**: `'self' https://*.supabase.co https://unpkg.com`
   - ⚠️ CRITICAL: Allows FFmpeg to fetch WASM files
   - Missing `unpkg.com` here causes "Failed to fetch" errors

3. **worker-src**: `'self' blob:`
   - Allows FFmpeg to spawn Web Workers for video processing

#### Directives for Embeds:

4. **frame-src**: `https://player.vimeo.com https://www.youtube.com`
   - Allows Vimeo and YouTube iframes in Welcome Dialog

## Common Issues

### Issue: FFmpeg fails to initialize
**Error:**
```
Refused to connect to 'https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm/ffmpeg-core.wasm'
```

**Solution:** Add `https://unpkg.com` to BOTH:
- `script-src` ✅ (already present)
- `connect-src` ✅ (already present)

### Issue: Vimeo iframe blocked in Chrome
**Symptoms:** Works in Safari, blocked in Chrome

**Solution:** Add `credentialless="true"` attribute to iframe:
```tsx
<iframe {...({ credentialless: 'true' } as any)} />
```

See: `src/components/features/WelcomeDialog.tsx`

## Git Deployment Settings

```json
"git": {
  "deploymentEnabled": {
    "main": false,
    "welcome-experience-core": false
  }
}
```

**Why disabled?** The project uses a private Git submodule (`packages/premium`) that Vercel cannot access. Manual deployments only via `npm run deploy:preview` or `npm run deploy`.

## Testing After Modifications

If you change this file, test:

1. **Localhost** (should work without these headers):
   - FFmpeg export
   - Vimeo playback

2. **Preview Deployment**:
   - Chrome: FFmpeg + Vimeo
   - Safari: FFmpeg + Vimeo
   - Check console for COEP/CSP violations

3. **Header Verification** (Network tab):
   - Cross-Origin-Embedder-Policy: credentialless
   - Cross-Origin-Opener-Policy: same-origin
   - Content-Security-Policy: [verify unpkg.com in both script-src and connect-src]

## References
- Full Documentation: `docs/COEP_CONFIGURATION_GUIDE.md`
- Quick Reference: `COPILOT_INSTRUCTIONS.md` (Security Headers section)
- MDN: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy
