-- 1) Gate writes to service_role or authenticated with is_admin:true
-- Require either the service_role OR an authenticated JWT with {"is_admin": true}
CREATE OR REPLACE FUNCTION public.secure_upsert_habit_templates(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  claims jsonb := COALESCE(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb);
  role   text  := COALESCE(claims->>'role','');
  is_admin boolean := COALESCE((claims->>'is_admin')::boolean, false);
BEGIN
  IF NOT (role = 'service_role' OR (role = 'authenticated' AND is_admin)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  PERFORM public.rpc_upsert_habit_templates(payload);
END;
$$;

REVOKE ALL     ON FUNCTION public.rpc_upsert_habit_templates(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.secure_upsert_habit_templates(jsonb)
  TO authenticated, service_role;

-- 2) Immutable audit log for any base-table changes
-- Even though clients can't write the base table, this captures all service/admin changes with who/when/what.

-- Audit table (no deletes)
CREATE TABLE IF NOT EXISTS public.habit_template_audit (
  id            bigserial PRIMARY KEY,
  action        text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  slug          text,
  old_row       jsonb,
  new_row       jsonb,
  changed_by    text,     -- JWT sub or 'service_role'
  changed_role  text,     -- JWT role
  changed_at    timestamptz NOT NULL DEFAULT now()
);

-- Trigger fn
CREATE OR REPLACE FUNCTION public.log_habit_template_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  claims jsonb := COALESCE(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb);
  who    text  := COALESCE(claims->>'sub', current_user);
  role   text  := COALESCE(claims->>'role', current_user);
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.habit_template_audit(action, slug, old_row, new_row, changed_by, changed_role)
    VALUES ('INSERT', NEW.slug, NULL, to_jsonb(NEW), who, role);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.habit_template_audit(action, slug, old_row, new_row, changed_by, changed_role)
    VALUES ('UPDATE', NEW.slug, to_jsonb(OLD), to_jsonb(NEW), who, role);
    RETURN NEW;
  ELSE
    INSERT INTO public.habit_template_audit(action, slug, old_row, new_row, changed_by, changed_role)
    VALUES ('DELETE', OLD.slug, to_jsonb(OLD), NULL, who, role);
    RETURN OLD;
  END IF;
END;
$$;

-- Attach triggers (idempotent if already attached; drop first if needed)
DROP TRIGGER IF EXISTS habit_template_audit_trg_ins ON public.habit_template;
DROP TRIGGER IF EXISTS habit_template_audit_trg_upd ON public.habit_template;
DROP TRIGGER IF EXISTS habit_template_audit_trg_del ON public.habit_template;

CREATE TRIGGER habit_template_audit_trg_ins AFTER INSERT ON public.habit_template
FOR EACH ROW EXECUTE FUNCTION public.log_habit_template_changes();
CREATE TRIGGER habit_template_audit_trg_upd AFTER UPDATE ON public.habit_template
FOR EACH ROW EXECUTE FUNCTION public.log_habit_template_changes();
CREATE TRIGGER habit_template_audit_trg_del AFTER DELETE ON public.habit_template
FOR EACH ROW EXECUTE FUNCTION public.log_habit_template_changes();

-- Read-only access to audit for app roles if you want:
GRANT SELECT ON public.habit_template_audit TO authenticated, service_role;

-- 3) Guardrails (lightweight checks)
-- Unique slug (if not already enforced)
CREATE UNIQUE INDEX IF NOT EXISTS habit_template_slug_uidx ON public.habit_template(slug);

-- Basic enums & ranges - drop existing constraints first, then add them
DO $$
BEGIN
  -- Drop existing constraints if they exist
  ALTER TABLE public.habit_template DROP CONSTRAINT IF EXISTS habit_domain_chk;
  ALTER TABLE public.habit_template DROP CONSTRAINT IF EXISTS habit_goal_type_chk;
  ALTER TABLE public.habit_template DROP CONSTRAINT IF EXISTS habit_difficulty_chk;
  ALTER TABLE public.habit_template DROP CONSTRAINT IF EXISTS habit_minutes_chk;
  ALTER TABLE public.habit_template DROP CONSTRAINT IF EXISTS habit_target_chk;
  ALTER TABLE public.habit_template DROP CONSTRAINT IF EXISTS habit_slug_format_chk;
  
  -- Add constraints
  ALTER TABLE public.habit_template
    ADD CONSTRAINT habit_domain_chk      CHECK (domain IN ('nutrition','exercise','recovery')),
    ADD CONSTRAINT habit_goal_type_chk   CHECK (goal_type IN ('bool','count','duration')),
    ADD CONSTRAINT habit_difficulty_chk  CHECK (difficulty IN ('easy','medium','hard')),
    ADD CONSTRAINT habit_minutes_chk     CHECK (estimated_minutes IS NULL OR (estimated_minutes >= 0 AND estimated_minutes <= 180)),
    ADD CONSTRAINT habit_target_chk      CHECK (default_target IS NULL OR default_target >= 0),
    ADD CONSTRAINT habit_slug_format_chk CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,64}$');
END;
$$;