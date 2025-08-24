import { SupplementCatalogItem, SupplementTip } from '@/types/supplements';
import baseCatalog from '@/content/supplements/baseCatalog';
import baseTips from '@/content/supplements/baseTips';
import { flag } from '@/lib/flags';

export type Registry = {
  catalog: Record<string, SupplementCatalogItem>; // keyed by slug
  tips: SupplementTip[];
};

const byDate = (t: SupplementTip): boolean => {
  const now = Date.now();
  if (t.validFrom && Date.parse(t.validFrom) > now) return false;
  if (t.validTo && Date.parse(t.validTo) < now) return false;
  return true;
};

export async function loadRegistry(): Promise<Registry> {
  // Start with base
  const catalog: Record<string, SupplementCatalogItem> =
    Object.fromEntries(baseCatalog.map(c => [c.slug, c]));
  let tips: SupplementTip[] = baseTips.filter(byDate);

  // Dynamically layer partner content if feature flags permit
  // (non-blocking; wrap in try/catch so failures don't break UI)
  const vendors = ['acme']; // extend later
  for (const v of vendors) {
    try {
      // gate by flag e.g., NEXT_PUBLIC_PARTNER_ACME=1
      if (!flag(`PARTNER_${v.toUpperCase()}`)) continue;
      
      const { default: partnerCatalog } = await import(`@/content/partners/${v}/catalog.json`);
      const { default: partnerTips } = await import(`@/content/partners/${v}/tips.json`);

      for (const item of partnerCatalog as SupplementCatalogItem[]) {
        catalog[item.slug] = { ...catalog[item.slug], ...item }; // override/extend
      }

      for (const t of partnerTips as SupplementTip[]) {
        if (t.sponsor?.featureFlag && !flag(t.sponsor.featureFlag)) continue;
        if (!catalog[t.productSlug]) continue; // require known product
        tips.push(t);
      }
    } catch {
      // Silently ignore partner content loading failures
    }
  }

  // Deduplicate tips by (productSlug,id) and sort by priority desc
  const seen = new Set<string>();
  tips = tips.filter(t => {
    const k = `${t.productSlug}:${t.id}`;
    if (seen.has(k)) return false;
    seen.add(k); 
    return true;
  })
  .filter(byDate)
  .sort((a, b) => (b.priority || 0) - (a.priority || 0))
  .slice(0, 10); // Keep max 10 tips for performance

  return { catalog, tips };
}