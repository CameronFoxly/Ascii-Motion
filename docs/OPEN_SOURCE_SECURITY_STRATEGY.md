# Open Source + Premium Security Strategy

**Date:** October 12, 2025  
**For:** ASCII Motion Project  
**Purpose:** Maintain open-source core while protecting premium features and user data

> **⚠️ Security Notice:** This document describes general security patterns and best practices.
> It does NOT contain actual credentials, specific implementation details, or exploitable vulnerabilities.
> All code examples are templates for educational purposes.

---

## 🎯 Core Philosophy

**ASCII Motion's Dual Nature:**
1. **Open Source Core** - Drawing tools, canvas, animation system (MIT License)
2. **Premium Backend** - Cloud storage, authentication, paid features (Proprietary/AGPL)

**Goal:** Allow community contributions to core features while protecting business model and user data.

---

## 📂 Repository Structure Strategy

### Current Structure (Single Repo)

```
ascii-motion/
├── src/                    # ✅ OPEN SOURCE (MIT License)
│   ├── components/
│   │   ├── common/        # Shared UI components
│   │   ├── features/      # Canvas, tools, timeline
│   │   └── tools/         # Drawing tools
│   ├── hooks/             # Custom React hooks
│   ├── stores/            # Zustand state management
│   ├── utils/             # Utility functions
│   └── constants/         # App constants
│
├── src/auth/              # ⚠️ PROPRIETARY (Premium)
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── components/
│   │   ├── SignUpDialog.tsx
│   │   ├── SignInDialog.tsx
│   │   └── AccountSettings.tsx
│   ├── hooks/
│   │   ├── useProjectSync.ts
│   │   └── useFeatureFlags.ts
│   └── lib/
│       └── supabase.ts
│
├── LICENSE-MIT            # For core features
├── LICENSE-PREMIUM        # For auth/premium features
└── README.md              # Explains dual licensing
```

### Recommended Structure (Separation)

**Option A: Monorepo with Clear Boundaries**

```
ascii-motion/
├── packages/
│   ├── core/              # ✅ MIT License (public repo)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   └── utils/
│   │   ├── package.json
│   │   └── LICENSE (MIT)
│   │
│   └── premium/           # ⚠️ Proprietary (private repo or AGPL)
│       ├── src/
│       │   ├── auth/
│       │   ├── cloud-sync/
│       │   └── payment/
│       ├── package.json
│       └── LICENSE (Proprietary)
│
├── apps/
│   └── web/               # Combines core + premium
│       ├── src/
│       ├── package.json   # Depends on @ascii-motion/core + @ascii-motion/premium
│       └── vercel.json
```

**Option B: Single Repo with License Headers**

Keep current structure, but add license headers to every file:

```typescript
/**
 * @license MIT
 * This file is part of ASCII Motion's open-source core.
 * See LICENSE-MIT for details.
 */
export function drawLine(/* ... */) { /* ... */ }
```

```typescript
/**
 * @license Proprietary
 * This file is part of ASCII Motion's premium features.
 * Unauthorized copying or distribution is prohibited.
 * See LICENSE-PREMIUM for details.
 */
export function syncToCloud(/* ... */) { /* ... */ }
```

---

## 🔒 Security Layers

### Layer 1: File Organization

**Principle:** Clear separation of concerns

```
src/
├── components/
│   ├── features/
│   │   ├── CanvasGrid.tsx           # ✅ Open source
│   │   ├── ToolPalette.tsx          # ✅ Open source
│   │   └── AnimationTimeline.tsx    # ✅ Open source
│
├── auth/                              # ⚠️ PREMIUM ONLY
│   ├── contexts/AuthContext.tsx     # Not in open-source build
│   ├── hooks/useProjectSync.ts      # Not in open-source build
│   └── lib/supabase.ts              # Not in open-source build
```

**Build Configuration:**

