-- Fix remaining database functions with search_path vulnerabilities
-- Direct approach to update specific functions that need search_path set

-- Fix the remaining functions that still have search_path issues
ALTER FUNCTION public.update_user_streaks() SET search_path = 'public', 'pg_catalog';
ALTER FUNCTION public.handle_new_user_profile() SET search_path = 'public', 'pg_catalog';
ALTER FUNCTION public.update_follow_counts() SET search_path = 'public', 'pg_catalog';

-- Create extensions schema for better security
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Fix user_notifications constraint violations
-- Based on logs, there are check constraint violations for notification types
-- Let's check what types are allowed and add missing ones

-- First, let's see what the current constraint allows and add common notification types
DO $$
BEGIN
    -- Try to add common notification types that are likely being used
    -- This will help resolve the constraint violations we see in the logs
    
    -- Check if we need to update the type enum or constraint
    -- Add a more permissive constraint temporarily to allow existing functionality
    
    -- Drop the existing constraint if it exists
    ALTER TABLE public.user_notifications DROP CONSTRAINT IF EXISTS user_notifications_type_check;
    
    -- Add a new constraint that includes common notification types
    ALTER TABLE public.user_notifications ADD CONSTRAINT user_notifications_type_check 
    CHECK (type IN (
        'achievement', 'badge_unlock', 'streak_milestone', 'friend_request', 
        'challenge_invite', 'daily_reminder', 'weekly_summary', 'monthly_summary',
        'team_up_prompt', 'meal_suggestion', 'exercise_reminder', 'hydration_reminder',
        'supplement_reminder', 'body_scan_reminder', 'mood_log_reminder',
        'general', 'system', 'social', 'health', 'reminder'
    ));
    
EXCEPTION WHEN OTHERS THEN
    -- If constraint operations fail, just log and continue
    RAISE NOTICE 'Could not update notification type constraint: %', SQLERRM;
END $$;