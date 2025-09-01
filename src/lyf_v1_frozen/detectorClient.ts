export async function analyzeLyfV1(supabase: any, image_base64: string) {
  const { data, error } = await supabase.functions.invoke('meal-detector-v1', { body: { image_base64 }});
  if (error) return { items: [], _debug: { from: 'error', error } };
  const items = Array.isArray(data?.items) ? data.items : [];
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] endpoint', '/functions/v1/meal-detector-v1');
    console.info('[LYF][v1] chosen', data?._debug?.from, 'count=', data?.items?.length ?? 0, 'items=', (data?.items ?? []).map(i => i.name));
  }
  
  return { items, _debug: data?._debug };
}