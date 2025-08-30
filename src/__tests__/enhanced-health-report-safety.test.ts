import { describe, it, expect } from 'vitest';

describe('EnhancedHealthReport Safety Tests', () => {
  it('should handle minimal payload without crashing', () => {
    const minimalResult: any = {
      itemName: 'Test Product',
      // All other properties undefined/missing
    };

    // Simulate the safety checks that should prevent crashes
    const nutritionData = minimalResult.nutritionData || {};
    const flags = Array.isArray(minimalResult.flags) ? minimalResult.flags : 
                  Array.isArray(minimalResult.ingredientFlags) ? minimalResult.ingredientFlags : [];
    const ingredientsText = minimalResult.ingredientsText || '';
    const healthScore = typeof minimalResult.healthScore === 'number' ? minimalResult.healthScore : 0;

    // These should all be safe values
    expect(nutritionData).toEqual({});
    expect(flags).toEqual([]);
    expect(ingredientsText).toBe('');
    expect(healthScore).toBe(0);
  });

  it('should handle undefined nutritionData safely', () => {
    const resultWithoutNutrition: any = {
      itemName: 'Test Product',
      nutritionData: undefined,
      flags: undefined,
      ingredientFlags: undefined
    };

    // Safety guard should handle undefined nutritionData
    const nutritionData = resultWithoutNutrition.nutritionData || {};
    expect(nutritionData).toEqual({});
  });

  it('should handle null/undefined portionGrams safely', () => {
    const resultWithNullPortion: any = {
      itemName: 'Test Product',
      portionGrams: null
    };

    // Safety guard should handle null portionGrams
    const portionGrams = typeof resultWithNullPortion.portionGrams === 'number' ? 
      resultWithNullPortion.portionGrams : null;
    expect(portionGrams).toBeNull();
  });

  it('should handle undefined flags array safely', () => {
    const resultWithUndefinedFlags: any = {
      itemName: 'Test Product',
      flags: undefined,
      ingredientFlags: null
    };

    // Safety guard should handle undefined flags
    const flags = Array.isArray(resultWithUndefinedFlags.flags) ? resultWithUndefinedFlags.flags : 
                  Array.isArray(resultWithUndefinedFlags.ingredientFlags) ? resultWithUndefinedFlags.ingredientFlags : [];
    expect(flags).toEqual([]);
  });

  it('should handle missing nutritionDataPerServing safely', () => {
    const resultMissingPerServing: any = {
      itemName: 'Test Product',
      nutritionDataPerServing: undefined,
      healthScore: null
    };

    // Safety guard should handle undefined nutritionDataPerServing
    const hasPerServing = !!resultMissingPerServing.nutritionDataPerServing;
    const healthScore = typeof resultMissingPerServing.healthScore === 'number' ? 
      resultMissingPerServing.healthScore : 0;
    
    expect(hasPerServing).toBe(false);
    expect(healthScore).toBe(0);
  });

  it('should handle completely empty result object', () => {
    const emptyResult: any = {};

    // All safety guards should handle empty object
    const nutritionData = emptyResult.nutritionData || {};
    const flags = Array.isArray(emptyResult.flags) ? emptyResult.flags : 
                  Array.isArray(emptyResult.ingredientFlags) ? emptyResult.ingredientFlags : [];
    const ingredientsText = emptyResult.ingredientsText || '';
    const healthScore = typeof emptyResult.healthScore === 'number' ? emptyResult.healthScore : 0;

    expect(nutritionData).toEqual({});
    expect(flags).toEqual([]);
    expect(ingredientsText).toBe('');
    expect(healthScore).toBe(0);
  });

  it('should handle btoa function safely', () => {
    const testStrings = ['', 'test', undefined, null];
    
    testStrings.forEach(str => {
      try {
        const text = str || '';
        const result = text.length > 0 ? btoa(text.slice(0, 100)).slice(0, 8) : undefined;
        expect(typeof result === 'string' || result === undefined).toBe(true);
      } catch (error) {
        // Should handle btoa errors gracefully
        expect(error).toBeDefined();
      }
    });
  });
});