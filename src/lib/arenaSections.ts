/**
 * Shared types and utilities for Arena section filtering
 */
export type ArenaSection = 'combined' | 'nutrition' | 'exercise' | 'recovery';

export const isArenaSection = (x: string): x is ArenaSection =>
  ['combined', 'nutrition', 'exercise', 'recovery'].includes(x);

/**
 * Normalize text for keyword matching
 */
export function normalize(text?: string): string {
  return (text ?? '').toLowerCase().trim();
}

/**
 * Infer arena section from text content using keyword matching
 */
export function inferSectionFromText(text?: string): ArenaSection | null {
  const normalized = normalize(text);
  
  // Nutrition keywords
  if (/\b(meal|food|calorie|nutrition|hydration|water|supplement|diet|eat|drink|protein|carb|fat|vitamin)\b/.test(normalized)) {
    return 'nutrition';
  }
  
  // Exercise keywords  
  if (/\b(workout|exercise|steps|run|strength|cardio|fitness|gym|training|sport|lift|bike|swim)\b/.test(normalized)) {
    return 'exercise';
  }
  
  // Recovery keywords
  if (/\b(sleep|recovery|meditation|breathe|breathing|yoga|sauna|cold|ice|thermo|rest|relax|mindful|zen)\b/.test(normalized)) {
    return 'recovery';
  }
  
  return null;
}

/**
 * Map award/trophy data to arena section
 */
export function mapAwardToSection(award: any): ArenaSection {
  // Try category field first
  if (award.category) {
    const section = inferSectionFromText(award.category);
    if (section) return section;
  }
  
  // Try title/name fields
  const titleText = award.title || award.name;
  if (titleText) {
    const section = inferSectionFromText(titleText);
    if (section) return section;
  }
  
  // Try source/type fields
  const sourceText = award.source || award.type;
  if (sourceText) {
    const section = inferSectionFromText(sourceText);
    if (section) return section;
  }
  
  // Fallback to nutrition (least surprising for health app)
  return 'nutrition';
}

/**
 * Map champion data to arena section
 */
export function mapChampionToSection(champion: any): ArenaSection {
  // Try category field first
  if (champion.category) {
    const section = inferSectionFromText(champion.category);
    if (section) return section;
  }
  
  // Try title/award/reason fields
  const titleText = champion.title || champion.award || champion.reason || champion.achievement;
  if (titleText) {
    const section = inferSectionFromText(titleText);
    if (section) return section;
  }
  
  // Try source field
  if (champion.source) {
    const section = inferSectionFromText(champion.source);
    if (section) return section;
  }
  
  // Fallback to nutrition
  return 'nutrition';
}

/**
 * Check if an item matches the active section
 */
export function sectionMatches(activeSection: ArenaSection, itemSection: ArenaSection): boolean {
  return activeSection === 'combined' || activeSection === itemSection;
}

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