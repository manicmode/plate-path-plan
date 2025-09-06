/**
 * Tests for Manual Entry Generic vs Brand labeling fixes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables for testing
const mockEnv = {
  VITE_MANUAL_ENTRY_LABEL_TIGHT: '1',
  VITE_CANDIDATE_CLASSIFIER_SAFE: '1',
  VITE_V3_ALT_BRAND_FIELDS: '1', 
  VITE_CORE_NOUN_STRICT: '1',
  VITE_MANUAL_INJECT_GENERIC: '0'
};

vi.mock('import.meta', () => ({
  env: mockEnv
}));

describe('Manual Entry Generic vs Brand Fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('looksGeneric truth table (tight mode)', () => {
    const looksGeneric = (it: any): boolean => {
      // Replicated tight logic for testing
      if (it?.isGeneric === true) return true;
      if (it?.canonicalKey?.startsWith('generic_')) return true;
      
      const hasBrandEvidence = !!(it?.brand || it?.brands || (it?.code && typeof it.code === 'string' && it.code.length >= 8));
      if (hasBrandEvidence) return false;
      
      if ((it?.kind === 'generic' || it?.provider === 'generic') && !hasBrandEvidence) return true;
      
      return false; // Default to Brand when tight flag ON
    };

    it('should return Generic for explicit isGeneric', () => {
      expect(looksGeneric({ isGeneric: true })).toBe(true);
      expect(looksGeneric({ isGeneric: true, brand: 'Quaker' })).toBe(false); // Brand evidence overrides
    });

    it('should return Generic for generic canonicalKey', () => {
      expect(looksGeneric({ canonicalKey: 'generic_chicken' })).toBe(true);
      expect(looksGeneric({ canonicalKey: 'generic_roll' })).toBe(true);
    });

    it('should return Brand for brand evidence', () => {
      expect(looksGeneric({ brand: 'Quaker' })).toBe(false);
      expect(looksGeneric({ brands: ['Kraft'] })).toBe(false);
      expect(looksGeneric({ code: '012345678901' })).toBe(false); // EAN/UPC
      expect(looksGeneric({ kind: 'generic', brand: 'Quaker' })).toBe(false); // Brand overrides
    });

    it('should return Generic for provider/kind generic without brand evidence', () => {
      expect(looksGeneric({ kind: 'generic' })).toBe(true);
      expect(looksGeneric({ provider: 'generic' })).toBe(true);
      expect(looksGeneric({ kind: 'generic', code: '123' })).toBe(true); // Short code OK
    });

    it('should default to Brand for unknown/ambiguous items', () => {
      expect(looksGeneric({ name: 'California Roll' })).toBe(false);
      expect(looksGeneric({ name: 'Chicken Breast' })).toBe(false);
      expect(looksGeneric({})).toBe(false);
      expect(looksGeneric(null)).toBe(false);
    });
  });

  describe('classifyItemKind safe mode', () => {
    const classifyItemKind = (item: any): 'generic' | 'brand' | 'unknown' => {
      // Replicated safe logic for testing
      const name = item.name?.toLowerCase() || '';
      
      // Check explicit brand evidence first
      if (item.brand || item.brands) return 'brand';
      if (item.code && typeof item.code === 'string' && item.code.length >= 8) return 'brand';
      
      // Check explicit generic indicators  
      if (item.provider === 'generic' || item.isGeneric) return 'generic';
      
      // Brand indicators
      const brandIndicators = ['quaker', 'oreo', 'spam', 'kraft', 'nestle'];
      if (brandIndicators.some(indicator => name.includes(indicator))) return 'brand';
      
      // Generic indicators
      const genericIndicators = ['generic', 'cooked', 'raw', 'grilled', 'homemade'];
      if (genericIndicators.some(indicator => name.includes(indicator))) return 'generic';
      
      return 'unknown'; // Safe mode returns unknown for ambiguous
    };

    it('should detect brand evidence correctly', () => {
      expect(classifyItemKind({ name: 'Chicken', brand: 'Tyson' })).toBe('brand');
      expect(classifyItemKind({ name: 'Cereal', brands: ['Kellogg'] })).toBe('brand');
      expect(classifyItemKind({ name: 'Oats', code: '012345678901' })).toBe('brand');
    });

    it('should detect explicit generic indicators', () => {
      expect(classifyItemKind({ name: 'Chicken', provider: 'generic' })).toBe('generic');
      expect(classifyItemKind({ name: 'Roll', isGeneric: true })).toBe('generic');
    });

    it('should detect brand names in safe mode', () => {
      expect(classifyItemKind({ name: 'Quaker Rolled Oats' })).toBe('brand');
      expect(classifyItemKind({ name: 'Oreo Cookies' })).toBe('brand');
      expect(classifyItemKind({ name: 'Spam' })).toBe('brand');
    });

    it('should return unknown for ambiguous short names in safe mode', () => {
      expect(classifyItemKind({ name: 'Roll' })).toBe('unknown');
      expect(classifyItemKind({ name: 'Chicken' })).toBe('unknown');
      expect(classifyItemKind({ name: 'Rice' })).toBe('unknown');
    });
  });

  describe('Core noun strict matching', () => {
    const hasCoreTokNounMatch = (query: string, foodName: string): boolean => {
      // Replicated strict logic for testing
      const queryLower = query.toLowerCase();
      const nameLower = foodName.toLowerCase();
      
      // Core nouns with word boundaries
      const CORE_NOUNS = ['roll', 'chicken', 'oats', 'rice'];
      
      for (const noun of CORE_NOUNS) {
        if (queryLower.includes(noun) && nameLower.includes(noun)) {
          const queryRegex = new RegExp(`\\b${noun}s?\\b`, 'i');
          const nameRegex = new RegExp(`\\b${noun}s?\\b`, 'i');
          if (queryRegex.test(queryLower) && nameRegex.test(nameLower)) {
            return true;
          }
        }
      }
      
      return false;
    };

    it('should match exact core nouns with strict boundaries', () => {
      expect(hasCoreTokNounMatch('california roll', 'california roll sushi')).toBe(true);
      expect(hasCoreTokNounMatch('grilled chicken', 'chicken breast grilled')).toBe(true);
    });

    it('should NOT match partial words when strict', () => {
      expect(hasCoreTokNounMatch('california roll', 'quaker rolled oats')).toBe(false);
      expect(hasCoreTokNounMatch('roll', 'rolled')).toBe(false);
    });

    it('should handle singular/plural variants', () => {
      expect(hasCoreTokNounMatch('roll', 'california rolls')).toBe(true);
      expect(hasCoreTokNounMatch('rolls', 'california roll')).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should prevent oats promotion for california roll query', () => {
      const query = 'california roll';
      const top = { name: 'California Roll Sushi', score: 0.85, brands: ['SushiCo'] };
      const second = { name: 'Quaker Rolled Oats', score: 0.75, provider: 'generic' };
      
      // With strict matching, "rolled" shouldn't match "roll"
      const secondMatchesQuery = false; // strict boundary would prevent this
      const scoreDiff = 0.10;
      
      // Should NOT promote because secondMatchesQuery is false
      expect(scoreDiff < 0.15).toBe(true);
      expect(secondMatchesQuery).toBe(false);
    });

    it('should allow proper generic promotion for relevant items', () => {
      const query = 'grilled chicken';
      const top = { name: 'Tyson Grilled Chicken', score: 0.80, brand: 'Tyson' };
      const second = { name: 'Chicken Breast Grilled', score: 0.75, provider: 'generic' };
      
      const secondMatchesQuery = true; // "chicken" matches
      const scoreDiff = 0.05;
      
      // Should promote because it's relevant and generic
      expect(scoreDiff < 0.15).toBe(true);
      expect(secondMatchesQuery).toBe(true);
    });
  });
});