# Supabase Architecture & REST API Implementation

**Last Updated:** October 13, 2025  
**Status:** Production Implementation

## Overview

ASCII Motion's cloud storage and authentication system uses **Supabase as a backend**, but specifically uses **direct REST API calls** instead of the Supabase JavaScript client for all database operations. This document explains why, how, and when to use this approach.

---

## Architectural Decision: REST API over JS Client

### Why We Use Direct REST API Calls

During initial implementation, the Supabase JavaScript client (v2.49.1) exhibited complete failure in our environment:

**Client Issues Encountered:**
- ✅ `supabase.auth.getSession()` - Hung indefinitely, never resolved
- ✅ `supabase.auth.onAuthStateChange()` - Subscription created but callback never fired
- ✅ `supabase.from('table').insert()` - Hung indefinitely with no HTTP request made
- ✅ `supabase.from('table').select()` - Hung indefinitely with no HTTP request made
- ✅ `supabase.from('table').update()` - Assumed broken (same pattern)

**Root Cause:** The client's internal HTTP layer failed to make requests in our Safari/Vite/React environment. Since debugging SDK internals is time-prohibitive and the REST API is Supabase's stable public interface, we bypassed the client entirely.

**Backend Verification:** Using the Supabase MCP (Model Context Protocol), we verified that:
- ✅ Database schema is correct
- ✅ RLS policies function properly
- ✅ Direct SQL executions succeed
- ✅ REST API endpoints work perfectly

**Conclusion:** The database backend is fully operational; only the JavaScript client wrapper is broken.

---

## Implementation Patterns

### 1. Authentication State Management

**Session Persistence (AuthContext.tsx):**

```typescript
// Manual session restoration from localStorage
const checkStoredSession = () => {
  const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`;
  const storedSession = localStorage.getItem(storageKey);
  
  if (storedSession) {
    const parsed = JSON.parse(storedSession);
    
    if (parsed?.access_token && parsed?.user) {
      // Inform Supabase client of session (still needed for auth state)
      supabase.auth.setSession({
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token,
      }).then(({ data }) => {
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
        }
      });
    }
  }
};
```

**Why This Works:**
- `localStorage` is reliable and directly accessible
- `setSession()` informs the client without waiting for events
- React state is managed manually, not dependent on client callbacks
- 1-second timeout fallback prevents infinite loading states

### 2. Database Operations via REST API

**Pattern: GET Request (SELECT)**

```typescript
// Get access token from localStorage
const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`;
const storedSession = localStorage.getItem(storageKey);
const parsed = JSON.parse(storedSession);
const accessToken = parsed.access_token;

// Direct REST API call with PostgREST query syntax
const response = await fetch(
  `${supabaseUrl}/rest/v1/projects?user_id=eq.${userId}&deleted_at=is.null&order=updated_at.desc&select=*`,
  {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': supabase['supabaseKey'], // Anonymous key
    },
  }
);

const data = await response.json();
```

**Pattern: POST Request (INSERT)**

```typescript
const response = await fetch(`${supabaseUrl}/rest/v1/projects`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'apikey': supabase['supabaseKey'],
    'Prefer': 'return=representation', // Return inserted row
  },
  body: JSON.stringify({
    user_id: userId,
    name: projectName,
    canvas_data: data,
  }),
});

const insertedRows = await response.json();
const newProject = insertedRows[0];
```

**Pattern: PATCH Request (UPDATE)**

```typescript
const response = await fetch(
  `${supabaseUrl}/rest/v1/projects?id=eq.${projectId}&user_id=eq.${userId}`,
  {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': supabase['supabaseKey'],
    },
    body: JSON.stringify({
      name: newName,
      updated_at: new Date().toISOString(),
    }),
  }
);
```

**Pattern: DELETE Request (DELETE)**

```typescript
const response = await fetch(
  `${supabaseUrl}/rest/v1/projects?id=eq.${projectId}&user_id=eq.${userId}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': supabase['supabaseKey'],
    },
  }
);
```

---

## PostgREST Query Syntax Reference

Supabase uses PostgREST for its REST API. Query parameters follow this format:

### Filtering
- **Equality:** `column=eq.value`
- **Not equal:** `column=neq.value`
- **Greater than:** `column=gt.value`
- **Less than:** `column=lt.value`
- **Greater/equal:** `column=gte.value`
- **Less/equal:** `column=lte.value`
- **LIKE:** `column=like.*pattern*`
- **ILIKE:** `column=ilike.*pattern*` (case-insensitive)
- **IN:** `column=in.(value1,value2,value3)`
- **IS NULL:** `column=is.null`
- **NOT NULL:** `column=not.is.null`

### Ordering & Pagination
- **Order:** `order=column.asc` or `order=column.desc`
- **Limit:** `limit=10`
- **Offset:** `offset=20`
- **Range:** Use `Range` header: `Range: 0-9` (returns 10 rows)

### Column Selection
- **All columns:** `select=*`
- **Specific columns:** `select=id,name,created_at`
- **Nested relations:** `select=*,author:user_id(*)`

### Multiple Filters
Combine with `&`:
```
?user_id=eq.123&deleted_at=is.null&order=created_at.desc&limit=10
```

---

## Security Considerations

### Row Level Security (RLS)

RLS policies are **enforced by the backend**, regardless of client vs REST API:

```sql
-- SELECT policy: Users can only see their own non-deleted projects
CREATE POLICY "Users can view own projects"
ON public.projects FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NULL);

