type Src = 'object' | 'label';

function asItemObjects(data: any): Array<{ name: string; source: Src; confidence: number; score: number }> {
  const dbgFrom: Src = data?._debug?.from === 'objects' ? 'object' : 'label';
  const raw = Array.isArray(data?.items) ? data.items : [];

  // Case A: strings → wrap with {name, source}
  if (raw.length && typeof raw[0] === 'string') {
    return raw.map((name: string) => ({
      name,
      source: dbgFrom,
      confidence: 0.7,
      score: 0.7,
    }));
  }

  // Case B: objects with name → ensure source exists
  if (raw.length && typeof raw[0] === 'object') {
    return raw
      .filter((o: any) => !!o?.name)
      .map((o: any) => ({
        name: String(o.name),
        source: (o.source === 'object' || o.source === 'label') ? o.source : dbgFrom,
        confidence: typeof o.confidence === 'number' ? o.confidence : (typeof o.score === 'number' ? o.score : 0.7),
        score: typeof o.score === 'number' ? o.score : (typeof o.confidence === 'number' ? o.confidence : 0.7),
      }));
  }

  return [];
}

export async function analyzeLyfV1(supabase: any, image_base64: string) {
  // Image size guard
  const imageData = image_base64.split(',')[1] || image_base64;
  const sizeKB = Math.round((imageData.length * 3 / 4) / 1024);
  
  if (sizeKB < 200) {
    console.warn('[LYF][v1] Image too small (~' + sizeKB + 'kB), may return empty results. Consider compressing to ~0.85 quality / 1000-1200px');
  }

  const { data, error } = await supabase.functions.invoke('meal-detector-v1', {
    body: { image_base64 },
  });

  if (error) {
    console.warn('[LYF][v1] detector error', error);
    return { items: [], _debug: { from: 'error', error } };
  }

  const items = asItemObjects(data);

  // Helpful telemetry while we stabilize
  console.info('[LYF][v1] resp', {
    from: data?._debug?.from,
    rawObjects: data?._debug?.rawObjectsCount,
    rawLabels: data?._debug?.rawLabelsCount,
    keptObjects: data?._debug?.keptObjectsCount,
    keptLabels: data?._debug?.keptLabelsCount,
    itemsPreview: items.map(i => `${i.name}:${i.source}`),
  });

  return { items, _debug: data?._debug };
}