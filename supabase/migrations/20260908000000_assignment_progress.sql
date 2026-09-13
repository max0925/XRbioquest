-- Trusted assignment attempts, phase progress, and quiz answer scoring.

CREATE TABLE public.assignment_attempts (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  completed_phase_ids TEXT[] NOT NULL DEFAULT '{}',
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  auto_score NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (auto_score >= 0),
  max_score NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (max_score >= 0),
  UNIQUE (assignment_id, student_id, attempt_number),
  CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);

CREATE UNIQUE INDEX assignment_attempts_one_current_idx
  ON public.assignment_attempts (assignment_id, student_id)
  WHERE status = 'in_progress';
CREATE INDEX assignment_attempts_student_idx
  ON public.assignment_attempts (student_id, assignment_id, attempt_number DESC);
CREATE INDEX assignment_attempts_assignment_idx
  ON public.assignment_attempts (assignment_id, student_id);

CREATE TABLE public.assignment_answers (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.assignment_attempts(id) ON DELETE CASCADE,
  phase_id TEXT NOT NULL CHECK (char_length(phase_id) BETWEEN 1 AND 200),
  question_type TEXT NOT NULL CHECK (char_length(question_type) BETWEEN 1 AND 40),
  answer JSONB NOT NULL,
  is_correct BOOLEAN,
  awarded_points NUMERIC(10,2) CHECK (awarded_points IS NULL OR awarded_points >= 0),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, phase_id)
);

CREATE INDEX assignment_answers_attempt_idx ON public.assignment_answers (attempt_id);

ALTER TABLE public.assignment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY assignment_attempts_student_select ON public.assignment_attempts
FOR SELECT TO authenticated
USING (
  student_id = (SELECT auth.uid())
  AND (SELECT public.current_classroom_role()) = 'student'
);

CREATE POLICY assignment_attempts_teacher_select ON public.assignment_attempts
FOR SELECT TO authenticated
USING (
  (SELECT public.current_classroom_role()) = 'teacher'
  AND EXISTS (
    SELECT 1 FROM public.assignments assignment
    WHERE assignment.id = assignment_id
      AND assignment.teacher_id = (SELECT auth.uid())
  )
);

CREATE POLICY assignment_answers_student_select ON public.assignment_answers
FOR SELECT TO authenticated
USING (
  (SELECT public.current_classroom_role()) = 'student'
  AND EXISTS (
    SELECT 1 FROM public.assignment_attempts attempt
    WHERE attempt.id = attempt_id
      AND attempt.student_id = (SELECT auth.uid())
  )
);

CREATE POLICY assignment_answers_teacher_select ON public.assignment_answers
FOR SELECT TO authenticated
USING (
  (SELECT public.current_classroom_role()) = 'teacher'
  AND EXISTS (
    SELECT 1
    FROM public.assignment_attempts attempt
    JOIN public.assignments assignment ON assignment.id = attempt.assignment_id
    WHERE attempt.id = attempt_id
      AND assignment.teacher_id = (SELECT auth.uid())
  )
);

REVOKE ALL ON TABLE public.assignment_attempts, public.assignment_answers FROM anon, authenticated;
GRANT SELECT ON TABLE public.assignment_attempts, public.assignment_answers TO authenticated;

