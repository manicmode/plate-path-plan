import { describe, it, expect } from 'vitest';
import { normalizeBrand, joinBrandTokens, calculateBrandMatchScore } from './brandNormalization';

describe('Brand Normalization', () => {
  describe('normalizeBrand', () => {
    it('should normalize trader joes variants', () => {
      expect(normalizeBrand("Trader Joe's")).toBe("trader joe's");
      expect(normalizeBrand("TRADER JOES")).toBe("trader joe's");
      expect(normalizeBrand("trader joe s")).toBe("trader joe's");
      expect(normalizeBrand("TJ's")).toBe("trader joe's");
      expect(normalizeBrand("TJs")).toBe("trader joe's");
    });

    it('should handle punctuation and whitespace', () => {
      expect(normalizeBrand("Ben & Jerry's")).toBe("ben & jerry's");
      expect(normalizeBrand("McDonald's")).toBe("mcdonald's");
      expect(normalizeBrand("Coca-Cola")).toBe("coca-cola");
    });

    it('should strip extra punctuation but keep apostrophes', () => {
      expect(normalizeBrand("Trader Joe's!@#")).toBe("trader joe's");
      expect(normalizeBrand("Ben & Jerry's...")).toBe("ben & jerry's");
    });
  });

  describe('joinBrandTokens', () => {
    it('should join trader joes tokens', () => {
      const tokens = ["trader", "joe", "s"];
      const result = joinBrandTokens(tokens);
      expect(result).toContain("trader joe's");
    });

    it('should join ben and jerrys tokens', () => {
      const tokens = ["ben", "and", "jerrys"];
      const result = joinBrandTokens(tokens);
      expect(result).toContain("ben & jerry's");
    });

    it('should preserve non-brand tokens', () => {
      const tokens = ["some", "random", "word"];
      const result = joinBrandTokens(tokens);
      expect(result).toEqual(["some", "random", "word"]);
    });
  });

  describe('calculateBrandMatchScore', () => {
    it('should give high scores for trader joes variants', () => {
      expect(calculateBrandMatchScore("trader joe's", "trader joes")).toBeGreaterThanOrEqual(0.9);
      expect(calculateBrandMatchScore("Trader Joe's", "TJ's")).toBeGreaterThanOrEqual(0.9);
      expect(calculateBrandMatchScore("trader joe s", "trader joe's")).toBeGreaterThanOrEqual(0.9);
    });

    it('should meet hot threshold requirements', () => {
      // Test that variants score above 0.45 threshold mentioned in acceptance criteria
      expect(calculateBrandMatchScore("trader joes", "trader joe's")).toBeGreaterThanOrEqual(0.45);
      expect(calculateBrandMatchScore("trader joe", "trader joe's")).toBeGreaterThanOrEqual(0.45);
      expect(calculateBrandMatchScore("TJs", "trader joe's")).toBeGreaterThanOrEqual(0.45);
    });
  });
});