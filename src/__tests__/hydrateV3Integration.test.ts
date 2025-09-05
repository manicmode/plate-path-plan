/**
 * Tests for hydrateNutritionV3 function
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hydrateNutritionV3 } from '@/lib/nutrition/hydrateV3';

// Mock the dependencies
vi.mock('@/lib/food/nutrition/hydrateCanonical', () => ({
  fetchMacrosByCanonicalKey: vi.fn(),
  legacyHydrateByName: vi.fn()
}));

vi.mock('@/lib/flags', () => ({
  FOOD_TEXT_DEBUG: false,
  ENABLE_FOOD_TEXT_V3_NUTR: true
}));

describe('hydrateNutritionV3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve with canonical data when available', async () => {
    const { fetchMacrosByCanonicalKey } = await import('@/lib/food/nutrition/hydrateCanonical');
    
    (fetchMacrosByCanonicalKey as any).mockResolvedValue({
      perGram: {
        kcal: 2.9,
        protein: 0.10,
        carbs: 0.02,
        fat: 0.26
      }
    });

    const mockItem = {
      id: 'test-item',
      name: 'Hot Dog',
      canonicalKey: 'generic_hot_dog'
    };

    const result = await hydrateNutritionV3(mockItem, { preferGeneric: true });

    expect(result.dataSource).toBe('canonical');
    expect(result.isEstimated).toBe(false);
    expect(result.perGram.kcal).toBe(2.9);
    expect(fetchMacrosByCanonicalKey).toHaveBeenCalledWith('generic_hot_dog');
  });

  it('should timeout after 6 seconds and return estimated', async () => {
    const { fetchMacrosByCanonicalKey } = await import('@/lib/food/nutrition/hydrateCanonical');
    
    // Mock a slow response
    (fetchMacrosByCanonicalKey as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 10000))
    );

    const mockItem = {
      id: 'test-item',
      name: 'Pizza Slice',
      classId: 'pizza_slice'
    };

    const promise = hydrateNutritionV3(mockItem, { preferGeneric: true });
    
    // Fast-forward past the 6s timeout
    vi.advanceTimersByTime(6100);

    const result = await promise;

    expect(result.dataSource).toBe('Estimated');
    expect(result.isEstimated).toBe(true);
    expect(result.perGram.kcal).toBe(2.66); // pizza_slice heuristic
  });

  it('should return estimated fallback with correct heuristics', async () => {
    const { fetchMacrosByCanonicalKey, legacyHydrateByName } = await import('@/lib/food/nutrition/hydrateCanonical');
    
    // Mock all lookups to fail
    (fetchMacrosByCanonicalKey as any).mockResolvedValue(null);
    (legacyHydrateByName as any).mockResolvedValue(null);

    const mockItem = {
      id: 'test-item',
      name: 'California Roll',
      classId: 'california_roll'
    };

    const result = await hydrateNutritionV3(mockItem, { preferGeneric: true });

    expect(result.dataSource).toBe('Estimated');
    expect(result.isEstimated).toBe(true);
    expect(result.perGram.kcal).toBe(1.29); // california_roll heuristic
    expect(result.perGram.protein).toBe(0.04);
    expect(result.perGram.carbs).toBe(0.18);
    expect(result.perGram.fat).toBe(0.06);
  });

  it('should handle abort signal correctly', async () => {
    const { fetchMacrosByCanonicalKey } = await import('@/lib/food/nutrition/hydrateCanonical');
    
    const controller = new AbortController();
    
    // Mock a response that checks for abort
    (fetchMacrosByCanonicalKey as any).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (controller.signal.aborted) {
        throw new Error('Aborted');
      }
      return { perGram: { kcal: 1.0 } };
    });

    const mockItem = {
      id: 'test-item',
      name: 'Test Food'
    };

    const promise = hydrateNutritionV3(mockItem, { 
      signal: controller.signal, 
      preferGeneric: true 
    });

    // Abort after 50ms
    setTimeout(() => controller.abort(), 50);
    vi.advanceTimersByTime(50);

    await expect(promise).rejects.toThrow('Aborted');
  });
});