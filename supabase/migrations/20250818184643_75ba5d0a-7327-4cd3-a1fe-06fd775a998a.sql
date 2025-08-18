
-- Test 1: Total count should be 133
SELECT COUNT(*) as total_templates FROM public.habit_templates;

-- Test 2: Domain distribution should be 44/44/45
SELECT domain, COUNT(*) as count 
FROM public.habit_templates 
GROUP BY domain 
ORDER BY domain;

-- Test 3: All 10 new slugs should be present
SELECT slug 
FROM public.habit_templates
WHERE slug IN (
  'prebiotic-food-1','slow-eating-15','protein-dinner-25g',
  'doorway-lat-stretch-2','glute-march-60s','heel-to-toe-walk-60s',
  'hrv-biofeedback-5','white-noise-sleep','sleep-earplugs-or-mask','lavender-aromatherapy-5'
)
ORDER BY slug;

-- Test 4: Check for duplicates (should return no rows)
SELECT slug, COUNT(*) as duplicate_count 
FROM public.habit_templates 
GROUP BY slug 
HAVING COUNT(*) > 1;
