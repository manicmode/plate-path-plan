-- Add unique constraint to badges and create beginner badges
ALTER TABLE badges ADD CONSTRAINT badges_name_unique UNIQUE (name);

-- Create basic achievement badges for testing
INSERT INTO badges (name, title, description, icon, requirement_type, requirement_value, tracker_type, rarity)
VALUES 
  ('first_steps', 'First Steps 👶', 'Complete your first day of logging', '👶', 'streak', 1, 'any', 'common'),
  ('getting_started', 'Getting Started 🌱', 'Maintain a 2-day streak', '🌱', 'streak', 2, 'any', 'common')
ON CONFLICT (name) DO NOTHING;

-- Test badge awarding again
SELECT check_and_award_all_badges('8589c22a-00f5-4e42-a197-fe0dbd87a5d8'::uuid) as badge_award_result;