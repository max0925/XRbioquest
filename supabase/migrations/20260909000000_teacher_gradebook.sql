-- Teacher gradebook, safe classroom display names, and immutable auto scores.

CREATE TABLE public.classroom_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 1 AND 80),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.classroom_profiles (user_id, display_name)
SELECT user_record.id,
  CASE
    WHEN char_length(trim(COALESCE(user_record.raw_user_meta_data ->> 'full_name', ''))) BETWEEN 1 AND 80
      THEN trim(user_record.raw_user_meta_data ->> 'full_name')
    ELSE 'Student ' || upper(substr(replace(user_record.id::text, '-', ''), 1, 6))
  END
FROM auth.users user_record
WHERE user_record.raw_app_meta_data ->> 'role' = 'student'
ON CONFLICT (user_id) DO NOTHING;

CREATE FUNCTION public.create_classroom_profile_for_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.raw_app_meta_data ->> 'role' = 'student' THEN
    INSERT INTO public.classroom_profiles (user_id, display_name)
    VALUES (NEW.id, CASE
      WHEN char_length(trim(COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''))) BETWEEN 1 AND 80
        THEN trim(NEW.raw_user_meta_data ->> 'full_name')
      ELSE 'Student ' || upper(substr(replace(NEW.id::text, '-', ''), 1, 6))
    END) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.get_assignment_submission(p_assignment_id UUID, p_student_id UUID)
