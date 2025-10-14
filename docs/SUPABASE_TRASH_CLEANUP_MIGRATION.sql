-- ============================================
-- Automated Trash Cleanup for Projects
-- ============================================
-- This migration adds automatic cleanup of deleted projects
-- after 30 days in trash, preventing database bloat

-- Function to permanently delete projects that have been in trash > 30 days
CREATE OR REPLACE FUNCTION cleanup_old_deleted_projects()
RETURNS void AS $$
BEGIN
  DELETE FROM public.projects
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (function runs as definer)
GRANT EXECUTE ON FUNCTION cleanup_old_deleted_projects() TO authenticated;

-- ============================================
-- Schedule Cleanup (Option 1: Using pg_cron)
-- ============================================
-- NOTE: pg_cron requires the extension to be enabled in Supabase
-- You may need to enable it via: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Then run this in Supabase SQL Editor:
/*
SELECT cron.schedule(
  'cleanup-deleted-projects',
  '0 2 * * *', -- Run daily at 2 AM UTC
  $$SELECT cleanup_old_deleted_projects()$$
);
*/

-- ============================================
-- Schedule Cleanup (Option 2: Supabase Edge Function)
-- ============================================
-- If pg_cron is not available, you can create a Supabase Edge Function
-- and call it via cron-job.org or GitHub Actions on a schedule
-- The function would call: supabase.rpc('cleanup_old_deleted_projects')

-- ============================================
-- Manual Cleanup (Run as needed)
-- ============================================
-- You can also run this manually to clean up old deleted projects:
-- SELECT cleanup_old_deleted_projects();

-- ============================================
-- View Projects in Trash
-- ============================================
-- Useful query to see what's currently in trash and when it expires:
/*
SELECT 
  id,
  name,
  deleted_at,
  deleted_at + INTERVAL '30 days' AS expires_at,
  EXTRACT(DAY FROM (deleted_at + INTERVAL '30 days' - NOW())) AS days_until_permanent_delete
FROM public.projects
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;
*/
