\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p1b-teacher-a@example.invalid', '', now(), now(), now(), '{"role":"teacher"}', '{}'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p1b-teacher-b@example.invalid', '', now(), now(), now(), '{"role":"teacher"}', '{}'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p1b-student-a@example.invalid', '', now(), now(), now(), '{"role":"student"}', '{}'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p1b-student-b@example.invalid', '', now(), now(), now(), '{"role":"student"}', '{}');

CREATE TEMP TABLE classroom_test_state (
  label TEXT PRIMARY KEY,
  class_id UUID NOT NULL,
  join_code TEXT NOT NULL
);
GRANT SELECT, INSERT ON classroom_test_state TO authenticated;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"teacher"}}', true);
INSERT INTO classroom_test_state
SELECT 'teacher-a', id, join_code
FROM public.create_class_with_join_code('Biology A', 'Grade 10', 'Biology');

DO $$
BEGIN
  IF (SELECT count(*) FROM public.classes) <> 1 THEN
    RAISE EXCEPTION 'Teacher A must see exactly one owned class';
  END IF;
  IF (SELECT count(*) FROM public.class_join_codes) <> 1 THEN
    RAISE EXCEPTION 'Teacher A must see its join code';
  END IF;
END;
$$;

SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"role":"teacher"}}', true);
INSERT INTO classroom_test_state
SELECT 'teacher-b', id, join_code
FROM public.create_class_with_join_code('Biology B', 'Grade 11', 'Biology');

DO $$
BEGIN
  IF (SELECT count(*) FROM public.classes) <> 1 THEN
    RAISE EXCEPTION 'Teacher B must see only its owned class';
  END IF;
  IF EXISTS (SELECT 1 FROM public.classes WHERE name = 'Biology A') THEN
    RAISE EXCEPTION 'Teacher B can see Teacher A class';
  END IF;
END;
$$;

SELECT set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"student"}}', true);

DO $$
DECLARE
  code TEXT := (SELECT join_code FROM classroom_test_state WHERE label = 'teacher-a');
BEGIN
  IF EXISTS (SELECT 1 FROM public.join_class_by_code('ABCDEFGH')) THEN
    RAISE EXCEPTION 'Wrong join code unexpectedly succeeded';
  END IF;
  PERFORM * FROM public.join_class_by_code(code);
  PERFORM * FROM public.join_class_by_code(code);
  IF (SELECT count(*) FROM public.class_memberships) <> 1 THEN
    RAISE EXCEPTION 'Repeated join must be idempotent';
  END IF;
  IF (SELECT count(*) FROM public.classes) <> 1 THEN
    RAISE EXCEPTION 'Student A must see exactly the joined class';
  END IF;
  IF EXISTS (SELECT 1 FROM public.class_join_codes) THEN
    RAISE EXCEPTION 'Student A can read a join code';
  END IF;
END;
$$;

SELECT set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"role":"student"}}', true);
DO $$
DECLARE
  attempt INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM public.classes) THEN
    RAISE EXCEPTION 'Student B can see a class it did not join';
  END IF;
  IF EXISTS (SELECT 1 FROM public.class_memberships) THEN
    RAISE EXCEPTION 'Student B can see another student membership';
  END IF;
  IF EXISTS (SELECT 1 FROM public.class_join_codes) THEN
    RAISE EXCEPTION 'Student B can read join codes';
  END IF;

  FOR attempt IN 1..10 LOOP
    PERFORM * FROM public.join_class_by_code('ABCDEFGH');
  END LOOP;
  BEGIN
    PERFORM * FROM public.join_class_by_code('ABCDEFGH');
    RAISE EXCEPTION 'Join-code rate limit did not block attempt 11';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'JOIN_RATE_LIMITED' THEN
      RAISE;
    END IF;
  END;
END;
$$;

SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"teacher"}}', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.class_memberships) <> 1 THEN
    RAISE EXCEPTION 'Teacher A student count is incorrect';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = (SELECT class_id FROM classroom_test_state WHERE label = 'teacher-b')
  ) THEN
    RAISE EXCEPTION 'Teacher A can see Teacher B class';
  END IF;
END;
$$;

RESET ROLE;

-- Force join-code collision to prove a failed RPC rolls back its class insert.
CREATE OR REPLACE FUNCTION public.generate_class_join_code()
RETURNS TEXT LANGUAGE sql VOLATILE SET search_path = ''
AS $$ SELECT join_code FROM pg_temp.classroom_test_state WHERE label = 'teacher-a' $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"teacher"}}', true);
DO $$
DECLARE
  before_count BIGINT := (SELECT count(*) FROM public.classes);
BEGIN
  BEGIN
    PERFORM * FROM public.create_class_with_join_code('Must Roll Back', 'Grade 12', 'Biology');
    RAISE EXCEPTION 'Collision test unexpectedly created a class';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    NULL;
  END;
  IF (SELECT count(*) FROM public.classes) <> before_count THEN
    RAISE EXCEPTION 'Failed creation left a partial class';
  END IF;
END;
$$;

RESET ROLE;
ROLLBACK;

SELECT 'P1b.1 classroom RLS tests passed; transaction rolled back.' AS result;
