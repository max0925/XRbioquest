-- ============================================================================
-- CLEAN TEST/PLACEHOLDER PROJECTS
-- Use this to remove test data or placeholder projects from user_projects table
-- ============================================================================

-- 1. VIEW all projects to see what data exists
-- Run this first to see what you have
SELECT
    id,
    user_id,
    name,
    status,
    created_at,
    updated_at,
    CASE
        WHEN scene_data::text = '{}'::text THEN 'Empty'
        ELSE 'Has Data'
    END as scene_status
FROM public.user_projects
ORDER BY updated_at DESC;

-- 2. DELETE all "Untitled Project" entries (if they're empty placeholders)
-- CAREFUL: Only run this if you're sure these are test data!
-- Uncomment the DELETE statement below when you're ready:

-- DELETE FROM public.user_projects
-- WHERE name = 'Untitled Project'
-- AND scene_data::text = '{}'::text;

-- 3. DELETE specific projects by ID
-- Replace 'your-project-id' with the actual ID from step 1
-- Uncomment when ready:

-- DELETE FROM public.user_projects
-- WHERE id = 'your-project-id'::uuid;

-- 4. DELETE ALL projects for a specific user (DANGER!)
-- Replace 'your-user-id' with actual user ID
-- ONLY use this if you want to completely reset your projects
-- Uncomment when ready:

-- DELETE FROM public.user_projects
-- WHERE user_id = 'your-user-id'::uuid;

-- 5. VERIFY deletion
-- Run this after deletion to confirm
SELECT COUNT(*) as remaining_projects
FROM public.user_projects;

-- ============================================================================
-- NOTES:
-- - Always run SELECT queries first to see what will be deleted
-- - Test deletions are irreversible - make sure you're deleting the right data
-- - If you accidentally delete important data, you'll need to recreate it
-- ============================================================================
