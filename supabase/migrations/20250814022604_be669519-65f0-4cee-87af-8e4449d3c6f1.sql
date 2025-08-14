-- Cleanup: Drop the temporary verification helper functions
DROP FUNCTION IF EXISTS public._verify_billboard_for(uuid);
DROP FUNCTION IF EXISTS public._verify_active_for(uuid);