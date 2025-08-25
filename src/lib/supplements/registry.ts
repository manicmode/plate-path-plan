import { SupplementCatalogItem, SupplementTip } from '@/types/supplements';
import { SHOW_SUPP_EDU, PARTNER_ACME } from '@/lib/flags';

// Static imports - guaranteed to work at build time
import baseCatalog from '@/content/supplements/baseCatalog';
import baseTips from '@/content/supplements/baseTips';

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

// Local fallback (guaranteed tip) - never fails
const FALLBACK_TIPS: SupplementTip[] = [
  {
    id: 'fallback-creatine',
    title: 'Creatine Monohydrate',
    blurb: 'Backed by strong evidence for strength, power and training volume.',
    emoji: '⚡',
    productSlug: 'creatine-monohydrate',
    priority: 100,
    ctaEnabled: true
  },
  {
    id: 'fallback-omega3',
    title: 'Omega-3 Fish Oil',
    blurb: 'Supports heart health, brain function, and reduces inflammation.',
    emoji: '🐟',
    productSlug: 'omega-3',
    priority: 95,
    ctaEnabled: true
  }
];

export async function loadRegistry(): Promise<Registry> {
  console.info('[SuppEdu.registry] getTips start');
  try {
    if (!SHOW_SUPP_EDU) {
      return { catalog: {}, tips: FALLBACK_TIPS };
    }

    // Guaranteed fallback catalog
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

    // Start with base tips (static import cannot throw at runtime)
    console.info('[SuppEdu.registry] importing baseTips');
    let tips: SupplementTip[] = Array.isArray(baseTips) ? [...baseTips] : [];
    console.info('[SuppEdu.registry] baseTips length', Array.isArray(baseTips) ? baseTips.length : baseTips);

    // Merge base catalog if available
    if (Array.isArray(baseCatalog) && baseCatalog.length > 0) {
      catalog = Object.fromEntries(baseCatalog.map((c: SupplementCatalogItem) => [c.slug, c]));
    }

    // Optionally merge partner tips (never throw)
    if (PARTNER_ACME) {
      try {
        const mod = await import('@/content/partners/acme/tips.json');
        const partnerTips = Array.isArray(mod.default) ? mod.default : [];
        tips = [...tips, ...partnerTips];
      } catch (e) {
        console.warn('[SuppEdu.registry] partner import failed', e);
      }
    }

    // Normalize and guarantee CTAs default
    tips = tips.map(t => ({
      ...t,
      ctaEnabled: (t as any).ctaEnabled ?? !!t.productSlug
    }));

    // Filter by date validity
    tips = tips.filter(byDate);

    // De-dupe by id, cap to 10
    const seen = new Set<string>();
    const deduped = [];
    for (const t of tips) {
      const key = t.id ?? `${t.title}-${t.productSlug ?? 'x'}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push({ ...t, id: key });
      if (deduped.length >= 10) break;
    }

    const finalTips = deduped.length ? deduped : FALLBACK_TIPS;
    console.info('[SuppEdu.registry] getTips returning length', finalTips?.length);
    return { catalog, tips: finalTips };
  } catch (err) {
    console.error('[SuppEdu.registry] getTips threw', err);
    console.error('[SuppEdu.registry] hard failure', err);
    return { 
      catalog: {
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
      }, 
      tips: FALLBACK_TIPS 
    };
  }
}