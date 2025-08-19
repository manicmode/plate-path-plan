-- Set the cron token in database configuration
-- This token will be used by pg_cron to authenticate with the Edge function
ALTER DATABASE postgres 
SET app.settings.cron_token = 'cron_habit_nudges_token_2025_secure_64char_random_string_abc123def456';

-- Also set it for the current session so it takes effect immediately
SELECT set_config('app.settings.cron_token', 'cron_habit_nudges_token_2025_secure_64char_random_string_abc123def456', true);