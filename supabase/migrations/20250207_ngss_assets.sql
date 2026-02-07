-- ═══════════════════════════════════════════════════════════════════════════
-- NGSS ASSETS TABLE
-- Internal library of NGSS-aligned 3D models for VR environments
-- ═══════════════════════════════════════════════════════════════════════════

-- Create ngss_assets table
CREATE TABLE IF NOT EXISTS public.ngss_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  model_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  ngss_standards TEXT[] DEFAULT '{}',
  curriculum_tags TEXT[] DEFAULT '{}',
  has_animation BOOLEAN DEFAULT false,
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ngss_assets_category ON public.ngss_assets(category);
CREATE INDEX IF NOT EXISTS idx_ngss_assets_subcategory ON public.ngss_assets(subcategory);
CREATE INDEX IF NOT EXISTS idx_ngss_assets_has_animation ON public.ngss_assets(has_animation);

-- GIN indexes for array fields (efficient for @> contains queries)
CREATE INDEX IF NOT EXISTS idx_ngss_assets_ngss_standards ON public.ngss_assets USING GIN(ngss_standards);
CREATE INDEX IF NOT EXISTS idx_ngss_assets_curriculum_tags ON public.ngss_assets USING GIN(curriculum_tags);
CREATE INDEX IF NOT EXISTS idx_ngss_assets_keywords ON public.ngss_assets USING GIN(keywords);

-- Full text search index on name and description
CREATE INDEX IF NOT EXISTS idx_ngss_assets_search ON public.ngss_assets
  USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Enable RLS (but with public read access)
ALTER TABLE public.ngss_assets ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- Public read access for all users (authenticated or not)
-- ═══════════════════════════════════════════════════════════════════════════

-- Policy: Anyone can read assets (public library)
CREATE POLICY "Public read access for ngss_assets"
  ON public.ngss_assets
  FOR SELECT
  TO public
  USING (true);

-- Policy: Only service role can insert/update/delete (admin only via Supabase dashboard or admin API)
-- No explicit policies for INSERT/UPDATE/DELETE means only service_role can modify

-- ═══════════════════════════════════════════════════════════════════════════
-- AUTO-UPDATE updated_at TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════

-- Reuse the handle_updated_at function if it exists, otherwise create it
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_updated_at ON public.ngss_assets;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.ngss_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE public.ngss_assets IS 'Internal library of NGSS-aligned 3D models for VR biology environments';
COMMENT ON COLUMN public.ngss_assets.model_url IS 'URL to the GLB/GLTF 3D model file';
COMMENT ON COLUMN public.ngss_assets.category IS 'Primary category (e.g., Cells, Organisms, Ecosystems)';
COMMENT ON COLUMN public.ngss_assets.subcategory IS 'Secondary category for finer organization';
COMMENT ON COLUMN public.ngss_assets.ngss_standards IS 'Array of NGSS standard codes (e.g., HS-LS1-1, MS-LS2-3)';
COMMENT ON COLUMN public.ngss_assets.curriculum_tags IS 'Array of curriculum-related tags for filtering';
COMMENT ON COLUMN public.ngss_assets.has_animation IS 'Whether the model contains animations';
COMMENT ON COLUMN public.ngss_assets.keywords IS 'Array of searchable keywords for discovery';
