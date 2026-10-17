-- Require an explicit student confirmation after completing all assignment phases.
-- Existing submitted/reviewed attempts and teacher review behavior are unchanged.

CREATE OR REPLACE FUNCTION public.prepare_assignment_attempt_review_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- record_assignment_phase still writes the legacy `completed` transition.
  -- Keep a fully completed attempt in progress until the student explicitly
  -- submits it through submit_assignment_attempt().
  IF NEW.status = 'completed' THEN
    NEW.status := 'in_progress';
    NEW.completed_at := NULL;
    NEW.duration_seconds := NULL;
    NEW.submitted_at := NULL;
    NEW.reviewed_at := NULL;
  END IF;
  IF NEW.status = 'submitted' AND OLD.status = 'in_progress' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
    NEW.submitted_at := COALESCE(NEW.submitted_at, NEW.completed_at, now());
    NEW.reviewed_at := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.submit_assignment_attempt(p_attempt_id UUID)
RETURNS TABLE (
  id UUID,
  assignment_id UUID,
  attempt_number INTEGER,
  status TEXT,
  progress_percent INTEGER,
  submitted_at TIMESTAMPTZ,
  auto_score NUMERIC,
  max_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id UUID := auth.uid();
  selected_attempt public.assignment_attempts%ROWTYPE;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  IF public.current_classroom_role() IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'STUDENT_ROLE_REQUIRED';
  END IF;

  SELECT attempt.* INTO selected_attempt
  FROM public.assignment_attempts attempt
  JOIN public.assignments assignment ON assignment.id = attempt.assignment_id
  WHERE attempt.id = p_attempt_id
    AND attempt.student_id = caller_id
    AND (
      attempt.status = 'submitted'
      OR (assignment.status = 'active' AND public.is_class_member(assignment.class_id))
    )
  FOR UPDATE OF attempt;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ATTEMPT_ACCESS_DENIED';
  END IF;

  -- A lost HTTP response can safely be retried without creating or changing
  -- another attempt.
  IF selected_attempt.status = 'submitted' THEN
    RETURN QUERY SELECT selected_attempt.id, selected_attempt.assignment_id,
      selected_attempt.attempt_number, selected_attempt.status,
      selected_attempt.progress_percent, selected_attempt.submitted_at,
      selected_attempt.auto_score, selected_attempt.max_score;
    RETURN;
  END IF;

  IF selected_attempt.status <> 'in_progress' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ATTEMPT_NOT_SUBMITTABLE';
  END IF;
  IF selected_attempt.progress_percent <> 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ATTEMPT_INCOMPLETE';
  END IF;

  UPDATE public.assignment_attempts attempt
  SET status = 'submitted',
      completed_at = now(),
      submitted_at = now(),
      duration_seconds = greatest(0, floor(extract(epoch FROM (now() - attempt.started_at)))::integer),
      last_activity_at = now()
  WHERE attempt.id = selected_attempt.id
  RETURNING attempt.* INTO selected_attempt;

  RETURN QUERY SELECT selected_attempt.id, selected_attempt.assignment_id,
    selected_attempt.attempt_number, selected_attempt.status,
    selected_attempt.progress_percent, selected_attempt.submitted_at,
    selected_attempt.auto_score, selected_attempt.max_score;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_assignment_attempt(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_assignment_attempt(UUID) TO authenticated;
