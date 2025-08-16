/**
 * Shared types and utilities for Arena section filtering
 */
export type ArenaSection = 'combined' | 'nutrition' | 'exercise' | 'recovery';

export const isArenaSection = (x: string): x is ArenaSection =>
  ['combined', 'nutrition', 'exercise', 'recovery'].includes(x);

/**
 * Filter items by category based on arena section
 */
export function filterByArenaSection<T extends { category?: string }>(
  items: T[],
  section: ArenaSection
): T[] {
  if (section === 'combined') return items;
  
  // Special case for recovery domain - includes multiple categories
  if (section === 'recovery') {
    return items.filter(item => 
      ['meditation', 'breathing', 'yoga', 'sleep', 'thermotherapy', 'recovery'].includes(
        (item.category ?? '').toLowerCase()
      )
    );
  }
  
  return items.filter(item => (item.category ?? '').toLowerCase() === section);
}