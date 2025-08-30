-- Create user product preferences table for portion size overrides
CREATE TABLE public.user_product_prefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_key TEXT NOT NULL, -- barcode or hash(brand+name)
  portion_grams NUMERIC NOT NULL,
  portion_display TEXT, -- e.g., "1 cup", "2 tbsp"
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_key)
);

-- Enable RLS
ALTER TABLE public.user_product_prefs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own product preferences"
ON public.user_product_prefs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_product_prefs_updated_at
  BEFORE UPDATE ON public.user_product_prefs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for efficient lookups
CREATE INDEX idx_user_product_prefs_lookup ON public.user_product_prefs(user_id, product_key);