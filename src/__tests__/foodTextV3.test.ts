/**
 * Integration tests for Food Text v3 system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitTextLookup } from '@/lib/food/textLookup';
import { parseQuery } from '@/lib/food/text/parse';
import { inferPortion } from '@/lib/food/portion/inferPortion';
import { normalizeQuery } from '@/lib/food/text/food_aliases';

// Mock the food search module
vi.mock('@/lib/foodSearch', () => ({
  searchFoodByName: vi.fn()
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } })
    }
  }
}));

describe('Food Text v3 System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Enable v3 by default
    vi.stubEnv('VITE_FOOD_TEXT_V3', '1');
    vi.stubEnv('VITE_FOOD_TEXT_DEBUG', '1');
  });

  describe('Query Parsing', () => {
    it('should parse "hot dog" correctly', () => {
      const facets = parseQuery('hot dog');
      expect(facets.core).toContain('hot dog');
      expect(facets.core).toContain('hotdog');
    });

    it('should parse "hawaii pizza slice" correctly', () => {
      const facets = parseQuery('hawaii pizza slice');
      expect(facets.core).toContain('pizza');
      expect(facets.cuisine).toContain('hawaiian');
      expect(facets.form).toContain('slice');
    });

    it('should parse "teriyaki bowl" correctly', () => {
      const facets = parseQuery('teriyaki bowl');
      expect(facets.core).toContain('bowl');
      expect(facets.prep).toContain('teriyaki');
    });

    it('should parse "california roll" correctly', () => {
      const facets = parseQuery('california roll');
      expect(facets.core).toContain('roll');
      expect(facets.cuisine).toContain('california');
    });

    it('should parse "grilled chicken" correctly', () => {
      const facets = parseQuery('grilled chicken');
      expect(facets.core).toContain('chicken');
      expect(facets.prep).toContain('grilled');
    });
  });

  describe('Portion Inference', () => {
    it('should infer hot dog portion correctly', () => {
      const portion = inferPortion('hot dog', 'hot dog', undefined, 'hot_dog_link');
      expect(portion.grams).toBe(50);
      expect(portion.unit).toBe('link');
      expect(portion.source).toBe('class_default');
    });

    it('should infer pizza slice portion correctly', () => {
      const portion = inferPortion('pizza slice', 'hawaii pizza slice', undefined, 'pizza_slice');
      expect(portion.grams).toBe(125);
      expect(portion.unit).toBe('slice');
    });

    it('should infer teriyaki bowl portion correctly', () => {
      const portion = inferPortion('teriyaki bowl', 'teriyaki bowl', undefined, 'teriyaki_bowl');
      expect(portion.grams).toBe(350);
      expect(portion.unit).toBe('bowl');
    });

    it('should infer california roll portion correctly', () => {
      const portion = inferPortion('california roll', 'california roll', undefined, 'california_roll');
      expect(portion.grams).toBe(170);
      expect(portion.unit).toBe('roll');
    });

    it('should handle unit counts', () => {
      const facets = parseQuery('2 slices pizza');
      const portion = inferPortion('pizza', '2 slices pizza', facets);
      expect(portion.grams).toBe(250); // 2 * 125g
      expect(portion.source).toBe('unit_count');
    });
  });

  describe('Typo Handling', () => {
    it('should fix "hawai" to "hawaii"', () => {
      const normalized = normalizeQuery('hawai pizza');
      expect(normalized).toBe('hawaii pizza');
    });

    it('should fix "califirnia" to "california"', () => {
      const normalized = normalizeQuery('califirnia roll');
      expect(normalized).toBe('california roll');
    });

    it('should fix "teriaki" to "teriyaki"', () => {
      const normalized = normalizeQuery('teriaki bowl');
      expect(normalized).toBe('teriyaki bowl');
    });

    it('should fix "peperoni" to "pepperoni"', () => {
      const normalized = normalizeQuery('peperoni pizza');
      expect(normalized).toBe('pepperoni pizza');
    });
  });

  describe('Text Lookup Integration', () => {
    it('should use v3 pipeline for manual input', async () => {
      // Mock successful food search
      const { searchFoodByName } = await import('@/lib/foodSearch');
      (searchFoodByName as any).mockResolvedValue([
        {
          id: 'hot-dog-generic',
          name: 'Hot dog',
          caloriesPer100g: 290,
          imageUrl: 'https://example.com/hotdog.jpg'
        }
      ]);

      const result = await submitTextLookup('hot dog', { source: 'manual' });
      
      expect(result.version).toBe('v3');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Hot dog');
      expect(result.items[0].portionGrams).toBe(50); // default hot dog portion
      expect(result.items[0].__source).toBe('manual');
      expect(result.items[0].__altCandidates).toBeDefined();
    });

    it('should use v3 pipeline for speech input', async () => {
      // Mock successful food search
      const { searchFoodByName } = await import('@/lib/foodSearch');
      (searchFoodByName as any).mockResolvedValue([
        {
          id: 'pizza-generic',
          name: 'Pizza Hawaii slice',
          caloriesPer100g: 250,
          imageUrl: 'https://example.com/pizza.jpg'
        }
      ]);

      const result = await submitTextLookup('hawaii pizza', { source: 'speech' });
      
      expect(result.version).toBe('v3');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Pizza Hawaii slice');
      expect(result.items[0].portionGrams).toBe(125); // default pizza slice portion
      expect(result.items[0].__source).toBe('voice');
    });

    it('should fallback to legacy when v3 disabled', async () => {
      vi.stubEnv('VITE_FOOD_TEXT_V3', '0');
      
      // Mock supabase function call
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.functions.invoke as any).mockResolvedValue({
        data: {
          ok: true,
          items: [{
            id: 'legacy-item',
            name: 'Hot dog',
            calories: 145,
            servingGrams: 100
          }],
          cached: false
        }
      });

      const result = await submitTextLookup('hot dog', { source: 'manual' });
      
      expect(result.version).toBeUndefined(); // Legacy doesn't set version
      expect(supabase.functions.invoke).toHaveBeenCalledWith('food-text-lookup', expect.any(Object));
    });
  });
});