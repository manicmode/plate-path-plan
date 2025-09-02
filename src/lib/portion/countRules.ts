/**
 * Count-based Portion Rules for v3
 * Infers portion from count hints (e.g., "6 spears", "2 wings")
 */

interface CountResult {
  grams?: number;
  basis?: 'count';
}

// Unit weights in grams per item
const UNIT_WEIGHTS: Record<string, number> = {
  // Vegetables
  'asparagus spear': 12,
  'spear': 12, // context-dependent fallback
  'asparagus': 12, // when used with count
  
  // Proteins
  'shrimp': 10, // medium shrimp
  'meatball': 20,
  'chicken wing': 45,
  'wing': 45,
  'egg': 50, // whole egg
  
  // Fruits
  'grape': 5,
  'cherry': 8,
  'strawberry': 12,
  'blueberry': 1,
  
  // Misc
  'olive': 4,
  'cracker': 3,
  'chip': 2
};

// Regex patterns for count extraction
const COUNT_PATTERNS = [
  // Exact counts: "6 spears", "2 wings", "~8 shrimp"  
  /(?:~|about\s+)?(\d+)\s+(spears?|wings?|shrimp|meatballs?|eggs?|grapes?|cherries|strawberries|olives?|crackers?|chips?)/i,
  
  // Number + food name: "6 asparagus", "2 chicken wing"
  /(?:~|about\s+)?(\d+)\s+(asparagus|chicken\s+wings?)/i,
  
  // Range patterns: "5-6 spears", "2 to 3 wings"
  /(\d+)[-\s]*(?:to\s+)?(\d+)\s+(spears?|wings?|shrimp|meatballs?)/i
];

export function inferCountGrams(det: { name: string; hints?: string }): CountResult {
  if (!det.hints) return {};
  
  const hints = det.hints.toLowerCase().trim();
  const foodName = det.name.toLowerCase();
  
  // Try each pattern
  for (const pattern of COUNT_PATTERNS) {
    const match = hints.match(pattern);
    if (!match) continue;
    
    let count: number;
    let unit: string;
    
    if (match.length === 3) {
      // Simple count pattern: "6 spears"
      count = parseInt(match[1]);
      unit = match[2].replace(/s$/, ''); // Remove plural 's'
    } else if (match.length === 4) {
      // Range pattern: "5-6 spears" -> use average
      const min = parseInt(match[1]);
      const max = parseInt(match[2]);
      count = Math.round((min + max) / 2);
      unit = match[3].replace(/s$/, '');
    } else {
      continue;
    }
    
    // Find unit weight
    let unitWeight = UNIT_WEIGHTS[unit];
    
    // Context-sensitive fallbacks
    if (!unitWeight) {
      // Try compound names
      if (unit === 'wing' && (foodName.includes('chicken') || foodName.includes('wing'))) {
        unitWeight = UNIT_WEIGHTS['chicken wing'];
      } else if (unit === 'spear' && foodName.includes('asparagus')) {
        unitWeight = UNIT_WEIGHTS['asparagus spear'];
      }
    }
    
    // Direct food name lookup for simple cases like "6 asparagus"
    if (!unitWeight && UNIT_WEIGHTS[foodName]) {
      unitWeight = UNIT_WEIGHTS[foodName];
    }
    
    if (unitWeight && count > 0 && count <= 50) { // Sanity check
      const grams = count * unitWeight;
      return {
        grams: Math.round(grams),
        basis: 'count'
      };
    }
  }
  
  return {};
}

// Get unit weight for a food name (used by scaler for validation)
export function getUnitWeight(foodName: string): number | undefined {
  const lower = foodName.toLowerCase();
  return UNIT_WEIGHTS[lower] || UNIT_WEIGHTS[lower.replace(/s$/, '')];
}