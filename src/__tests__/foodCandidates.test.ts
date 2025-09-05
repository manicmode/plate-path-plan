/**
 * Golden tests for food candidate search
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFoodCandidates, shouldShowCandidatePicker } from '@/lib/food/search/getFoodCandidates';

// Mock the dependencies
vi.mock('@/lib/foodSearch', () => ({
  searchFoodByName: vi.fn()
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

describe('Food Candidates Golden Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const testCases = [
    {
      query: 'grilled chicken',
      expectedNames: ['grilled chicken breast', 'chicken breast cooked', 'chicken fillet grilled']
    },
    {
      query: 'california roll',
      expectedNames: ['california roll sushi', 'sushi california roll', 'california maki']
    },
    {
      query: 'hot dog',
      expectedNames: ['hot dog', 'frankfurter', 'wiener']
    },
    {
      query: 'white rice',
      expectedNames: ['white rice cooked', 'jasmine rice', 'basmati rice']
    },
    {
      query: 'oatmeal',
      expectedNames: ['oatmeal cooked', 'rolled oats', 'steel cut oats']
    },
    {
      query: 'egg large',
      expectedNames: ['egg large', 'chicken egg large', 'whole egg large']
    }
  ];

  testCases.forEach(({ query, expectedNames }) => {
    it(`should return appropriate candidates for "${query}"`, async () => {
      // Mock search results
      const { searchFoodByName } = await import('@/lib/foodSearch');
      (searchFoodByName as any).mockResolvedValue(
        expectedNames.map((name, index) => ({
          id: `test-${index}`,
          name,
          caloriesPer100g: 150 + index * 10,
          confidence: 0.9 - index * 0.1
        }))
      );

      const candidates = await getFoodCandidates(query, 6);
      
      expect(candidates).toHaveLength(expectedNames.length);
      expect(candidates[0].confidence).toBeGreaterThan(0.5);
      expect(candidates.every(c => c.name.toLowerCase().includes(query.split(' ')[0]))).toBe(true);
    });
  });

  it('should show candidate picker for low confidence', () => {
    const candidates = [
      { confidence: 0.6, name: 'test' } as any,
      { confidence: 0.5, name: 'test2' } as any
    ];
    
    expect(shouldShowCandidatePicker(candidates)).toBe(true);
  });

  it('should show candidate picker for close scores', () => {
    const candidates = [
      { confidence: 0.85, name: 'test1' } as any,
      { confidence: 0.75, name: 'test2' } as any // gap = 0.10 < 0.15
    ];
    
    expect(shouldShowCandidatePicker(candidates)).toBe(true);
  });

  it('should not show candidate picker for high confidence with large gap', () => {
    const candidates = [
      { confidence: 0.90, name: 'test1' } as any,
      { confidence: 0.60, name: 'test2' } as any // gap = 0.30 > 0.15
    ];
    
    expect(shouldShowCandidatePicker(candidates)).toBe(false);
  });
});