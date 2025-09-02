export type Item = { name: string; score?: number; cats?: string[]; src?: string };

const SYNONYMS: Record<string, string> = {
  'salmon cooked walmart': 'salmon',
  'crunchy cooked salmon': 'salmon',
  'sushi cooked tuna & aburi salmon': 'salmon',
  'salmon ahumado en lonchas': 'smoked salmon',
  'lemon juice': 'lemon',
  'vegetarian fish slice': 'veg fish slice',
};

export const CANON_VEG = new Set([
  'asparagus', 'lemon', 'avocado', 'broccoli', 'spinach',
  'tomato', 'cucumber', 'carrot', 'pepper', 'onion', 'garlic',
]);

export function canonicalizeName(name: string) {
  const n = (name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  return SYNONYMS[n] ?? n;
}

export function dedupe(items: Item[]) {
  const byKey = new Map<string, Item & { score: number }>();
  for (const it of items) {
    const key = canonicalizeName(it.name);
    const score = it.score ?? 1;
    const cur = byKey.get(key);
    if (!cur || score > cur.score) byKey.set(key, { ...it, name: key, score });
  }
  return [...byKey.values()];
}

// Category/quality filter: keep veggies a bit looser, proteins/starches stricter.
export function qualityFilter(items: Item[]) {
  return items.filter((m) => {
    const isVeg = CANON_VEG.has(m.name);
    const score = m.score ?? 0;
    if (isVeg) return score >= 0.35;      // permissive for veggies
    return score >= 0.62;                 // stricter for proteins/starches
  });
}

// Small "conflict" fix: if salmon exists, drop weird veg-fish slice unless GPT insisted
export function conflictClean(items: Item[]) {
  const hasSalmon = items.some(i => i.name === 'salmon' || i.name === 'smoked salmon');
  if (!hasSalmon) return items;
  return items.filter(i => i.name !== 'veg fish slice');
}
