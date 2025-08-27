/**
 * Brand normalization for consistent OCR/LLM brand detection
 */

// Brand aliases mapping slug → canonical label
const BRAND_ALIASES: Record<string, string> = {
  "traderjoes": "Trader Joe's",
  "traderjoe": "Trader Joe's", 
  "tjs": "Trader Joe's",
  "tj": "Trader Joe's",
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
  // TODO: add more brands as we encounter them
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
 * Join OCR tokens into candidate brand phrases
 * Example: ["trader", "joe", "'s"] → ["trader", "traderjoe", "traderjoes", "joe", "joes"]
 */
export function joinTokens(tokens: string[]): string[] {
  if (!tokens || tokens.length === 0) return [];
  
  const candidates = new Set<string>();
  
  // Single tokens
  tokens.forEach(token => {
    const cleaned = toSlug(token);
    if (cleaned.length > 1) {
      candidates.add(cleaned);
    }
  });
  
  // Bi-grams and tri-grams
  for (let i = 0; i < tokens.length - 1; i++) {
    // Bi-gram
    const bigram = toSlug(tokens[i] + tokens[i + 1]);
    if (bigram.length > 2) {
      candidates.add(bigram);
    }
    
    // Tri-gram (if available)
    if (i < tokens.length - 2) {
      const trigram = toSlug(tokens[i] + tokens[i + 1] + tokens[i + 2]);
      if (trigram.length > 3) {
        candidates.add(trigram);
      }
    }
  }
  
  return Array.from(candidates);
}

/**
 * Normalize brand from multiple sources
 */
export function normalizeBrand(input: BrandNormalizationInput): BrandNormalizationResult {
  // Priority 1: Logo brands (highest confidence)
  if (input.logoBrands && input.logoBrands.length > 0) {
    for (const logo of input.logoBrands) {
      const slug = toSlug(logo);
      const canonical = BRAND_ALIASES[slug];
      if (canonical) {
        return { brandGuess: canonical, confidence: 0.95 };
      }
    }
    
    // Return first logo brand even if not in aliases
    return { brandGuess: input.logoBrands[0], confidence: 0.85 };
  }
  
  // Priority 2: OCR tokens (medium confidence)
  if (input.ocrTokens && input.ocrTokens.length > 0) {
    const candidates = joinTokens(input.ocrTokens);
    
    for (const candidate of candidates) {
      const canonical = BRAND_ALIASES[candidate];
      if (canonical) {
        return { brandGuess: canonical, confidence: 0.8 };
      }
    }
  }
  
  // Priority 3: LLM guess (lower confidence, needs validation)
  if (input.llmGuess) {
    const slug = toSlug(input.llmGuess);
    const canonical = BRAND_ALIASES[slug];
    if (canonical) {
      return { brandGuess: canonical, confidence: 0.7 };
    }
    
    // Return LLM guess even if not in aliases (low confidence)
    return { brandGuess: input.llmGuess, confidence: 0.5 };
  }
  
  return { confidence: 0 };
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