-- Add AI insights column to body_scans table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'body_scans' 
        AND column_name = 'ai_insights'
    ) THEN
        ALTER TABLE public.body_scans 
        ADD COLUMN ai_insights TEXT;
    END IF;
END $$;

-- Add AI generated timestamp column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'body_scans' 
        AND column_name = 'ai_generated_at'
    ) THEN
        ALTER TABLE public.body_scans 
        ADD COLUMN ai_generated_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;