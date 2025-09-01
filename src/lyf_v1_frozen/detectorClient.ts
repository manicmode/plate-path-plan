export async function analyzeLyfV1(supabase: any, image_base64: string) {
  // Image size guard
  const imageData = image_base64.split(',')[1] || image_base64;
  const sizeKB = Math.round((imageData.length * 3 / 4) / 1024);
  
  if (sizeKB < 200) {
    console.warn('[LYF][v1] Image too small (~' + sizeKB + 'kB), may return empty results. Consider compressing to ~0.85 quality / 1000-1200px');
  }

  const { data, error } = await supabase.functions.invoke('meal-detector-v1', { body: { image_base64 }});
  if (error) return { items: [], _debug: { from: 'error', error } };
  const items = Array.isArray(data?.items) ? data.items : [];
  
  // Enhanced logging (even in prod for now)
  console.info('[LYF][v1] resp', { 
    from: data._debug?.from, 
    rawObjects: data._debug?.rawObjectsCount, 
    rawLabels: data._debug?.rawLabelsCount, 
    keptObjects: data._debug?.keptObjectsCount, 
    keptLabels: data._debug?.keptLabelsCount, 
    items: data.items?.map((i: any) => i.name) || [] 
  });
  
  return { items, _debug: data?._debug };
}