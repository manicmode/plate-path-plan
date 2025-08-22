// Enhanced display name utility for proper name casing
export function displayName(raw?: string): string {
  if (!raw) return "";
  const s = raw.trim().toLowerCase();

  // Title-case words incl. apostrophes/hyphens (O'Neil, Jean-Luc)
  let out = s.replace(
    /([\p{L}\p{M}]+(?:[''\-][\p{L}\p{M}]+)*)/gu,
    w => w.replace(/^\p{L}/u, c => c.toUpperCase())
  );

  // Common niceties (optional)
  out = out.replace(/\b(mc)(\p{L})/giu, (_, mc, c) => mc + c.toUpperCase());   // McDonald
  out = out.replace(/\b(o[''])(\p{L})/giu, (_, o, c) => o + c.toUpperCase());  // O'Neil

  return out;
}