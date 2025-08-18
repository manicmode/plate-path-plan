-- Optional tidy-ups for habit_templates view
-- Ensure the view owner has privileges to avoid future grant drift
ALTER VIEW public.habit_templates OWNER TO postgres;

-- Re-assert grants in case CREATE OR REPLACE reset them (some Postgres versions)
GRANT SELECT ON public.habit_templates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.habit_templates TO authenticated;