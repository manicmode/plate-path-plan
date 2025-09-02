/**
 * Detection Filters - Post-canonicalization filtering
 * Citrus throttling and additional quality control
 */

interface FilterableItem {
  name: string;
  confidence: number;
  category?: string;
  portion_hint?: string | null;
}

// Citrus throttling guard
export function throttleCitrus(items: FilterableItem[]): FilterableItem[] {
  const citrusItems = items.filter(item => 
    ['lemon', 'lime'].includes(item.name.toLowerCase())
  );
  
  if (citrusItems.length <= 1) return items;
  
  // More than one citrus - check confidence gap
  const sortedCitrus = citrusItems.sort((a, b) => b.confidence - a.confidence);
  const best = sortedCitrus[0];
  const second = sortedCitrus[1];
  
  // If confidence gap > 0.2, keep both, otherwise drop the weaker ones
  const confidenceGap = best.confidence - second.confidence;
  
  if (confidenceGap <= 0.2) {
    // Keep only the best citrus
    const itemsToKeep = new Set([best]);
    const filtered = items.filter(item => {
      if (['lemon', 'lime'].includes(item.name.toLowerCase())) {
        return itemsToKeep.has(item);
      }
      return true;
    });
    
    const droppedCount = citrusItems.length - 1;
    if (droppedCount > 0) {
      console.info('[FILTER][citrus_throttle]', `dropped=${droppedCount}`, `kept=${best.name}`);
    }
    
    return filtered;
  }
  
  return items;
}

// Additional quality filters can be added here
export function applyQualityFilters(items: FilterableItem[]): FilterableItem[] {
  // Apply citrus throttling
  let filtered = throttleCitrus(items);
  
  // Future: Add other quality filters here
  
  return filtered;
}
