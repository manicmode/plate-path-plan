export async function detectFoodVisionV1(supabase: any, base64: string) {
  const { data, error } = await supabase.functions.invoke('meal-detector-v1', { 
    body: { image_base64: base64 } 
  });
  
  if (error) throw error;
  
  return { 
    items: data?.items ?? [], 
    _debug: data?._debug ?? {} 
  };
}

// Food filtering - keep existing NEG list but do NOT drop nouns extracted by edge
const NEG = /\b(plate|dish|bowl|cutlery|fork|spoon|knife|napkin|logo|brand|pack|sleeve|kit|box|package|message|screen|monitor)\b/i;

export function filterFoodish(items: string[]): string[] {
  return items.filter(item => {
    const t = (item || '').toLowerCase().trim();
    return t.length > 2 && !NEG.test(t);
  });
}
