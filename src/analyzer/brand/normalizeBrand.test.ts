import { describe, it, expect } from 'vitest';
import { toSlug, joinTokens, normalizeBrand, getKnownBrandSlugs, getCanonicalBrand } from './normalizeBrand';

describe('Brand Normalization', () => {
  describe('toSlug', () => {
    it('should convert to lowercase and remove punctuation', () => {
      expect(toSlug("Trader Joe's")).toBe("traderjoes");
      expect(toSlug("Ben & Jerry's")).toBe("benjerrys");
      expect(toSlug("McDonald's")).toBe("mcdonalds");
    });

    it('should handle various punctuation', () => {
      expect(toSlug("Coca-Cola")).toBe("cocacola");
      expect(toSlug("7-Eleven")).toBe("7eleven");
      expect(toSlug("Kit-Kat")).toBe("kitkat");
    });
  });

  describe('joinTokens', () => {
    it('should create proper n-grams for Trader Joes', () => {
      const tokens = ["trader", "joe", "'s", "just", "the", "clusters"];
      const result = joinTokens(tokens);
      
      expect(result).toContain("trader");
      expect(result).toContain("joe");
      expect(result).toContain("traderjoe"); // bi-gram
      expect(result).toContain("traderjoes"); // tri-gram (trader + joe + 's)
    });

    it('should handle various token combinations', () => {
      const tokens = ["TRADER", "JOES"];
      const result = joinTokens(tokens);
      
      expect(result).toContain("trader");
      expect(result).toContain("joes");
      expect(result).toContain("traderjoes");
    });

    it('should filter short tokens', () => {
      const tokens = ["a", "trader", "b", "joe"];
      const result = joinTokens(tokens);
      
      expect(result).not.toContain("a");
      expect(result).not.toContain("b");
      expect(result).toContain("trader");
      expect(result).toContain("joe");
    });
  });

  describe('normalizeBrand', () => {
    it('should normalize Trader Joes from OCR tokens', () => {
      const result = normalizeBrand({
        ocrTokens: ["trader", "joe", "'s", "just", "the", "clusters"]
      });
      
      expect(result.brandGuess).toBe("Trader Joe's");
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    // Critical test cases for the acceptance criteria
    it('should handle all Trader Joes variants with confidence ≥0.45', () => {
      const variants = [
        ["trader", "joes"],
        ["TRADER", "JOE'S"],
        ["trader", "joe", "s"],
        ["trader", "joe", "'s"]
      ];

      variants.forEach(tokens => {
        const result = normalizeBrand({ ocrTokens: tokens });
        expect(result.brandGuess).toBe("Trader Joe's");
        expect(result.confidence).toBeGreaterThanOrEqual(0.45); // Hot thresholds requirement
      });
    });

    it('should prioritize logo brands over OCR', () => {
      const result = normalizeBrand({
        logoBrands: ["trader joe's"],
        ocrTokens: ["some", "other", "text"]
      });
      
      expect(result.brandGuess).toBe("Trader Joe's");
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should handle LLM guesses', () => {
      const result = normalizeBrand({
        llmGuess: "Trader Joe's"
      });
      
      expect(result.brandGuess).toBe("Trader Joe's");
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should return low confidence for unknown brands', () => {
      const result = normalizeBrand({
        ocrTokens: ["unknown", "brand", "name"]
      });
      
      expect(result.confidence).toBe(0);
      expect(result.brandGuess).toBeUndefined();
    });

    it('should handle mixed case and punctuation', () => {
      const result = normalizeBrand({
        ocrTokens: ["TRADER", "JOE'S", "ORGANIC"]
      });
      
      expect(result.brandGuess).toBe("Trader Joe's");
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Utility functions', () => {
    it('getKnownBrandSlugs should return known brands', () => {
      const slugs = getKnownBrandSlugs();
      expect(slugs).toContain('traderjoes');
      expect(slugs).toContain('cocacola');
      expect(Array.isArray(slugs)).toBe(true);
    });

    it('getCanonicalBrand should return canonical names', () => {
      expect(getCanonicalBrand('traderjoes')).toBe("Trader Joe's");
      expect(getCanonicalBrand('cocacola')).toBe('Coca-Cola');
      expect(getCanonicalBrand('unknown')).toBeUndefined();
    });
  });
});