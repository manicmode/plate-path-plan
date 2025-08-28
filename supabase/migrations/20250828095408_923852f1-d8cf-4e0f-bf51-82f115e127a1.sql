-- Clean view that always hides mocks & soft-deletes
CREATE OR REPLACE VIEW public.nutrition_logs_clean AS
SELECT *
FROM public.nutrition_logs
WHERE is_mock = false
  AND deleted_at IS NULL;

-- Ensure the view runs with caller privileges (RLS enforced for the user)
ALTER VIEW public.nutrition_logs_clean SET (security_invoker = on);

-- Safer (recommended): only authenticated users can select
GRANT SELECT ON public.nutrition_logs_clean TO authenticated;