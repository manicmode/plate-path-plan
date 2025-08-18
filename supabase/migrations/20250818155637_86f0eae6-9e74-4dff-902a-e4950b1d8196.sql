-- Back-compat view (plural → singular)
CREATE OR REPLACE VIEW public.habit_templates AS
SELECT * FROM public.habit_template;

-- Permissions (mirror whatever habit_template has; safest grant to authenticated role)
GRANT SELECT ON public.habit_templates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.habit_templates TO authenticated;

-- Uniqueness (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS habit_template_slug_uidx
  ON public.habit_template (slug);

-- Fast lookups & search
CREATE INDEX IF NOT EXISTS habit_template_domain_idx    ON public.habit_template (domain);
CREATE INDEX IF NOT EXISTS habit_template_category_idx  ON public.habit_template (category);
CREATE INDEX IF NOT EXISTS habit_template_tags_gin      ON public.habit_template USING GIN ((to_tsvector('simple', COALESCE(tags,''))));

-- Guard goal_type/default_target consistency (simple CHECKs + trigger)
ALTER TABLE public.habit_template
  ADD CONSTRAINT habit_goal_type_chk
  CHECK (goal_type IN ('bool','count','duration'));

-- Enforce target rules via trigger (bool must be NULL; count/duration must be numeric)
CREATE OR REPLACE FUNCTION public.habit_validate_targets() RETURNS trigger AS $$
BEGIN
  IF NEW.goal_type = 'bool' AND NEW.default_target IS NOT NULL THEN
    RAISE EXCEPTION 'default_target must be NULL for goal_type=bool (slug=%)', NEW.slug;
  ELSIF NEW.goal_type IN ('count','duration') AND NEW.default_target IS NULL THEN
    RAISE EXCEPTION 'default_target must be set for goal_type in (count,duration) (slug=%)', NEW.slug;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_habit_validate_targets ON public.habit_template;
CREATE TRIGGER trg_habit_validate_targets
BEFORE INSERT OR UPDATE ON public.habit_template
FOR EACH ROW EXECUTE FUNCTION public.habit_validate_targets();