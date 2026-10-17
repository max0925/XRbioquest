-- STAGING BOOTSTRAP ONLY.
-- Normalized, idempotent baseline for an empty Supabase staging project.
-- Do not add this file to the production migration history without a separate
-- reconciliation review against the production schema and migration ledger.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.game_configs (
  id             TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  config         JSONB       NOT NULL,
  title          TEXT,
  subject        TEXT,
  prompt         TEXT,
  is_published   BOOLEAN     NOT NULL DEFAULT false,
  play_count     INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_configs_user_id_idx
  ON public.game_configs (user_id);

CREATE INDEX IF NOT EXISTS game_configs_created_at_idx
  ON public.game_configs (created_at DESC);

CREATE OR REPLACE FUNCTION public.set_game_configs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_game_configs_updated_at ON public.game_configs;
CREATE TRIGGER set_game_configs_updated_at
  BEFORE UPDATE ON public.game_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_game_configs_updated_at();

ALTER TABLE public.game_configs ENABLE ROW LEVEL SECURITY;

-- Reproduce the legacy policy state so the P1a.5 migration transition is
-- exercised in staging. The next migration must replace these policies before
-- application testing or data creation.
DROP POLICY IF EXISTS public_read_game_configs ON public.game_configs;
DROP POLICY IF EXISTS public_insert_game_configs ON public.game_configs;
DROP POLICY IF EXISTS owner_update_game_configs ON public.game_configs;
DROP POLICY IF EXISTS owner_delete_game_configs ON public.game_configs;

CREATE POLICY public_read_game_configs
  ON public.game_configs
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY public_insert_game_configs
  ON public.game_configs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY owner_update_game_configs
  ON public.game_configs
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY owner_delete_game_configs
  ON public.game_configs
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
