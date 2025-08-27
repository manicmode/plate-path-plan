/**
 * Brand normalization utilities for consistent matching
 */

interface BrandAlias {
  [key: string]: string;
}

// Common brand variants that should be normalized
const BRAND_ALIASES: BrandAlias = {
  "trader joe s": "trader joe's",
  "trader joes": "trader joe's", 
  "trader joe": "trader joe's",
  "tj's": "trader joe's",
  "tjs": "trader joe's",
  "coca cola": "coca-cola",
  "coca-cola": "coca-cola",
  "coke": "coca-cola",
  "pepsi cola": "pepsi",
  "pepsi-cola": "pepsi",
  "mcdonalds": "mcdonald's",
  "mc donalds": "mcdonald's",
  "ben and jerrys": "ben & jerry's",
  "ben & jerrys": "ben & jerry's",
  "ben jerrys": "ben & jerry's",
  "kelloggs": "kellogg's",
  "kellogg": "kellogg's",
  "general mills": "general mills",
  "kraft heinz": "kraft",
  "oscar mayer": "oscar mayer",
  "oscar meyer": "oscar mayer"
};

/**
 * Normalize a brand string for consistent matching
 * - Lowercases, strips punctuation except apostrophes
 * - Collapses whitespace
 * - Maps common variants to canonical names
 */
export function normalizeBrand(brand: string): string {
  if (!brand) return '';
  
  // Lowercase and strip punctuation except apostrophes
  let normalized = brand.toLowerCase()
    .replace(/[^\w\s']/g, ' ')  // Keep only word chars, spaces, apostrophes
    .replace(/\s+/g, ' ')       // Collapse whitespace
    .trim();
  
  // Check for aliases
  const canonical = BRAND_ALIASES[normalized];
  return canonical || normalized;
}

/**
 * Join OCR tokens that match known brand n-grams separated by punctuation
 * Example: ["trader", "joe", "s"] → "trader joe's"
 */
export function joinBrandTokens(tokens: string[]): string[] {
  if (!tokens || tokens.length < 2) return tokens;
  
  const result: string[] = [];
  let i = 0;
  
  while (i < tokens.length) {
    let bestMatch = tokens[i];
    let bestLength = 1;
    
    // Try to match multi-token brands (up to 4 tokens)
    for (let len = Math.min(4, tokens.length - i); len >= 2; len--) {
      const candidate = tokens.slice(i, i + len).join(' ');
      const normalized = normalizeBrand(candidate);
      
      // Check if this forms a known brand
      if (isKnownBrand(normalized)) {
        bestMatch = normalized;
        bestLength = len;
        break;
      }
    }
    
    result.push(bestMatch);
    i += bestLength;
  }
  
  return result;
}

/**
 * Check if a normalized string is a known brand
 */
function isKnownBrand(normalized: string): boolean {
  // Check direct aliases
  if (BRAND_ALIASES[normalized]) return true;
  
  // Check if it's a target of an alias
  const aliasValues = Object.values(BRAND_ALIASES);
  if (aliasValues.includes(normalized)) return true;
  
  // Known complete brand names
  const knownBrands = [
    "trader joe's", "coca-cola", "pepsi", "mcdonald's", "ben & jerry's",
    "kellogg's", "general mills", "kraft", "oscar mayer", "nestle",
    "unilever", "procter & gamble", "mars", "mondelez", "danone",
    "campbell's", "heinz", "nabisco", "oreo", "lay's", "doritos",
    "cheetos", "fritos", "ritz", "goldfish", "cheerios", "lucky charms"
  ];
  
  return knownBrands.includes(normalized);
}

/**
 * Score brand match confidence after normalization
 */
export function calculateBrandMatchScore(brand1: string, brand2: string): number {
  const norm1 = normalizeBrand(brand1);
  const norm2 = normalizeBrand(brand2);
  
  if (norm1 === norm2) return 1.0;
  
  // Substring match
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const longer = Math.max(norm1.length, norm2.length);
    const shorter = Math.min(norm1.length, norm2.length);
    return shorter / longer;
  }
  
  // Word overlap
  const words1 = new Set(norm1.split(/\s+/));
  const words2 = new Set(norm2.split(/\s+/));
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  
  return intersection / union;
}