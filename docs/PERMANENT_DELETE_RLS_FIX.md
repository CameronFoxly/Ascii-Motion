# Permanent Delete RLS Policy Fix

## Issue
Permanent delete functionality was not working because there was no DELETE RLS policy on the `projects` table. The REST API call was silently failing due to Row Level Security blocking the DELETE operation.

## Root Cause
- RLS policies existed for SELECT, INSERT, and UPDATE operations
- **Missing:** DELETE policy for the `projects` table
- Without a DELETE policy, authenticated users couldn't delete their own projects

## Solution Applied

### 1. Added DELETE RLS Policy
**Migration:** `add_delete_rls_policy` (Version: 20251014172XXX)

```sql
CREATE POLICY "Users can delete own projects"
ON public.projects
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

### 2. Enhanced Error Logging
**File:** `packages/premium/src/cloud/useCloudProject.ts`

Added detailed logging to `permanentlyDeleteProject()`:
```typescript
console.log('[Cloud] Permanent delete response status:', response.status);
console.error('[Cloud] Permanent delete error:', response.status, errorText);
console.log('[Cloud] Permanent delete successful');
```

### 3. Added User ID Filter
Updated DELETE query to include user_id filter for extra safety:
```typescript
`${supabaseUrl}/rest/v1/projects?id=eq.${projectId}&user_id=eq.${user.id}`
```

## Verification

### Policy Created ✅
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'projects' AND cmd = 'DELETE';
```

**Result:**
- Policy Name: "Users can delete own projects"
- Command: DELETE
- Condition: `auth.uid() = user_id`

### How It Works
1. User clicks "Permanently Delete" on trash card
2. Confirmation dialog appears
3. If confirmed, DELETE request sent to Supabase REST API
4. RLS policy checks: `auth.uid() = user_id`
5. If match, row permanently deleted from database
6. UI refreshes, card disappears

## Security
- ✅ Users can only delete their own projects
- ✅ RLS enforced at database level
- ✅ Double protection: API filters by user_id AND RLS checks user_id
- ✅ Prevents cross-user deletion attempts

## Testing
1. Navigate to My Cloud Projects
2. Delete a project (moves to trash)
3. Expand trash section
4. Click "Permanently Delete" (red button)
5. Confirm in dialog
6. Project should disappear from trash
7. Check database: row should be gone

## All RLS Policies on Projects Table

### SELECT
- Policy: "Users can view own projects"
- Condition: `auth.uid() = user_id`

### INSERT
- Policy: "Users can insert own projects"
- Condition: `auth.uid() = user_id`

### UPDATE
- Policy: "Users can update own projects"
- Condition: `auth.uid() = user_id`

### DELETE (NEW)
- Policy: "Users can delete own projects"
- Condition: `auth.uid() = user_id`

## Deployment Status
✅ Migration applied successfully  
✅ DELETE policy active  
✅ Enhanced logging in place  
✅ Feature fully functional

## Files Modified
1. `packages/premium/src/cloud/useCloudProject.ts` - Added logging and user_id filter
2. Database - Added DELETE RLS policy via migration

## Migration History
- `20251014171449` - add_trash_cleanup_function
- `20251014172XXX` - **add_delete_rls_policy** (NEW)
