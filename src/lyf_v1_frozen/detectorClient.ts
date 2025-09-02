type Src = 'object' | 'label';

function asItemObjects(data: any): Array<{ name: string; source: Src; confidence: number; score: number }> {
  const dbgFrom: Src = data?._debug?.from === 'objects' ? 'object' : 'label';
  const raw = Array.isArray(data?.items) ? data.items : [];

  // Normalizer hardening - coerce to proper format
  if (raw.length && typeof raw[0] === 'string') {
    return raw.map((name: string) => ({
      name: String(name || ''),
      source: dbgFrom,
      confidence: 0.7,
      score: 0.7,
    }));
  }

  // Handle partial objects and normalize
  if (raw.length && typeof raw[0] === 'object') {
    return raw
      .filter((o: any) => o && (o.name || o.description))
      .map((o: any) => ({
        name: String(o.name || o.description || ''),
        source: (o.source === 'object' || o.source === 'label') ? o.source : dbgFrom,
        confidence: typeof o.confidence === 'number' ? o.confidence : (typeof o.score === 'number' ? o.score : 0.7),
        score: typeof o.score === 'number' ? o.score : (typeof o.confidence === 'number' ? o.confidence : 0.7),
      }));
  }

  return [];
}

export async function analyzeLyfV1(supabase: any, image_base64: string, opts?: { debug?: boolean }) {
  const imageData = image_base64.split(',')[1] || image_base64;
  const sizeKB = Math.round((imageData.length * 3 / 4) / 1024);
  if (sizeKB < 200) console.warn('[LYF][v1] image small ~' + sizeKB + 'kB');

  const { data, error } = await supabase.functions.invoke('meal-detector-v1', {
    body: { image_base64, debug: !!(opts?.debug ?? import.meta.env.DEV) }
  });
  if (error) {
    console.error('[LYF][v1] Edge error:', error);
    return { items: [], _debug: { from: 'error', error } };
  }

  const raw = Array.isArray(data?.items) ? data.items : [];
  let items: Array<{ name: string; source: 'object'|'label'; confidence?: number; score?: number }> = [];

  if (raw.length > 0) {
    if (typeof raw[0] === 'string') {
      const from = data?._debug?.from === 'objects' ? 'object' : 'label';
      items = raw.map((name: string) => ({ name, source: from, confidence: 0.7, score: 0.7 }));
    } else {
      items = raw as any[];
    }
  }

  console.info('[LYF][v1] resp', {
    from: data?._debug?.from,
    rawObjects: data?._debug?.rawObjectsCount,
    rawLabels: data?._debug?.rawLabelsCount,
    keptObjects: data?._debug?.keptObjectsCount,
    keptLabels: data?._debug?.keptLabelsCount,
    items: items.map(i => `${i.name}:${i.source}`)
  });

  return { items, _debug: data?._debug };
}