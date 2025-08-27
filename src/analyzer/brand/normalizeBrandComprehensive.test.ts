import { describe, it, expect } from 'vitest';
import { 
  toSlug, 
  joinTokens, 
  normalizeBrandComprehensive, 
  getKnownBrandSlugs, 
  getCanonicalBrand 
} from './normalizeBrandComprehensive';

describe('toSlug', () => {
  it('should convert to lowercase and remove punctuation', () => {
    expect(toSlug("Trader Joe's")).toBe('traderjoes');
    expect(toSlug('COCA-COLA')).toBe('cocacola');
    expect(toSlug('Ben & Jerry\'s')).toBe('benjerrys');
  });

  it('should handle apostrophes and hyphens', () => {
    expect(toSlug("McDonald's")).toBe('mcdonalds');
    expect(toSlug('Coca-Cola')).toBe('cocacola');
  });
});

describe('joinTokens', () => {
  it('should create n-grams from token arrays', () => {
    const tokens = ['trader', 'joe', 'vanilla'];
    const result = joinTokens(tokens);
    
    expect(result).toContain('trader');
    expect(result).toContain('joe'); 
    expect(result).toContain('traderjoe');
    expect(result).toContain('traderjoevani lla'.replace(' ', ''));
  });

  it('should handle mixed case and punctuation', () => {
    const tokens = ['TRADER', "JOE'S", 'clusters'];
    const result = joinTokens(tokens);
    
    expect(result).toContain('trader');
    expect(result).toContain('joes');
    expect(result).toContain('traderjoes');
  });

  it('should filter out very short tokens', () => {
    const tokens = ['a', 'trader', 'joe'];
    const result = joinTokens(tokens);
    
    expect(result).not.toContain('a');
    expect(result).toContain('trader');
  });
});

describe('normalizeBrandComprehensive', () => {
  it('should prioritize logo brands', () => {
    const result = normalizeBrandComprehensive({
      logoBrands: ['trader joe\'s'],
      ocrTokens: ['pepsi', 'cola'],
      llmGuess: 'coca cola'
    });
    
    expect(result.brandGuess).toBe("Trader Joe's");
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('should normalize OCR tokens with n-grams', () => {
    const result = normalizeBrandComprehensive({
      ocrTokens: ['trader', 'joe', 'just', 'clusters']
    });
    
    expect(result.brandGuess).toBe("Trader Joe's");
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('should handle various Trader Joe\'s variants', () => {
    const variants = [
      { ocrTokens: ['trader'], expected: "Trader Joe's" },
      { ocrTokens: ['joe'], expected: "Trader Joe's" },
      { ocrTokens: ['trader', 'joe'], expected: "Trader Joe's" },
      { ocrTokens: ['TRADER', 'JOES'], expected: "Trader Joe's" },
    ];

    variants.forEach(({ ocrTokens, expected }) => {
      const result = normalizeBrandComprehensive({ ocrTokens });
      expect(result.brandGuess).toBe(expected);
    });
  });

  it('should validate LLM guesses', () => {
    const result = normalizeBrandComprehensive({
      llmGuess: 'trader joes'
    });
    
    expect(result.brandGuess).toBe("Trader Joe's");
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it('should return low confidence for unknown brands', () => {
    const result = normalizeBrandComprehensive({
      llmGuess: 'unknown brand xyz'
    });
    
    expect(result.brandGuess).toBe('unknown brand xyz');
    expect(result.confidence).toBe(0.5);
  });

  it('should return zero confidence when no input', () => {
    const result = normalizeBrandComprehensive({});
    expect(result.confidence).toBe(0);
    expect(result.brandGuess).toBeUndefined();
  });
});

describe('utility functions', () => {
  it('should return known brand slugs', () => {
    const slugs = getKnownBrandSlugs();
    expect(slugs).toContain('traderjoes');
    expect(slugs).toContain('cocacola');
    expect(slugs.length).toBeGreaterThan(10);
  });

  it('should get canonical brand names', () => {
    expect(getCanonicalBrand('traderjoes')).toBe("Trader Joe's");
    expect(getCanonicalBrand('TRADER JOE')).toBe("Trader Joe's");
    expect(getCanonicalBrand('unknown')).toBeUndefined();
  });
});