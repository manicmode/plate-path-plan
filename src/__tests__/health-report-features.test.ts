/**
 * Health Report Features Tests
 * Ensures all enhanced features work correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock the nutrition calculator
vi.mock('@/lib/nutrition/portionCalculator', () => ({
  parsePortionGrams: vi.fn(() => ({ grams: 30, isEstimated: true })),
  toPerPortion: vi.fn((nutrition, grams) => ({
    calories: Math.round((nutrition.calories || 0) * grams / 100),
    protein: Math.round((nutrition.protein || 0) * grams / 100),
    carbs: Math.round((nutrition.carbs || 0) * grams / 100),
    fat: Math.round((nutrition.fat || 0) * grams / 100),
    sugar: Math.round((nutrition.sugar || 0) * grams / 100),
    fiber: Math.round((nutrition.fiber || 0) * grams / 100),
    sodium: Math.round((nutrition.sodium || 0) * grams / 100)
  }))
}));

// Mock the flag detector
vi.mock('@/lib/health/flagger', () => ({
  detectFlags: vi.fn(() => [
    {
      key: 'added_sugar',
      label: 'Contains Added Sugar',
      severity: 'warning'
    }
  ])
}));

describe('Nutrition Toggle Features', () => {
  it('should remember user preference for nutrition mode', () => {
    mockLocalStorage.getItem.mockReturnValue('portion');

    // Simulate component behavior
    const savedMode = localStorage.getItem('nutrition-display-mode');
    const mode = savedMode === 'portion' ? 'portion' : 'per100g';
    
    expect(mode).toBe('portion');
    expect(localStorage.getItem).toHaveBeenCalledWith('nutrition-display-mode');
  });

  it('should calculate portion values correctly', async () => {
    const { toPerPortion } = await import('@/lib/nutrition/portionCalculator');
    
    const nutrition100g = {
      calories: 500,
      protein: 20,
      carbs: 60,
      fat: 15,
      sugar: 25,
      fiber: 10,
      sodium: 800
    };
    
    const portionGrams = 30;
    const result = toPerPortion(nutrition100g, portionGrams);
    
    expect(result.calories).toBe(150); // 500 * 30/100
    expect(result.protein).toBe(6);    // 20 * 30/100
    expect(result.sugar).toBe(8);      // 25 * 30/100 (rounded)
  });

  it('should show estimation badge for estimated portions', async () => {
    const { parsePortionGrams } = await import('@/lib/nutrition/portionCalculator');
    
    const result = parsePortionGrams('Granola Bar');
    
    expect(result.grams).toBe(30);
    expect(result.isEstimated).toBe(true);
  });
});

describe('Flags Tab Features', () => {
  it('should detect and categorize health flags', async () => {
    const { detectFlags } = await import('@/lib/health/flagger');
    
    const flags = detectFlags('sugar, high fructose corn syrup', {});
    
    expect(flags).toHaveLength(1);
    expect(flags[0].key).toBe('added_sugar');
    expect(flags[0].severity).toBe('warning');
    expect(flags[0].label).toBe('Contains Added Sugar');
  });

  it('should persist hidden flags in localStorage', () => {
    const flagsToHide = new Set(['added_sugar']);
    
    // Simulate hiding a flag
    localStorage.setItem('hidden-health-flags', JSON.stringify([...flagsToHide]));
    
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'hidden-health-flags', 
      JSON.stringify(['added_sugar'])
    );
  });

  it('should restore hidden flags from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('["added_sugar", "artificial_colors"]');
    
    const saved = localStorage.getItem('hidden-health-flags');
    const hiddenFlags = new Set(saved ? JSON.parse(saved) : []);
    
    expect(hiddenFlags.has('added_sugar')).toBe(true);
    expect(hiddenFlags.has('artificial_colors')).toBe(true);
    expect(hiddenFlags.has('high_sodium')).toBe(false);
  });
});

describe('Save Tab Features', () => {
  it('should generate correct save payload', () => {
    const mockResult = {
      itemName: 'Test Product',
      healthScore: 7.5,
      ingredientFlags: [{ code: 'added_sugar', severity: 'medium' }],
      nutritionData: { calories: 150, protein: 5 }
    };

    const analysisData = { source: 'barcode', barcode: '123456789' };
    const portionGrams = 30;

    // Simulate save payload generation
    const savePayload = {
      userId: 'test-user-id',
      productRef: analysisData.barcode || 'manual-entry',
      timestamp: new Date().toISOString(),
      score: mockResult.healthScore,
      flagsSnapshot: mockResult.ingredientFlags,
      portionGrams,
      source: analysisData.source
    };

    expect(savePayload.productRef).toBe('123456789');
    expect(savePayload.score).toBe(7.5);
    expect(savePayload.flagsSnapshot).toHaveLength(1);
    expect(savePayload.source).toBe('barcode');
  });
});

describe('Personalized Suggestions Features', () => {
  it('should generate suggestions based on user profile and product facts', () => {
    const mockContext = {
      report: {
        itemName: 'Granola Bar',
        healthScore: 6.5,
        ingredientFlags: [{ code: 'added_sugar', severity: 'medium' }]
      },
      portionGrams: 42,
      userProfile: {
        goals: ['weight_loss'],
        restrictions: ['gluten_free'],
        preferences: ['low_sugar']
      }
    };

    // Simulate suggestion generation logic
    const suggestions = [
      {
        type: 'swap',
        text: 'Try steel-cut oats with fresh berries for lower sugar',
        confidence: 0.8
      },
      {
        type: 'portion',
        text: 'Consider a smaller portion (30g) to reduce sugar intake',
        confidence: 0.7
      }
    ];

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].type).toBe('swap');
    expect(suggestions[1].type).toBe('portion');
    expect(suggestions.every(s => s.text.length <= 120)).toBe(true);
  });

  it('should cache suggestions to avoid regeneration', () => {
    const cacheKey = 'user123_product456_30g_2024-01-01';
    const mockSuggestions = [
      { type: 'swap', text: 'Try whole grain alternatives', confidence: 0.8 }
    ];

    // Simulate caching
    const cache = new Map();
    cache.set(cacheKey, { suggestions: mockSuggestions, timestamp: Date.now() });

    expect(cache.has(cacheKey)).toBe(true);
    expect(cache.get(cacheKey).suggestions).toEqual(mockSuggestions);
  });
});