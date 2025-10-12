# 🚀 Authentication Quick Start Guide

**For:** ASCII Motion Development  
**Date:** October 12, 2025  
**Estimated Setup Time:** 2-3 hours

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] Existing ASCII Motion project running locally
- [ ] Supabase account created (free tier)

---

## Step-by-Step Setup

### 1️⃣ Create Supabase Project (15 minutes)

1. **Go to [supabase.com](https://supabase.com) and sign in**

2. **Click "New Project"**
   - **Project name:** `ascii-motion`
   - **Database password:** Generate strong password
   - **Region:** `US East (North Virginia)` (or closest to users)
   - **Pricing:** Free tier

3. **Wait for initialization** (~2 minutes) ☕

4. **Copy your credentials:**
   - Navigate to **Settings → API**
   - Copy **Project URL**: `https://xxxxx.supabase.co`
   - Copy **Project API Key (anon, public)**: `eyJhbGci...`

### 2️⃣ Configure Database Schema (10 minutes)

1. **Open Supabase SQL Editor:**
   - Navigate to **SQL Editor**
   - Click **New Query**

2. **Copy schema from AUTH_IMPLEMENTATION_PLAN.md:**
   - Open `docs/AUTH_IMPLEMENTATION_PLAN.md`
   - Copy entire database schema section (lines ~50-300)
   - Paste into SQL Editor

3. **Run the query:**
   - Click **Run** (or press `Cmd+Enter`)
   - ✅ Should see "Success. No rows returned"

4. **Verify tables created:**
   - Navigate to **Table Editor**
   - You should see: `profiles`, `projects`, `project_versions`, `subscription_tiers`

### 3️⃣ Configure Authentication (10 minutes)

1. **Enable email authentication:**
   - Navigate to **Authentication → Providers**
   - **Email:** ✅ Enabled
   - **Confirm email:** ✅ **Enable** (critical!)
   - **Secure email change:** ✅ Enable
   - **Allow disposable emails:** ❌ Disable

2. **Set redirect URLs:**
   - Navigate to **Authentication → URL Configuration**
   - Add redirect URLs:
     ```
     http://localhost:5173/auth/callback
     https://your-domain.vercel.app/auth/callback
     ```
   - **Site URL:** `http://localhost:5173` (dev) or your production URL

3. **Customize email templates** (optional now, can improve later):
   - Navigate to **Authentication → Email Templates**
   - Edit **Confirm signup** template with branding from AUTH_IMPLEMENTATION_PLAN.md
   - Edit **Reset password** template
   - Edit **Change email** template

### 4️⃣ Install Dependencies (5 minutes)

```bash
cd /Users/cameronfoxly/GitHubRepos/Ascii-Motion

# Install Supabase client
npm install @supabase/supabase-js

# Verify installation
npm list @supabase/supabase-js
# Should show: @supabase/supabase-js@2.x.x
```

### 5️⃣ Configure Environment Variables (5 minutes)

1. **Create `.env.local` file in project root:**

```bash
# Create file
touch .env.local

# Add credentials
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EOF
```

2. **Update `.gitignore`:**

```bash
# Add to .gitignore if not already present
echo ".env.local" >> .gitignore
```

3. **Restart dev server:**

```bash
npm run dev
```

### 6️⃣ Create Supabase Client (10 minutes)

**Create:** `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Check your .env.local file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});
```

**Test the connection:**

```typescript
// Add temporary test in src/App.tsx
import { supabase } from './lib/supabase';

useEffect(() => {
  supabase.auth.getSession().then(({ data, error }) => {
    console.log('Supabase connection test:', error ? 'Failed' : 'Success');
  });
}, []);
```

### 7️⃣ Create TypeScript Types (15 minutes)

**Create:** `src/types/supabase.ts`

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          subscription_tier_id: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: string;
          subscription_current_period_end: string | null;
          auto_save_enabled: boolean;
          email_notifications: boolean;
          created_at: string;
          updated_at: string;
          last_seen_at: string;
        };
        Insert: {
          id: string;
          subscription_tier_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string;
          auto_save_enabled?: boolean;
          email_notifications?: boolean;
        };
        Update: {
          id?: string;
          subscription_tier_id?: string | null;
          auto_save_enabled?: boolean;
          email_notifications?: boolean;
          last_seen_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          canvas_data: Json;
          tool_state: Json | null;
          animation_state: Json | null;
          created_at: string;
          updated_at: string;
          last_opened_at: string;
          is_published: boolean;
          published_at: string | null;
          view_count: number;
          remix_count: number;
          deleted_at: string | null;
        };
        Insert: {
          user_id: string;
          name: string;
          canvas_data: Json;
          tool_state?: Json | null;
          animation_state?: Json | null;
          description?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          canvas_data?: Json;
          tool_state?: Json | null;
          animation_state?: Json | null;
          updated_at?: string;
          last_opened_at?: string;
          deleted_at?: string | null;
        };
      };
      subscription_tiers: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          max_projects: number;
          max_frames_per_project: number | null;
          max_canvas_size: number | null;
          features: Json;
          stripe_price_id: string | null;
          price_monthly_cents: number;
          created_at: string;
          updated_at: string;
        };
      };
    };
    Functions: {
      get_user_tier: {
        Args: { user_uuid: string };
        Returns: Json;
      };
      can_create_project: {
        Args: { user_uuid: string };
        Returns: boolean;
      };
      update_last_seen: {
        Args: {};
        Returns: void;
      };
      delete_user_data: {
        Args: { user_uuid: string };
        Returns: void;
      };
    };
  };
}
```

### 8️⃣ Test Authentication (10 minutes)

1. **Create test user in Supabase Dashboard:**
   - Navigate to **Authentication → Users**
   - Click **Invite user**
   - Enter your email
   - Check inbox for verification email
   - Verify email template looks good

2. **Test from browser console:**
   ```javascript
   // Open http://localhost:5173
   // Open browser console

   // Test connection
   const { data, error } = await window.supabase.auth.getSession();
   console.log('Session:', data);
   ```

---

## Next Steps

After completing setup:

1. **Implement AuthContext** (copy from AUTH_IMPLEMENTATION_PLAN.md)
2. **Create SignUpDialog component**
3. **Add sign in/sign up buttons to header**
4. **Test signup → verify → signin flow**
5. **Implement project sync hook**

---

## Troubleshooting

### Issue: "Missing Supabase credentials" error

**Solution:**
```bash
# Check .env.local exists and has correct values
cat .env.local

