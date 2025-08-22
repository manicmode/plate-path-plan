// Robust Title/Name case for human names.
// - Lowercases the string first
// - Uppercases the first letter of each word
// - Works with Unicode letters
export function nameCase(input?: string | null): string {
  if (!input) return "";
  const s = input.trim().toLocaleLowerCase(); // normalize
  // Capitalize first letter of each word (space, start, hyphen, apostrophe)
  return s.replace(/\b[\p{L}\p{M}]/gu, ch => ch.toLocaleUpperCase());
}