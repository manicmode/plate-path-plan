import { canonicalizeName, dedupe, qualityFilter, hardReject, conflictClean, CANON_VEG } from './canonicalize';
import { foodSearchCandidates } from './foodSearch';
import { gptDetectItems } from './gptDetect';

export type Detected = { name: string; score?: number; cats?: string[]; src: 'gpt'|'vision'|'search' };

type Opts = {
  featureBackend?: 'gpt-first' | 'vision-first' | 'vision-only';
  visionLabels?: string[];      // optional: pass Vision nouns you already have
};

// imageBase64 = "data:image/jpeg;base64,...."
export async function detectItemsEnsemble(imageBase64: string, opts: Opts = {}): Promise<Detected[]> {
  const backend = opts.featureBackend ?? 'gpt-first';
  const results: Detected[] = [];

  // 1) GPT-first (best quality)
  if (backend === 'gpt-first') {
    const gpt = await gptDetectItems(imageBase64, 8000);
    for (const g of gpt) {
      const name = canonicalizeName(g.name);
      results.push({ name, score: g.confidence ?? 0.8, src: 'gpt' });
    }
  }

  // 2) Vision nouns (veggie booster) – only add if not already present
  const labels = (opts.visionLabels ?? []).map(canonicalizeName);
  for (const n of labels) {
    if (CANON_VEG.has(n) && !results.some(r => r.name === n)) {
      results.push({ name: n, score: 0.5, src: 'vision' });
    }
  }

  // 3) Resolve to good nutrition names via search (but don't let SKUs rename our items)
  //    We only *look up* to get a better score/category signal.
  const withSearch: Detected[] = [];
  for (const r of results) {
    const hits = await foodSearchCandidates(r.name, 3);
    const top = hits[0];
    withSearch.push({
      ...r,
      score: Math.max(r.score ?? 0, Number(top?.score ?? 0)),
      cats: top?.cats,
      // name stays canonicalized; we do not replace it with "Crunchy Salmon Walmart"
    });
  }

  // 4) Hard reject + dedupe + quality filtering + conflict rules
  let final = dedupe(withSearch) as Detected[];
  final = hardReject(final) as Detected[];
  final = qualityFilter(final) as Detected[];
  final = conflictClean(final) as Detected[];

  // 5) Boost veggies if GPT missed them but found proteins/carbs
  const hasProteinOrCarb = final.some(f => !CANON_VEG.has(f.name));
  const hasVeggie = final.some(f => CANON_VEG.has(f.name));
  
  if (backend === 'gpt-first' && hasProteinOrCarb && !hasVeggie && labels.length) {
    const veggieLabels = labels.filter(n => CANON_VEG.has(n)).slice(0, 2);
    for (const n of veggieLabels) {
      if (!final.some(f => f.name === n)) {
        final.push({ name: n, score: 0.5, src: 'vision' });
      }
    }
  }

  // 6) Cap to max 6 items, keep highest confidence
  final = final
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 6);

  // If GPT timed out (or returned nothing) and backend is vision-first/only, add a tiny search assist:
  if (!final.length && (backend === 'vision-first' || backend === 'vision-only') && labels.length) {
    // search top 1 for each label; keep only if protein/starch & decent score
    const extras: Detected[] = [];
    for (const n of labels) {
      const hits = await foodSearchCandidates(n, 1);
      const h = hits[0];
      if (h && (h.score ?? 0) >= 0.62) extras.push({ name: n, score: h.score, cats: h.cats, src: 'search' });
    }
    final = qualityFilter(dedupe(extras)) as Detected[];
  }

  console.info('[DETECTION] backend=' + backend + ' (ensemble), items=' + JSON.stringify(final.map(f => f.name)));
  return final;
}
