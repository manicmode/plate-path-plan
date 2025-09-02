// Portion estimation for detected food items
const SERVING_GRAMS: Record<string, number> = {
  'salmon': 120,            // typical cooked fillet
  'smoked salmon': 56,      // 2 oz
  'asparagus': 90,          // ~8 spears
  'tomato': 80,
  'rice': 150,
  'bread': 30,
  'egg': 50,
  'chicken breast': 140,
  'beef steak': 150,
  'broccoli': 90,
  'lemon': 30,
  'avocado': 150,
  'spinach': 85,
  'carrot': 80,
  'onion': 110,
  'garlic': 10,
  'cucumber': 100,
  'pepper': 90,
};

export function estimatePortionFromName(name: string): number {
  const key = name.toLowerCase();
  
  // Direct lookup first
  if (SERVING_GRAMS[key]) {
    return SERVING_GRAMS[key];
  }
  
  // Category fallbacks using regex patterns
  if (/(salmon|fish|tuna|cod|halibut)/.test(key)) return 120;
  if (/(chicken|turkey|poultry)/.test(key)) return 140;
  if (/(beef|steak|pork|lamb)/.test(key)) return 150;
  if (/(broccoli|asparagus|spinach|greens|vegg?)/.test(key)) return 85;
  if (/(rice|pasta|noodle|grain|quinoa)/.test(key)) return 150;
  if (/(sauce|dressing|oil)/.test(key)) return 30;
  if (/(fruit|apple|banana|orange)/.test(key)) return 120;
  if (/(cheese|dairy)/.test(key)) return 28;
  if (/(nuts|seeds)/.test(key)) return 30;
  
  return 100; // final fallback
}