RETURNS TABLE (
  attempt_id UUID, attempt_number INTEGER, attempt_status TEXT,
  phase_id TEXT, phase_name TEXT, student_answer TEXT,
  is_correct BOOLEAN, awarded_points NUMERIC, needs_review BOOLEAN,
  manual_adjustment NUMERIC, teacher_feedback TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  selected_attempt_id UUID;
  selected_attempt_number INTEGER;
  selected_attempt_status TEXT;
  game_config JSONB;
BEGIN
  IF auth.uid() IS NULL OR public.current_classroom_role() IS DISTINCT FROM 'teacher' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TEACHER_ROLE_REQUIRED';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.assignments assignment
    WHERE assignment.id = p_assignment_id AND assignment.teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SUBMISSION_ACCESS_DENIED';
  END IF;
  SELECT attempt.id, attempt.attempt_number, attempt.status, experience.config
  INTO selected_attempt_id, selected_attempt_number, selected_attempt_status, game_config
  FROM public.assignments assignment
  JOIN public.class_memberships membership
    ON membership.class_id = assignment.class_id AND membership.student_id = p_student_id
  JOIN public.assignment_attempts attempt
    ON attempt.assignment_id = assignment.id AND attempt.student_id = p_student_id
  JOIN public.game_configs experience ON experience.id = assignment.experience_id
  WHERE assignment.id = p_assignment_id AND assignment.teacher_id = auth.uid()
  ORDER BY (attempt.status = 'in_progress') DESC, attempt.attempt_number DESC
  LIMIT 1;

  IF selected_attempt_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT selected_attempt_id, selected_attempt_number, selected_attempt_status,
    answer.phase_id,
    COALESCE(phase.value ->> 'question', phase.value ->> 'title', answer.phase_id),
    CASE WHEN answer.question_type = 'quiz' THEN COALESCE((
      SELECT option ->> 'text'
      FROM jsonb_array_elements(phase.value -> 'options') option
      WHERE option ->> 'id' = answer.answer ->> 'option_id'
      LIMIT 1
    ), answer.answer ->> 'option_id') ELSE answer.answer::text END,
    answer.is_correct,
    answer.awarded_points,
    answer.is_correct IS NULL OR answer.awarded_points IS NULL,
    COALESCE(review.manual_adjustment, 0),
    review.teacher_feedback
  FROM public.assignment_answers answer
  LEFT JOIN LATERAL (
    SELECT phase_item.value
    FROM jsonb_array_elements(game_config -> 'phases') phase_item(value)
    WHERE phase_item.value ->> 'id' = answer.phase_id
    LIMIT 1
  ) phase ON true
  LEFT JOIN public.assignment_reviews review ON review.attempt_id = selected_attempt_id
  WHERE answer.attempt_id = selected_attempt_id
  ORDER BY answer.submitted_at;
END;
$$;

CREATE FUNCTION public.save_assignment_review(
  p_assignment_id UUID,
  p_student_id UUID,
  p_manual_adjustment NUMERIC,
  p_teacher_feedback TEXT
)
RETURNS TABLE (
  attempt_id UUID, auto_score NUMERIC, manual_adjustment NUMERIC,
  final_score NUMERIC, teacher_feedback TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  selected_attempt public.assignment_attempts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR public.current_classroom_role() IS DISTINCT FROM 'teacher' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TEACHER_ROLE_REQUIRED';
  END IF;
  IF p_manual_adjustment IS NULL OR p_manual_adjustment NOT BETWEEN -10000 AND 10000
    OR (p_teacher_feedback IS NOT NULL AND char_length(p_teacher_feedback) > 4000) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_REVIEW';
  END IF;

  SELECT attempt.* INTO selected_attempt
  FROM public.assignments assignment
  JOIN public.class_memberships membership
    ON membership.class_id = assignment.class_id AND membership.student_id = p_student_id
  JOIN public.assignment_attempts attempt
    ON attempt.assignment_id = assignment.id AND attempt.student_id = p_student_id
  WHERE assignment.id = p_assignment_id AND assignment.teacher_id = auth.uid()
  ORDER BY (attempt.status = 'in_progress') DESC, attempt.attempt_number DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ATTEMPT_NOT_FOUND';
  END IF;

  INSERT INTO public.assignment_reviews (attempt_id, teacher_id, manual_adjustment, teacher_feedback)
  VALUES (selected_attempt.id, auth.uid(), p_manual_adjustment, nullif(trim(p_teacher_feedback), ''))
  ON CONFLICT ON CONSTRAINT assignment_reviews_pkey DO UPDATE SET
    teacher_id = EXCLUDED.teacher_id,
    manual_adjustment = EXCLUDED.manual_adjustment,
    teacher_feedback = EXCLUDED.teacher_feedback,
    updated_at = now();

  RETURN QUERY SELECT selected_attempt.id, selected_attempt.auto_score, p_manual_adjustment,
    selected_attempt.auto_score + p_manual_adjustment, nullif(trim(p_teacher_feedback), '');
END;
$$;

CREATE TRIGGER create_classroom_profile_after_user_insert
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_classroom_profile_for_new_user();

ALTER TABLE public.classroom_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY classroom_profiles_own_select ON public.classroom_profiles FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY classroom_profiles_own_update ON public.classroom_profiles FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
REVOKE ALL ON TABLE public.classroom_profiles FROM anon, authenticated;
GRANT SELECT, UPDATE (display_name) ON TABLE public.classroom_profiles TO authenticated;

CREATE TABLE public.assignment_reviews (
  attempt_id UUID PRIMARY KEY REFERENCES public.assignment_attempts(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manual_adjustment NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (manual_adjustment BETWEEN -10000 AND 10000),
  teacher_feedback TEXT CHECK (teacher_feedback IS NULL OR char_length(teacher_feedback) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX assignment_reviews_teacher_idx ON public.assignment_reviews (teacher_id);

CREATE FUNCTION public.set_assignment_reviews_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER set_assignment_reviews_updated_at BEFORE UPDATE ON public.assignment_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_assignment_reviews_updated_at();

ALTER TABLE public.assignment_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY assignment_reviews_teacher_select ON public.assignment_reviews FOR SELECT TO authenticated
USING (teacher_id = (SELECT auth.uid()) AND (SELECT public.current_classroom_role()) = 'teacher');
CREATE POLICY assignment_reviews_student_select ON public.assignment_reviews FOR SELECT TO authenticated
USING ((SELECT public.current_classroom_role()) = 'student' AND EXISTS (
  SELECT 1 FROM public.assignment_attempts attempt
  WHERE attempt.id = attempt_id AND attempt.student_id = (SELECT auth.uid())
));
REVOKE ALL ON TABLE public.assignment_reviews FROM anon, authenticated;
GRANT SELECT ON TABLE public.assignment_reviews TO authenticated;

REVOKE ALL ON FUNCTION public.create_classroom_profile_for_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_assignment_reviews_updated_at() FROM PUBLIC;

CREATE FUNCTION public.get_assignment_gradebook(p_assignment_id UUID)
RETURNS TABLE (
  assignment_id UUID,
  assignment_title TEXT,
  class_name TEXT,
  allow_retries BOOLEAN,
  student_id UUID,
  display_name TEXT,
  attempt_id UUID,
  status TEXT,
  started_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  auto_score NUMERIC,
  max_score NUMERIC,
  manual_adjustment NUMERIC,
  final_score NUMERIC,
  teacher_feedback TEXT,
  attempt_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR public.current_classroom_role() IS DISTINCT FROM 'teacher' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TEACHER_ROLE_REQUIRED';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.assignments assignment
    WHERE assignment.id = p_assignment_id AND assignment.teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'GRADEBOOK_ACCESS_DENIED';
  END IF;

  RETURN QUERY
  SELECT
    assignment.id,
    assignment.title,
    classroom.name,
    assignment.allow_retries,
    membership.student_id,
    COALESCE(profile.display_name, 'Student ' || upper(substr(replace(membership.student_id::text, '-', ''), 1, 6))),
    latest_attempt.id,
    COALESCE(latest_attempt.status, 'not_started'),
    latest_attempt.started_at,
    latest_attempt.last_activity_at,
    latest_attempt.completed_at,
    latest_attempt.duration_seconds,
    COALESCE(latest_attempt.auto_score, 0),
    COALESCE(latest_attempt.max_score, 0),
    COALESCE(review.manual_adjustment, 0),
    COALESCE(latest_attempt.auto_score, 0) + COALESCE(review.manual_adjustment, 0),
    review.teacher_feedback,
    COALESCE(attempt_totals.attempt_count, 0)
  FROM public.assignments assignment
  JOIN public.classes classroom ON classroom.id = assignment.class_id
  JOIN public.class_memberships membership ON membership.class_id = classroom.id
  LEFT JOIN public.classroom_profiles profile ON profile.user_id = membership.student_id
  LEFT JOIN LATERAL (
    SELECT attempt.*
    FROM public.assignment_attempts attempt
    WHERE attempt.assignment_id = assignment.id AND attempt.student_id = membership.student_id
    ORDER BY (attempt.status = 'in_progress') DESC, attempt.attempt_number DESC
    LIMIT 1
  ) latest_attempt ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS attempt_count
    FROM public.assignment_attempts attempt
    WHERE attempt.assignment_id = assignment.id AND attempt.student_id = membership.student_id
  ) attempt_totals ON true
  LEFT JOIN public.assignment_reviews review ON review.attempt_id = latest_attempt.id
  WHERE assignment.id = p_assignment_id
  ORDER BY COALESCE(profile.display_name, membership.student_id::text);
END;
$$;

REVOKE ALL ON FUNCTION public.get_assignment_gradebook(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_assignment_submission(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_assignment_review(UUID, UUID, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assignment_gradebook(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assignment_submission(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_assignment_review(UUID, UUID, NUMERIC, TEXT) TO authenticated;
