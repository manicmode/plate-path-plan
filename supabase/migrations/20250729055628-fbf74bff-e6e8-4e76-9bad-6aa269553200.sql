-- Recreate report_templates table
CREATE TABLE IF NOT EXISTS public.report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL CHECK (report_type IN ('weekly', 'monthly', 'yearly')),
  title text,
  description text,
  layout jsonb DEFAULT '{}',
  logic_config jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read templates"
  ON public.report_templates FOR SELECT
  USING (true);

CREATE POLICY "Creators can manage their templates"
  ON public.report_templates FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);