-- INSERT policy: User ID must match authenticated user
CREATE POLICY "Users can insert own projects"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE policy: Users can only update own projects
CREATE POLICY "Users can update own projects"
ON public.projects FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

**Key Points:**
- ✅ RLS uses `auth.uid()` from the JWT token in the `Authorization` header
- ✅ The `apikey` header provides anonymous access level
- ✅ Both headers are required for authenticated requests
- ✅ REST API and JS client use the same RLS enforcement

### Token Management

**Access Token (JWT):**
- Stored in `localStorage` with key: `sb-{project-slug}-auth-token`
- Valid for 1 hour by default
- Contains `user_id`, `email`, `role`, and other claims
- Used in `Authorization: Bearer {token}` header

**Anonymous Key (apikey):**
- Public key, safe to expose in client code
- Defines base permission level (usually read-only on public tables)
- User permissions are elevated by the JWT token
- Used in `apikey: {key}` header

**Refresh Token:**
- Also in localStorage
- Used by `supabase.auth.setSession()` to refresh expired access tokens
- Longer-lived (weeks/months)

---

## When to Use Supabase Client vs REST API

### ✅ Use REST API For:
- **Database operations** (SELECT, INSERT, UPDATE, DELETE)
- **Cloud project CRUD** (save, load, list, delete, rename)
- **Any operation that was hanging with the client**
- **Maximum transparency and debugging**

### ⚠️ Use Supabase Client For:
- **Initial authentication** (`signUp`, `signInWithPassword`, `signOut`)
- **Session management** (`setSession` to restore from localStorage)
- **Token refresh** (handled automatically by client)

### ❓ Evaluate Case-by-Case:
- **File uploads** (Storage) - REST API works, see Storage section below
- **Realtime subscriptions** - May need to test if client's realtime works
- **Edge Functions** - Use direct HTTP calls to function endpoints

---

## Future: File Uploads & Storage

When implementing user avatars or other file storage:

### Storage REST API Pattern

**Upload File:**
```typescript
const formData = new FormData();
formData.append('file', file);

const response = await fetch(
  `${supabaseUrl}/storage/v1/object/avatars/${userId}/avatar.jpg`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': supabase['supabaseKey'],
    },
    body: formData,
  }
);
```

**Get Public URL:**
```typescript
const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${userId}/avatar.jpg`;
```

**Delete File:**
```typescript
await fetch(
  `${supabaseUrl}/storage/v1/object/avatars/${userId}/avatar.jpg`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': supabase['supabaseKey'],
    },
  }
);
```

---

## Gallery & Social Features

### Project Previews
**Recommendation:** Generate server-side, not uploaded by users

```typescript
// Supabase Edge Function: generate-preview
export async function generatePreview(projectId: string) {
  // Fetch project data
  const response = await fetch(
    `${supabaseUrl}/rest/v1/projects?id=eq.${projectId}&select=canvas_data`,
    { headers: { ... } }
  );
  
  const { canvas_data } = await response.json();
  
  // Render ASCII to image (using canvas or sharp)
  const imageBuffer = renderAsciiToImage(canvas_data);
  
  // Upload to storage
  await fetch(
    `${supabaseUrl}/storage/v1/object/previews/${projectId}.png`,
    {
      method: 'POST',
      body: imageBuffer,
      headers: { ... },
    }
  );
}
```

**Benefits:**
- Consistent quality
- Automatic generation on save
- No user upload validation needed
- Can be regenerated anytime

### User Avatars
**Recommendation:** Use Storage REST API with direct uploads

- Small files (~100KB)
- User-controlled
- CDN-backed for fast loading
- RLS policies for privacy

---

## Error Handling

### Common Error Scenarios

**401 Unauthorized:**
```typescript
if (response.status === 401) {
  // Token expired or invalid
  // Prompt user to log in again
  // Clear localStorage and redirect to login
}
```

**403 Forbidden:**
```typescript
if (response.status === 403) {
  // RLS policy blocked the operation
  // User trying to access/modify someone else's data
}
```

**404 Not Found:**
```typescript
if (response.status === 404) {
  // Resource doesn't exist
  // Either deleted or never existed
}
```

**409 Conflict:**
```typescript
if (response.status === 409) {
  // Unique constraint violation
  // Duplicate key, concurrent modification
}
```

### Error Response Format

PostgREST returns errors as JSON:
```json
{
  "code": "PGRST116",
  "message": "JSON object requested, but multiple (or no) rows returned",
  "details": null,
  "hint": null
}
```

Always parse error text:
```typescript
if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`Operation failed: ${response.status} ${errorText}`);
}
```

---

## Testing & Debugging

### Using Supabase MCP

The Supabase MCP (Model Context Protocol) is invaluable for backend testing:

```typescript
// List tables
mcp_supabase_list_tables({ project_id: 'your-project-id' })