# Restart dev server
npm run dev
```

### Issue: Email verification not received

**Solutions:**
1. Check spam folder
2. Verify email provider settings in Supabase
3. Check Supabase logs: **Authentication → Logs**
4. Use "Resend verification" feature

### Issue: RLS policy errors

**Solution:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Should show: rowsecurity = true for all tables
```

### Issue: CORS errors

**Solution:**
- Supabase allows all origins by default (anon key)
- If issues persist, check **Settings → API → CORS**

---

## Resources

- **Full Implementation Plan:** `docs/AUTH_IMPLEMENTATION_PLAN.md`
- **Supabase Docs:** https://supabase.com/docs
- **Supabase Auth Guide:** https://supabase.com/docs/guides/auth
- **Row Level Security:** https://supabase.com/docs/guides/auth/row-level-security

---

## Verification Checklist

Before proceeding to code implementation:

- [ ] Supabase project created and initialized
- [ ] Database schema executed successfully (4 tables created)
- [ ] Email authentication configured with verification enabled
- [ ] Redirect URLs configured for localhost and production
- [ ] .env.local created with correct credentials
- [ ] .env.local added to .gitignore
- [ ] @supabase/supabase-js installed
- [ ] Supabase client utility created (src/lib/supabase.ts)
- [ ] TypeScript types created (src/types/supabase.ts)
- [ ] Test email received and branded correctly

✅ **When all items are checked, you're ready to implement authentication!**

---

**Questions?** Refer to AUTH_IMPLEMENTATION_PLAN.md for detailed code examples and architecture decisions.
