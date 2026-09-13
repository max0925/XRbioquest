-- Run only against the isolated staging project. Transaction always rolls back.
BEGIN;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) VALUES
('51000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','snapshot-teacher@example.invalid','',now(),now(),now(),'{"role":"teacher"}','{}'),
('52000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','snapshot-student@example.invalid','',now(),now(),now(),'{"role":"student"}','{}');

INSERT INTO public.game_configs (id,user_id,config,title,visibility,is_published) VALUES
('snapshot-experience','51000000-0000-0000-0000-000000000001',
 '{"phases":[{"id":"quiz-1","type":"quiz","points":10,"options":[{"id":"old","is_correct":true},{"id":"new","is_correct":false}]}]}',
 'Snapshot Experience','published',true);

CREATE TEMP TABLE snapshot_state(class_id UUID, join_code TEXT, assignment_id UUID, first_attempt UUID, second_attempt UUID);
GRANT SELECT, INSERT, UPDATE ON snapshot_state TO authenticated;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"teacher"}}',true);
INSERT INTO snapshot_state(class_id,join_code)
SELECT id,join_code FROM public.create_class_with_join_code('Snapshot Class','Grade 10','Biology');
WITH made AS (
  INSERT INTO public.assignments(class_id,experience_id,teacher_id,title,allow_retries)
  SELECT class_id,'snapshot-experience','51000000-0000-0000-0000-000000000001','Snapshot Assignment',true FROM snapshot_state RETURNING id
) UPDATE snapshot_state SET assignment_id=made.id FROM made;

SELECT set_config('request.jwt.claims','{"sub":"52000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"student"}}',true);
SELECT * FROM public.join_class_by_code((SELECT join_code FROM snapshot_state));
WITH started AS (SELECT * FROM public.start_assignment_attempt((SELECT assignment_id FROM snapshot_state),'snapshot-experience'))
UPDATE snapshot_state SET first_attempt=started.id FROM started;

SELECT set_config('request.jwt.claims','{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"teacher"}}',true);
UPDATE public.game_configs SET config='{"phases":[{"id":"quiz-1","type":"quiz","points":20,"options":[{"id":"old","is_correct":false},{"id":"new","is_correct":true}]}]}'
WHERE id='snapshot-experience';

SELECT set_config('request.jwt.claims','{"sub":"52000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"student"}}',true);
SELECT * FROM public.record_assignment_phase((SELECT first_attempt FROM snapshot_state),'snapshot-experience','quiz-1','{"option_id":"old"}');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.assignment_attempts WHERE id=(SELECT first_attempt FROM snapshot_state) AND status='completed' AND auto_score=10 AND max_score=10) THEN
    RAISE EXCEPTION 'existing attempt was changed by a later quiz edit';
  END IF;
END $$;
WITH started AS (SELECT * FROM public.start_assignment_attempt((SELECT assignment_id FROM snapshot_state),'snapshot-experience'))
UPDATE snapshot_state SET second_attempt=started.id FROM started;
SELECT * FROM public.record_assignment_phase((SELECT second_attempt FROM snapshot_state),'snapshot-experience','quiz-1','{"option_id":"new"}');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.assignment_attempts WHERE id=(SELECT second_attempt FROM snapshot_state) AND auto_score=20 AND max_score=20) THEN
    RAISE EXCEPTION 'new attempt did not use the edited quiz snapshot';
  END IF;
END $$;

RESET ROLE;

DO $$
DECLARE
  function_definition TEXT;
BEGIN
  SELECT pg_catalog.pg_get_functiondef('public.record_assignment_phase(uuid,text,text,jsonb)'::regprocedure)
  INTO function_definition;
  IF function_definition NOT LIKE '%target_attempt.config_snapshot%' THEN
    RAISE EXCEPTION 'record_assignment_phase does not use the attempt snapshot';
  END IF;
  IF function_definition LIKE '%SELECT experience.config INTO game_config%' THEN
    RAISE EXCEPTION 'record_assignment_phase still reads the live config';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'assignment_attempts'
      AND column_name = 'config_snapshot' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'assignment attempt config snapshot is not enforced';
  END IF;
END;
$$;

ROLLBACK;
