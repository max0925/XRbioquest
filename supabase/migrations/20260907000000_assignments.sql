-- Assign published teacher-owned experiences to teacher-owned classes.

CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  experience_id TEXT NOT NULL REFERENCES public.game_configs(id) ON DELETE RESTRICT,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
  instructions TEXT CHECK (instructions IS NULL OR char_length(instructions) <= 2000),
  due_at TIMESTAMPTZ,
  allow_retries BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX assignments_teacher_created_idx ON public.assignments (teacher_id, created_at DESC);
CREATE INDEX assignments_class_created_idx ON public.assignments (class_id, created_at DESC);
CREATE INDEX assignments_experience_id_idx ON public.assignments (experience_id);

CREATE FUNCTION public.set_assignments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER set_assignments_updated_at BEFORE UPDATE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.set_assignments_updated_at();

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY assignments_teacher_select ON public.assignments FOR SELECT TO authenticated
USING (teacher_id = (SELECT auth.uid()) AND (SELECT public.current_classroom_role()) = 'teacher');
CREATE POLICY assignments_student_select ON public.assignments FOR SELECT TO authenticated
USING ((SELECT public.current_classroom_role()) = 'student' AND (SELECT public.is_class_member(class_id)));

CREATE POLICY assignments_teacher_insert ON public.assignments FOR INSERT TO authenticated
WITH CHECK (
  teacher_id = (SELECT auth.uid())
  AND (SELECT public.current_classroom_role()) = 'teacher'
  AND (SELECT public.is_class_teacher(class_id))
  AND EXISTS (
    SELECT 1 FROM public.game_configs experience
    WHERE experience.id = experience_id
      AND experience.user_id = (SELECT auth.uid())
      AND experience.visibility = 'published'
  )
);

CREATE POLICY assignments_teacher_update ON public.assignments FOR UPDATE TO authenticated
USING (teacher_id = (SELECT auth.uid()) AND (SELECT public.current_classroom_role()) = 'teacher')
WITH CHECK (
  teacher_id = (SELECT auth.uid())
  AND (SELECT public.current_classroom_role()) = 'teacher'
  AND (SELECT public.is_class_teacher(class_id))
  AND EXISTS (
    SELECT 1 FROM public.game_configs experience
    WHERE experience.id = experience_id
      AND experience.user_id = (SELECT auth.uid())
      AND experience.visibility = 'published'
  )
);

CREATE POLICY assignments_teacher_delete ON public.assignments FOR DELETE TO authenticated
USING (teacher_id = (SELECT auth.uid()) AND (SELECT public.current_classroom_role()) = 'teacher');

REVOKE ALL ON TABLE public.assignments FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assignments TO authenticated;
REVOKE ALL ON FUNCTION public.set_assignments_updated_at() FROM PUBLIC;
