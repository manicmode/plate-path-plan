/**
 * Generate stable hash for meal set identification
 * Uses sorted names and grams to prevent duplicates with order changes
 */
export function hashMealSet(items: Array<{ name: string; grams?: number }>): string {
  // Create stable key from sorted item data
  const key = items
    .map(item => `${item.name}|${item.grams || 100}`)
    .sort()
    .join('::');
  
  // Simple hash for consistency
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `set-${Math.abs(hash).toString(36)}`;
}