// Execute SQL
mcp_supabase_execute_sql({
  project_id: 'your-project-id',
  query: 'SELECT * FROM projects WHERE user_id = \'...\' LIMIT 5'
})

// Check advisors (security/performance)
mcp_supabase_get_advisors({
  project_id: 'your-project-id',
  type: 'security'
})
```

### Using curl for REST API

Test endpoints directly:
```bash
# GET request
curl "https://{project}.supabase.co/rest/v1/projects?select=*" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"

# POST request
curl "https://{project}.supabase.co/rest/v1/projects" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}" \
  -H "Prefer: return=representation" \
  -d '{"user_id":"...","name":"Test","canvas_data":{}}'
```

### Browser DevTools

Check Network tab for:
- Request URL and method
- Request headers (Authorization, apikey)
- Request body
- Response status and body
- Timing (should be <500ms for most operations)

---

## Performance Considerations

### Why REST API is Fast

- **Direct HTTP requests** - No client overhead
- **CDN-backed** - Supabase REST API uses Cloudflare
- **Connection pooling** - Browser handles Keep-Alive
- **Small payloads** - Only send/receive what you need

### Optimization Tips

1. **Select specific columns:**
   ```
   select=id,name,updated_at  // Not select=*
   ```

2. **Use pagination:**
   ```
   limit=20&offset=0
   ```

3. **Index frequently filtered columns:**
   ```sql
   CREATE INDEX idx_projects_user_updated 
   ON projects(user_id, updated_at DESC) 
   WHERE deleted_at IS NULL;
   ```

4. **Batch operations when possible:**
   ```typescript
   // Single insert with array
   body: JSON.stringify([project1, project2, project3])
   ```

---

## Code Organization

### Current File Structure

```
packages/premium/src/
├── auth/
│   ├── AuthContext.tsx          # Manual session management
│   ├── lib/
│   │   └── supabase.ts          # Client creation, exports supabaseUrl
│   └── components/
│       ├── SignInDialog.tsx     # Uses client for auth
│       └── SignUpDialog.tsx     # Uses client for auth
├── cloud/
│   ├── useCloudProject.ts       # REST API for all DB ops
│   ├── types.ts                 # CloudProject, SessionData types
│   ├── utils/
│   │   └── projectSerializer.ts # Serialize/deserialize logic
│   └── components/
│       ├── SaveToCloudDialog.tsx
│       └── ProjectsDialog.tsx
```

### Helper Function Pattern

To reduce duplication, extract token fetching:

```typescript
// packages/premium/src/cloud/utils/authHelpers.ts
export function getAccessToken(): string {
  const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`;
  const storedSession = localStorage.getItem(storageKey);
  
  if (!storedSession) {
    throw new Error('No session found');
  }
  
  const parsed = JSON.parse(storedSession);
  
  if (!parsed.access_token) {
    throw new Error('No access token found');
  }
  
  return parsed.access_token;
}

export function getAnonKey(): string {
  return supabase['supabaseKey'] || import.meta.env.VITE_SUPABASE_ANON_KEY;
}

// Usage in hooks
const accessToken = getAccessToken();
const anonKey = getAnonKey();
```

---

## Migration Path (If Client Gets Fixed)

If a future Supabase client version works, here's how to migrate back:

### 1. Test New Client Version
```typescript
// Create separate test file
import { createClient } from '@supabase/supabase-js@latest';

const testClient = createClient(url, key);
const { data } = await testClient.from('projects').select('*').limit(1);
console.log('Client works!', data);
```

### 2. Gradual Replacement
- Keep REST API as fallback
- Start with read operations (SELECT)
- Move to writes (INSERT/UPDATE) if reads work
- Keep manual session management (it's actually better)

### 3. Don't Remove REST API Knowledge
- REST API is the **foundation**, client is a wrapper
- Knowing REST API makes debugging easier
- Some features (like batch operations) are clearer in REST

---

## Summary

**Current Architecture:**
- ✅ Authentication: Supabase client for sign-in/sign-up
- ✅ Session persistence: Manual localStorage management
- ✅ Database operations: Direct REST API with fetch()
- ✅ File storage (future): Storage REST API

**Why It Works:**
- Bypasses broken JavaScript client
- Uses stable public REST API
- More transparent and debuggable
- Performs well (fast, reliable)
- Future-proof (REST API won't break)

**Maintenance Notes:**
- Keep REST API patterns for all new database features
- Extract common helpers to reduce duplication
- Document any new PostgREST patterns discovered
- Use MCP for backend verification/testing

---

## Related Documentation

- [Cloud Project Types](./types.ts) - TypeScript interfaces
- [Project Serialization](./utils/projectSerializer.ts) - Data format conversion
- [Authentication Context](../auth/AuthContext.tsx) - Session management
- [PostgREST Documentation](https://postgrest.org/en/stable/api.html)
- [Supabase REST API Reference](https://supabase.com/docs/guides/api)
