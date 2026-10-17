-- Classroom foundation for the teacher-led BioQuest workflow.
-- Apply only to the dedicated staging project after reviewing this file.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  grade TEXT NOT NULL CHECK (char_length(trim(grade)) BETWEEN 1 AND 40),
  subject TEXT NOT NULL CHECK (char_length(trim(subject)) BETWEEN 1 AND 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.class_join_codes (
  class_id UUID PRIMARY KEY REFERENCES public.classes(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.class_memberships (
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, student_id)
);

CREATE TABLE public.class_join_attempts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_started_at TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL CHECK (attempt_count > 0)
);

CREATE INDEX classes_teacher_id_idx ON public.classes (teacher_id);
CREATE INDEX class_memberships_student_id_idx ON public.class_memberships (student_id);

CREATE FUNCTION public.current_classroom_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'student')
      THEN auth.jwt() -> 'app_metadata' ->> 'role'
    ELSE NULL
  END;
$$;

CREATE FUNCTION public.is_class_teacher(target_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = target_class_id AND teacher_id = (SELECT auth.uid())
      AND public.current_classroom_role() = 'teacher'
  );
$$;

CREATE FUNCTION public.is_class_member(target_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_memberships
    WHERE class_id = target_class_id AND student_id = (SELECT auth.uid())
      AND public.current_classroom_role() = 'student'
  );
$$;

CREATE FUNCTION public.set_classes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.set_classes_updated_at();

-- Rejection sampling keeps every character equally likely for a 31-symbol alphabet.
CREATE FUNCTION public.generate_class_join_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = ''
AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate TEXT := '';
  random_byte INTEGER;
BEGIN
  WHILE char_length(candidate) < 8 LOOP
    random_byte := get_byte(extensions.gen_random_bytes(1), 0);
    IF random_byte < 248 THEN
      candidate := candidate || substr(alphabet, (random_byte % 31) + 1, 1);
    END IF;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE FUNCTION public.create_class_with_join_code(
  class_name TEXT,
  class_grade TEXT,
  class_subject TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  grade TEXT,
  subject TEXT,
  join_code TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id UUID := auth.uid();
  classroom public.classes%ROWTYPE;
  candidate TEXT;
  code_attempt INTEGER;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  IF public.current_classroom_role() IS DISTINCT FROM 'teacher' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TEACHER_ROLE_REQUIRED';
  END IF;
  IF class_name IS NULL OR char_length(trim(class_name)) NOT BETWEEN 1 AND 120
    OR class_grade IS NULL OR char_length(trim(class_grade)) NOT BETWEEN 1 AND 40
    OR class_subject IS NULL OR char_length(trim(class_subject)) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_CLASS_FIELDS';
  END IF;

  INSERT INTO public.classes (teacher_id, name, grade, subject)
  VALUES (caller_id, trim(class_name), trim(class_grade), trim(class_subject))
  RETURNING * INTO classroom;

  FOR code_attempt IN 1..10 LOOP
    candidate := public.generate_class_join_code();
    BEGIN
      INSERT INTO public.class_join_codes (class_id, code)
      VALUES (classroom.id, candidate);
      RETURN QUERY SELECT classroom.id, classroom.name, classroom.grade,
        classroom.subject, candidate, classroom.created_at, classroom.updated_at;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;

  RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'JOIN_CODE_GENERATION_FAILED';
END;
$$;

CREATE FUNCTION public.join_class_by_code(join_code TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  grade TEXT,
  subject TEXT,
  already_joined BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id UUID := auth.uid();
  normalized_code TEXT := upper(trim(join_code));
  target_class public.classes%ROWTYPE;
  attempts INTEGER;
  affected_rows INTEGER;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  IF public.current_classroom_role() IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'STUDENT_ROLE_REQUIRED';
  END IF;
  IF join_code IS NULL OR normalized_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_JOIN_CODE_FORMAT';
  END IF;

  INSERT INTO public.class_join_attempts (user_id, window_started_at, attempt_count)
  VALUES (caller_id, now(), 1)
  ON CONFLICT (user_id) DO UPDATE
  SET window_started_at = CASE
        WHEN class_join_attempts.window_started_at <= now() - interval '10 minutes' THEN now()
        ELSE class_join_attempts.window_started_at
      END,
      attempt_count = CASE
        WHEN class_join_attempts.window_started_at <= now() - interval '10 minutes' THEN 1
        ELSE class_join_attempts.attempt_count + 1
      END
  RETURNING attempt_count INTO attempts;

  IF attempts > 10 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'JOIN_RATE_LIMITED';
  END IF;

  SELECT classroom.* INTO target_class
  FROM public.class_join_codes code
  JOIN public.classes classroom ON classroom.id = code.class_id
  WHERE code.code = normalized_code;

  IF target_class.id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.class_memberships (class_id, student_id)
  VALUES (target_class.id, caller_id)
  ON CONFLICT (class_id, student_id) DO NOTHING;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  RETURN QUERY SELECT target_class.id, target_class.name, target_class.grade,
    target_class.subject, affected_rows = 0;
END;
$$;

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_join_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_join_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY classes_teacher_read ON public.classes
  FOR SELECT TO authenticated
  USING (teacher_id = (SELECT auth.uid()) AND (SELECT public.current_classroom_role()) = 'teacher');
CREATE POLICY classes_student_read ON public.classes
  FOR SELECT TO authenticated
  USING ((SELECT public.is_class_member(id)));
CREATE POLICY classes_teacher_update ON public.classes
  FOR UPDATE TO authenticated
  USING (teacher_id = (SELECT auth.uid()) AND (SELECT public.current_classroom_role()) = 'teacher')
  WITH CHECK (teacher_id = (SELECT auth.uid()) AND (SELECT public.current_classroom_role()) = 'teacher');
CREATE POLICY classes_teacher_delete ON public.classes
  FOR DELETE TO authenticated
  USING (teacher_id = (SELECT auth.uid()) AND (SELECT public.current_classroom_role()) = 'teacher');

CREATE POLICY class_join_codes_teacher_read ON public.class_join_codes
  FOR SELECT TO authenticated
  USING ((SELECT public.is_class_teacher(class_id)));

CREATE POLICY class_memberships_teacher_read ON public.class_memberships
  FOR SELECT TO authenticated
  USING ((SELECT public.is_class_teacher(class_id)));
CREATE POLICY class_memberships_student_read_self ON public.class_memberships
  FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.classes, public.class_join_codes,
  public.class_memberships, public.class_join_attempts FROM anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.classes TO authenticated;
GRANT SELECT ON TABLE public.class_join_codes, public.class_memberships TO authenticated;

REVOKE ALL ON FUNCTION public.current_classroom_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_class_teacher(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_class_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_classes_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_class_join_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_class_with_join_code(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_class_by_code(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_classroom_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_class_teacher(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_class_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_class_with_join_code(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_class_by_code(TEXT) TO authenticated;
