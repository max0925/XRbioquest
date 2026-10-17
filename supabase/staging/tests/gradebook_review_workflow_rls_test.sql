\set ON_ERROR_STOP on
BEGIN;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) VALUES
('61000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','review-teacher-a@example.invalid','',now(),now(),now(),'{"role":"teacher"}','{}'),
('61000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','review-teacher-b@example.invalid','',now(),now(),now(),'{"role":"teacher"}','{}'),
('62000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','review-student@example.invalid','',now(),now(),now(),'{"role":"student"}','{"full_name":"Review Student"}');

INSERT INTO public.game_configs (id,user_id,config,title,visibility,is_published) VALUES
('review-experience','61000000-0000-0000-0000-000000000001','{"phases":[{"id":"quiz-1","type":"quiz","points":5,"options":[{"id":"a","is_correct":true}]}]}','Review Experience','published',true);

CREATE TEMP TABLE review_state(class_id UUID, join_code TEXT, assignment_id UUID, attempt_id UUID);
GRANT SELECT, INSERT, UPDATE ON review_state TO authenticated;
SET LOCAL ROLE authenticated;

SELECT set_config('request.jwt.claims','{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"teacher"}}',true);
INSERT INTO review_state(class_id,join_code)
SELECT id,join_code FROM public.create_class_with_join_code('Review Class','Grade 10','Biology');
WITH made AS (
  INSERT INTO public.assignments(class_id,experience_id,teacher_id,title,allow_retries)
  SELECT class_id,'review-experience','61000000-0000-0000-0000-000000000001','Review Assignment',true FROM review_state RETURNING id
) UPDATE review_state SET assignment_id=made.id FROM made;

SELECT set_config('request.jwt.claims','{"sub":"62000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"student"}}',true);
SELECT * FROM public.join_class_by_code((SELECT join_code FROM review_state));
WITH started AS (SELECT * FROM public.start_assignment_attempt((SELECT assignment_id FROM review_state),'review-experience'))
UPDATE review_state SET attempt_id=started.id FROM started;
SELECT * FROM public.record_assignment_phase((SELECT attempt_id FROM review_state),'review-experience','quiz-1','{"option_id":"a"}');
SELECT * FROM public.submit_assignment_attempt((SELECT attempt_id FROM review_state));

SELECT set_config('request.jwt.claims','{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"teacher"}}',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.get_teacher_gradebook(NULL,NULL,'submitted')) <> 1 THEN
    RAISE EXCEPTION 'submitted attempt was not counted as needing review';
  END IF;
END $$;
SELECT * FROM public.review_assignment_attempt((SELECT attempt_id FROM review_state),'needs_revision','Please revisit the cell organelle answer.');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.get_teacher_gradebook(NULL,NULL,'submitted')) <> 0 THEN
    RAISE EXCEPTION 'returned attempt remained in the review queue';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.assignment_attempts WHERE id=(SELECT attempt_id FROM review_state) AND status='needs_revision' AND reviewed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'needs-revision transition was not persisted';
  END IF;
END $$;

SELECT set_config('request.jwt.claims','{"sub":"61000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"role":"teacher"}}',true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.get_teacher_gradebook(NULL,NULL,NULL)) THEN
    RAISE EXCEPTION 'non-owner teacher viewed another teacher submissions';
  END IF;
  BEGIN
    PERFORM public.review_assignment_attempt((SELECT attempt_id FROM review_state),'reviewed','Forged review');
    RAISE EXCEPTION 'non-owner teacher reviewed another teacher submission';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claims','{"sub":"62000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"student"}}',true);
DO $$ BEGIN
  BEGIN
    PERFORM public.get_teacher_gradebook(NULL,NULL,NULL);
    RAISE EXCEPTION 'student called teacher Gradebook function';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.review_assignment_attempt((SELECT attempt_id FROM review_state),'reviewed','Forged review');
    RAISE EXCEPTION 'student reviewed own submission';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

RESET ROLE;
ROLLBACK;
SELECT 'Gradebook review workflow RLS tests passed; transaction rolled back.' AS result;
