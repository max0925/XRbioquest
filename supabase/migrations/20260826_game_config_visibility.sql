-- P1a: backward-compatible experience visibility foundation.
--
-- IMPORTANT: This migration is additive and must be deployed before the P1a
-- application code. It deliberately does not update existing rows:
--   NULL        = legacy visibility; remains publicly playable for compatibility
--   draft       = private to the authenticated owner through application APIs
--   published   = publicly playable
--
-- No RLS policies are changed here because this repository does not have a
-- local Supabase policy test harness. Tightening the legacy public policies is
-- a separate, explicitly validated deployment step.

ALTER TABLE public.game_configs
  ADD COLUMN IF NOT EXISTS visibility TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'game_configs_visibility_check'
      AND conrelid = 'public.game_configs'::regclass
  ) THEN
    ALTER TABLE public.game_configs
      ADD CONSTRAINT game_configs_visibility_check
      CHECK (visibility IS NULL OR visibility IN ('draft', 'published'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS game_configs_visibility_idx
  ON public.game_configs (visibility);

COMMENT ON COLUMN public.game_configs.visibility IS
  'P1a access state: NULL=legacy-compatible public playback, draft=owner-only application access, published=public playback';
