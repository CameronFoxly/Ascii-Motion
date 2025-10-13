# 🚀 Your Supabase Setup Guide

**Start here while code migration is happening!**

---

## ✅ Step-by-Step Checklist

### 1. Create Supabase Account (5 min)

- [ ] Go to [https://supabase.com](https://supabase.com)
- [ ] Click "Start your project"  
- [ ] Sign up with GitHub (recommended) or email
- [ ] Verify email if prompted

---

### 2. Create Project (3 min + 2 min wait)

- [ ] Click "New Project" button
- [ ] Fill in project details:
  - **Organization:** (Select or create)
  - **Name:** `ascii-motion`
  - **Database Password:** Click "Generate a password" (SAVE THIS!)
  - **Region:** Select closest (US East if unsure)
  - **Pricing Plan:** Free
- [ ] Click "Create new project"
- [ ] ☕ Wait 2-3 minutes while it initializes

---

### 3. Run Database Schema (10 min)

**While waiting for project to initialize:**

- [ ] Open `docs/AUTH_IMPLEMENTATION_PLAN.md` in VS Code
- [ ] Find the section "Complete Database Schema" (around line 50)
- [ ] Copy the ENTIRE SQL block (starts with `-- Subscription tiers table`)

**Once project is ready:**

- [ ] In Supabase dashboard, click **SQL Editor** (left sidebar)
- [ ] Click **New query** button
- [ ] Paste the SQL schema you copied
- [ ] Click **RUN** button (or press Cmd+Enter on Mac)
- [ ] Verify you see: "Success. No rows returned"
- [ ] Click **Table Editor** (left sidebar)
- [ ] Confirm you see these tables:
  - `profiles`
  - `projects` 
  - `project_versions`
  - `subscription_tiers`

---

### 4. Configure Authentication (5 min)

- [ ] Click **Authentication** in left sidebar
- [ ] Click **Providers** tab
- [ ] Find **Email** provider:
  - [ ] Toggle **Enable Email provider** to ON
  - [ ] Enable **Confirm email** ✅ (IMPORTANT!)
  - [ ] Enable **Secure email change** ✅
  - [ ] Disable **Allow disposable emails** ❌
  - [ ] Click **Save**

- [ ] Click **URL Configuration** tab
- [ ] Set **Site URL:** `http://localhost:5173`
- [ ] Under **Redirect URLs**, add:
  ```
  http://localhost:5173/auth/callback
  ```
- [ ] Click **Save**

---

### 5. Get Your API Credentials (2 min)

- [ ] Click **Settings** (gear icon) in left sidebar
- [ ] Click **API** in the settings menu
- [ ] **Copy these values** (you'll need them next):

**Project URL:**
```
https://xxxxx.supabase.co
```

**anon public key:** (the long one that starts with `eyJhbGci...`)
```
eyJhbGci...
```

---

### 6. Tell Me Your Credentials

Once you have both values:

1. **DO NOT** paste them in chat directly (security risk)
2. Instead, say: **"I have my Supabase credentials"**
3. I'll guide you to create a `.env.local` file safely

---

## ❓ Troubleshooting

**Project won't initialize?**
- Wait 5 minutes, refresh the page
- Check Supabase status page

**SQL error when running schema?**
- Make sure you copied the ENTIRE schema
- Check for any syntax errors from copy/paste
- Try running each table creation separately

**Can't find Email provider?**
- Make sure you're in **Authentication → Providers**
- Scroll down - Email should be in the list

---

## 🎯 What's Next?

Once you complete Step 6, I'll:
1. Create your `.env.local` file with credentials
2. Install Supabase dependencies
3. Start building the authentication system

**Current status:** Code migration is in progress. By the time you finish Supabase setup, the core package migration should be complete!

---

**Questions?** Just ask! I'm here to help.