```typescript
// vite.config.ts

export default defineConfig({
  // ... other config
  
  define: {
    // Feature flags based on build target
    __PREMIUM_FEATURES__: process.env.VITE_BUILD_TARGET === 'premium',
  },
  
  build: {
    rollupOptions: {
      // Exclude premium code from open-source builds
      external: process.env.VITE_BUILD_TARGET === 'opensource' 
        ? [/^@\/auth\//]
        : [],
    },
  },
});
```

### Layer 2: Environment Variables

**Never commit secrets to Git**

```bash
# .env.local (gitignored, premium builds only)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# .env.example (committed, shows structure)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key_here
```

**Runtime Checks:**

```typescript
// src/auth/lib/supabase.ts

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.PROD) {
    throw new Error('Missing Supabase credentials. Premium features disabled.');
  }
  console.warn('Running without cloud features (open-source mode)');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null; // Graceful degradation
```

### Layer 3: Feature Flags

**Conditional feature access based on environment**

```typescript
// src/config/features.ts

export const FEATURES = {
  // Always available (open source)
  CORE_EDITOR: true,
  ANIMATION: true,
  EXPORT_PNG: true,
  EXPORT_SVG: true,
  
  // Premium features (require auth)
  CLOUD_SAVE: import.meta.env.VITE_SUPABASE_URL !== undefined,
  AUTO_SYNC: import.meta.env.VITE_SUPABASE_URL !== undefined,
  COMMUNITY_GALLERY: false, // Not yet launched
  
  // Future paid features
  HD_EXPORTS: false,
  VERSION_HISTORY: false,
  COLLABORATION: false,
} as const;
```

**Usage in Components:**

```typescript
import { FEATURES } from '@/config/features';

export function HamburgerMenu() {
  return (
    <DropdownMenu>
      {/* Always available */}
      <DropdownMenuItem onClick={exportToPNG}>
        Export PNG
      </DropdownMenuItem>
      
      {/* Premium feature */}
      {FEATURES.CLOUD_SAVE && (
        <DropdownMenuItem onClick={saveToCloud}>
          Save to Cloud
        </DropdownMenuItem>
      )}
      
      {/* Open source fallback */}
      {!FEATURES.CLOUD_SAVE && (
        <DropdownMenuItem onClick={saveToFile}>
          Save to File (.asciimtn)
        </DropdownMenuItem>
      )}
    </DropdownMenu>
  );
}
```

### Layer 4: Database Security (Row Level Security)

**Even if someone gets API keys, RLS protects data**

```sql
-- Example: Users can only access their own projects
create policy "Users can view own projects"
  on projects for select
  using ( auth.uid() = user_id );

create policy "Users can update own projects"
  on projects for update
  using ( auth.uid() = user_id );

-- Force RLS on all tables
alter table projects enable row level security;
```

**Important Principle:**
- Supabase anon key is designed to be public (client-side safe)
- RLS policies enforce access control at the database level
- Service role key must NEVER be exposed in frontend code

### Layer 5: Code Obfuscation (Optional)

**For premium builds, add minification and obfuscation**

```typescript
// vite.config.ts (premium build)

export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs
        drop_debugger: true,
      },
      mangle: {
        properties: {
          regex: /^_/, // Mangle private properties
        },
      },
    },
  },
});
```

**Note:** Obfuscation is not true security (code can be reverse-engineered), but it raises the bar.

---

## 📜 Licensing Strategy

### Dual Licensing Model

**Option 1: MIT Core + Proprietary Premium**

```
LICENSE-MIT (for src/components/, src/hooks/, src/stores/, src/utils/)

MIT License

Copyright (c) 2025 ASCII Motion

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

```
LICENSE-PREMIUM (for src/auth/, premium features)

Proprietary License

Copyright (c) 2025 ASCII Motion

All rights reserved. This code is proprietary and confidential.
Unauthorized copying, distribution, or use is strictly prohibited.

