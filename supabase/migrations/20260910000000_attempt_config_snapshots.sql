-- Freeze lesson and quiz content when an assignment attempt starts.

ALTER TABLE public.assignment_attempts
  ADD COLUMN config_snapshot JSONB;

UPDATE public.assignment_attempts attempt
SET config_snapshot = experience.config
FROM public.assignments assignment
JOIN public.game_configs experience ON experience.id = assignment.experience_id
WHERE assignment.id = attempt.assignment_id;

ALTER TABLE public.assignment_attempts
  ALTER COLUMN config_snapshot SET NOT NULL;

CREATE FUNCTION public.capture_assignment_attempt_config()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.config_snapshot IS NULL THEN
    SELECT experience.config INTO NEW.config_snapshot
    FROM public.assignments assignment
    JOIN public.game_configs experience ON experience.id = assignment.experience_id
    WHERE assignment.id = NEW.assignment_id;
  END IF;
  IF NEW.config_snapshot IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'ATTEMPT_CONFIG_REQUIRED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assignment_attempt_config_snapshot
BEFORE INSERT ON public.assignment_attempts
FOR EACH ROW EXECUTE FUNCTION public.capture_assignment_attempt_config();

-- Keep the established scoring function and replace only its live-config read.
-- This minimizes drift from the already validated authorization and scoring path.
DO $$
DECLARE
  original_definition TEXT;
  snapshot_definition TEXT;
BEGIN
  original_definition := pg_catalog.pg_get_functiondef(
    'public.record_assignment_phase(uuid,text,text,jsonb)'::regprocedure
  );
  snapshot_definition := pg_catalog.regexp_replace(
    original_definition,
    'SELECT experience\.config INTO game_config[[:space:]]+FROM public\.game_configs experience[[:space:]]+WHERE experience\.id = p_experience_id AND experience\.visibility = ''published'';',
    'game_config := target_attempt.config_snapshot;',
    'n'
  );
  IF snapshot_definition = original_definition THEN
    RAISE EXCEPTION 'record_assignment_phase live config lookup was not found';
  END IF;
  EXECUTE snapshot_definition;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_assignment_attempt_config() FROM PUBLIC;
