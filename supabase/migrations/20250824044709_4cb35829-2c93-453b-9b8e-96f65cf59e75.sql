-- Final hardening: Lock search_path and schema-qualify function calls

-- 1) Minute key (locked search_path + STRICT + minute truncate)
CREATE OR REPLACE FUNCTION public.calculate_minute_key(ts timestamptz)
RETURNS bigint
LANGUAGE sql
IMMUTABLE STRICT
SET search_path = pg_catalog
AS $fn$
  SELECT floor(extract(epoch FROM date_trunc('minute', ts)) / 60)::bigint
$fn$;

-- 2) Generic trigger used by log tables (schema-qualify our function)
CREATE OR REPLACE FUNCTION public.set_minute_key_from_created_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $fn$
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;
  IF NEW.minute_key IS NULL THEN
    NEW.minute_key := public.calculate_minute_key(NEW.created_at);
  END IF;
  RETURN NEW;
END
$fn$;

-- (If you also keep a hydration-specific trigger function, harden it too)
CREATE OR REPLACE FUNCTION public.set_hydration_minute_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $fn$
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;
  NEW.minute_key := public.calculate_minute_key(NEW.created_at);
  RETURN NEW;
END
$fn$;

-- 3) Updated_at helpers (locked search_path)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$fn$;

CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$fn$;

CREATE OR REPLACE FUNCTION public.tg_touch_updated_at_v2()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$fn$;

-- 4) Challenge helper (locked search_path; schema-qualify table)
-- NOTE: confirm the table name is actually public.challenge (not public.challenges).
CREATE OR REPLACE FUNCTION public.tg_set_challenge_order_influencer()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $fn$
BEGIN
  SELECT c.influencer_id INTO NEW.influencer_id
  FROM public.challenge AS c
  WHERE c.id = NEW.challenge_id;

  IF NEW.influencer_id IS NULL THEN
    RAISE EXCEPTION 'Invalid challenge_id: %', NEW.challenge_id;
  END IF;

  RETURN NEW;
END
$fn$;