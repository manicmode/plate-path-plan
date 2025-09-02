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

export async function analyzeLyfV1(supabase: any, image_base64: string) {
  // Image size guard
  const imageData = image_base64.split(',')[1] || image_base64;
  const sizeKB = Math.round((imageData.length * 3 / 4) / 1024);
  
  if (sizeKB < 200) {
    console.warn('[LYF][v1] Image too small (~' + sizeKB + 'kB), may return empty results. Consider compressing to ~0.85 quality / 1000-1200px');
  }

  // Add debug flag for dev builds
  const debugMode = import.meta.env.DEV && import.meta.env.VITE_LYF_V1_DEBUG !== 'false';
  
  const startTime = performance.now();

  // Add 12s timeout with AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const { data, error } = await supabase.functions.invoke('meal-detector-v1', {
      body: { image_base64, debug: debugMode },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (error) {
      console.warn('[LYF][v1] detector error', error);
      return { items: [], _debug: { from: 'error', error } };
    }

    const detectMs = Math.round(performance.now() - startTime);
    const items = asItemObjects(data);

    // Concise debug logging for dev builds
    if (import.meta.env.DEV) {
      console.info(`[LYF][v1] raw: from=${data?._debug?.from} rawObjects=${data?._debug?.rawObjectsCount} rawLabels=${data?._debug?.rawLabelsCount}`);
      console.info('[LYF][v1] keep:', items.map(i => i.name));
      
      if (debugMode && data?._debug?.dropped) {
        console.info('[LYF][v1] drop:', data._debug.dropped);
      }
    }

    // Emit metrics
    if (typeof window !== 'undefined' && window.console?.table) {
      console.table([{
        'detect_ms': detectMs,
        'items_kept': items.length,
        'image_kb': sizeKB
      }]);
    }

    return { items, _debug: data?._debug };
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.warn('[LYF][v1] Detection timed out after 12s');
      throw new Error('Detection timed out. Please try again or use a smaller image.');
    }
    
    throw error;
  }
}