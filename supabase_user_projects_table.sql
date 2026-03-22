-- ============================================================================
-- CREATE user_projects TABLE
-- This table stores VR Studio projects for authenticated users
-- ============================================================================

-- Create the table
CREATE TABLE IF NOT EXISTS public.user_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Untitled Project',
    short_id TEXT,  -- Optional link to scenes.short_id for public sharing
    scene_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    thumbnail_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON public.user_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_projects_updated_at ON public.user_projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_projects_short_id ON public.user_projects(short_id) WHERE short_id IS NOT NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running this script)
DROP POLICY IF EXISTS "Users can view their own projects" ON public.user_projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.user_projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.user_projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.user_projects;

-- RLS Policies: Users can only access their own projects
CREATE POLICY "Users can view their own projects"
    ON public.user_projects
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
    ON public.user_projects
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
    ON public.user_projects
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
    ON public.user_projects
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.user_projects;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.user_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES (run these after creating the table)
-- ============================================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'user_projects'
-- ORDER BY ordinal_position;

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'user_projects';

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'user_projects';

-- ============================================================================
-- SAMPLE DATA (optional - for testing)
-- ============================================================================

-- Insert a test project (replace 'your-user-id' with actual user ID from auth.users)
-- INSERT INTO public.user_projects (user_id, name, scene_data, status, thumbnail_url)
-- VALUES (
--     'your-user-id'::uuid,
--     'Test VR Lab',
--     '{"environment": {"name": "Science Lab", "type": "environment-ai"}, "models": []}'::jsonb,
--     'draft',
--     'https://example.com/thumbnail.jpg'
-- );
