-- Resolve PL/pgSQL output-column ambiguity in the teacher review upsert.

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

REVOKE ALL ON FUNCTION public.save_assignment_review(UUID, UUID, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_assignment_review(UUID, UUID, NUMERIC, TEXT) TO authenticated;
