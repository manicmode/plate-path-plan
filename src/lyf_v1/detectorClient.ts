export async function analyzeLyfV1(supabase: any, image_base64: string) {
  const { data, error } = await supabase.functions.invoke('meal-detector-v1', { body: { image_base64 }});
  if (error) return { items: [], _debug: { from: 'error', error } };
  const items = Array.isArray(data?.items) ? data.items : [];
  console.info('[LYF] endpoint', '/functions/v1/meal-detector-v1');
  console.info('[LYF] items', items.map((i: any) => i?.name).filter(Boolean));
  return { items, _debug: data?._debug };
}