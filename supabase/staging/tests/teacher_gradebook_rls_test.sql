\set ON_ERROR_STOP on
BEGIN;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) VALUES
('51000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','grade-teacher-a@example.invalid','',now(),now(),now(),'{"role":"teacher"}','{"full_name":"Teacher A"}'),
('51000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','grade-teacher-b@example.invalid','',now(),now(),now(),'{"role":"teacher"}','{"full_name":"Teacher B"}'),
('52000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','grade-student-a@example.invalid','',now(),now(),now(),'{"role":"student"}','{"full_name":"Student Alpha"}'),
('52000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','grade-student-b@example.invalid','',now(),now(),now(),'{"role":"student"}','{"full_name":"Student Beta"}'),
('52000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','grade-student-c@example.invalid','',now(),now(),now(),'{"role":"student"}','{"full_name":"Student Other Class"}');

INSERT INTO public.game_configs (id,user_id,config,title,visibility,is_published) VALUES
('grade-experience-a','51000000-0000-0000-0000-000000000001','{"phases":[{"id":"quiz-1","type":"quiz","title":"Cell Check","question":"Which organelle?","points":5,"options":[{"id":"a","text":"Nucleus","is_correct":true},{"id":"b","text":"Wall","is_correct":false}]},{"id":"complete","type":"complete"}]}','Grade Experience A','published',true),
('grade-experience-b','51000000-0000-0000-0000-000000000002','{"phases":[{"id":"quiz-b","type":"quiz","points":1,"options":[{"id":"a","is_correct":true}]}]}','Grade Experience B','published',true);

CREATE TEMP TABLE grade_state(label TEXT PRIMARY KEY, class_id UUID, join_code TEXT, assignment_id UUID, attempt_id UUID);
GRANT SELECT, INSERT, UPDATE ON grade_state TO authenticated;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"teacher"}}',true);
INSERT INTO grade_state(label,class_id,join_code) SELECT 'a',id,join_code FROM public.create_class_with_join_code('Grade Class A','Grade 10','Biology');
WITH created AS (
  INSERT INTO public.assignments(class_id,experience_id,teacher_id,title)
  SELECT class_id,'grade-experience-a','51000000-0000-0000-0000-000000000001','Cell Gradebook' FROM grade_state WHERE label='a'
  RETURNING id
) UPDATE grade_state SET assignment_id=created.id FROM created WHERE label='a';

SELECT set_config('request.jwt.claims','{"sub":"51000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"role":"teacher"}}',true);
INSERT INTO grade_state(label,class_id,join_code) SELECT 'b',id,join_code FROM public.create_class_with_join_code('Grade Class B','Grade 11','Biology');

SELECT set_config('request.jwt.claims','{"sub":"52000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"student"}}',true);
SELECT * FROM public.join_class_by_code((SELECT join_code FROM grade_state WHERE label='a'));
WITH started AS (
  SELECT * FROM public.start_assignment_attempt((SELECT assignment_id FROM grade_state WHERE label='a'),'grade-experience-a')
) UPDATE grade_state SET attempt_id=started.id FROM started WHERE label='a';
SELECT * FROM public.record_assignment_phase((SELECT attempt_id FROM grade_state WHERE label='a'),'grade-experience-a','quiz-1','{"option_id":"a"}');
SELECT * FROM public.submit_assignment_attempt((SELECT attempt_id FROM grade_state WHERE label='a'));

SELECT set_config('request.jwt.claims','{"sub":"52000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"role":"student"}}',true);
SELECT * FROM public.join_class_by_code((SELECT join_code FROM grade_state WHERE label='a'));

SELECT set_config('request.jwt.claims','{"sub":"52000000-0000-0000-0000-000000000003","role":"authenticated","app_metadata":{"role":"student"}}',true);
SELECT * FROM public.join_class_by_code((SELECT join_code FROM grade_state WHERE label='b'));

SELECT set_config('request.jwt.claims','{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"teacher"}}',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.get_assignment_gradebook((SELECT assignment_id FROM grade_state WHERE label='a'))) <> 2 THEN
    RAISE EXCEPTION 'Gradebook did not include exactly the two enrolled students';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.get_assignment_gradebook((SELECT assignment_id FROM grade_state WHERE label='a'))
    WHERE student_id='52000000-0000-0000-0000-000000000002' AND status='not_started' AND attempt_count=0
  ) THEN RAISE EXCEPTION 'Not-started student is missing'; END IF;
END $$;
SELECT * FROM public.save_assignment_review((SELECT assignment_id FROM grade_state WHERE label='a'),'52000000-0000-0000-0000-000000000001',2,'Strong work.');
DO $$ BEGIN
  IF (SELECT auto_score FROM public.assignment_attempts WHERE id=(SELECT attempt_id FROM grade_state WHERE label='a')) <> 5 THEN
    RAISE EXCEPTION 'Teacher adjustment changed immutable auto score';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.get_assignment_gradebook((SELECT assignment_id FROM grade_state WHERE label='a'))
    WHERE student_id='52000000-0000-0000-0000-000000000001' AND auto_score=5 AND manual_adjustment=2 AND final_score=7
  ) THEN RAISE EXCEPTION 'Final score aggregation is incorrect'; END IF;
  IF (SELECT count(*) FROM public.get_assignment_submission((SELECT assignment_id FROM grade_state WHERE label='a'),'52000000-0000-0000-0000-000000000001')) <> 1 THEN
    RAISE EXCEPTION 'Teacher A cannot read own student submission detail';
  END IF;
END $$;

SELECT set_config('request.jwt.claims','{"sub":"51000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"role":"teacher"}}',true);
DO $$ BEGIN
  BEGIN
    PERFORM public.get_assignment_gradebook((SELECT assignment_id FROM grade_state WHERE label='a'));
    RAISE EXCEPTION 'Teacher B viewed Teacher A Gradebook';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.save_assignment_review((SELECT assignment_id FROM grade_state WHERE label='a'),'52000000-0000-0000-0000-000000000001',50,'Forged');
    RAISE EXCEPTION 'Teacher B adjusted Teacher A Gradebook';
  EXCEPTION WHEN insufficient_privilege OR invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.get_assignment_submission((SELECT assignment_id FROM grade_state WHERE label='a'),'52000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'Teacher B viewed Teacher A submission detail';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claims','{"sub":"52000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"role":"student"}}',true);
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.assignment_answers) OR EXISTS(SELECT 1 FROM public.assignment_reviews) THEN
    RAISE EXCEPTION 'Student B read Student A answers or feedback';
  END IF;
  BEGIN
    UPDATE public.assignment_reviews SET manual_adjustment=999, teacher_feedback='Forged';
    RAISE EXCEPTION 'Student updated teacher review';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.save_assignment_review((SELECT assignment_id FROM grade_state WHERE label='a'),'52000000-0000-0000-0000-000000000001',999,'Forged');
    RAISE EXCEPTION 'Student called teacher review function';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

RESET ROLE;
ROLLBACK;
SELECT 'Teacher Gradebook RLS tests passed; transaction rolled back.' AS result;
