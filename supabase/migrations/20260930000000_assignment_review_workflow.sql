-- Submission review workflow shared by the teacher Gradebook and Dashboard.

ALTER TABLE public.assignment_attempts
  DROP CONSTRAINT IF EXISTS assignment_attempts_status_check,
  DROP CONSTRAINT IF EXISTS assignment_attempts_check;

ALTER TABLE public.assignment_attempts
  ADD COLUMN submitted_at TIMESTAMPTZ,
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.assignment_attempts
SET status = 'submitted',
    submitted_at = COALESCE(completed_at, last_activity_at),
    updated_at = now()
WHERE status = 'completed';

ALTER TABLE public.assignment_attempts
  ADD CONSTRAINT assignment_attempts_status_check
    CHECK (status IN ('in_progress', 'submitted', 'needs_revision', 'reviewed')),
  ADD CONSTRAINT assignment_attempts_review_timestamps_check CHECK (
    (status = 'in_progress' AND completed_at IS NULL AND submitted_at IS NULL AND reviewed_at IS NULL)
    OR (status = 'submitted' AND completed_at IS NOT NULL AND submitted_at IS NOT NULL AND reviewed_at IS NULL)
    OR (status IN ('needs_revision', 'reviewed') AND completed_at IS NOT NULL AND submitted_at IS NOT NULL AND reviewed_at IS NOT NULL)
  );

CREATE INDEX assignment_attempts_needs_review_idx
  ON public.assignment_attempts (assignment_id, submitted_at DESC)
  WHERE status = 'submitted';

CREATE FUNCTION public.prepare_assignment_attempt_review_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Compatibility for the established progress RPC, which used `completed`.
  IF NEW.status = 'completed' THEN
    NEW.status := 'submitted';
  END IF;
  IF NEW.status = 'submitted' AND OLD.status = 'in_progress' THEN
    NEW.submitted_at := COALESCE(NEW.submitted_at, NEW.completed_at, now());
    NEW.reviewed_at := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER prepare_assignment_attempt_review_state
BEFORE UPDATE ON public.assignment_attempts
FOR EACH ROW EXECUTE FUNCTION public.prepare_assignment_attempt_review_state();

