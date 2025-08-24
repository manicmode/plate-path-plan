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

// Bulletproof fallback tips that are guaranteed to always be available
const BULLETPROOF_FALLBACK_TIPS: SupplementTip[] = [
  { 
    id: 'creatine-fallback', 
    title: 'Creatine Monohydrate', 
    blurb: 'Supports strength and power output. One of the most researched supplements for athletic performance.',
    productSlug: 'creatine-monohydrate',
    emoji: '💪',
    priority: 100
  },
  { 
    id: 'omega3-fallback', 
    title: 'Omega-3 Fish Oil', 
    blurb: 'Supports heart health and brain function. Essential fatty acids your body cannot produce naturally.',
    productSlug: 'omega-3',
    emoji: '🐟',
    priority: 95
  },
];

export async function loadRegistry(): Promise<Registry> {
  // Always start with guaranteed fallback catalog
  let catalog: Record<string, SupplementCatalogItem> = {
    'creatine-monohydrate': {
      slug: 'creatine-monohydrate',
      name: 'Creatine Monohydrate',
      shortDesc: 'Supports muscle strength and power',
      defaultPrice: 24.99
    },
    'omega-3': {
      slug: 'omega-3',
      name: 'Omega-3 Fish Oil',
      shortDesc: 'Supports heart and brain health',
      defaultPrice: 19.99
    }
  };
  let tips: SupplementTip[] = [...BULLETPROOF_FALLBACK_TIPS];
  let baseTipsData: SupplementTip[] = [];
  let partnerTips: SupplementTip[] = [];
  
  try {
    // Try to load base catalog and tips
    const baseCatalogModule = await import('@/content/supplements/baseCatalog');
    const baseTipsModule = await import('@/content/supplements/baseTips');
    
    const baseCatalogData = baseCatalogModule.default || [];
    const baseTipsData = baseTipsModule.default || [];
    
    // Merge with base data if available
    if (baseCatalogData.length > 0) {
      catalog = Object.fromEntries(baseCatalogData.map((c: SupplementCatalogItem) => [c.slug, c]));
    }
    
    if (baseTipsData.length > 0) {
      const filteredTips = baseTipsData.filter(byDate);
      if (filteredTips.length > 0) {
        tips = filteredTips;
      }
    }
  } catch (error) {
    console.warn('[Registry] Base import failed, using fallbacks:', error);
    // Keep existing fallback data
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
        partnerTips.push(t);
        tips.push(t);
      }
    } catch (error) {
      console.warn('partner tips import failed:', error);
      // Silently ignore partner content loading failures
    }
  }

  // Map tips to include ctaEnabled flag instead of dropping them
  const knownSlugs = new Set(Object.keys(catalog));
  const allTips = [...tips];
  const tipsWithCta = allTips.map(t => {
    const hasValidSlug = !!t.productSlug && knownSlugs.has(t.productSlug);
    return { ...t, ctaEnabled: hasValidSlug };
  });
  
  // Deduplicate tips by (productSlug,id) and sort by priority desc
  const seen = new Set<string>();
  const finalTips = tipsWithCta.filter(t => {
    const k = `${t.productSlug}:${t.id}`;
    if (seen.has(k)) return false;
    seen.add(k); 
    return true;
  })
  .filter(byDate)
  .sort((a, b) => (b.priority || 0) - (a.priority || 0))
  .slice(0, 10); // Keep max 10 tips for performance

  // Ensure we ALWAYS return at least 2 tips minimum
  if (finalTips.length === 0) {
    const hardFallback = BULLETPROOF_FALLBACK_TIPS.map(t => ({ ...t, ctaEnabled: true }));
    return { catalog, tips: hardFallback };
  }

  return { catalog, tips: finalTips };
}