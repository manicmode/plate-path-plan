-- Add meal quality evaluation columns to nutrition_logs table
ALTER TABLE public.nutrition_logs
ADD COLUMN quality_score INTEGER,
ADD COLUMN quality_verdict TEXT,
ADD COLUMN quality_reasons TEXT[],
ADD COLUMN processing_level TEXT,
ADD COLUMN ingredient_analysis JSONB;