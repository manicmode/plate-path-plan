/**
 * Comprehensive brand normalization for consistent OCR/LLM brand detection
 * Includes all brand aliases and robust n-gram matching
 */

// Enhanced brand aliases mapping slug → canonical label
const BRAND_ALIASES: Record<string, string> = {
  // Trader Joe's variants (comprehensive)
  "traderjoes": "Trader Joe's",
  "traderjoe": "Trader Joe's", 
  "tjs": "Trader Joe's",
  "tj": "Trader Joe's",
  "trader": "Trader Joe's",
  "joe": "Trader Joe's",
  "joes": "Trader Joe's",
  
  // Other major brands
  "cocacola": "Coca-Cola",
  "coke": "Coca-Cola",
  "pepsi": "Pepsi",
  "pepsicola": "Pepsi",
  "mcdonalds": "McDonald's",
  "kelloggs": "Kellogg's",
  "kellogg": "Kellogg's",
  "generalmills": "General Mills",
  "kraft": "Kraft",
  "kraftheinz": "Kraft Heinz",
  "nestle": "Nestlé",
  "nabisco": "Nabisco",
  "oreo": "Oreo",
  "cheerios": "Cheerios",
  "lays": "Lay's",
  "doritos": "Doritos",
  "cheetos": "Cheetos",
  "planters": "Planters",
  "skippy": "Skippy",
  "jif": "Jif",
  "ritz": "Ritz",
  "goldfish": "Goldfish",
  "benjerrys": "Ben & Jerry's",
  "benjerry": "Ben & Jerry's"
};

interface BrandNormalizationInput {
  ocrTokens?: string[];
  logoBrands?: string[];
  llmGuess?: string;
}

interface BrandNormalizationResult {
  brandGuess?: string;
  confidence: number;
}

/**
 * Convert string to slug (lowercase, no spaces/punct, normalize apostrophes)
 */
export function toSlug(s: string): string {
  if (!s) return '';
  
  return s.toLowerCase()
    .replace(/'/g, '') // Remove apostrophes
    .replace(/[^\w\s]/g, '') // Remove punctuation except word chars and spaces
    .replace(/\s+/g, '') // Remove all spaces
    .trim();
}

/**
 * Join OCR tokens into candidate brand phrases with comprehensive n-gram generation
 */
export function joinTokens(tokens: string[], maxGram = 3): string[] {
  if (!tokens || tokens.length === 0) return [];
  
  const candidates = new Set<string>();
  
  // Single tokens
  tokens.forEach(token => {
    const cleaned = toSlug(token);
    if (cleaned.length > 1) {
      candidates.add(cleaned);
    }
  });
  
  // Multi-word combinations
  for (let gramSize = 2; gramSize <= Math.min(maxGram, tokens.length); gramSize++) {
    for (let i = 0; i <= tokens.length - gramSize; i++) {
      const gram = tokens.slice(i, i + gramSize);
      const combined = toSlug(gram.join(' '));
      if (combined.length > 2) {
        candidates.add(combined);
      }
      
      // Also try without spaces
      const concatenated = toSlug(gram.join(''));
      if (concatenated.length > 2) {
        candidates.add(concatenated);
      }
    }
  }
  
  return Array.from(candidates);
}

/**
 * Check for Trader Joe's decisive window match
 * Rule: if tokens contain "trader" and "joe/joes/joe's" within a window of ≤3 tokens
 */
function checkTraderJoesWindow(tokens: string[]): { match: boolean; confidence: number } {
  const lowerTokens = tokens.map(t => t.toLowerCase());
  
  for (let i = 0; i < lowerTokens.length; i++) {
    const token = lowerTokens[i];
    if (token === 'trader' || token === 'traderjoes' || token === 'traderjoe') {
      // Look for joe/joes/joe's within 3 positions
      for (let j = Math.max(0, i - 3); j <= Math.min(lowerTokens.length - 1, i + 3); j++) {
        const nearby = lowerTokens[j];
        if (nearby === 'joe' || nearby === 'joes' || nearby.includes('joe')) {
          return { match: true, confidence: 0.9 };
        }
      }
    }
  }
  
  return { match: false, confidence: 0 };
}

/**
 * Comprehensive brand normalization from multiple sources
 */
export function normalizeBrandComprehensive(input: BrandNormalizationInput): BrandNormalizationResult & { reason?: string } {
  // Priority 1: Logo brands (highest confidence)
  if (input.logoBrands && input.logoBrands.length > 0) {
    for (const logo of input.logoBrands) {
      const slug = toSlug(logo);
      const canonical = BRAND_ALIASES[slug];
      if (canonical) {
        return { brandGuess: canonical, confidence: 0.95, reason: 'logo_hit' };
      }
    }
    
    // Return first logo brand even if not in aliases
    return { brandGuess: input.logoBrands[0], confidence: 0.85, reason: 'logo_hit' };
  }
  
  // Priority 2: OCR tokens with decisive window matching for Trader Joe's
  if (input.ocrTokens && input.ocrTokens.length > 0) {
    const traderJoesCheck = checkTraderJoesWindow(input.ocrTokens);
    if (traderJoesCheck.match) {
      return { brandGuess: "Trader Joe's", confidence: traderJoesCheck.confidence, reason: 'ocr_window_match' };
    }
    
    const candidates = joinTokens(input.ocrTokens, 3);
    
    // Try exact matches first
    for (const candidate of candidates) {
      const canonical = BRAND_ALIASES[candidate];
      if (canonical) {
        return { brandGuess: canonical, confidence: 0.8, reason: 'ocr_exact_match' };
      }
    }
    
    // Try partial matches for multi-word brands
    for (const candidate of candidates) {
      for (const [slug, brand] of Object.entries(BRAND_ALIASES)) {
        if (slug.includes(candidate) || candidate.includes(slug)) {
          if (candidate.length >= 3 && slug.length >= 3) {
            return { brandGuess: brand, confidence: 0.7, reason: 'ocr_partial_match' };
          }
        }
      }
    }
  }
  
  // Priority 3: LLM guess (lower confidence, needs validation)
  if (input.llmGuess) {
    const slug = toSlug(input.llmGuess);
    const canonical = BRAND_ALIASES[slug];
    if (canonical) {
      return { brandGuess: canonical, confidence: 0.7, reason: 'llm_guess' };
    }
    
    // Try partial matching for LLM guess
    for (const [aliasSlug, brand] of Object.entries(BRAND_ALIASES)) {
      if (aliasSlug.includes(slug) || slug.includes(aliasSlug)) {
        if (slug.length >= 3 && aliasSlug.length >= 3) {
          return { brandGuess: brand, confidence: 0.6, reason: 'llm_guess' };
        }
      }
    }
    
    // Return LLM guess even if not in aliases (low confidence)
    return { brandGuess: input.llmGuess, confidence: 0.5, reason: 'llm_guess' };
  }
  
  return { confidence: 0, reason: 'none' };
}

/**
 * Get all known brand slugs for testing/debugging
 */
export function getKnownBrandSlugs(): string[] {
  return Object.keys(BRAND_ALIASES);
}

/**
 * Get canonical brand name for a slug
 */
export function getCanonicalBrand(slug: string): string | undefined {
  return BRAND_ALIASES[toSlug(slug)];
}
