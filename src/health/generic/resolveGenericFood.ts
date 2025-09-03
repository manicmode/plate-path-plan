import generic from '@/data/generic_foods.json';

export type GenericFood = typeof generic[number];

export function resolveGenericFood(name: string): GenericFood | null {
  const q = name?.toLowerCase().trim();
  if (!q) return null;

  // exact slug/display match
  const direct = generic.find(g =>
    g.slug === q || g.display_name.toLowerCase() === q
  );
  if (direct) return direct;

  // alias / contains
  for (const g of generic) {
    if (g.aliases?.some(a => a.toLowerCase() === q)) return g;
    if (g.slug.includes(q) || q.includes(g.slug)) return g;
  }
  return null;
}