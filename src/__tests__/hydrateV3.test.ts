/**
 * Tests for v3 nutrition hydration system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hydrateNutritionV3 } from '@/lib/nutrition/hydrateV3';

// Mock the canonical hydration
vi.mock('@/lib/food/nutrition/hydrateCanonical', () => ({
  fetchMacrosByCanonicalKey: vi.fn(),
  legacyHydrateByName: vi.fn()
}));

// Mock flags
vi.mock('@/lib/flags', () => ({
  ENABLE_FOOD_TEXT_V3_NUTR: true
}));

describe('V3 Nutrition Hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fast path', () => {
    it('should return existing store data for items with hasStoreData', async () => {
      const item = {
        hasStoreData: true,
        calories: 250,
        protein: 10,
        carbs: 30,
        fat: 8,
        fiber: 2,
        sugar: 5,
        sodium: 400
      };

      const result = await hydrateNutritionV3(item);

      expect(result.fromStore).toBe(true);
      expect(result.dataSource).toBe('store');
      expect(result.isEstimated).toBe(false);
      expect(result.perGram.kcal).toBe(2.5); // 250/100
      expect(result.perGram.protein).toBe(0.1); // 10/100
    });
  });

  describe('Canonical key lookup', () => {
    it('should use canonical key when available', async () => {
      const { fetchMacrosByCanonicalKey } = await import('@/lib/food/nutrition/hydrateCanonical');
      
      (fetchMacrosByCanonicalKey as any).mockResolvedValue({
        perGram: {
          kcal: 2.9,
          protein: 0.1,
          carbs: 0.02,
          fat: 0.26
        }
      });

      const item = {
        name: 'Hot dog',
        canonicalKey: 'generic_hot_dog'
      };

      const result = await hydrateNutritionV3(item);

      expect(fetchMacrosByCanonicalKey).toHaveBeenCalledWith('generic_hot_dog');
      expect(result.dataSource).toBe('canonical');
      expect(result.perGram.kcal).toBe(2.9);
    });
  });

  describe('Timeout handling', () => {
    it('should return estimated result on timeout', async () => {
      const { fetchMacrosByCanonicalKey } = await import('@/lib/food/nutrition/hydrateCanonical');
      
      // Mock a slow response
      (fetchMacrosByCanonicalKey as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 7000))
      );

      const item = {
        name: 'Pizza slice',
        canonicalKey: 'generic_pizza_slice',
        classId: 'pizza_slice'
      };

      const result = await hydrateNutritionV3(item);

      expect(result.isEstimated).toBe(true);
      expect(result.dataSource).toBe('Estimated');
      expect(result.perGram.kcal).toBeGreaterThan(0);
    });
  });

  describe('Core noun derivation', () => {
    it('should derive core nouns from food titles', async () => {
      const { fetchMacrosByCanonicalKey } = await import('@/lib/food/nutrition/hydrateCanonical');
      
      (fetchMacrosByCanonicalKey as any).mockResolvedValue({
        perGram: {
          kcal: 1.29,
          protein: 0.04,
          carbs: 0.18,
          fat: 0.06
        }
      });

      const item = {
        name: 'California sushi roll with avocado'
      };

      const result = await hydrateNutritionV3(item);

      expect(result.dataSource).toBe('canonical');
      expect(result.perGram.kcal).toBe(1.29);
    });
  });
});