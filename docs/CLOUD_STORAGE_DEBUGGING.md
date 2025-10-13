# Cloud Storage Debugging Guide

## Issue
Save and Load from cloud features show spinners but never complete. No console logs appear, and nothing saves to the database.

## Database Table Location
Projects are stored in: **`public.projects`**

### Expected Schema
```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  
  -- Project metadata
  name text not null,
  description text,
  
  -- Project data (stored as JSONB)
  canvas_data jsonb not null,
  tool_state jsonb,
  animation_state jsonb,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_opened_at timestamptz default now(),
  
  -- Soft delete
  deleted_at timestamptz
);
```

## Debugging Steps Added

### 1. Enhanced Logging
Added verbose console logging to track execution flow:

**SaveToCloudDialog.tsx:**
- Logs button clicks
- Logs project name validation
- Logs start/success/failure of save

**useCloudProjectActions.ts:**
- Logs session data creation
- Logs frame count and canvas dimensions
- Logs save success/failure

**useCloudProject.ts (premium package):**
- Logs user authentication status
- Logs project data serialization
- Logs Supabase insert/update operations
- Logs detailed error information

### 2. Things to Check

#### A. Supabase Configuration
1. **Check if `.env.local` has correct values:**
   ```bash
   cat .env.local
   ```
   Should contain:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

2. **Verify table exists in Supabase:**
   - Go to Supabase Dashboard → Table Editor
   - Look for `projects` table in `public` schema
   - If missing, run the SQL from AUTH_IMPLEMENTATION_PLAN.md

#### B. Row Level Security (RLS)
The table likely needs RLS policies for users to insert/select their own projects:

```sql
-- Enable RLS
alter table public.projects enable row level security;

-- Allow users to insert their own projects
create policy "Users can insert own projects"
  on public.projects
  for insert
  with check (auth.uid() = user_id);

-- Allow users to select their own projects
create policy "Users can select own projects"
  on public.projects
  for select
  using (auth.uid() = user_id);

-- Allow users to update their own projects
create policy "Users can update own projects"
  on public.projects
  for update
  using (auth.uid() = user_id);

-- Allow users to delete their own projects
create policy "Users can delete own projects"
  on public.projects
  for delete
  using (auth.uid() = user_id);
```

#### C. Authentication
1. **Verify user is actually logged in:**
   - Check browser console for `[useCloudProject] hasUser: true`
   - Check that `userId` is a valid UUID

2. **Check Supabase auth session:**
   ```javascript
   // In browser console:
   const { data: { session } } = await supabase.auth.getSession()
   console.log(session)
   ```

## Next Steps

1. **Restart dev server** to pick up enhanced logging:
   ```bash
   npm run dev
   ```

2. **Open browser console** and attempt to save a project

3. **Look for log messages** starting with:
   - `[SaveToCloudDialog]`
   - `[CloudActions]`
   - `[useCloudProject]`

4. **Check for errors:**
   - Supabase connection errors
   - RLS policy violations
   - Missing table errors
   - Authentication errors

5. **Check Supabase logs:**
   - Go to Supabase Dashboard → Logs
   - Look for API requests and errors

## Common Issues

### Issue: No logs appear at all
**Cause:** Code not executing (button not wired up correctly)
**Fix:** Check if dialog is properly connected to state

### Issue: Logs show "Must be signed in"
**Cause:** User not authenticated or session expired
**Fix:** Sign out and sign back in

### Issue: Logs show "relation 'projects' does not exist"
**Cause:** Table not created in database
**Fix:** Run SQL migration to create table

### Issue: Logs show "permission denied" or "new row violates row-level security policy"
**Cause:** RLS policies not configured
**Fix:** Add RLS policies (see above)

### Issue: Infinite spinner
**Cause:** Promise never resolves (likely network/database issue)
**Fix:** Check browser Network tab for failed requests

## Viewing Saved Projects in Supabase

1. Go to Supabase Dashboard
2. Click "Table Editor" in sidebar
3. Select "projects" table from dropdown
4. You should see saved projects with columns:
   - `id` (UUID)
   - `user_id` (UUID)
   - `name` (text)
   - `description` (text)
   - `canvas_data` (jsonb) - Contains all session data
   - `created_at`, `updated_at`, `last_opened_at` (timestamps)
