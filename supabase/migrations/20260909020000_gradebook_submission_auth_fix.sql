-- Return an explicit authorization failure for cross-teacher submission access.

CREATE OR REPLACE FUNCTION public.get_assignment_submission(p_assignment_id UUID, p_student_id UUID)
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
      SELECT option ->> 'text' FROM jsonb_array_elements(phase.value -> 'options') option
      WHERE option ->> 'id' = answer.answer ->> 'option_id' LIMIT 1
    ), answer.answer ->> 'option_id') ELSE answer.answer::text END,
    answer.is_correct, answer.awarded_points,
    answer.is_correct IS NULL OR answer.awarded_points IS NULL,
    COALESCE(review.manual_adjustment, 0), review.teacher_feedback
  FROM public.assignment_answers answer
  LEFT JOIN LATERAL (
    SELECT phase_item.value FROM jsonb_array_elements(game_config -> 'phases') phase_item(value)
    WHERE phase_item.value ->> 'id' = answer.phase_id LIMIT 1
  ) phase ON true
  LEFT JOIN public.assignment_reviews review ON review.attempt_id = selected_attempt_id
  WHERE answer.attempt_id = selected_attempt_id
  ORDER BY answer.submitted_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_assignment_submission(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assignment_submission(UUID, UUID) TO authenticated;
