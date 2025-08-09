-- Update existing xp_config tuning (no schema changes)
UPDATE public.xp_config
SET
  daily_soft_cap = 60,
  daily_post_cap_multiplier = 0.25,
  action_meal_log = 3,
  action_hydration_log = 1,
  action_recovery_log = 4,
  action_workout_logged = 12
WHERE is_active = false
RETURNING *;