For licensing inquiries, contact: [your-email@example.com]
```

**Option 2: AGPL for Premium** (Forces forks to stay open)

```
LICENSE-AGPL (for src/auth/)

GNU Affero General Public License v3.0

This ensures anyone who forks and hosts the premium features must also
open-source their modifications. Protects against SaaS clones.
```

### License Header Template

**Add to EVERY file:**

```typescript
/**
 * ASCII Motion - Open Source ASCII Art Editor
 * 
 * @license MIT
 * @copyright 2025 ASCII Motion
 * @see LICENSE-MIT for full license text
 */

// Core feature code...
```

```typescript
/**
 * ASCII Motion - Premium Cloud Features
 * 
 * @license Proprietary
 * @copyright 2025 ASCII Motion
 * @see LICENSE-PREMIUM for full license text
 * 
 * This file is part of ASCII Motion's premium features.
 * Unauthorized use is prohibited.
 */

// Premium feature code...
```

---

## 🛡️ Protecting Against Common Threats

### Threat 1: Competitor Clones Core + Adds Their Own Backend

**Mitigation:**
- ✅ MIT license allows this (expected and acceptable)
- ✅ Your backend is proprietary (they can't clone your database/auth)
- ✅ Brand differentiation (your UX, community, support)

**Strategy:**
- Focus on superior UX and features
- Build community trust
- Continuous innovation (stay ahead of clones)

### Threat 2: Someone Forks and Removes Payment Logic

**Mitigation:**
- ✅ Payment logic is proprietary (not in open-source repo)
- ✅ Backend API requires valid Supabase credentials (can't self-host without setup)
- ✅ AGPL option forces forks to share modifications

**Strategy:**
- Make premium features genuinely valuable (not just paywalls)
- Community gallery, collaboration require your backend
- Network effects (shared community on your platform)

### Threat 3: Exposed API Keys in Client-Side Code

**Mitigation:**
- ✅ Supabase anon key is designed to be public (safe)
- ✅ Row Level Security (RLS) enforces access control at database level
- ✅ Service role key NEVER in frontend

**Verification:**

```bash
# Search for accidentally committed secrets
git log -p | grep -i "supabase_service" || echo "✅ No service keys found"

# Ensure .env.local is gitignored
git check-ignore .env.local || echo "⚠️ WARNING: .env.local NOT ignored!"
```

### Threat 4: Malicious Project Data Injection

**Mitigation:**
- ✅ Validate all loaded data before applying to state
- ✅ Sanitize user-generated content before rendering
- ✅ Database constraints (e.g., max project size)

**Example Validation:**

```typescript
// ✅ GOOD: Validate before loading
const loadProjectData = (data: any) => {
  // Validate grid size
  const gridWidth = Math.max(10, Math.min(200, data.canvas_data?.gridSize?.width || 80));
  const gridHeight = Math.max(10, Math.min(100, data.canvas_data?.gridSize?.height || 40));
  
  // Validate cell data structure
  const cells = Array.isArray(data.canvas_data?.cells) 
    ? data.canvas_data.cells.map(row => 
        Array.isArray(row) ? row : []
      )
    : createEmptyGrid(gridWidth, gridHeight);
  
  return { gridWidth, gridHeight, cells };
};

// ❌ BAD: Trust user data
useCanvasStore.getState().setCells(data.canvas_data.cells); // Could be malicious!
```

### Threat 5: Reverse Engineering Premium Features

**Mitigation:**
- ✅ Obfuscation raises the bar (terser minification)
- ✅ Backend logic is server-side (Supabase functions, future serverless)
- ✅ Critical features require authenticated API calls

**Acceptance:**
- ⚠️ Client-side code is always reverse-engineer-able
- Focus on backend protection and continuous innovation
- Legal protection via proprietary license

---

## 🔐 Secrets Management

### Development Environment

```bash
# .env.local (local development, gitignored)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Production Environment (Vercel)

