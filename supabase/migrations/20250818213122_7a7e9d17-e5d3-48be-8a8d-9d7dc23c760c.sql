-- Enable trigram for fast ILIKE
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- B-tree filters (base table)
CREATE INDEX IF NOT EXISTS ht_domain_idx      ON public.habit_template(domain);
CREATE INDEX IF NOT EXISTS ht_category_idx    ON public.habit_template(category);
CREATE INDEX IF NOT EXISTS ht_difficulty_idx  ON public.habit_template(difficulty);
CREATE INDEX IF NOT EXISTS ht_goal_type_idx   ON public.habit_template(goal_type);

-- (Optional but helpful for combined filters)
CREATE INDEX IF NOT EXISTS ht_dom_cat_diff_idx ON public.habit_template(domain, category, difficulty);

-- Trigram search accelerators
CREATE INDEX IF NOT EXISTS ht_name_trgm_idx     ON public.habit_template USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ht_summary_trgm_idx  ON public.habit_template USING gin (summary gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ht_slug_trgm_idx     ON public.habit_template USING gin (slug gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ht_tags_trgm_idx     ON public.habit_template USING gin (tags gin_trgm_ops);