-- STAGING-ONLY rollback for P1a.5 RLS hardening.
-- Restores the legacy game_configs policies. It does not remove visibility or
-- alter data. Use only after rolling back the P1a/P1a.5 application deployment.

BEGIN;

DROP POLICY IF EXISTS game_configs_public_read ON public.game_configs;
DROP POLICY IF EXISTS game_configs_owner_read ON public.game_configs;
DROP POLICY IF EXISTS game_configs_owner_insert ON public.game_configs;
DROP POLICY IF EXISTS game_configs_owner_update ON public.game_configs;
DROP POLICY IF EXISTS game_configs_owner_delete ON public.game_configs;

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

REVOKE ALL ON public.game_configs FROM anon, authenticated;
GRANT SELECT, INSERT ON public.game_configs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_configs TO authenticated;

COMMIT;
