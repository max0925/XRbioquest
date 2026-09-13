\set ON_ERROR_STOP on
BEGIN;

INSERT INTO auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data) VALUES
('61000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','dashboard-teacher-a@example.invalid','',now(),now(),now(),'{"role":"teacher"}','{}'),
('61000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','dashboard-teacher-b@example.invalid','',now(),now(),now(),'{"role":"teacher"}','{}');

INSERT INTO public.classes(id,teacher_id,name,grade,subject) VALUES
('62000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','Teacher A Class','Grade 10','Biology'),
('62000000-0000-0000-0000-000000000002','61000000-0000-0000-0000-000000000002','Teacher B Class','Grade 11','Biology');
INSERT INTO public.game_configs(id,user_id,config,title,visibility,is_published) VALUES
('dashboard-experience-a','61000000-0000-0000-0000-000000000001','{}','Teacher A Experience','published',true),
('dashboard-experience-b','61000000-0000-0000-0000-000000000002','{}','Teacher B Experience','draft',false);
INSERT INTO public.assignments(id,class_id,experience_id,teacher_id,title) VALUES
('63000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001','dashboard-experience-a','61000000-0000-0000-0000-000000000001','Teacher A Assignment'),
('63000000-0000-0000-0000-000000000002','62000000-0000-0000-0000-000000000002','dashboard-experience-b','61000000-0000-0000-0000-000000000002','Teacher B Assignment');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"teacher"}}',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.classes WHERE teacher_id=auth.uid())<>1
    OR (SELECT count(*) FROM public.assignments WHERE teacher_id=auth.uid())<>1
    OR (SELECT count(*) FROM public.game_configs WHERE user_id=auth.uid())<>1 THEN
    RAISE EXCEPTION 'Teacher A dashboard scope is incomplete';
  END IF;
  IF EXISTS(SELECT 1 FROM public.classes WHERE teacher_id<>auth.uid())
    OR EXISTS(SELECT 1 FROM public.assignments WHERE teacher_id<>auth.uid()) THEN
    RAISE EXCEPTION 'Teacher A can read Teacher B private classroom data';
  END IF;
END $$;

SELECT set_config('request.jwt.claims','{"sub":"61000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"role":"teacher"}}',true);
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.classes WHERE teacher_id='61000000-0000-0000-0000-000000000001')
    OR EXISTS(SELECT 1 FROM public.assignments WHERE teacher_id='61000000-0000-0000-0000-000000000001')
    OR EXISTS(SELECT 1 FROM public.game_configs WHERE user_id=auth.uid() AND user_id<>'61000000-0000-0000-0000-000000000002') THEN
    RAISE EXCEPTION 'Teacher B dashboard scope leaked Teacher A data';
  END IF;
END $$;

RESET ROLE;
ROLLBACK;
SELECT 'Dashboard RLS test passed; transaction rolled back.' AS result;