**Set environment variables in Vercel dashboard:**

```
Settings → Environment Variables

Production:
VITE_SUPABASE_URL = https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY = your_prod_anon_key_here

Preview (optional):
VITE_SUPABASE_URL = https://your-preview-project.supabase.co
VITE_SUPABASE_ANON_KEY = your_preview_anon_key_here
```

**Never:**
- ❌ Commit `.env.local` or `.env.production`
- ❌ Hardcode API keys in source code
- ❌ Share production keys in screenshots or docs
- ❌ Use production keys in local development

### Rotating Keys

**If API key is compromised:**

1. **Generate new anon key in Supabase:**
   - Settings → API → Project API Keys → Regenerate

2. **Update environment variables:**
   - Vercel dashboard → Environment Variables → Update
   - Redeploy application

3. **Update local `.env.local`** for all developers

4. **Audit recent database activity** for unauthorized access

---

## 🚀 Open Source Contribution Guidelines

### What We Accept (MIT License)

**Core Features:**
- ✅ New drawing tools (spray, line, polygon)
- ✅ New effects (blur, sharpen, dithering)
- ✅ UI improvements (better color picker, keyboard shortcuts)
- ✅ Performance optimizations (rendering, memory)
- ✅ Bug fixes (anywhere in core)
- ✅ Documentation improvements

**Premium Features:**
- ❌ Authentication/authorization code
- ❌ Cloud sync logic
- ❌ Payment integration
- ❌ User account management

### Contribution Process

1. **Fork the repository** (public fork of open-source code only)

2. **Create feature branch:**
   ```bash
   git checkout -b feature/new-drawing-tool
   ```

3. **Add license header to new files:**
   ```typescript
   /**
    * @license MIT
    * @copyright 2025 ASCII Motion
    */
   ```

4. **Submit pull request** with:
   - Clear description of changes
   - Tests (if applicable)
   - Documentation updates
   - Confirmation that code is MIT-compatible

5. **Code review** by maintainers

6. **Merge** if approved

### CLA (Contributor License Agreement) - Optional

**Consider requiring CLA for larger contributions:**

```
By contributing to ASCII Motion, you agree that:

1. You grant ASCII Motion a perpetual, worldwide, non-exclusive license
   to use, modify, and distribute your contributions under the MIT license.

2. You retain copyright ownership of your contributions.

3. You confirm that your contributions are your original work or you have
   the right to submit them.

4. You understand that your contributions will be publicly available under
   the MIT license.
```

---

## 📊 Monitoring and Auditing

### Security Monitoring

**Track suspicious activity:**

```sql
-- Supabase: Log all project access
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  action text, -- 'project_view', 'project_save', 'project_delete'
  resource_id uuid,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

-- Trigger on project access
create trigger log_project_access
  after insert or update or delete on projects
  for each row execute function log_access();
```

**Alert on anomalies:**

```typescript
// Example: Too many projects created in short time
const detectAbuse = async (userId: string) => {
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 3600000).toISOString()); // Last hour
  
  if (count > 10) {
    // Alert admin, rate limit user
    await sendAlert('Possible abuse detected', { userId, count });
  }
};
```

### Dependency Auditing

**Check for vulnerabilities:**

```bash
# Run regularly (weekly)
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Check for outdated packages
npm outdated
```

### License Compliance

**Ensure dependencies are compatible:**

```bash
# Install license checker
npm install -g license-checker

# Check licenses
license-checker --summary

# Ensure no GPL/AGPL dependencies (incompatible with MIT for combined work)
license-checker --exclude MIT,Apache-2.0,BSD-2-Clause,BSD-3-Clause,ISC
```

---

## 🎓 Team Education

### For Core Contributors

**What they should know:**
- ✅ Core features are open source (MIT)
- ✅ Can share code publicly in examples, blog posts
- ✅ Should add MIT license headers to new files
- ✅ No proprietary code in public repos

