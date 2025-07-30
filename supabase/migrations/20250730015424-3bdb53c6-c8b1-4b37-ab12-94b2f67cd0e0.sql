-- Clean up duplicate AI generated routines (keeping only the newest ones)
DELETE FROM ai_generated_routines 
WHERE routine_name LIKE '%(Copy)%' 
   OR routine_name LIKE '%Copy%';

-- Also ensure all routines are inactive since we want single active routine logic
UPDATE ai_generated_routines SET is_active = false WHERE is_active = true;
UPDATE ai_routines SET is_active = false WHERE is_active = true;