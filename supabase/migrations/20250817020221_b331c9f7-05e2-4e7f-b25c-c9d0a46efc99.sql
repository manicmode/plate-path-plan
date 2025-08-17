-- Manually insert the July winners to test the system
INSERT INTO public.arena_monthly_winners (season_month, user_id, rank, score, trophy_level)
VALUES 
  ('2025-07-01', 'f8458f5c-cd73-44ba-a818-6996d23e454b', 1, 150, 'gold'),
  ('2025-07-01', '8589c22a-00f5-4e42-a197-fe0dbd87a5d8', 2, 120, 'silver'),
  ('2025-07-01', 'ea6022e7-0947-4322-ab30-bfff6774b334', 3, 90, 'bronze');