/**
 * Tests for Text→Food v3 nutrition hydration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

vi.mock('@/lib/flags', () => ({
  ENABLE_FOOD_TEXT_V3: true,
  FOOD_TEXT_DEBUG: true
}));

describe('Text→Food v3 Nutrition Hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Canonical nutrition mapping', () => {
    it('should map common food items to canonical keys', async () => {
      const { canonicalFor } = await import('@/lib/food/text/canonicalMap');
      
      expect(canonicalFor('hot_dog')).toBe('generic_hot_dog');
      expect(canonicalFor('pizza')).toBe('generic_pizza_slice');
      expect(canonicalFor('teriyaki_bowl')).toBe('generic_teriyaki_chicken_bowl');
      expect(canonicalFor('california_roll')).toBe('generic_california_roll');
      expect(canonicalFor('grilled_chicken')).toBe('generic_chicken_grilled');
    });

    it('should handle unknown foods gracefully', async () => {
      const { canonicalFor } = await import('@/lib/food/text/canonicalMap');
      
      expect(canonicalFor('unknown_food_item')).toBe(null);
      expect(canonicalFor('')).toBe(null);
    });
  });

  describe('Canonical nutrition hydration', () => {
    it('should return hardcoded nutrition for known items', async () => {
      const { fetchMacrosByCanonicalKey } = await import('@/lib/food/nutrition/hydrateCanonical');
      
      const hotdogNutrition = await fetchMacrosByCanonicalKey('generic_hot_dog');
      expect(hotdogNutrition).not.toBe(null);
      expect(hotdogNutrition!.perGram.kcal).toBeCloseTo(2.90);
      expect(hotdogNutrition!.perGram.protein).toBeCloseTo(0.10);
      
      const pizzaNutrition = await fetchMacrosByCanonicalKey('generic_pizza_slice');
      expect(pizzaNutrition).not.toBe(null);
      expect(pizzaNutrition!.perGram.kcal).toBeCloseTo(2.66);
    });

    it('should return null for unknown canonical keys', async () => {
      const { fetchMacrosByCanonicalKey } = await import('@/lib/food/nutrition/hydrateCanonical');
      
      // @ts-ignore - testing with invalid key
      const result = await fetchMacrosByCanonicalKey('unknown_key');
      expect(result).toBe(null);
    });
  });

  describe('Legacy hydration fallback', () => {
    it('should call GPT nutrition estimator for unknown items', async () => {
      const mockSupabase = await import('@/integrations/supabase/client');
      const mockInvoke = vi.fn().mockResolvedValue({
        data: {
          nutrition: {
            calories: 250,
            protein: 15,
            carbs: 30,
            fat: 8,
            fiber: 3,
            sugar: 5,
            sodium: 500
          }
        },
        error: null
      });
      
      mockSupabase.supabase.functions.invoke = mockInvoke;
      
      const { legacyHydrateByName } = await import('@/lib/food/nutrition/hydrateCanonical');
      const result = await legacyHydrateByName('custom food item');
      
      expect(result).not.toBe(null);
      expect(result!.perGram.kcal).toBeCloseTo(2.5); // 250/100
      expect(result!.perGram.protein).toBeCloseTo(0.15); // 15/100
      expect(mockInvoke).toHaveBeenCalledWith('gpt-nutrition-estimator', {
        body: {
          foodName: 'custom food item',
          amountPercentage: 100
        }
      });
    });
  });
});