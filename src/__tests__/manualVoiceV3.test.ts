/**
 * Manual test for v3 text lookup system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Enable v3 for testing
vi.stubEnv('VITE_FOOD_TEXT_V3', '1');
vi.stubEnv('VITE_FOOD_TEXT_DEBUG', '1');

describe('Manual/Voice v3 System', () => {
  const acceptanceCases = [
    {
      query: 'hot dog', 
      expectedPortion: 50,
      expectedUnit: 'link',
      expectedType: 'hot_dog_link'
    },
    {
      query: 'hawaii pizza slice',
      expectedPortion: 125, 
      expectedUnit: 'slice',
      expectedType: 'pizza_slice'
    },
    {
      query: 'teriyaki bowl',
      expectedPortion: 350,
      expectedUnit: 'bowl', 
      expectedType: 'teriyaki_bowl'
    },
    {
      query: 'california roll',
      expectedPortion: 170,
      expectedUnit: 'roll',
      expectedType: 'california_roll'
    },
    {
      query: 'grilled chicken',
      expectedPortion: 113,
      expectedUnit: 'piece',
      expectedType: 'chicken_breast'
    }
  ];

  acceptanceCases.forEach(({ query, expectedPortion, expectedUnit, expectedType }) => {
    it(`should handle "${query}" with realistic portions`, async () => {
      const { inferPortion } = await import('@/lib/food/portion/inferPortion');
      const { parseQuery } = await import '@/lib/food/text/parse');
      
      const facets = parseQuery(query);
      const portion = inferPortion(query, query, facets, expectedType);
      
      expect(portion.grams).toBe(expectedPortion);
      expect(portion.unit).toBe(expectedUnit);
      expect(portion.confidence).toBe('high');
      
      console.log(`✅ ${query}: ${portion.grams}g (${portion.unit})`);
    });
  });

  it('should handle typo normalization', async () => {
    const { normalizeQuery } = await import('@/lib/food/text/food_aliases');
    
    const cases = [
      { input: 'hawai pizza', expected: 'hawaii pizza' },
      { input: 'califirnia roll', expected: 'california roll' },
      { input: 'teriaki bowl', expected: 'teriyaki bowl' },
      { input: 'peperoni pizza', expected: 'pepperoni pizza' }
    ];
    
    cases.forEach(({ input, expected }) => {
      const normalized = normalizeQuery(input);
      expect(normalized).toBe(expected);
      console.log(`✅ "${input}" → "${normalized}"`);
    });
  });

  it('should parse facets correctly', async () => {
    const { parseQuery } = await import('@/lib/food/text/parse');
    
    const cases = [
      {
        query: 'grilled chicken breast',
        expectedCore: ['chicken'],
        expectedPrep: ['grilled']
      },
      {
        query: 'hawaii pizza slice', 
        expectedCore: ['pizza'],
        expectedCuisine: ['hawaiian']
      },
      {
        query: '2 slices pizza',
        expectedCore: ['pizza'],
        expectedUnits: { count: 2, unit: 'slice' }
      }
    ];
    
    cases.forEach(({ query, expectedCore, expectedPrep, expectedCuisine, expectedUnits }) => {
      const facets = parseQuery(query);
      
      if (expectedCore) {
        expect(facets.core.some(c => expectedCore.includes(c))).toBe(true);
      }
      if (expectedPrep) {
        expect(facets.prep.some(p => expectedPrep.includes(p))).toBe(true);
      }
      if (expectedCuisine) {
        expect(facets.cuisine.some(c => expectedCuisine.includes(c))).toBe(true);
      }
      if (expectedUnits) {
        expect(facets.units?.count).toBe(expectedUnits.count);
        expect(facets.units?.unit).toBe(expectedUnits.unit);
      }
      
      console.log(`✅ "${query}":`, facets);
    });
  });
});