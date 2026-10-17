-- P1a.5 STAGING-ONLY RLS HARDENING.
-- Apply only after the game_configs baseline and P1a visibility migration.
-- This migration intentionally preserves visibility IS NULL as public legacy
-- playback. It does not modify rows or infer missing ownership.

DO $$
DECLARE
  invalid_columns TEXT;
BEGIN
  SELECT string_agg(required.name, ', ' ORDER BY required.name)
    INTO invalid_columns
  FROM (VALUES
    ('id', 'text'),
    ('user_id', 'uuid'),
    ('config', 'jsonb'),
    ('is_published', 'bool'),
    ('visibility', 'text')
  ) AS required(name, udt_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns AS columns
    WHERE columns.table_schema = 'public'
      AND columns.table_name = 'game_configs'
      AND columns.column_name = required.name
      AND columns.udt_name = required.udt_name
  );

  IF invalid_columns IS NOT NULL THEN
    RAISE EXCEPTION 'game_configs has missing or incompatible columns: %', invalid_columns;
  END IF;
END
$$;

ALTER TABLE public.game_configs ENABLE ROW LEVEL SECURITY;

-- Remove both the normalized names and any quoted legacy names if present.
DROP POLICY IF EXISTS public_read_game_configs ON public.game_configs;
DROP POLICY IF EXISTS public_insert_game_configs ON public.game_configs;
DROP POLICY IF EXISTS owner_update_game_configs ON public.game_configs;
DROP POLICY IF EXISTS owner_delete_game_configs ON public.game_configs;

DROP POLICY IF EXISTS "public_read_game_configs" ON public.game_configs;
DROP POLICY IF EXISTS "public_insert_game_configs" ON public.game_configs;
DROP POLICY IF EXISTS "owner_update_game_configs" ON public.game_configs;
DROP POLICY IF EXISTS "owner_delete_game_configs" ON public.game_configs;

DROP POLICY IF EXISTS game_configs_public_read ON public.game_configs;
DROP POLICY IF EXISTS game_configs_owner_read ON public.game_configs;
DROP POLICY IF EXISTS game_configs_owner_insert ON public.game_configs;
DROP POLICY IF EXISTS game_configs_owner_update ON public.game_configs;
DROP POLICY IF EXISTS game_configs_owner_delete ON public.game_configs;

CREATE POLICY game_configs_public_read
  ON public.game_configs
  FOR SELECT
  TO anon, authenticated
  USING (visibility IS NULL OR visibility = 'published');

CREATE POLICY game_configs_owner_read
  ON public.game_configs
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY game_configs_owner_insert
  ON public.game_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND visibility = 'draft'
    AND is_published = false
  );

CREATE POLICY game_configs_owner_update
  ON public.game_configs
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (
      visibility IS NULL
      OR (visibility = 'draft' AND is_published = false)
      OR (visibility = 'published' AND is_published = true)
    )
  );

CREATE POLICY game_configs_owner_delete
  ON public.game_configs
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.game_configs FROM anon, authenticated;
GRANT SELECT ON public.game_configs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_configs TO authenticated;