CREATE FUNCTION public.start_assignment_attempt(p_assignment_id UUID, p_experience_id TEXT)
RETURNS TABLE (
  id UUID,
  assignment_id UUID,
  attempt_number INTEGER,
  status TEXT,
  completed_phase_ids TEXT[],
  progress_percent INTEGER,
  started_at TIMESTAMPTZ,
  auto_score NUMERIC,
  max_score NUMERIC
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
    UPDATE public.assignment_attempts attempt
    SET last_activity_at = now()
    WHERE attempt.id = current_attempt.id
    RETURNING attempt.* INTO current_attempt;
  ELSE
    IF NOT target_assignment.allow_retries AND EXISTS (
      SELECT 1 FROM public.assignment_attempts attempt
      WHERE attempt.assignment_id = p_assignment_id
        AND attempt.student_id = caller_id
        AND attempt.status = 'completed'
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

    INSERT INTO public.assignment_attempts (
      assignment_id, student_id, attempt_number, max_score
    ) VALUES (
      p_assignment_id, caller_id, next_attempt_number, quiz_max
    ) RETURNING * INTO current_attempt;
  END IF;

  RETURN QUERY SELECT current_attempt.id, current_attempt.assignment_id,
    current_attempt.attempt_number, current_attempt.status,
    current_attempt.completed_phase_ids, current_attempt.progress_percent,
    current_attempt.started_at, current_attempt.auto_score, current_attempt.max_score;
END;
$$;

CREATE FUNCTION public.record_assignment_phase(
  p_attempt_id UUID,
  p_experience_id TEXT,
  p_phase_id TEXT,
  p_answer JSONB DEFAULT NULL
)
RETURNS TABLE (
  status TEXT,
  completed_phase_ids TEXT[],
  progress_percent INTEGER,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  auto_score NUMERIC,
  max_score NUMERIC,
  answer_is_correct BOOLEAN,
  awarded_points NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id UUID := auth.uid();
  target_attempt public.assignment_attempts%ROWTYPE;
  target_assignment public.assignments%ROWTYPE;
  game_config JSONB;
  target_phase JSONB;
  expected_phase_id TEXT;
  selected_option_id TEXT;
  computed_correct BOOLEAN := NULL;
  computed_points NUMERIC := NULL;
  interactive_count INTEGER;
  completed_count INTEGER;
  score_total NUMERIC;
  score_max NUMERIC;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  IF public.current_classroom_role() IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'STUDENT_ROLE_REQUIRED';
  END IF;

  SELECT attempt.* INTO target_attempt
  FROM public.assignment_attempts attempt
  WHERE attempt.id = p_attempt_id
  FOR UPDATE;

  IF NOT FOUND OR target_attempt.student_id <> caller_id OR target_attempt.status <> 'in_progress' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ATTEMPT_ACCESS_DENIED';
  END IF;

  SELECT assignment.* INTO target_assignment
  FROM public.assignments assignment
  WHERE assignment.id = target_attempt.assignment_id
    AND assignment.experience_id = p_experience_id
    AND assignment.status = 'active'
    AND public.is_class_member(assignment.class_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ASSIGNMENT_ACCESS_DENIED';
  END IF;

  SELECT experience.config INTO game_config
  FROM public.game_configs experience
  WHERE experience.id = p_experience_id AND experience.visibility = 'published';
  IF game_config IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'EXPERIENCE_ACCESS_DENIED';
  END IF;

  SELECT phase.value INTO target_phase
  FROM jsonb_array_elements(game_config -> 'phases') WITH ORDINALITY phase(value, position)
  WHERE phase.value ->> 'id' = p_phase_id
    AND phase.value ->> 'type' NOT IN ('intro', 'complete');
  IF target_phase IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_PHASE';
  END IF;

  SELECT phase.value ->> 'id' INTO expected_phase_id
  FROM jsonb_array_elements(game_config -> 'phases') WITH ORDINALITY phase(value, position)
  WHERE phase.value ->> 'type' NOT IN ('intro', 'complete')
    AND NOT (phase.value ->> 'id' = ANY(target_attempt.completed_phase_ids))
  ORDER BY phase.position
  LIMIT 1;
  IF expected_phase_id IS DISTINCT FROM p_phase_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PHASE_OUT_OF_ORDER';
  END IF;

  IF target_phase ->> 'type' = 'quiz' THEN
    selected_option_id := p_answer ->> 'option_id';
    IF selected_option_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(target_phase -> 'options') option
      WHERE option ->> 'id' = selected_option_id
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ANSWER';
    END IF;
    SELECT COALESCE((option ->> 'is_correct')::boolean, false) INTO computed_correct
    FROM jsonb_array_elements(target_phase -> 'options') option
    WHERE option ->> 'id' = selected_option_id;
    computed_points := CASE WHEN computed_correct THEN COALESCE((target_phase ->> 'points')::numeric, 0) ELSE 0 END;

    INSERT INTO public.assignment_answers (
      attempt_id, phase_id, question_type, answer, is_correct, awarded_points, submitted_at
    ) VALUES (
      p_attempt_id, p_phase_id, 'quiz', jsonb_build_object('option_id', selected_option_id),
      computed_correct, computed_points, now()
    ) ON CONFLICT (attempt_id, phase_id) DO UPDATE
    SET answer = EXCLUDED.answer, is_correct = EXCLUDED.is_correct,
      awarded_points = EXCLUDED.awarded_points, submitted_at = EXCLUDED.submitted_at;
  ELSIF p_answer IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ANSWER_NOT_ALLOWED';
  END IF;

  IF target_phase ->> 'type' <> 'quiz' OR computed_correct THEN
    target_attempt.completed_phase_ids := array_append(target_attempt.completed_phase_ids, p_phase_id);
  END IF;

  SELECT count(*) INTO interactive_count
  FROM jsonb_array_elements(game_config -> 'phases') phase
  WHERE phase ->> 'type' NOT IN ('intro', 'complete');
  completed_count := cardinality(target_attempt.completed_phase_ids);

  SELECT COALESCE(sum(answer.awarded_points), 0) INTO score_total
  FROM public.assignment_answers answer WHERE answer.attempt_id = p_attempt_id;
  SELECT COALESCE(sum(COALESCE((phase ->> 'points')::numeric, 0)), 0) INTO score_max
  FROM jsonb_array_elements(game_config -> 'phases') phase WHERE phase ->> 'type' = 'quiz';

  UPDATE public.assignment_attempts attempt
  SET completed_phase_ids = target_attempt.completed_phase_ids,
      progress_percent = CASE WHEN interactive_count = 0 THEN 100 ELSE floor(completed_count * 100.0 / interactive_count)::integer END,
      last_activity_at = now(),
      status = CASE WHEN completed_count >= interactive_count THEN 'completed' ELSE 'in_progress' END,
      completed_at = CASE WHEN completed_count >= interactive_count THEN now() ELSE NULL END,
      duration_seconds = CASE WHEN completed_count >= interactive_count THEN greatest(0, floor(extract(epoch FROM (now() - attempt.started_at)))::integer) ELSE NULL END,
      auto_score = score_total,
      max_score = score_max
  WHERE attempt.id = p_attempt_id
  RETURNING attempt.* INTO target_attempt;

  RETURN QUERY SELECT target_attempt.status, target_attempt.completed_phase_ids,
    target_attempt.progress_percent, target_attempt.completed_at,
    target_attempt.duration_seconds, target_attempt.auto_score, target_attempt.max_score,
    computed_correct, computed_points;
END;
$$;

REVOKE ALL ON FUNCTION public.start_assignment_attempt(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_assignment_phase(UUID, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_assignment_attempt(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_assignment_phase(UUID, TEXT, TEXT, JSONB) TO authenticated;
