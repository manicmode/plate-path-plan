export interface ClassificationResult { classId: string | null; confidence: number; matchedPattern?: string; }

const FOOD_PATTERNS: Record<string, RegExp[]> = {
  fish_fillet_link: [/salmon.*fillet/i, /tuna.*fillet/i, /cod.*fillet/i, /fish.*fillet/i, /\bsalmon\b/i, /\btuna\b/i, /\bcod\b/i],
  hot_dog_link: [/hot\s*dog/i, /frankfurter/i, /wiener/i, /bratwurst/i, /sausage.*link/i],
  club_sandwich: [/club.*sandwich/i, /turkey.*club/i],
  apple_generic: [/\bapple\b/i, /red.*delicious/i, /granny.*smith/i, /gala.*apple/i],
  banana_generic: [/\bbanana\b/i, /plantain/i],
  bread_slice: [/bread.*slice/i, /slice.*bread/i, /\btoast\b/i, /white.*bread/i, /wheat.*bread/i],
  egg_large: [/\begg\b/i, /large.*egg/i, /chicken.*egg/i],
  pizza_slice: [/\bpizza\b/i, /margherita/i, /pepperoni/i],
  chicken_breast: [/chicken.*breast/i, /grilled.*chicken/i],
  pasta_generic: [/\bpasta\b/i, /spaghetti/i, /linguine/i],
};

const STABLE_MACROS: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {
  fish_fillet_link: { calories: 206, protein: 28.2, carbs: 0, fat: 9.4 },
  hot_dog_link: { calories: 290, protein: 10.4, carbs: 2.3, fat: 26.8 },
  club_sandwich: { calories: 590, protein: 31, carbs: 39, fat: 36 },
  apple_generic: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  banana_generic: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  bread_slice: { calories: 79, protein: 2.3, carbs: 15, fat: 1.0 },
  egg_large: { calories: 70, protein: 6, carbs: 0.6, fat: 5 },
  pizza_slice: { calories: 285, protein: 12, carbs: 36, fat: 10 },
  chicken_breast: { calories: 198, protein: 37, carbs: 0, fat: 4 },
  pasta_generic: { calories: 157, protein: 5.8, carbs: 30.9, fat: 0.9 },
};

export function inferClassId(text: string): ClassificationResult {
  if (!text) return { classId: null, confidence: 0 };
  const t = text.toLowerCase().trim();
  for (const [classId, patterns] of Object.entries(FOOD_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(t)) {
        const confidence = pattern.source.includes('\\b') ? 0.9 : 0.7;
        return { classId, confidence, matchedPattern: pattern.source };
      }
    }
  }
  return { classId: null, confidence: 0 };
}

export function getGenericFallback(classId: string, name?: string) {
  const m = STABLE_MACROS[classId]; if (!m) return null;
  return {
    name: name || `${classId.replace(/_/g, ' ')} (generic)`,
    classId, source: 'generic', isGeneric: true, confidence: 0.5,
    nutrition: { per100g: { ...m, fiber: 0, sugar: 0, sodium: 0 } },
    calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat
  };
}