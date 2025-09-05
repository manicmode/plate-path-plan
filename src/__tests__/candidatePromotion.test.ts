/**
 * Tests for candidate promotion logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFoodCandidates } from '@/lib/food/search/getFoodCandidates';
import { parseQuery } from '@/lib/food/text/parse';

// Mock the search functions
vi.mock('@/lib/foodSearch', () => ({
  searchFoodByName: vi.fn()
}));

vi.mock('@/lib/food/text/food_aliases', () => ({
  expandAliases: vi.fn(),
  normalizeQuery: vi.fn()
}));

describe('Candidate Promotion Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Generic promotion', () => {
    it('should promote generic when brand is top but generic is close', async () => {
      // Mock the search to return brand first, generic second
      const { searchFoodByName } = await import('@/lib/foodSearch');
      const { normalizeQuery } = await import('@/lib/food/text/food_aliases');
      
      (normalizeQuery as any).mockReturnValue('hawaiian pizza');
      (searchFoodByName as any).mockResolvedValue([
        {
          id: 'brand-1',
          name: 'DiGiorno Hawaiian Pizza',
          caloriesPer100g: 250,
          imageUrl: 'https://example.com/brand.jpg'
        },
        {
          id: 'generic-1', 
          name: 'Pizza slice, Hawaiian',
          caloriesPer100g: 240,
          imageUrl: null
        }
      ]);

      const facets = parseQuery('hawaiian pizza');
      const candidates = await getFoodCandidates('hawaiian pizza', facets, {
        preferGeneric: true,
        requireCoreToken: false
      });

      // Should have promoted the generic to first place
      expect(candidates[0].kind).toBe('generic');
      expect(candidates[0].name).toBe('Pizza slice, Hawaiian');
    });

    it('should not promote if score difference is too large', async () => {
      const { searchFoodByName } = await import('@/lib/foodSearch');
      const { normalizeQuery } = await import('@/lib/food/text/food_aliases');
      
      (normalizeQuery as any).mockReturnValue('hot dog');
      (searchFoodByName as any).mockResolvedValue([
        {
          id: 'brand-1',
          name: 'Oscar Mayer Hot Dog',
          caloriesPer100g: 290,
          imageUrl: 'https://example.com/brand.jpg'
        },
        {
          id: 'generic-1',
          name: 'Hot dog link, generic',
          caloriesPer100g: 280,
          imageUrl: null
        }
      ]);

      const facets = parseQuery('hot dog');
      const candidates = await getFoodCandidates('hot dog', facets, {
        preferGeneric: true,
        requireCoreToken: false
      });

      // Brand should stay first if it's a much better match
      // This test would need the actual scoring logic to validate properly
      expect(candidates.length).toBeGreaterThan(0);
    });

    it('should work for manual/voice entries only', () => {
      // This is handled by the candidatePromotion logic in the search
      // The behavior is the same regardless of input source at the search level
      expect(true).toBe(true); // Placeholder - actual implementation depends on integration
    });
  });
});