-- Students resume an unfinished attempt, start a new attempt after requested
-- revision, and cannot bypass a no-retries assignment after a real submission.
CREATE OR REPLACE FUNCTION public.start_assignment_attempt(p_assignment_id UUID, p_experience_id TEXT)
RETURNS TABLE (
  id UUID, assignment_id UUID, attempt_number INTEGER, status TEXT,
  completed_phase_ids TEXT[], progress_percent INTEGER, started_at TIMESTAMPTZ,
  auto_score NUMERIC, max_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id UUID := auth.uid();
  target_assignment public.assignments%ROWTYPE;
  current_attempt public.assignment_attempts%ROWTYPE;
  next_attempt_number INTEGER;
  quiz_max NUMERIC := 0;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  IF public.current_classroom_role() IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'STUDENT_ROLE_REQUIRED';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_assignment_id::text || caller_id::text, 0));
  SELECT assignment.* INTO target_assignment
  FROM public.assignments assignment
  WHERE assignment.id = p_assignment_id
    AND assignment.experience_id = p_experience_id
    AND assignment.status = 'active'
    AND public.is_class_member(assignment.class_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ASSIGNMENT_ACCESS_DENIED';
  END IF;

  SELECT attempt.* INTO current_attempt
  FROM public.assignment_attempts attempt
  WHERE attempt.assignment_id = p_assignment_id
    AND attempt.student_id = caller_id
    AND attempt.status = 'in_progress';

  IF FOUND THEN
    UPDATE public.assignment_attempts attempt SET last_activity_at = now()
    WHERE attempt.id = current_attempt.id RETURNING attempt.* INTO current_attempt;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.assignment_attempts attempt
      WHERE attempt.assignment_id = p_assignment_id
        AND attempt.student_id = caller_id
        AND attempt.status = 'submitted'
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SUBMISSION_PENDING_REVIEW';
    END IF;
    IF NOT target_assignment.allow_retries AND EXISTS (
      SELECT 1 FROM public.assignment_attempts attempt
      WHERE attempt.assignment_id = p_assignment_id
        AND attempt.student_id = caller_id
        AND attempt.status = 'reviewed'
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'RETRIES_NOT_ALLOWED';
    END IF;

    SELECT COALESCE(max(attempt.attempt_number), 0) + 1 INTO next_attempt_number
    FROM public.assignment_attempts attempt
    WHERE attempt.assignment_id = p_assignment_id AND attempt.student_id = caller_id;
    SELECT COALESCE(sum(COALESCE((phase.value ->> 'points')::numeric, 0)), 0) INTO quiz_max
    FROM public.game_configs experience,
      LATERAL jsonb_array_elements(experience.config -> 'phases') phase(value)
    WHERE experience.id = p_experience_id AND phase.value ->> 'type' = 'quiz';

    INSERT INTO public.assignment_attempts (assignment_id, student_id, attempt_number, max_score)
    VALUES (p_assignment_id, caller_id, next_attempt_number, quiz_max)
    RETURNING * INTO current_attempt;
  END IF;

  RETURN QUERY SELECT current_attempt.id, current_attempt.assignment_id,
    current_attempt.attempt_number, current_attempt.status,
    current_attempt.completed_phase_ids, current_attempt.progress_percent,
    current_attempt.started_at, current_attempt.auto_score, current_attempt.max_score;
END;
$$;

CREATE FUNCTION public.get_teacher_gradebook(
  p_class_id UUID DEFAULT NULL,
  p_assignment_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  attempt_id UUID, class_id UUID, class_name TEXT, assignment_id UUID,
  assignment_title TEXT, student_id UUID, student_name TEXT,
  submitted_at TIMESTAMPTZ, attempt_status TEXT, auto_score NUMERIC,
  max_score NUMERIC, manual_adjustment NUMERIC, final_score NUMERIC,
  teacher_feedback TEXT, reviewed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.current_classroom_role() IS DISTINCT FROM 'teacher' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TEACHER_ROLE_REQUIRED';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('in_progress', 'submitted', 'needs_revision', 'reviewed') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_REVIEW_STATUS';
  END IF;

  RETURN QUERY
  SELECT attempt.id, classroom.id, classroom.name, assignment.id, assignment.title,
    attempt.student_id,
    COALESCE(profile.display_name, 'Student ' || upper(substr(replace(attempt.student_id::text, '-', ''), 1, 6))),
    attempt.submitted_at, attempt.status, attempt.auto_score, attempt.max_score,
    COALESCE(review.manual_adjustment, 0),
    attempt.auto_score + COALESCE(review.manual_adjustment, 0),
    review.teacher_feedback, attempt.reviewed_at
  FROM public.assignment_attempts attempt
  JOIN public.assignments assignment ON assignment.id = attempt.assignment_id
  JOIN public.classes classroom ON classroom.id = assignment.class_id
  JOIN public.class_memberships membership
    ON membership.class_id = classroom.id AND membership.student_id = attempt.student_id
  LEFT JOIN public.classroom_profiles profile ON profile.user_id = attempt.student_id
  LEFT JOIN public.assignment_reviews review ON review.attempt_id = attempt.id
  WHERE assignment.teacher_id = auth.uid()
    AND classroom.teacher_id = auth.uid()
    AND (p_class_id IS NULL OR classroom.id = p_class_id)
    AND (p_assignment_id IS NULL OR assignment.id = p_assignment_id)
    AND (p_status IS NULL OR attempt.status = p_status)
  ORDER BY COALESCE(attempt.submitted_at, attempt.last_activity_at) DESC, attempt.attempt_number DESC;
END;
$$;

CREATE FUNCTION public.review_assignment_attempt(
  p_attempt_id UUID,
  p_outcome TEXT,
  p_teacher_feedback TEXT
)
RETURNS TABLE (
  attempt_id UUID, attempt_status TEXT, teacher_feedback TEXT,
  reviewed_at TIMESTAMPTZ, manual_adjustment NUMERIC, final_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_attempt public.assignment_attempts%ROWTYPE;
  existing_adjustment NUMERIC := 0;
BEGIN
  IF auth.uid() IS NULL OR public.current_classroom_role() IS DISTINCT FROM 'teacher' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TEACHER_ROLE_REQUIRED';
  END IF;
  IF p_outcome NOT IN ('reviewed', 'needs_revision')
    OR p_teacher_feedback IS NULL
    OR char_length(trim(p_teacher_feedback)) > 4000
    OR (p_outcome = 'needs_revision' AND char_length(trim(p_teacher_feedback)) = 0) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_REVIEW';
  END IF;

  SELECT attempt.* INTO selected_attempt
  FROM public.assignment_attempts attempt
  JOIN public.assignments assignment ON assignment.id = attempt.assignment_id
  JOIN public.classes classroom ON classroom.id = assignment.class_id
  JOIN public.class_memberships membership
    ON membership.class_id = classroom.id AND membership.student_id = attempt.student_id
  WHERE attempt.id = p_attempt_id
    AND attempt.status = 'submitted'
    AND assignment.teacher_id = auth.uid()
    AND classroom.teacher_id = auth.uid()
  FOR UPDATE OF attempt;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'REVIEW_ACCESS_DENIED';
  END IF;

  SELECT review.manual_adjustment INTO existing_adjustment
  FROM public.assignment_reviews review WHERE review.attempt_id = selected_attempt.id;
  existing_adjustment := COALESCE(existing_adjustment, 0);

  INSERT INTO public.assignment_reviews (attempt_id, teacher_id, manual_adjustment, teacher_feedback)
  VALUES (selected_attempt.id, auth.uid(), existing_adjustment, nullif(trim(p_teacher_feedback), ''))
  ON CONFLICT ON CONSTRAINT assignment_reviews_pkey DO UPDATE SET
    teacher_id = EXCLUDED.teacher_id,
    teacher_feedback = EXCLUDED.teacher_feedback,
    updated_at = now();

  UPDATE public.assignment_attempts attempt
  SET status = p_outcome, reviewed_at = now()
  WHERE attempt.id = selected_attempt.id
  RETURNING attempt.* INTO selected_attempt;

  RETURN QUERY SELECT selected_attempt.id, selected_attempt.status,
    nullif(trim(p_teacher_feedback), ''), selected_attempt.reviewed_at,
    existing_adjustment, selected_attempt.auto_score + existing_adjustment;
END;
$$;

-- Keep the established per-assignment Gradebook compatible: saving its score
-- adjustment is also a completed review and uses the same ownership boundary.
CREATE OR REPLACE FUNCTION public.save_assignment_review(
  p_assignment_id UUID,
  p_student_id UUID,
  p_manual_adjustment NUMERIC,
  p_teacher_feedback TEXT
)
RETURNS TABLE (
  attempt_id UUID, auto_score NUMERIC, manual_adjustment NUMERIC,
  final_score NUMERIC, teacher_feedback TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
  FROM public.assignment_attempts attempt
  JOIN public.assignments assignment ON assignment.id = attempt.assignment_id
  JOIN public.classes classroom ON classroom.id = assignment.class_id
  JOIN public.class_memberships membership
    ON membership.class_id = classroom.id AND membership.student_id = attempt.student_id
  WHERE assignment.id = p_assignment_id
    AND attempt.student_id = p_student_id
    AND attempt.status = 'submitted'
    AND assignment.teacher_id = auth.uid()
    AND classroom.teacher_id = auth.uid()
  ORDER BY attempt.attempt_number DESC
  LIMIT 1
  FOR UPDATE OF attempt;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'REVIEW_ACCESS_DENIED';
  END IF;

  INSERT INTO public.assignment_reviews (attempt_id, teacher_id, manual_adjustment, teacher_feedback)
  VALUES (selected_attempt.id, auth.uid(), p_manual_adjustment, nullif(trim(p_teacher_feedback), ''))
  ON CONFLICT ON CONSTRAINT assignment_reviews_pkey DO UPDATE SET
    teacher_id = EXCLUDED.teacher_id,
    manual_adjustment = EXCLUDED.manual_adjustment,
    teacher_feedback = EXCLUDED.teacher_feedback,
    updated_at = now();

  UPDATE public.assignment_attempts attempt
  SET status = 'reviewed', reviewed_at = now()
  WHERE attempt.id = selected_attempt.id
  RETURNING attempt.* INTO selected_attempt;

  RETURN QUERY SELECT selected_attempt.id, selected_attempt.auto_score, p_manual_adjustment,
    selected_attempt.auto_score + p_manual_adjustment, nullif(trim(p_teacher_feedback), '');
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_assignment_attempt_review_state() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_teacher_gradebook(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_assignment_attempt(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_assignment_review(UUID, UUID, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_teacher_gradebook(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_assignment_attempt(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_assignment_review(UUID, UUID, NUMERIC, TEXT) TO authenticated;