### For Premium Feature Developers

**What they should know:**
- ⚠️ Premium code is proprietary (no public sharing)
- ⚠️ Never commit secrets to Git
- ⚠️ Use feature flags to conditionally enable features
- ⚠️ Test with and without premium features enabled

### Security Training Checklist

- [ ] Never commit API keys or secrets
- [ ] Always use RLS policies for data protection
- [ ] Validate all user input before processing
- [ ] Use HTTPS/TLS for all network requests
- [ ] Keep dependencies updated (npm audit)
- [ ] Review code for security issues before merging
- [ ] Test authentication flows thoroughly
- [ ] Understand GDPR compliance requirements

---

## 📋 Security Checklist (Pre-Launch)

### Code Security

- [ ] No secrets in Git history (`git log -p | grep -i "secret"`)
- [ ] `.env.local` gitignored
- [ ] All premium files have proprietary license headers
- [ ] All core files have MIT license headers
- [ ] Feature flags properly separate open/premium code

### Infrastructure Security

- [ ] Supabase RLS policies enabled on all tables
- [ ] Service role key never used in frontend
- [ ] Environment variables configured in Vercel
- [ ] HTTPS enforced (Vercel default)
- [ ] CORS configured correctly in Supabase

### Legal Security

- [ ] MIT license file present for core
- [ ] Proprietary license file present for premium (or AGPL)
- [ ] README explains dual licensing
- [ ] CONTRIBUTING.md explains what's acceptable
- [ ] Terms of Service and Privacy Policy live

### Monitoring Security

- [ ] Audit logging enabled for sensitive actions
- [ ] Anomaly detection alerts configured
- [ ] Regular dependency audits scheduled
- [ ] Security incident response plan documented

---

## 🆘 Incident Response Plan

**If security breach detected:**

### Step 1: Immediate Actions (Within 1 hour)

1. **Revoke compromised credentials**
   - Supabase: Regenerate API keys
   - Vercel: Update environment variables
   - Stripe: Rotate webhook secrets (if applicable)

2. **Assess scope of breach**
   - Check audit logs for unauthorized access
   - Identify affected users
   - Determine what data was accessed

3. **Contain the breach**
   - Temporarily disable affected features
   - Block suspicious IP addresses (if applicable)

### Step 2: Notification (Within 24-72 hours)

1. **Notify affected users**
   - Email all potentially affected users
   - Explain what happened (transparently)
   - Provide mitigation steps (reset password, etc.)

2. **Public disclosure** (if significant)
   - Blog post explaining incident
   - Timeline of events
   - Actions taken

3. **Regulatory compliance** (GDPR)
   - Notify supervisory authority within 72 hours (EU users)
   - Document incident in compliance log

### Step 3: Recovery and Prevention

1. **Fix root cause**
   - Patch vulnerability
   - Update security policies
   - Improve monitoring

2. **Post-mortem analysis**
   - What went wrong?
   - How can we prevent this in the future?
   - Update security checklist

3. **User trust rebuild**
   - Offer free premium features for affected users (optional)
   - Improve security transparency
   - Regular security updates

---

## 📚 Additional Resources

### Documentation
- [Supabase Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10 Web Security Risks](https://owasp.org/www-project-top-ten/)
- [GDPR Compliance Checklist](https://gdpr.eu/checklist/)

### Tools
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Dependency vulnerability scanning
- [license-checker](https://www.npmjs.com/package/license-checker) - License compatibility checking
- [git-secrets](https://github.com/awslabs/git-secrets) - Prevent committing secrets

### Templates
- See `LICENSE-MIT` and `LICENSE-PREMIUM` in repository root
- See `CONTRIBUTING.md` for contribution guidelines

---

**Remember:** Security is an ongoing process, not a one-time setup. Regular audits, updates, and team education are essential.

**Questions?** Contact security team at [security@ascii-motion.com]
