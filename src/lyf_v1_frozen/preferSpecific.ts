/**
 * Prefers specific foods over generic ones and handles advanced deduplication
 */

interface Item {
  name: string;
  canonicalName?: string;
  source?: 'object' | 'label';
  confidence?: number;
  score?: number;
}

// Map specific foods to their generic counterparts
const SPECIFICITY: Record<string, string[]> = {
  salmon: ['fish', 'fish product', 'white fish', 'fillet', 'seafood'],
  asparagus: ['vegetable', 'greens', 'green vegetable'],
  tomato: ['vegetable', 'produce'],
  'cherry tomato': ['vegetable', 'produce', 'tomato'],
  lemon: ['citrus', 'fruit'],
  lime: ['citrus', 'fruit'],
  chicken: ['poultry', 'meat', 'protein'],
  beef: ['meat', 'protein'],
  pork: ['meat', 'protein'],
};

// Simple string similarity for near-duplicate detection
function similarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const setA = new Set(normalize(a).split(' '));
  const setB = new Set(normalize(b).split(' '));
  
  let intersection = 0;
  setA.forEach(word => {
    if (setB.has(word)) intersection++;
  });
  
  return intersection / Math.max(setA.size, setB.size, 1);
}

export function preferSpecific(items: Item[]): Item[] {
  if (!items?.length) return [];
  
  // Step 1: Get all canonical names present
  const canonicalNames = new Set(
    items.map(item => (item.canonicalName || item.name).toLowerCase())
  );
  
  // Step 2: Filter out generics that have specific counterparts
  const filtered = items.filter(item => {
    const itemName = (item.canonicalName || item.name).toLowerCase();
    
    // Check if this generic item should be dropped due to a specific being present
    for (const [specific, generics] of Object.entries(SPECIFICITY)) {
      if (canonicalNames.has(specific) && generics.includes(itemName)) {
        return false; // Drop this generic
      }
    }
    
    return true;
  });
  
  // Step 3: Handle near-duplicates by similarity
  const deduplicated: Item[] = [];
  
  for (const item of filtered) {
    const itemName = (item.canonicalName || item.name).toLowerCase();
    
    // Check if we already have a very similar item
    const isDuplicate = deduplicated.some(existing => {
      const existingName = (existing.canonicalName || existing.name).toLowerCase();
      
      // If names are very similar (>= 0.85), keep the better one
      if (similarity(itemName, existingName) >= 0.85) {
        // Prefer objects over labels, then higher confidence
        const itemSource = item.source || 'label';
        const existingSource = existing.source || 'label';
        const itemConf = item.confidence || item.score || 0;
        const existingConf = existing.confidence || existing.score || 0;
        
        if (itemSource === 'object' && existingSource === 'label') {
          // Replace existing with this object
          const index = deduplicated.indexOf(existing);
          deduplicated[index] = item;
        } else if (itemSource === existingSource && itemConf > existingConf) {
          // Replace with higher confidence
          const index = deduplicated.indexOf(existing);
          deduplicated[index] = item;
        }
        
        return true; // It's a duplicate, don't add again
      }
      
      return false;
    });
    
    if (!isDuplicate) {
      deduplicated.push(item);
    }
  }
  
  return deduplicated;
}
