-- Insert some test data for July 2025 to simulate winners
INSERT INTO public.arena_leaderboard_rollups (challenge_id, section, year, month, user_id, rank, score)
VALUES 
  ('73177b10-ecfc-43ed-a00c-890ead294e29', 'global', 2025, 7, 'f8458f5c-cd73-44ba-a818-6996d23e454b', 1, 150),
  ('73177b10-ecfc-43ed-a00c-890ead294e29', 'global', 2025, 7, '8589c22a-00f5-4e42-a197-fe0dbd87a5d8', 2, 120),
  ('73177b10-ecfc-43ed-a00c-890ead294e29', 'global', 2025, 7, 'ea6022e7-0947-4322-ab30-bfff6774b334', 3, 90)
ON CONFLICT (challenge_id, section, year, month, user_id) DO UPDATE 
SET score = EXCLUDED.score, rank = EXCLUDED.rank;