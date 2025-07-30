-- Deactivate all AI-generated routines to effectively delete them from the UI
UPDATE public.ai_routines 
SET is_active = false, updated_at = now()
WHERE is_active = true;