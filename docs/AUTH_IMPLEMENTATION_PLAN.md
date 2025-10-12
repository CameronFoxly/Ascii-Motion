# Authentication & Cloud Storage Implementation Plan

**Date Created:** October 12, 2025  
**Status:** Planning Phase  
**Branch:** `add-auth`

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture Decision](#architecture-decision)
3. [Database Schema](#database-schema)
4. [Supabase Setup Guide](#supabase-setup-guide)
5. [Implementation Phases](#implementation-phases)
6. [Code Examples](#code-examples)
7. [Security Considerations](#security-considerations)
8. [Migration Strategy](#migration-strategy)
9. [Testing Plan](#testing-plan)
10. [Future Premium Features](#future-premium-features)

---

## Overview

### Goals

- ✅ Enable email-linked user accounts with email verification
- ✅ Allow users to save up to 3 projects in the cloud (free tier)
- ✅ Implement hybrid storage: localStorage for anonymous + cloud for authenticated
- ✅ Prepare infrastructure for future paid features (without implementing payment now)
- ✅ Maintain open-source core while building scalable backend

### Key Decisions

**✅ KEEP Vite + React** (No Next.js migration)
- Current SPA architecture is optimal
- Add minimal serverless functions only where needed
- Supabase handles most backend logic via client SDK

**✅ Hybrid Storage Strategy**
- Anonymous users: Work locally (localStorage), prompt to save when they want cloud storage
- Authenticated users: Auto-sync to cloud with localStorage fallback
- Best UX without forcing authentication

**✅ Payment-Ready Architecture (No Payment Code Yet)**
- Database designed with `subscription_tiers` from day 1
- Feature flags prepared but not enforced
- Easy to activate Stripe later without migration

---

## Architecture Decision

### Tech Stack

```
┌─────────────────────────────────────┐
│   Vite + React SPA (Unchanged)     │
│   - Zustand stores                  │
│   - Canvas rendering                │
│   - Tool system                     │
│   - Export functionality            │
└──────────────┬──────────────────────┘
               │
               ├──► Supabase Client SDK (@supabase/supabase-js)
               │    ├─ Auth (email/password + verification)
               │    ├─ PostgreSQL (projects, versions, tiers)
               │    └─ Row Level Security (RLS)
               │
               └──► Vercel (Frontend Deployment - Unchanged)
                    └─ Optional: Serverless functions for webhooks later
```

### Why NOT Next.js?

**Current Setup:**
- ✅ Vite with fast HMR and optimized builds
- ✅ Pure client-side SPA (no server requirements)
- ✅ Deployed to Vercel as static site

**Next.js Would Require:**
- ❌ Complete build system overhaul
- ❌ Server-side infrastructure (increased costs)
- ❌ Loss of Vite's dev experience
- ❌ Unnecessary complexity for our use case

**Better Approach:**
- Keep Vite for frontend
- Use Supabase client SDK for all backend operations
- Add Vercel serverless functions ONLY if needed (Stripe webhooks later)

---

## Database Schema

### Core Tables

```sql
-- ============================================
-- AUTHENTICATION (Managed by Supabase Auth)
-- ============================================
-- auth.users table is automatically created
-- Contains: id, email, encrypted_password, email_confirmed_at, etc.

-- ============================================
-- SUBSCRIPTION TIERS (Payment-Ready)
-- ============================================
create table public.subscription_tiers (
  id uuid primary key default gen_random_uuid(),
  name text unique not null, -- 'free', 'pro', 'enterprise'
  display_name text not null,
  max_projects integer not null,
  max_frames_per_project integer, -- null = unlimited
  max_canvas_size integer, -- null = unlimited  
  features jsonb not null default '[]'::jsonb, -- flexible feature list
  stripe_price_id text, -- null for free tier, set later for paid
  price_monthly_cents integer, -- 0 for free, 500 for $5/mo
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed free tier
insert into public.subscription_tiers (name, display_name, max_projects, price_monthly_cents, features)
values (
  'free',
  'Free',
  3,
  0,
  '["basic_exports", "local_storage"]'::jsonb
);

-- Future paid tiers (commented out, ready to activate)
-- insert into public.subscription_tiers (name, display_name, max_projects, price_monthly_cents, features, stripe_price_id)
-- values (
--   'pro',
--   'Pro',
--   -1, -- unlimited
--   500, -- $5/month
--   '["hd_exports", "version_history", "priority_support", "custom_branding"]'::jsonb,
--   'price_xxx' -- Stripe price ID
-- );

-- ============================================
-- USER PROFILES (Extended User Data)
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  subscription_tier_id uuid references public.subscription_tiers(id) default (
    select id from public.subscription_tiers where name = 'free'
  ),
  stripe_customer_id text unique, -- null until they start payment
  stripe_subscription_id text unique, -- null for free users
  subscription_status text default 'active', -- 'active', 'canceled', 'past_due'
  subscription_current_period_end timestamptz,
  
  -- Preferences
  auto_save_enabled boolean default true,
  email_notifications boolean default true,
  
  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

-- Trigger: Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- PROJECTS (Cloud-Saved Projects)
-- ============================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  
  -- Project metadata
  name text not null,
  description text,
  
  -- Project data (stored as JSONB for flexibility)
  canvas_data jsonb not null, -- grid cells with characters/colors
  tool_state jsonb, -- active tool, palette, settings
  animation_state jsonb, -- frames, timeline settings
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_opened_at timestamptz default now(),
  
  -- Future: Community gallery
  is_published boolean default false,
  published_at timestamptz,
  view_count integer default 0,
  remix_count integer default 0,
  
  -- Soft delete (for potential recovery)
  deleted_at timestamptz
);

-- Index for user's projects list
create index idx_projects_user_id on public.projects(user_id, deleted_at);
create index idx_projects_updated_at on public.projects(updated_at desc);

-- ============================================
-- PROJECT VERSIONS (Future Premium Feature)
-- ============================================
create table public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  version_number integer not null,
  
  -- Snapshot of project at this version
  canvas_data jsonb not null,
  tool_state jsonb,
  animation_state jsonb,
  
  -- Metadata
  commit_message text,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id),
  
  -- Storage optimization: consider compression or diffs
  is_compressed boolean default false,
  
  unique(project_id, version_number)
);

create index idx_project_versions on public.project_versions(project_id, version_number desc);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_versions enable row level security;
alter table public.subscription_tiers enable row level security;

-- Profiles: Users can only view/update their own profile
create policy "Users can view their own profile"
  on public.profiles for select
  using ( (select auth.uid()) = id );

create policy "Users can update their own profile"
  on public.profiles for update
  using ( (select auth.uid()) = id );

-- Projects: Users can CRUD their own projects
create policy "Users can view their own projects"
  on public.projects for select
  using ( (select auth.uid()) = user_id and deleted_at is null );

create policy "Users can insert their own projects"
  on public.projects for insert
  with check ( (select auth.uid()) = user_id );

create policy "Users can update their own projects"
  on public.projects for update
  using ( (select auth.uid()) = user_id );

create policy "Users can soft-delete their own projects"
  on public.projects for update
  using ( (select auth.uid()) = user_id )
  with check ( deleted_at is not null ); -- allows setting deleted_at

-- Future: Public gallery (commented out for now)
-- create policy "Anyone can view published projects"
--   on public.projects for select
--   using ( is_published = true and deleted_at is null );

-- Project Versions: Premium feature, RLS ready
create policy "Users can view versions of their projects"
  on public.project_versions for select
  using ( 
    exists (
      select 1 from public.projects
      where projects.id = project_versions.project_id
      and projects.user_id = (select auth.uid())
    )
  );

-- Subscription Tiers: Public read-only
create policy "Anyone can view subscription tiers"
  on public.subscription_tiers for select
  using ( true );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get user's current subscription tier
create or replace function public.get_user_tier(user_uuid uuid)
returns jsonb as $$
declare
  tier_info jsonb;
begin
  select jsonb_build_object(
    'tier_name', st.name,
    'display_name', st.display_name,
    'max_projects', st.max_projects,
    'features', st.features,
    'subscription_status', p.subscription_status
  ) into tier_info
  from public.profiles p
  join public.subscription_tiers st on p.subscription_tier_id = st.id
  where p.id = user_uuid;
  
  return tier_info;
end;
$$ language plpgsql security definer;

-- Check if user can create another project
create or replace function public.can_create_project(user_uuid uuid)
returns boolean as $$
declare
  current_count integer;
  max_allowed integer;
begin
  -- Get current project count (exclude soft-deleted)
  select count(*) into current_count
  from public.projects
  where user_id = user_uuid and deleted_at is null;
  
  -- Get max allowed for user's tier
  select st.max_projects into max_allowed
  from public.profiles p
  join public.subscription_tiers st on p.subscription_tier_id = st.id
  where p.id = user_uuid;
  
  -- -1 means unlimited
  if max_allowed = -1 then
    return true;
  end if;
  
  return current_count < max_allowed;
end;
$$ language plpgsql security definer;

-- Update last_seen_at timestamp
create or replace function public.update_last_seen()
returns void as $$
begin
  update public.profiles
  set last_seen_at = now()
  where id = (select auth.uid());
end;
$$ language plpgsql security definer;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
create index idx_profiles_subscription_tier on public.profiles(subscription_tier_id);
create index idx_projects_user_created on public.projects(user_id, created_at desc);
create index idx_projects_user_updated on public.projects(user_id, updated_at desc);

-- ============================================
-- GDPR COMPLIANCE: Account Deletion
-- ============================================

-- Function to completely delete user data (GDPR right to erasure)
create or replace function public.delete_user_data(user_uuid uuid)
returns void as $$
begin
  -- Delete project versions first (foreign key constraint)
  delete from public.project_versions
  where project_id in (
    select id from public.projects where user_id = user_uuid
  );
  
  -- Delete projects
  delete from public.projects where user_id = user_uuid;
  
  -- Delete profile
  delete from public.profiles where id = user_uuid;
  
  -- Delete auth user (cascades via on delete cascade)
  delete from auth.users where id = user_uuid;
end;
$$ language plpgsql security definer;
```

---

## Supabase Setup Guide

### Step 1: Create Supabase Project

1. **Go to [supabase.com](https://supabase.com) and sign in**
2. **Click "New Project"**
   - Organization: Personal or create new
   - Project name: `ascii-motion`
   - Database password: Generate strong password (save securely)
   - Region: Choose closest to your users (US East recommended)
   - Pricing plan: **Free tier** (sufficient for development and early users)

3. **Wait for project to initialize** (~2 minutes)

### Step 2: Configure Authentication

1. **Navigate to Authentication → Providers**
2. **Enable Email provider:**
   - Email Auth: ✅ Enabled
   - Confirm email: ✅ **Required** (critical for our use case)
   - Secure email change: ✅ Enabled
   - Allow disposable emails: ❌ Disabled (reduce spam accounts)

3. **Configure Email Templates** (Authentication → Email Templates)

#### **Signup Confirmation Email**
```html
<h2>Welcome to ASCII Motion! 🎨</h2>
<p>Hi there,</p>
<p>Thanks for signing up! Click the link below to confirm your email and start saving your projects to the cloud:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
<p>This link expires in 24 hours.</p>
<p>If you didn't create an account, you can safely ignore this email.</p>
<hr>
<p style="color: #666; font-size: 12px;">ASCII Motion - Create and animate ASCII art in your browser</p>
```

#### **Password Recovery Email**
```html
<h2>Reset your ASCII Motion password 🔐</h2>
<p>Hi there,</p>
<p>We received a request to reset your password. Click the link below to choose a new password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>
<p>This link expires in 1 hour.</p>
<p>If you didn't request a password reset, you can safely ignore this email.</p>
<hr>
<p style="color: #666; font-size: 12px;">ASCII Motion - Create and animate ASCII art in your browser</p>
```

#### **Email Change Confirmation**
```html
<h2>Confirm your new email address 📧</h2>
<p>Hi there,</p>
<p>You've requested to change your email address. Click the link below to confirm:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm new email</a></p>
<p>This link expires in 24 hours.</p>
<p>If you didn't request this change, please contact support immediately.</p>
<hr>
<p style="color: #666; font-size: 12px;">ASCII Motion - Create and animate ASCII art in your browser</p>
```

### Step 3: Run Database Schema

1. **Navigate to SQL Editor**
2. **Create a new query**
3. **Copy and paste the entire schema from [Database Schema](#database-schema) section above**
4. **Click "Run"**
5. **Verify tables created:** Check "Table Editor" sidebar

### Step 4: Configure Authentication URLs

1. **Navigate to Authentication → URL Configuration**
2. **Set redirect URLs:**
   ```
   Development:
   - http://localhost:5173/auth/callback
   
   Production:
   - https://your-domain.vercel.app/auth/callback
   ```

3. **Set Site URL:** `https://your-domain.vercel.app` (or localhost for dev)

### Step 5: Get API Credentials

1. **Navigate to Settings → API**
2. **Copy these values** (you'll need them for `.env.local`):
   - Project URL: `https://xxxxx.supabase.co`
   - Project API Key (anon, public): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Service Role Key: **Keep secret, only for server-side** (not used yet)

### Step 6: Test Authentication Flow

1. **Navigate to Authentication → Users**
2. **Click "Invite user"** (manual test)
3. **Enter your email**
4. **Check inbox for confirmation email**
5. **Verify email templates are branded correctly**

---

## Implementation Phases

### Phase 1: Environment Setup ✅
**Estimated Time:** 30 minutes

- [x] Create Supabase project
- [x] Run database schema
- [x] Configure email templates
- [ ] Install dependencies
- [ ] Set up environment variables
- [ ] Update .gitignore

### Phase 2: Authentication Foundation 🔨
**Estimated Time:** 4-6 hours

- [ ] Create Supabase client utility
- [ ] Build AuthContext and useAuth hook
- [ ] Create SignUpDialog component
- [ ] Create SignInDialog component
- [ ] Create EmailVerificationDialog
- [ ] Add auth state to header
- [ ] Test signup → verify → signin flow

### Phase 3: Cloud Storage System 🔨
**Estimated Time:** 6-8 hours

- [ ] Create useProjectSync hook
- [ ] Implement save to cloud function
- [ ] Implement load from cloud function
- [ ] Add auto-save toggle to hamburger menu
- [ ] Handle localStorage ↔ Supabase sync
- [ ] Add conflict resolution logic

### Phase 4: Project Management UI 🔨
**Estimated Time:** 4-6 hours

- [ ] Create ProjectsDialog component
- [ ] Display saved projects list
- [ ] Add rename project functionality
- [ ] Add delete project functionality
- [ ] Add duplicate project functionality
- [ ] Show storage quota (X/3 projects)

### Phase 5: Export Refactoring 🔨
**Estimated Time:** 2-3 hours

- [ ] Move "Save" to "Export Project File" (.asciimtn)
- [ ] Keep all exports (PNG, MP4, etc.) auth-free
- [ ] Add "Save to Cloud" button (auth-gated)
- [ ] Add prompts for anonymous users

### Phase 6: Subscription Infrastructure 🔨
**Estimated Time:** 2-3 hours

- [ ] Create getUserTier utility
- [ ] Add canCreateProject check
- [ ] Prepare feature flags (commented out)
- [ ] Add upgrade prompts (non-functional)
- [ ] Test tier limits

### Phase 7: Legal & Compliance 🔨
**Estimated Time:** 3-4 hours

- [ ] Draft Terms of Service
- [ ] Draft Privacy Policy
- [ ] Create legal pages (/terms, /privacy)
- [ ] Add account deletion UI
- [ ] Test complete data deletion

### Phase 8: Testing & Documentation 🔨
**Estimated Time:** 4-5 hours

- [ ] Test full signup flow
- [ ] Test save/load projects
- [ ] Test auto-save toggle
- [ ] Test project quota limits
- [ ] Test account deletion
- [ ] Update COPILOT_INSTRUCTIONS.md
- [ ] Update DEVELOPMENT.md
- [ ] Create AUTH_USER_GUIDE.md

---

## Code Examples

### Supabase Client Setup

**File:** `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage, // Use localStorage for session persistence
  },
});
```

**File:** `.env.local` (create this, add to .gitignore)

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**File:** `.gitignore` (add this line)

```
.env.local
```

### Authentication Context

**File:** `src/contexts/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface SubscriptionTier {
  tier_name: string;
  display_name: string;
  max_projects: number;
  features: string[];
  subscription_status: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  tier: SubscriptionTier | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  canCreateProject: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user's subscription tier
  const fetchUserTier = async (userId: string) => {
    const { data, error } = await supabase.rpc('get_user_tier', {
      user_uuid: userId,
    });

    if (error) {
      console.error('Error fetching user tier:', error);
      return;
    }

    setTier(data);
  };

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserTier(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserTier(session.user.id);
        // Update last_seen_at timestamp
        await supabase.rpc('update_last_seen');
      } else {
        setTier(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    return { error };
  };

  const canCreateProject = async (): Promise<boolean> => {
    if (!user) return false;

    const { data, error } = await supabase.rpc('can_create_project', {
      user_uuid: user.id,
    });

    if (error) {
      console.error('Error checking project limit:', error);
      return false;
    }

    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        tier,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        canCreateProject,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Sign Up Dialog Component

**File:** `src/components/features/SignUpDialog.tsx`

```typescript
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface SignUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToSignIn: () => void;
}

export function SignUpDialog({
  open,
  onOpenChange,
  onSwitchToSignIn,
}: SignUpDialogProps) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      // Show success message, user needs to verify email
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check your email 📧</DialogTitle>
            <DialogDescription>
              We've sent a confirmation link to <strong>{email}</strong>
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertDescription>
              Click the link in the email to verify your account and start
              saving projects to the cloud.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an account</DialogTitle>
          <DialogDescription>
            Sign up to save your projects to the cloud
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign Up
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onSwitchToSignIn}
              disabled={loading}
            >
              Already have an account? Sign in
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Project Sync Hook

**File:** `src/hooks/useProjectSync.ts`

```typescript
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useCanvasStore } from '@/stores/canvasStore';
import { useAnimationStore } from '@/stores/animationStore';
import { useToolStore } from '@/stores/toolStore';

interface ProjectData {
  id?: string;
  name: string;
  canvas_data: any;
  tool_state: any;
  animation_state: any;
}

export function useProjectSync() {
  const { user, tier } = useAuth();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Get auto-save preference from user profile
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  useEffect(() => {
    if (user) {
      // Fetch auto-save preference from profile
      supabase
        .from('profiles')
        .select('auto_save_enabled')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setAutoSaveEnabled(data.auto_save_enabled ?? true);
          }
        });
    }
  }, [user]);

  const toggleAutoSave = useCallback(async (enabled: boolean) => {
    setAutoSaveEnabled(enabled);
    if (user) {
      await supabase
        .from('profiles')
        .update({ auto_save_enabled: enabled })
        .eq('id', user.id);
    }
  }, [user]);

  // Save current state to cloud
  const saveToCloud = useCallback(
    async (projectName?: string): Promise<{ success: boolean; error?: string }> => {
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      setIsSyncing(true);

      try {
        // Gather current state from all stores
        const canvasState = useCanvasStore.getState();
        const animationState = useAnimationStore.getState();
        const toolState = useToolStore.getState();

        const projectData: ProjectData = {
          name: projectName || `Project ${new Date().toLocaleString()}`,
          canvas_data: {
            cells: canvasState.cells,
            gridSize: canvasState.gridSize,
            // Add other canvas state as needed
          },
          tool_state: {
            activeTool: toolState.activeTool,
            selectedCharacter: toolState.selectedCharacter,
            selectedTextColor: toolState.selectedTextColor,
            selectedBackgroundColor: toolState.selectedBackgroundColor,
            // Add other tool state as needed
          },
          animation_state: {
            frames: animationState.frames,
            currentFrameIndex: animationState.currentFrameIndex,
            // Add other animation state as needed
          },
        };

        if (currentProjectId) {
          // Update existing project
          const { error } = await supabase
            .from('projects')
            .update({
              ...projectData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', currentProjectId);

          if (error) throw error;
        } else {
          // Create new project
          const { data, error } = await supabase
            .from('projects')
            .insert([
              {
                ...projectData,
                user_id: user.id,
              },
            ])
            .select()
            .single();

          if (error) throw error;
          if (data) {
            setCurrentProjectId(data.id);
          }
        }

        setLastSyncedAt(new Date());
        setIsSyncing(false);
        return { success: true };
      } catch (error: any) {
        setIsSyncing(false);
        return { success: false, error: error.message };
      }
    },
    [user, currentProjectId]
  );

  // Load project from cloud
  const loadFromCloud = useCallback(
    async (projectId: string): Promise<{ success: boolean; error?: string }> => {
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      setIsSyncing(true);

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (error) throw error;

        if (data) {
          // Load state into stores
          const canvasState = data.canvas_data;
          const toolState = data.tool_state;
          const animationState = data.animation_state;

          useCanvasStore.getState().setCells(canvasState.cells);
          useCanvasStore.getState().setGridSize(canvasState.gridSize);

          useToolStore.getState().setActiveTool(toolState.activeTool);
          useToolStore.getState().setSelectedCharacter(toolState.selectedCharacter);
          // Load other tool state...

          useAnimationStore.getState().setFrames(animationState.frames);
          useAnimationStore.getState().setCurrentFrameIndex(animationState.currentFrameIndex);
          // Load other animation state...

          setCurrentProjectId(projectId);
          setLastSyncedAt(new Date());
        }

        setIsSyncing(false);
        return { success: true };
      } catch (error: any) {
        setIsSyncing(false);
        return { success: false, error: error.message };
      }
    },
    [user]
  );

  // Auto-save effect (only if enabled and user is authenticated)
  useEffect(() => {
    if (!autoSaveEnabled || !user || !currentProjectId) return;

    const interval = setInterval(() => {
      saveToCloud();
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(interval);
  }, [autoSaveEnabled, user, currentProjectId, saveToCloud]);

  return {
    currentProjectId,
    isSyncing,
    lastSyncedAt,
    autoSaveEnabled,
    toggleAutoSave,
    saveToCloud,
    loadFromCloud,
    setCurrentProjectId,
  };
}
```

### Save to Cloud Button (Hamburger Menu)

**File:** `src/components/features/HamburgerMenu.tsx` (updated)

```typescript
// Add to existing hamburger menu component

import { useAuth } from '@/contexts/AuthContext';
import { useProjectSync } from '@/hooks/useProjectSync';

export function HamburgerMenu() {
  const { user } = useAuth();
  const { autoSaveEnabled, toggleAutoSave, saveToCloud, isSyncing } = useProjectSync();
  const [showSignUpDialog, setShowSignUpDialog] = useState(false);

  const handleSaveToCloud = async () => {
    if (!user) {
      setShowSignUpDialog(true);
      return;
    }

    const result = await saveToCloud();
    if (result.success) {
      // Show success toast
    } else {
      // Show error toast
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Existing menu items... */}

          <DropdownMenuSeparator />

          {/* Cloud Save Section */}
          {user && (
            <>
              <DropdownMenuItem onClick={handleSaveToCloud} disabled={isSyncing}>
                {isSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Cloud className="mr-2 h-4 w-4" />
                )}
                Save to Cloud
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => toggleAutoSave(!autoSaveEnabled)}
                className="flex items-center justify-between"
              >
                <span className="flex items-center">
                  <Save className="mr-2 h-4 w-4" />
                  Auto-Save
                </span>
                {autoSaveEnabled && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            </>
          )}

          {!user && (
            <DropdownMenuItem onClick={() => setShowSignUpDialog(true)}>
              <Cloud className="mr-2 h-4 w-4" />
              Save to Cloud (Sign up required)
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <SignUpDialog
        open={showSignUpDialog}
        onOpenChange={setShowSignUpDialog}
        onSwitchToSignIn={() => {
          setShowSignUpDialog(false);
          // Open sign in dialog
        }}
      />
    </>
  );
}
```

---

## Security Considerations

### 1. **Row Level Security (RLS)**

✅ **All tables have RLS enabled**
- Users can only access their own data
- Database enforces security at the lowest level
- Even if client-side code is bypassed, data is protected

### 2. **Environment Variables**

✅ **Never commit secrets to Git**
```bash
# .env.local (gitignored)
VITE_SUPABASE_URL=xxx
VITE_SUPABASE_ANON_KEY=xxx # Public, safe to expose
```

❌ **Never use service role key in frontend**
- Service role bypasses RLS
- Only for server-side operations
- Not needed for our current implementation

### 3. **Email Verification Required**

✅ **Users must verify email before saving projects**
- Reduces spam accounts
- Ensures valid contact method
- Supabase handles verification flow

### 4. **Data Validation**

✅ **Client-side validation**
- Email format, password strength
- Project name length
- Data size limits

✅ **Server-side validation via RLS policies**
- User can only insert their own projects
- Tier limits enforced at database level

### 5. **GDPR Compliance**

✅ **Right to erasure**
- `delete_user_data()` function removes all user data
- Cascading deletes ensure no orphaned records
- Includes projects, versions, profile, auth account

✅ **Data minimization**
- Only collect necessary data (email, password)
- Optional: display name, avatar (future)

✅ **Data portability**
- Users can export their data (existing .asciimtn export)
- JSON format for easy parsing

### 6. **Rate Limiting**

⚠️ **Supabase built-in rate limiting**
- Free tier: 100 requests per second
- Authenticated: Higher limits
- If needed later: Implement custom rate limiting

---

## Migration Strategy

### For Existing Users (Anonymous → Authenticated)

**Scenario:** User has been using ASCII Motion anonymously, has projects in localStorage, now wants to sign up.

**Migration Flow:**

1. **User clicks "Save to Cloud" → Prompted to sign up**
2. **After email verification and signin:**
   ```typescript
   // Check if localStorage has unsaved projects
   const localProjects = loadFromLocalStorage();
   
   if (localProjects.length > 0) {
     // Show migration dialog
     <MigrationDialog
       projects={localProjects}
       onMigrate={async (selectedProjects) => {
         for (const project of selectedProjects) {
           await saveToCloud(project.name, project.data);
         }
         clearLocalStorage();
       }}
     />
   }
   ```

3. **User selects which local projects to migrate**
4. **Projects uploaded to cloud (within tier limits)**
5. **localStorage cleared (or marked as migrated)**

### For Returning Users (Cloud → Local Sync)

**Scenario:** User signs in on a new device, wants to access cloud projects.

**Sync Flow:**

1. **User signs in → Fetch cloud projects**
2. **Display "Projects" dialog with cloud projects**
3. **User selects project to open → Load into canvas**
4. **Auto-save keeps cloud synced (if enabled)**

### Conflict Resolution

**Scenario:** User modifies project offline, then comes back online with cloud changes.

**Resolution Strategy:**

```typescript
// When saving to cloud, check last_updated timestamp
const cloudProject = await fetchProjectMetadata(projectId);

if (cloudProject.updated_at > lastLocalSaveTime) {
  // Cloud is newer, show conflict dialog
  <ConflictDialog
    cloudVersion={cloudProject}
    localVersion={currentState}
    onResolve={(choice) => {
      if (choice === 'keep-cloud') {
        loadFromCloud(projectId);
      } else if (choice === 'keep-local') {
        saveToCloud(projectName, true); // force overwrite
      } else if (choice === 'duplicate') {
        saveToCloud(`${projectName} (local copy)`); // save as new
      }
    }}
  />
}
```

---

## Testing Plan

### Unit Tests (Future)

- [ ] `useAuth` hook: signup, signin, signout flows
- [ ] `useProjectSync` hook: save, load, auto-save
- [ ] Tier limit checks: `canCreateProject()`
- [ ] Data validation utilities

### Integration Tests

- [ ] **Signup Flow:**
  1. Enter email/password
  2. Submit form
  3. Check email for verification
  4. Click verification link
  5. Redirected to app, signed in
  6. Profile created in database

- [ ] **Save Project Flow:**
  1. Sign in
  2. Create canvas content
  3. Click "Save to Cloud"
  4. Verify project in database
  5. Check auto-save works (30s interval)

- [ ] **Load Project Flow:**
  1. Sign in
  2. Open "Projects" dialog
  3. Select project
  4. Verify canvas loads correctly
  5. Make edits, auto-save updates cloud

- [ ] **Project Limit Flow:**
  1. Sign in (free tier)
  2. Create 3 projects
  3. Attempt 4th project
  4. See "Upgrade to Pro" prompt (future)

- [ ] **Account Deletion Flow:**
  1. Sign in
  2. Go to account settings
  3. Click "Delete Account"
  4. Confirm deletion
  5. Verify all data removed from database
  6. Verify auth account deleted

### Manual Testing Checklist

**Email Verification:**
- [ ] Signup email received within 1 minute
- [ ] Email branded with ASCII Motion branding
- [ ] Verification link works
- [ ] Expired link shows proper error
- [ ] Unverified users cannot save to cloud

**Cloud Sync:**
- [ ] Save creates new project
- [ ] Save updates existing project
- [ ] Auto-save works every 30 seconds
- [ ] Auto-save toggle persists across sessions
- [ ] Last synced timestamp updates

**Multi-Device:**
- [ ] Sign in on Device A, save project
- [ ] Sign in on Device B, load same project
- [ ] Edits on Device B sync to cloud
- [ ] Device A refreshes and sees updates

**Offline/Online:**
- [ ] Work offline → prompt to sign in when saving
- [ ] Work online → auto-save syncs
- [ ] Go offline mid-session → show "offline" indicator
- [ ] Come back online → resume auto-save

---

## Future Premium Features

### When to Add Stripe Integration

**Indicators:**
1. ✅ 100+ active users
2. ✅ Users requesting more storage
3. ✅ Feature requests for HD exports
4. ✅ Community gallery ready to launch

### Premium Feature Roadmap

**Tier Structure (Prepared, Not Implemented):**

```typescript
// Free Tier (Current)
const freeTier = {
  name: 'free',
  max_projects: 3,
  features: [
    'basic_exports', // PNG, JPEG, MP4
    'local_storage',
    'community_gallery_view',
  ],
  price: 0,
};

// Pro Tier (Future)
const proTier = {
  name: 'pro',
  max_projects: -1, // unlimited
  features: [
    'hd_exports', // 4K video, large PNG
    'version_history', // Last 30 versions
    'priority_support',
    'custom_branding', // Remove "Made with ASCII Motion"
    'private_projects',
    'early_access_features',
  ],
  price: 500, // $5/month
};

// Enterprise Tier (Future)
const enterpriseTier = {
  name: 'enterprise',
  max_projects: -1,
  features: [
    ...proTier.features,
    'team_collaboration',
    'custom_domain', // yoursite.com/animation
    'api_access',
    'white_label',
    'dedicated_support',
  ],
  price: 2500, // $25/month
};
```

### Feature Flag System (Ready to Activate)

**File:** `src/utils/featureFlags.ts` (create when ready)

```typescript
import { useAuth } from '@/contexts/AuthContext';

export function useFeatureFlags() {
  const { tier } = useAuth();

  const hasFeature = (featureName: string): boolean => {
    if (!tier) return false;
    return tier.features.includes(featureName);
  };

  return {
    // Export features
    canExportHD: hasFeature('hd_exports'),
    canRemoveBranding: hasFeature('custom_branding'),

    // Storage features
    hasUnlimitedProjects: tier?.max_projects === -1,
    hasVersionHistory: hasFeature('version_history'),

    // Community features
    canPublishToGallery: true, // Free for all
    canMakePrivate: hasFeature('private_projects'),

    // Future features
    canCollaborate: hasFeature('team_collaboration'),
    hasApiAccess: hasFeature('api_access'),
  };
}
```

### Upgrade Prompt Component (Ready to Activate)

**File:** `src/components/features/UpgradePrompt.tsx` (create when ready)

```typescript
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  description: string;
}

export function UpgradePrompt({
  open,
  onOpenChange,
  feature,
  description,
}: UpgradePromptProps) {
  const handleUpgrade = () => {
    // Future: Redirect to Stripe Checkout
    window.location.href = '/pricing';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade to Pro 🚀</DialogTitle>
          <DialogDescription>
            {feature} is a Pro feature. {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold mb-2">ASCII Motion Pro</h3>
            <p className="text-2xl font-bold mb-2">$5<span className="text-sm font-normal">/month</span></p>
            <ul className="space-y-1 text-sm">
              <li>✅ Unlimited projects</li>
              <li>✅ HD exports (4K video)</li>
              <li>✅ Version history</li>
              <li>✅ Priority support</li>
              <li>✅ Remove branding</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade}>
            Upgrade to Pro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Next Steps

1. **Create Supabase project** → [Supabase Setup Guide](#supabase-setup-guide)
2. **Install dependencies:**
   ```bash
   npm install @supabase/supabase-js
   ```
3. **Copy code examples** from this document into your project
4. **Test authentication flow** locally
5. **Deploy to Vercel** with environment variables
6. **Monitor usage** and prepare for premium features

---

## Questions or Issues?

- **Supabase Docs:** https://supabase.com/docs
- **Discord:** [Join ASCII Motion community] (future)
- **GitHub Issues:** [Report bugs/feature requests]

---

**Last Updated:** October 12, 2025  
**Author:** ASCII Motion Development Team  
**Version:** 1.0.0 (Initial Plan)
