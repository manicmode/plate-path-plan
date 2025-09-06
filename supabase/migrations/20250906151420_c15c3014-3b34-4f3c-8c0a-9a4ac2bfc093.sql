-- Use pg_net (correct extension for net.http_post)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Set a temporary QA key for this single call
ALTER DATABASE postgres SET app.settings.qa_enrich_key = 'qa_temp_key_2025_delete_after_run';

-- One-off: trigger the QA function once right now without storing any JWT in SQL
SELECT net.http_post(
  url := 'https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/qa-enrichment-run',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'X-QA-KEY', current_setting('app.settings.qa_enrich_key', true)
  ),
  body := '{"trigger":"db"}'::jsonb
) AS request_id;