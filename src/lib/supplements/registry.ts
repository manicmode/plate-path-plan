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

// Fallback tips to ensure the card always has content
const fallbackBaseTips: SupplementTip[] = [
  { 
    id: 'creatine', 
    title: 'Creatine Monohydrate', 
    blurb: 'Supports strength and power.', 
    productSlug: 'creatine-monohydrate',
    emoji: '💪',
    priority: 100
  },
];

export async function loadRegistry(): Promise<Registry> {
  // Start with base - ensure we always have fallback tips
  let catalog: Record<string, SupplementCatalogItem> = {};
  let tips: SupplementTip[] = [];
  
  try {
    // Load base catalog and tips
    const baseCatalogData = (await import('@/content/supplements/baseCatalog')).default || [];
    const baseTipsData = (await import('@/content/supplements/baseTips')).default || [];
    
    catalog = Object.fromEntries(baseCatalogData.map((c: SupplementCatalogItem) => [c.slug, c]));
    tips = baseTipsData.filter(byDate);
  } catch (error) {
    console.error('baseTips import failed:', error);
    // Ensure fallback catalog item exists for the fallback tip
    const fallbackCatalogItem: SupplementCatalogItem = {
      slug: 'creatine-monohydrate',
      name: 'Creatine Monohydrate',
      shortDesc: 'Supports muscle strength and power',
      defaultPrice: 24.99
    };
    catalog = { 'creatine-monohydrate': fallbackCatalogItem };
    tips = fallbackBaseTips;
  }

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
    } catch (error) {
      console.warn('partner tips import failed:', error);
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

  // Ensure we always return at least the base tips
  if (tips.length === 0) {
    // Final fallback - use hardcoded fallback tips if everything else fails
    const fallbackCatalogItem: SupplementCatalogItem = {
      slug: 'creatine-monohydrate',
      name: 'Creatine Monohydrate',
      shortDesc: 'Supports muscle strength and power',
      defaultPrice: 24.99
    };
    if (!catalog['creatine-monohydrate']) {
      catalog['creatine-monohydrate'] = fallbackCatalogItem;
    }
    tips = fallbackBaseTips;
  }

  return { catalog, tips };
}