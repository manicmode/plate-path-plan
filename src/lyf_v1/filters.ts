const NEG = /\b(plate|dish|bowl|cutlery|fork|spoon|knife|napkin|logo|brand|pack|sleeve|kit|box|package|message|screen|monitor)\b/i;
export function looksFoodish(s: string) {
  const t = (s||'').toLowerCase().trim();
  return t.length > 2 && !NEG.test(t);
}
export function rankSource(a: any, b: any) {
  const w = (s: string) => s==='object' ? 2 : 1;
  return (w(b.source||'label') - w(a.source||'label')) || ((b.confidence||0) - (a.confidence||0));
}