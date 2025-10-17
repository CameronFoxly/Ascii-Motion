# 🔐 Security & Premium Feature Documentation

**Important:** Documentation for authentication, database, cloud storage, and payment systems has been moved to a secure location.

---

## 📍 Where to Find Premium Documentation

All documentation related to **sensitive systems** is now located in:

```
packages/premium/docs/
```

This includes:
- 🔐 **Authentication System** - Sign up, sign in, session management
- 🗄️ **Database Architecture** - Supabase setup, RLS policies, migrations
- ☁️ **Cloud Storage** - Project saving, loading, user data management
- 💳 **Subscription Tiers** - Free vs Pro features, tier management
- 🔒 **Security Policies** - API keys, credentials, security best practices

**See:** [`packages/premium/docs/README.md`](../packages/premium/docs/README.md) for the complete index.

---

## ⚠️ Why The Move?

To prevent accidental exposure of sensitive information:

- **Database schemas and queries** should not be in public docs
- **Authentication flows** contain security-critical details
- **API integration patterns** reveal system architecture
- **Credential management** procedures need restricted access
- **SQL helper scripts** could expose vulnerabilities if misused

---

## 📖 What Stays in Main `/docs` Folder?

This folder is for **public-safe documentation**:

### ✅ User-Facing Documentation
- Feature guides and tutorials
- How to use tools (brush, shapes, etc.)
- Keyboard shortcuts
- Animation system basics
- Import/export file formats

### ✅ Open Source Contribution
- Code style guide
- PR guidelines
- Issue templates
- Development setup (general)

### ✅ Architecture (Non-Sensitive)
- Canvas rendering system
- Drawing tools architecture
- Effects system design
- Animation playback
- Color palette system

### ✅ Developer Guides (Public APIs)
- Plugin development
- Extension points
- Public API reference
- Custom tool creation

---

## 🚨 Before Creating New Documentation

**Ask yourself:**

1. **Does this document contain database queries or schema?**
   - YES → `packages/premium/docs/` 🔒
   - NO → Continue to question 2

2. **Does this reference authentication or user management?**
   - YES → `packages/premium/docs/` 🔒
   - NO → Continue to question 3

3. **Does this include API keys, credentials, or secrets?**
   - YES → `packages/premium/docs/` 🔒
   - NO → Continue to question 4

4. **Does this describe payment/subscription logic?**
   - YES → `packages/premium/docs/` 🔒
   - NO → Continue to question 5

5. **Does this reveal security measures or policies?**
   - YES → `packages/premium/docs/` 🔒
   - NO → Main `/docs/` is fine ✅

---

## 📝 Quick Reference

| Topic | Location | Public? |
|-------|----------|---------|
| User tutorials | `/docs/` | ✅ Yes |
| Drawing tools | `/docs/` | ✅ Yes |
| Animation system | `/docs/` | ✅ Yes |
| Effects system | `/docs/` | ✅ Yes |
| Authentication | `packages/premium/docs/` | ❌ No |
| Database/Supabase | `packages/premium/docs/` | ❌ No |
| Cloud storage | `packages/premium/docs/` | ❌ No |
| Subscriptions | `packages/premium/docs/` | ❌ No |
| Security policies | `packages/premium/docs/` | ❌ No |
| Payment/Stripe | `packages/premium/docs/` | ❌ No |
| SQL scripts | `packages/premium/docs/` | ❌ No |

---

## 🤖 For AI Assistants & Copilot

**Important instructions for AI code assistants:**

When creating documentation for ASCII Motion, follow these rules:

### Premium/Secure Documentation Location
**Location:** `packages/premium/docs/`

**Topics:**
- Authentication (sign up, sign in, sessions, JWT)
- Database (Supabase, PostgreSQL, RLS policies)
- Cloud storage (user projects, saving, loading)
- Subscription tiers (Free, Pro, limits, features)
- Payment integration (Stripe, webhooks, billing)
- Security (API keys, credentials, secrets)
- SQL queries and migration scripts
- Backend architecture
- Server-side logic

**Example filenames:**
- `AUTH_*.md`
- `SUPABASE_*.md`
- `CLOUD_STORAGE_*.md`
- `SUBSCRIPTION_*.md`
- `SECURITY_*.md`
- `SQL_*.sql`

### Public Documentation Location
**Location:** `/docs/`

**Topics:**
- User-facing features and guides
- Drawing tools (brush, shapes, line, etc.)
- Animation system (frames, playback, layers)
- Effects system (pixelation, color adjustments)
- Canvas rendering
- File import/export
- UI/UX patterns
- Open source contribution
- Public API reference

**Example filenames:**
- `BRUSH_TOOL_*.md`
- `ANIMATION_SYSTEM_*.md`
- `EFFECTS_*.md`
- `CONTRIBUTING.md`
- `ARCHITECTURE_DECISION_*.md` (public decisions only)

### Security Guidelines for AI

**NEVER include in documentation:**
- ❌ Real API keys or secrets
- ❌ Real database credentials
- ❌ Real user emails or data
- ❌ Production URLs with sensitive data
- ❌ Service role keys
- ❌ Stripe secret keys

**ALWAYS use placeholders:**
- ✅ `YOUR_API_KEY_HERE`
- ✅ `user@example.com`
- ✅ `00000000-0000-0000-0000-000000000000` (UUIDs)
- ✅ Environment variable references (`$VITE_SUPABASE_URL`)

---

## 📧 Questions?

- **"Should this be in premium docs?"** → When in doubt, put it in `packages/premium/docs/`
- **"Can I document this publicly?"** → Only if it contains zero database/auth/payment info
- **"Where are the auth docs?"** → `packages/premium/docs/README.md`

---

**Last Updated:** October 16, 2025  
**See Also:** [`packages/premium/docs/README.md`](../packages/premium/docs/README.md)
