-- Run with psql against the dedicated staging project only.
-- Required psql variables:
--   owner_id      UUID of an existing staging Auth user
--   non_owner_id  UUID of a different existing staging Auth user
--
-- All fixtures and mutations are rolled back. ON_ERROR_STOP must be enabled.

\if :{?owner_id}
\else
  \echo 'owner_id is required'
  \quit 2
\endif

\if :{?non_owner_id}
\else
  \echo 'non_owner_id is required'
  \quit 2
\endif

BEGIN;

INSERT INTO public.game_configs (
  id, user_id, config, title, visibility, is_published
) VALUES
  ('p1a5-rls-draft', :'owner_id'::uuid, '{}'::jsonb, 'P1a.5 draft', 'draft', false),
  ('p1a5-rls-published', :'owner_id'::uuid, '{}'::jsonb, 'P1a.5 published', 'published', true),
  ('p1a5-rls-delete', :'owner_id'::uuid, '{}'::jsonb, 'P1a.5 delete', 'draft', false),
  ('p1a5-rls-legacy', NULL, '{}'::jsonb, 'P1a.5 legacy', NULL, false);

CREATE OR REPLACE FUNCTION pg_temp.assert_visible_count(expected INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'pg_temp', 'public'
AS $$
DECLARE
  actual INTEGER;
BEGIN
  SELECT count(*) INTO actual
  FROM public.game_configs
  WHERE id LIKE 'p1a5-rls-%';
  IF actual <> expected THEN
    RAISE EXCEPTION 'expected % visible fixtures, got %', expected, actual;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.assert_update_count(
  target_id TEXT,
  expected INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'pg_temp', 'public'
AS $$
DECLARE
  actual INTEGER;
BEGIN
  UPDATE public.game_configs
  SET title = title
  WHERE id = target_id;
  GET DIAGNOSTICS actual = ROW_COUNT;
  IF actual <> expected THEN
    RAISE EXCEPTION 'expected % updated rows for %, got %', expected, target_id, actual;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.assert_publication_update(
  target_id TEXT,
  new_visibility TEXT,
  expected INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'pg_temp', 'public'
AS $$
DECLARE
  actual INTEGER;
BEGIN
  UPDATE public.game_configs
  SET visibility = new_visibility,
      is_published = (new_visibility = 'published')
  WHERE id = target_id;
  GET DIAGNOSTICS actual = ROW_COUNT;
  IF actual <> expected THEN
    RAISE EXCEPTION 'expected % publication updates for %, got %', expected, target_id, actual;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.assert_delete_count(
  target_id TEXT,
  expected INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'pg_temp', 'public'
AS $$
DECLARE
  actual INTEGER;
BEGIN
  DELETE FROM public.game_configs
  WHERE id = target_id;
  GET DIAGNOSTICS actual = ROW_COUNT;
  IF actual <> expected THEN
    RAISE EXCEPTION 'expected % deleted rows for %, got %', expected, target_id, actual;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.assert_insert_denied(target_owner UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'pg_temp', 'public'
AS $$
DECLARE
  was_allowed BOOLEAN := false;
BEGIN
  BEGIN
    INSERT INTO public.game_configs (
      id, user_id, config, visibility, is_published
    ) VALUES (
      'p1a5-rls-forbidden-insert', target_owner, '{}'::jsonb, 'draft', false
    );
    was_allowed := true;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  IF was_allowed THEN
    RAISE EXCEPTION 'forbidden insert unexpectedly succeeded';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.assert_insert_allowed(target_owner UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'pg_temp', 'public'
AS $$
DECLARE
  actual INTEGER;
BEGIN
  INSERT INTO public.game_configs (
    id, user_id, config, visibility, is_published
  ) VALUES (
    'p1a5-rls-owner-insert', target_owner, '{}'::jsonb, 'draft', false
  );
  GET DIAGNOSTICS actual = ROW_COUNT;
  IF actual <> 1 THEN
    RAISE EXCEPTION 'owner draft insert did not affect exactly one row';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION pg_temp.assert_visible_count(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION pg_temp.assert_update_count(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION pg_temp.assert_publication_update(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION pg_temp.assert_delete_count(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION pg_temp.assert_insert_denied(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION pg_temp.assert_insert_allowed(UUID) TO authenticated;

-- Anonymous: published + legacy are visible; draft and inserts are denied.
SET LOCAL ROLE anon;
SELECT pg_temp.assert_visible_count(2);
SELECT pg_temp.assert_insert_denied(:'owner_id'::uuid);
RESET ROLE;

-- Owner: sees all fixtures, can edit and publish their draft.
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'owner_id', 'role', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_visible_count(4);
SELECT pg_temp.assert_update_count('p1a5-rls-draft', 1);
SELECT pg_temp.assert_publication_update('p1a5-rls-draft', 'published', 1);
SELECT pg_temp.assert_insert_allowed(:'owner_id'::uuid);
RESET ROLE;

-- Anonymous can now see the newly published fixture.
SET LOCAL ROLE anon;
SELECT pg_temp.assert_visible_count(3);
RESET ROLE;

-- Non-owner: cannot edit the owner's experience and sees only public rows.
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'non_owner_id', 'role', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_visible_count(3);
SELECT pg_temp.assert_update_count('p1a5-rls-draft', 0);
SELECT pg_temp.assert_publication_update('p1a5-rls-draft', 'draft', 0);
SELECT pg_temp.assert_delete_count('p1a5-rls-delete', 0);
SELECT pg_temp.assert_insert_denied(:'owner_id'::uuid);
RESET ROLE;

-- Restore draft as owner, then verify anonymous/non-owner visibility contracts.
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'owner_id', 'role', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_publication_update('p1a5-rls-draft', 'draft', 1);
SELECT pg_temp.assert_delete_count('p1a5-rls-delete', 1);
RESET ROLE;

SET LOCAL ROLE anon;
SELECT pg_temp.assert_visible_count(2);
RESET ROLE;

SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'non_owner_id', 'role', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_visible_count(2);
RESET ROLE;

ROLLBACK;

\echo 'P1a.5 game_configs RLS tests passed; transaction rolled back.'
