# Security Headers Documentation Index

## Quick Navigation

Choose the document that matches your need:

### 🚀 **I want to understand the current configuration**
→ Read: [`COEP_CONFIGURATION_GUIDE.md`](./COEP_CONFIGURATION_GUIDE.md)
- Complete overview of COEP/COOP/CSP
- Why each header is needed
- Browser compatibility details
- Testing requirements

### 🔧 **I need to modify vercel.json**
→ Read: [`VERCEL_JSON_REFERENCE.md`](./VERCEL_JSON_REFERENCE.md)
- Line-by-line explanation of each setting
- What each CSP directive does
- Common pitfalls when editing
- Testing checklist after changes

### 🐛 **Something is broken in production**
→ Read: [`COEP_TROUBLESHOOTING_GUIDE.md`](./COEP_TROUBLESHOOTING_GUIDE.md)
- Diagnostic flowchart
- Error messages with solutions
- Browser DevTools investigation steps
- Emergency rollback procedures

### 📚 **I want the quick reference**
→ Read: [`COPILOT_INSTRUCTIONS.md`](../COPILOT_INSTRUCTIONS.md) (Security Headers section)
- TL;DR version
- Critical configuration snippets
- Quick testing matrix

---

## Document Overview

### COEP_CONFIGURATION_GUIDE.md (Main Reference)
**Length:** Comprehensive (full guide)  
**Audience:** Developers new to COEP/CSP or making significant changes  
**Contains:**
- Full explanation of why COEP is needed
- All three COEP policy options (credentialless, require-corp, unsafe-none)
- Detailed browser compatibility matrix
- Complete CSP breakdown
- Future considerations

### VERCEL_JSON_REFERENCE.md (Configuration Focus)
**Length:** Medium (specific to vercel.json)  
**Audience:** Developers editing vercel.json  
**Contains:**
- Each vercel.json setting explained
- CSP directive breakdown
- Git deployment settings
- Testing checklist
- Common configuration issues

### COEP_TROUBLESHOOTING_GUIDE.md (Problem Solving)
**Length:** Medium (diagnostic focused)  
**Audience:** Developers debugging production issues  
**Contains:**
- Diagnostic decision tree
- Error messages with exact solutions
- Browser DevTools checklist
- Testing matrix
- Emergency rollback steps

### COPILOT_INSTRUCTIONS.md Section (Quick Reference)
**Length:** Short (essentials only)  
**Audience:** AI assistants and quick lookups  
**Contains:**
- Critical configuration snippets
- Most common issues
- Testing requirements
- Browser compatibility table

---

## When to Use Each Document

| Scenario | Read This | Why |
|----------|-----------|-----|
| "FFmpeg stopped working after deploy" | Troubleshooting Guide | Diagnostic flowchart + error solutions |
| "I need to add a new CDN to CSP" | vercel.json Reference | Explains each CSP directive |
| "What is COEP and why do we have it?" | Configuration Guide | Full context and alternatives |
| "Vimeo iframe blocked in Chrome" | Troubleshooting Guide | Specific error with solution |
| "Planning to change COEP policy" | Configuration Guide | Explains all policy options |
| "Quick reminder about unpkg.com" | COPILOT_INSTRUCTIONS.md | Fast reference |

---

## Common Questions Answered

### Q: Why do we need COEP at all?
**A:** FFmpeg requires `SharedArrayBuffer` which browsers only enable with COEP + COOP headers.  
**Document:** [`COEP_CONFIGURATION_GUIDE.md`](./COEP_CONFIGURATION_GUIDE.md) → "Why COEP is Required"

### Q: Why "credentialless" instead of "require-corp"?
**A:** `require-corp` blocks all iframes (Vimeo, YouTube) unless they send specific headers. `credentialless` allows iframes without credentials.  
**Document:** [`COEP_CONFIGURATION_GUIDE.md`](./COEP_CONFIGURATION_GUIDE.md) → "COEP Policy Options"

### Q: Why is unpkg.com in two CSP directives?
**A:** `script-src` loads JavaScript, `connect-src` fetches WASM files. Both are needed.  
**Document:** [`VERCEL_JSON_REFERENCE.md`](./VERCEL_JSON_REFERENCE.md) → "Critical Directives for FFmpeg"

### Q: Why does Vimeo work in Safari but not Chrome?
**A:** Chrome requires explicit `credentialless="true"` attribute on iframes.  
**Document:** [`COEP_TROUBLESHOOTING_GUIDE.md`](./COEP_TROUBLESHOOTING_GUIDE.md) → "Vimeo iframe blank/not loading"

### Q: Why no COEP headers in development?
**A:** Localhost doesn't need COEP for SharedArrayBuffer, and removing it makes iframe testing easier.  
**Document:** [`COEP_CONFIGURATION_GUIDE.md`](./COEP_CONFIGURATION_GUIDE.md) → "Current Configuration → Development"

### Q: What should I test after changing vercel.json?
**A:** FFmpeg export and Vimeo playback in both Chrome and Safari, on both localhost and production.  
**Document:** [`COEP_TROUBLESHOOTING_GUIDE.md`](./COEP_TROUBLESHOOTING_GUIDE.md) → "Testing Matrix"

---

## Files Modified by This Implementation

| File | Changes Made | Why |
|------|--------------|-----|
| `vercel.json` | Added COEP: credentialless, COOP: same-origin, CSP with unpkg.com in script-src and connect-src | Enable FFmpeg + Vimeo simultaneously |
| `vite.config.ts` | Removed COEP headers | Easier development testing |
| `src/components/features/WelcomeDialog.tsx` | Added `credentialless="true"` to Vimeo iframe | Chrome COEP compatibility |
| `docs/COEP_CONFIGURATION_GUIDE.md` | Created | Main reference documentation |
| `docs/VERCEL_JSON_REFERENCE.md` | Created | Configuration-specific guide |
| `docs/COEP_TROUBLESHOOTING_GUIDE.md` | Created | Problem-solving guide |
| `docs/SECURITY_HEADERS_INDEX.md` | Created (this file) | Navigation hub |
| `DEVELOPMENT.md` | Added security headers section | Quick reference in main docs |
| `COPILOT_INSTRUCTIONS.md` | Added security headers section | AI assistant reference |

---

## Related MDN Resources

- [Cross-Origin-Embedder-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy)
- [Cross-Origin-Opener-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy)
- [Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy)
- [SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)

---

## Maintenance Notes

**Last Updated:** October 20, 2025  
**Current Configuration:** COEP credentialless, working in Chrome and Safari  
**Known Issues:** None

**If these docs become outdated:**
1. Check `vercel.json` for current configuration
2. Check git history: `git log --oneline | grep -i "coep\|csp"`
3. Test in latest Chrome and Safari versions
4. Update browser compatibility matrix if behavior changes

---

## Quick Start for New Developers

1. **Read this first:** [`COEP_CONFIGURATION_GUIDE.md`](./COEP_CONFIGURATION_GUIDE.md) (skim the overview)
2. **Before editing vercel.json:** [`VERCEL_JSON_REFERENCE.md`](./VERCEL_JSON_REFERENCE.md)
3. **Keep bookmarked:** [`COEP_TROUBLESHOOTING_GUIDE.md`](./COEP_TROUBLESHOOTING_GUIDE.md)
4. **For quick lookups:** [`COPILOT_INSTRUCTIONS.md`](../COPILOT_INSTRUCTIONS.md) → Security Headers section

**Critical Rule:** Never commit security header changes without testing FFmpeg + Vimeo in both Chrome and Safari on a preview deployment.
