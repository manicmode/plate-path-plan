-- Fix search path security issue for triggerMeditationNudge function
CREATE OR REPLACE FUNCTION triggerMeditationNudge()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  u RECORD;
  low_mood boolean;
  intense_exercise boolean;
  missed_meditation boolean;
  last_meditated_at timestamp;
BEGIN
  FOR u IN SELECT id FROM auth.users LOOP
    -- Check low mood in last 3 days
    SELECT EXISTS (
      SELECT 1 FROM mood_logs
      WHERE user_id = u.id
      AND mood_score <= 3
      AND created_at >= NOW() - INTERVAL '3 days'
    ) INTO low_mood;

    -- Check for intense exercise in last 3 days
    SELECT EXISTS (
      SELECT 1 FROM exercise_logs
      WHERE user_id = u.id
      AND intensity = 'high'
      AND created_at >= NOW() - INTERVAL '3 days'
    ) INTO intense_exercise;

    -- Check for missed meditation in last 2 days
    SELECT MAX(completed_at)
    FROM recovery_logs
    WHERE user_id = u.id
    AND recovery_type = 'meditation'
    INTO last_meditated_at;

    missed_meditation := (last_meditated_at IS NULL OR last_meditated_at < NOW() - INTERVAL '2 days');

    -- If any condition matches, insert nudge
    IF low_mood OR intense_exercise OR missed_meditation THEN
      INSERT INTO ai_nudges (user_id, nudge_type, message, created_at)
      VALUES (
        u.id,
        'meditation',
        'Need a breather? 🧘 Your mind and body could use a meditation break!',
        NOW()
      );
    END IF;
  END LOOP;
END;
$$;