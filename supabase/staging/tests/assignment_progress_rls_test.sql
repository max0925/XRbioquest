\set ON_ERROR_STOP on
BEGIN;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) VALUES
('41000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','progress-teacher-a@example.invalid','',now(),now(),now(),'{"role":"teacher"}','{}'),
('41000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','progress-teacher-b@example.invalid','',now(),now(),now(),'{"role":"teacher"}','{}'),
('42000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','progress-student-a@example.invalid','',now(),now(),now(),'{"role":"student"}','{}'),
('42000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','progress-student-b@example.invalid','',now(),now(),now(),'{"role":"student"}','{}');

INSERT INTO public.game_configs (id,user_id,config,title,visibility,is_published) VALUES
('progress-experience-a','41000000-0000-0000-0000-000000000001',
 '{"phases":[{"id":"intro","type":"intro"},{"id":"quiz-1","type":"quiz","points":10,"options":[{"id":"a","is_correct":false},{"id":"b","is_correct":true}]},{"id":"click-1","type":"click","points":20},{"id":"complete","type":"complete"}]}',
 'Progress Experience A','published',true),
('progress-experience-b','41000000-0000-0000-0000-000000000002',
 '{"phases":[{"id":"quiz-b","type":"quiz","points":5,"options":[{"id":"a","is_correct":true}]}]}',
 'Progress Experience B','published',true);

CREATE TEMP TABLE progress_test_state(label TEXT PRIMARY KEY, class_id UUID, join_code TEXT, assignment_id UUID, attempt_id UUID);
GRANT SELECT, INSERT, UPDATE ON progress_test_state TO authenticated;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"41000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"teacher"}}',true);
INSERT INTO progress_test_state(label,class_id,join_code)
SELECT 'a',id,join_code FROM public.create_class_with_join_code('Progress A','Grade 10','Biology');
WITH inserted AS (
  INSERT INTO public.assignments(class_id,experience_id,teacher_id,title,allow_retries)
  SELECT class_id,'progress-experience-a','41000000-0000-0000-0000-000000000001','Progress Assignment',false
  FROM progress_test_state WHERE label='a' RETURNING id
) UPDATE progress_test_state SET assignment_id = inserted.id FROM inserted WHERE label='a';

SELECT set_config('request.jwt.claims','{"sub":"41000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"role":"teacher"}}',true);
INSERT INTO progress_test_state(label,class_id,join_code)
SELECT 'b',id,join_code FROM public.create_class_with_join_code('Progress B','Grade 11','Biology');

SELECT set_config('request.jwt.claims','{"sub":"42000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"student"}}',true);
SELECT * FROM public.join_class_by_code((SELECT join_code FROM progress_test_state WHERE label='a'));
WITH started AS (
  SELECT * FROM public.start_assignment_attempt((SELECT assignment_id FROM progress_test_state WHERE label='a'),'progress-experience-a')
) UPDATE progress_test_state SET attempt_id = started.id FROM started WHERE label='a';

DO $$ BEGIN
  IF (SELECT count(*) FROM public.start_assignment_attempt((SELECT assignment_id FROM progress_test_state WHERE label='a'),'progress-experience-a')) <> 1 THEN
    RAISE EXCEPTION 'in-progress attempt was not resumed';
  END IF;
  BEGIN
    PERFORM public.start_assignment_attempt((SELECT assignment_id FROM progress_test_state WHERE label='a'),'progress-experience-b');
    RAISE EXCEPTION 'wrong experience was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- A forged score/correctness is not an accepted argument; the selected option is graded from GameConfig.
SELECT * FROM public.record_assignment_phase((SELECT attempt_id FROM progress_test_state WHERE label='a'),'progress-experience-a','quiz-1','{"option_id":"a","score":999,"is_correct":true}');
DO $$ BEGIN
  IF (SELECT auto_score FROM public.assignment_attempts WHERE id=(SELECT attempt_id FROM progress_test_state WHERE label='a')) <> 0 THEN
    RAISE EXCEPTION 'forged score affected automatic score';
  END IF;
END $$;
SELECT * FROM public.record_assignment_phase((SELECT attempt_id FROM progress_test_state WHERE label='a'),'progress-experience-a','quiz-1','{"option_id":"b","score":999}');
SELECT * FROM public.record_assignment_phase((SELECT attempt_id FROM progress_test_state WHERE label='a'),'progress-experience-a','click-1',NULL);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.assignment_attempts WHERE id=(SELECT attempt_id FROM progress_test_state WHERE label='a') AND status='completed' AND auto_score=10 AND max_score=10 AND progress_percent=100) THEN
    RAISE EXCEPTION 'trusted completion aggregation is incorrect';
  END IF;
  BEGIN
    PERFORM public.start_assignment_attempt((SELECT assignment_id FROM progress_test_state WHERE label='a'),'progress-experience-a');
    RAISE EXCEPTION 'retry was allowed for a completed no-retry assignment';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claims','{"sub":"42000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"role":"student"}}',true);
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.assignment_attempts) OR EXISTS(SELECT 1 FROM public.assignment_answers) THEN
    RAISE EXCEPTION 'Student B can read Student A learning data';
  END IF;
  BEGIN
    PERFORM public.start_assignment_attempt((SELECT assignment_id FROM progress_test_state WHERE label='a'),'progress-experience-a');
    RAISE EXCEPTION 'non-member started an attempt';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.record_assignment_phase((SELECT attempt_id FROM progress_test_state WHERE label='a'),'progress-experience-a','quiz-1','{"option_id":"b"}');
    RAISE EXCEPTION 'Student B modified Student A attempt';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claims','{"sub":"41000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"role":"teacher"}}',true);
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.assignment_attempts) OR EXISTS(SELECT 1 FROM public.assignment_answers) THEN
    RAISE EXCEPTION 'Teacher B can read Teacher A learning data';
  END IF;
END $$;

SELECT set_config('request.jwt.claims','{"sub":"41000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"teacher"}}',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.assignment_attempts) <> 1 OR (SELECT count(*) FROM public.assignment_answers) <> 1 THEN
    RAISE EXCEPTION 'Teacher A cannot read own assignment learning data';
  END IF;
END $$;

RESET ROLE;
ROLLBACK;
SELECT 'Assignment progress RLS tests passed; transaction rolled back.' AS result;
