// normalizeItems.ts - Canonicalization & de-duplication for food items
const SYNONYMS: Record<string, string> = {
  'salmon cooked walmart': 'salmon',
  'crunchy cooked salmon': 'salmon',
  'sushi cooked tuna & aburi salmon': 'salmon',
  'salmon ahumado en lonchas': 'smoked salmon',
  'fish fingers': 'fish fingers',
  'vegetarian fish slice': 'veg fish slice',
  // veggies
  'lemon juice': 'lemon',
};

const CANON_VEG = new Set([
  'asparagus', 'lemon', 'avocado', 'broccoli', 'spinach', 
  'tomato', 'cucumber', 'carrot', 'pepper', 'onion', 'garlic'
]);

export function canonicalizeName(name: string): string {
  const n = name.trim().toLowerCase();
  return SYNONYMS[n] ?? n.replace(/\s+/g, ' ');
}

export function dedupe(items: { name: string; score?: number; cats?: string[] }[]) {
  const byKey = new Map<string, { name: string; score: number; cats?: string[] }>();
  
  for (const it of items) {
    const key = canonicalizeName(it.name);
    const score = it.score ?? 1;
    const cur = byKey.get(key);
    
    if (!cur || score > cur.score) {
      byKey.set(key, { ...it, name: key, score });
    }
  }
  
  return [...byKey.values()];
}

export function filterByCategory(items: { name: string; score?: number; cats?: string[] }[]) {
  return items.filter(m => {
    const isVeg = CANON_VEG.has(m.name);
    if (isVeg) return true;
    const ok = (m.score ?? 0) >= 0.62;
    return ok;
  });
}