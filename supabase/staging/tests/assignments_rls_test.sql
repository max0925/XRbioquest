\set ON_ERROR_STOP on
BEGIN;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) VALUES
('31000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','assign-teacher-a@example.invalid','',now(),now(),now(),'{"role":"teacher"}','{}'),
('31000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','assign-teacher-b@example.invalid','',now(),now(),now(),'{"role":"teacher"}','{}'),
('32000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','assign-student-a@example.invalid','',now(),now(),now(),'{"role":"student"}','{}'),
('32000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','assign-student-b@example.invalid','',now(),now(),now(),'{"role":"student"}','{}');

INSERT INTO public.game_configs (id,user_id,config,title,visibility,is_published) VALUES
('assign-published-a','31000000-0000-0000-0000-000000000001','{}','Published A','published',true),
('assign-draft-a','31000000-0000-0000-0000-000000000001','{}','Draft A','draft',false),
('assign-published-b','31000000-0000-0000-0000-000000000002','{}','Published B','published',true);

CREATE TEMP TABLE assignment_test_state(label TEXT PRIMARY KEY, class_id UUID, join_code TEXT);
GRANT SELECT, INSERT ON assignment_test_state TO authenticated;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"teacher"}}',true);
INSERT INTO assignment_test_state SELECT 'a',id,join_code FROM public.create_class_with_join_code('Class A','Grade 10','Biology');
INSERT INTO public.assignments(class_id,experience_id,teacher_id,title)
SELECT class_id,'assign-published-a','31000000-0000-0000-0000-000000000001','Cell Quest' FROM assignment_test_state WHERE label='a';

DO $$ BEGIN
  BEGIN
    INSERT INTO public.assignments(class_id,experience_id,teacher_id,title) SELECT class_id,'assign-draft-a','31000000-0000-0000-0000-000000000001','Draft' FROM assignment_test_state WHERE label='a';
    RAISE EXCEPTION 'draft experience was assignable';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.assignments(class_id,experience_id,teacher_id,title) SELECT class_id,'assign-published-b','31000000-0000-0000-0000-000000000001','Other owner' FROM assignment_test_state WHERE label='a';
    RAISE EXCEPTION 'non-owner experience was assignable';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"role":"teacher"}}',true);
INSERT INTO assignment_test_state SELECT 'b',id,join_code FROM public.create_class_with_join_code('Class B','Grade 11','Biology');
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.assignments) THEN RAISE EXCEPTION 'Teacher B can see Teacher A assignments'; END IF;
  BEGIN
    INSERT INTO public.assignments(class_id,experience_id,teacher_id,title) SELECT class_id,'assign-published-b','31000000-0000-0000-0000-000000000002','Wrong class' FROM assignment_test_state WHERE label='a';
    RAISE EXCEPTION 'Teacher B assigned to Teacher A class';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claims','{"sub":"32000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"student"}}',true);
SELECT * FROM public.join_class_by_code((SELECT join_code FROM assignment_test_state WHERE label='a'));
DO $$ BEGIN
  IF (SELECT count(*) FROM public.assignments) <> 1 THEN RAISE EXCEPTION 'Student A assignment visibility is incorrect'; END IF;
  BEGIN
    INSERT INTO public.assignments(class_id,experience_id,teacher_id,title) SELECT class_id,'assign-published-a','31000000-0000-0000-0000-000000000001','Student write' FROM assignment_test_state WHERE label='a';
    RAISE EXCEPTION 'Student inserted an assignment';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claims','{"sub":"32000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"role":"student"}}',true);
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.assignments) THEN RAISE EXCEPTION 'Student B can see another class assignment'; END IF;
END $$;

RESET ROLE;
ROLLBACK;
SELECT 'Assignments RLS tests passed; transaction rolled back.' AS result;
