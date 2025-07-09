-- Create ingredient_flags table for the flagging system
CREATE TABLE public.ingredient_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('harmful', 'allergen', 'gmo', 'hormone', 'environmental', 'seed_oil')),
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'moderate', 'high')),
  common_aliases TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ingredient_flags ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (users need to see flagged ingredients)
CREATE POLICY "Anyone can view ingredient flags" 
ON public.ingredient_flags 
FOR SELECT 
USING (true);

-- Only authenticated users can modify (admin functionality for future)
CREATE POLICY "Only authenticated users can insert ingredient flags" 
ON public.ingredient_flags 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Add index for faster ingredient name lookups
CREATE INDEX idx_ingredient_flags_name ON public.ingredient_flags (name);
CREATE INDEX idx_ingredient_flags_category ON public.ingredient_flags (category);

-- Populate with initial flagged ingredients
INSERT INTO public.ingredient_flags (name, category, description, severity, common_aliases) VALUES
-- Harmful additives
('Aspartame', 'harmful', 'Artificial sweetener linked to headaches, dizziness, and potential neurological issues', 'high', ARRAY['aspartame', 'nutrasweet', 'equal']),
('MSG', 'harmful', 'Monosodium glutamate can cause headaches, nausea, and other symptoms in sensitive individuals', 'moderate', ARRAY['msg', 'monosodium glutamate', 'glutamic acid', 'hydrolyzed protein']),
('Sodium Nitrite', 'harmful', 'Preservative that can form cancer-causing nitrosamines when heated', 'high', ARRAY['sodium nitrite', 'nitrite', 'e250']),
('High Fructose Corn Syrup', 'harmful', 'Processed sweetener linked to obesity, diabetes, and metabolic issues', 'moderate', ARRAY['hfcs', 'high fructose corn syrup', 'corn syrup']),
('BHA', 'harmful', 'Butylated hydroxyanisole - potential carcinogen and endocrine disruptor', 'high', ARRAY['bha', 'butylated hydroxyanisole', 'e320']),
('BHT', 'harmful', 'Butylated hydroxytoluene - potential carcinogen linked to liver damage', 'high', ARRAY['bht', 'butylated hydroxytoluene', 'e321']),

-- GMO ingredients
('Corn Syrup', 'gmo', 'Often made from genetically modified corn', 'moderate', ARRAY['corn syrup', 'glucose syrup', 'dextrose']),
('Soy Lecithin', 'gmo', 'Commonly derived from genetically modified soybeans', 'low', ARRAY['soy lecithin', 'lecithin', 'soya lecithin']),
('Canola Oil', 'gmo', 'Usually made from genetically modified rapeseed', 'moderate', ARRAY['canola oil', 'rapeseed oil']),

-- Common allergens
('Gluten', 'allergen', 'Protein found in wheat, barley, and rye that triggers celiac disease and sensitivities', 'high', ARRAY['gluten', 'wheat', 'barley', 'rye', 'wheat flour']),
('Dairy', 'allergen', 'Milk proteins that can cause allergic reactions and digestive issues', 'moderate', ARRAY['dairy', 'milk', 'casein', 'whey', 'lactose']),
('Peanuts', 'allergen', 'Tree nuts that can cause severe allergic reactions', 'high', ARRAY['peanuts', 'peanut', 'groundnuts']),
('Soy', 'allergen', 'Soybean protein that can trigger allergic reactions', 'moderate', ARRAY['soy', 'soya', 'soybean', 'soy protein']),

-- Hormones and antibiotics
('rBGH', 'hormone', 'Recombinant bovine growth hormone used in dairy production', 'moderate', ARRAY['rbgh', 'rbst', 'bovine growth hormone']),
('Antibiotics', 'hormone', 'Antimicrobial drugs used in livestock that may contribute to antibiotic resistance', 'moderate', ARRAY['antibiotics', 'antibiotic residue']),

-- Seed oils
('Soybean Oil', 'seed_oil', 'Highly processed oil high in omega-6 fatty acids and inflammatory compounds', 'moderate', ARRAY['soybean oil', 'soy oil']),
('Corn Oil', 'seed_oil', 'Refined oil high in omega-6 that promotes inflammation', 'moderate', ARRAY['corn oil', 'maize oil']),
('Sunflower Oil', 'seed_oil', 'Processed oil that can be pro-inflammatory when consumed in excess', 'low', ARRAY['sunflower oil']),
('Safflower Oil', 'seed_oil', 'Highly refined oil with unbalanced omega fatty acid profile', 'low', ARRAY['safflower oil']),

-- Environmental concerns
('Palm Oil', 'environmental', 'Often linked to deforestation and habitat destruction', 'moderate', ARRAY['palm oil', 'palm kernel oil']),
('Farmed Salmon', 'environmental', 'Often contains antibiotics, chemicals, and has negative environmental impact', 'low', ARRAY['farmed salmon', 'atlantic salmon']);