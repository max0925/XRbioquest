-- Reconcile the existing Bioquest ngss_assets schema with the column names
-- used by the application. This is intentionally a forward migration: the
-- historical 20250207 migration must not be marked as applied or replayed
-- against a table that was created outside the repository migration ledger.

DO $migration$
DECLARE
  legacy_standards_type TEXT;
  legacy_curriculum_type TEXT;
BEGIN
  IF pg_catalog.to_regclass('public.ngss_assets') IS NULL THEN
    RAISE EXCEPTION 'public.ngss_assets must exist before applying the compatibility migration';
  END IF;

  SELECT pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
  INTO legacy_standards_type
  FROM pg_catalog.pg_attribute attribute
  WHERE attribute.attrelid = 'public.ngss_assets'::pg_catalog.regclass
    AND attribute.attname = 'standards'
    AND attribute.attnum > 0
    AND NOT attribute.attisdropped;

  SELECT pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
  INTO legacy_curriculum_type
  FROM pg_catalog.pg_attribute attribute
  WHERE attribute.attrelid = 'public.ngss_assets'::pg_catalog.regclass
    AND attribute.attname = 'curriculum'
    AND attribute.attnum > 0
    AND NOT attribute.attisdropped;

  IF legacy_standards_type IS NOT NULL AND legacy_standards_type <> 'text[]' THEN
    RAISE EXCEPTION 'public.ngss_assets.standards has unsupported type %; expected text[]', legacy_standards_type;
  END IF;
  IF legacy_curriculum_type IS NOT NULL AND legacy_curriculum_type <> 'text[]' THEN
    RAISE EXCEPTION 'public.ngss_assets.curriculum has unsupported type %; expected text[]', legacy_curriculum_type;
  END IF;
END;
$migration$;

ALTER TABLE public.ngss_assets
  ADD COLUMN IF NOT EXISTS ngss_standards TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS curriculum_tags TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT pg_catalog.now();

DO $migration$
DECLARE
  target_standards_type TEXT;
  target_curriculum_type TEXT;
  updated_at_type TEXT;
BEGIN
  SELECT pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
  INTO target_standards_type
  FROM pg_catalog.pg_attribute attribute
  WHERE attribute.attrelid = 'public.ngss_assets'::pg_catalog.regclass
    AND attribute.attname = 'ngss_standards'
    AND attribute.attnum > 0
    AND NOT attribute.attisdropped;

  SELECT pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
  INTO target_curriculum_type
  FROM pg_catalog.pg_attribute attribute
  WHERE attribute.attrelid = 'public.ngss_assets'::pg_catalog.regclass
    AND attribute.attname = 'curriculum_tags'
    AND attribute.attnum > 0
    AND NOT attribute.attisdropped;

  SELECT pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
  INTO updated_at_type
  FROM pg_catalog.pg_attribute attribute
  WHERE attribute.attrelid = 'public.ngss_assets'::pg_catalog.regclass
    AND attribute.attname = 'updated_at'
    AND attribute.attnum > 0
    AND NOT attribute.attisdropped;

  IF target_standards_type <> 'text[]' THEN
    RAISE EXCEPTION 'public.ngss_assets.ngss_standards has unsupported type %; expected text[]', target_standards_type;
  END IF;
  IF target_curriculum_type <> 'text[]' THEN
    RAISE EXCEPTION 'public.ngss_assets.curriculum_tags has unsupported type %; expected text[]', target_curriculum_type;
  END IF;
  IF updated_at_type <> 'timestamp with time zone' THEN
    RAISE EXCEPTION 'public.ngss_assets.updated_at has unsupported type %; expected timestamp with time zone', updated_at_type;
  END IF;

  -- Dynamic statements allow this migration to remain safe in a future schema
  -- where either legacy source column has already been retired. Existing,
  -- non-empty target arrays always win.
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute attribute
    WHERE attribute.attrelid = 'public.ngss_assets'::pg_catalog.regclass
      AND attribute.attname = 'standards'
      AND attribute.attnum > 0
      AND NOT attribute.attisdropped
  ) THEN
    EXECUTE $sql$
      UPDATE public.ngss_assets
      SET ngss_standards = standards
      WHERE (ngss_standards IS NULL OR pg_catalog.cardinality(ngss_standards) = 0)
        AND standards IS NOT NULL
        AND pg_catalog.cardinality(standards) > 0
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute attribute
    WHERE attribute.attrelid = 'public.ngss_assets'::pg_catalog.regclass
      AND attribute.attname = 'curriculum'
      AND attribute.attnum > 0
      AND NOT attribute.attisdropped
  ) THEN
    EXECUTE $sql$
      UPDATE public.ngss_assets
      SET curriculum_tags = curriculum
      WHERE (curriculum_tags IS NULL OR pg_catalog.cardinality(curriculum_tags) = 0)
        AND curriculum IS NOT NULL
        AND pg_catalog.cardinality(curriculum) > 0
    $sql$;
  END IF;
END;
$migration$;

UPDATE public.ngss_assets
SET ngss_standards = '{}'::TEXT[]
WHERE ngss_standards IS NULL;

UPDATE public.ngss_assets
SET curriculum_tags = '{}'::TEXT[]
WHERE curriculum_tags IS NULL;

UPDATE public.ngss_assets
SET updated_at = COALESCE(created_at, pg_catalog.now())
WHERE updated_at IS NULL;

ALTER TABLE public.ngss_assets
  ALTER COLUMN ngss_standards SET DEFAULT '{}'::TEXT[],
  ALTER COLUMN curriculum_tags SET DEFAULT '{}'::TEXT[],
  ALTER COLUMN updated_at SET DEFAULT pg_catalog.now(),
  ALTER COLUMN updated_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ngss_assets_ngss_standards
  ON public.ngss_assets USING GIN (ngss_standards);

CREATE INDEX IF NOT EXISTS idx_ngss_assets_curriculum_tags
  ON public.ngss_assets USING GIN (curriculum_tags);

CREATE OR REPLACE FUNCTION public.set_ngss_assets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$function$;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger trigger_record
    WHERE trigger_record.tgrelid = 'public.ngss_assets'::pg_catalog.regclass
      AND trigger_record.tgname = 'set_ngss_assets_updated_at'
      AND NOT trigger_record.tgisinternal
  ) THEN
    CREATE TRIGGER set_ngss_assets_updated_at
      BEFORE UPDATE ON public.ngss_assets
      FOR EACH ROW
      EXECUTE FUNCTION public.set_ngss_assets_updated_at();
  END IF;
END;
$migration$;

REVOKE ALL ON FUNCTION public.set_ngss_assets_updated_at() FROM PUBLIC;

COMMENT ON COLUMN public.ngss_assets.ngss_standards IS
  'Application-facing NGSS codes copied from legacy standards when the target is empty';
COMMENT ON COLUMN public.ngss_assets.curriculum_tags IS
  'Application-facing curriculum tags copied from legacy curriculum when the target is empty';
