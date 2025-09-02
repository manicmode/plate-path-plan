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

  try {
    const { data, error } = await supabase.functions.invoke('meal-detector-v1', {
      body: { image_base64, debug: !!(opts?.debug ?? import.meta.env.DEV) }
    });
    
    if (error) {
      console.error('[LYF][v1] Edge error:', error);
      return { items: [], error: 'detector_unavailable', _debug: { from: 'error', error } };
    }

    // Check for server-side errors
    if (data?._debug?.from === 'error' || data?.error) {
      console.warn('[LYF][v1] Server returned error:', data?.error || data?._debug?.message);
      return { items: [], error: 'detector_unavailable', _debug: data?._debug || { from: 'error' } };
    }

    // Robust normalizer - handle both string[] and object[] responses
    const raw = Array.isArray(data?.items) ? data.items : [];
    let items: Array<{ name: string; source: 'object'|'label'; confidence?: number; score?: number }> = [];

    if (raw.length > 0) {
      if (typeof raw[0] === 'string') {
        // Legacy string array response
        const from = data?._debug?.from?.includes('objects') ? 'object' : 'label';
        items = raw.map((name: string) => ({ 
          name, 
          source: from as 'object'|'label', 
          confidence: 0.7, 
          score: 0.7 
        }));
      } else if (typeof raw[0] === 'object' && raw[0].name) {
        // New object array response
        items = raw.map((item: any) => ({
          name: item.name,
          source: item.source || 'label',
          confidence: item.confidence || item.score || 0.7,
          score: item.score || item.confidence || 0.7
        }));
      }
    }

    // If no items found, still return successfully but with empty array
    if (items.length === 0) {
      console.info('[LYF][v1] No items detected');
      return { items: [], error: 'no_items_detected', _debug: data?._debug };
    }

    // Enhanced debug logging when enabled
    if (import.meta.env.DEV || opts?.debug) {
      const debugInfo = {
        from: data?._debug?.from,
        rawObjects: data?._debug?.rawObjectsCount,
        rawLabels: data?._debug?.rawLabelsCount,
        keptObjects: data?._debug?.keptObjectsCount,
        keptLabels: data?._debug?.keptLabelsCount,
        specificObjects: data?._debug?.specificObjectsCount,
        specificLabels: data?._debug?.specificLabelsCount,
        itemsPreview: items.slice(0, 5).map(i => `${i.name}:${i.source}`)
      };
      console.info('[LYF][v1] resp', debugInfo);
    }

    return { items, _debug: data?._debug };
    
  } catch (networkError) {
    console.error('[LYF][v1] Network error:', networkError);
    return { 
      items: [], 
      error: 'detector_unavailable', 
      _debug: { from: 'error', error: String(networkError) } 
    };
  }
}