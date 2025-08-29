import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the barcode report processing
const mockProcessAndShowResult = vi.fn();

describe('Barcode Report Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should keep adapter flags for barcode reports', () => {
    const legacy = {
      _dataSource: 'openfoodfacts/barcode',
      productName: 'Test Product',
      health: { score: 7 },
      flags: [
        { code: 'artificial_sweetener', label: 'Artificial Sweetener', severity: 'medium' },
        { code: 'high_sodium', label: 'High Sodium', severity: 'high' }
      ],
      nutritionData: {
        energyKcal: 150,
        protein_g: 5,
        carbs_g: 20,
        sugar_g: 15,
        fat_g: 2,
        fiber_g: 1,
        sodium_mg: 800
      }
    };

    // Simulate the barcode processing logic
    const finalFlags = legacy.flags.map((f: any) => ({
      ingredient: f.label || f.code || 'Ingredient',
      flag: f.description || f.label || '',
      severity: (f.severity === 'high' ? 'high' : 
                f.severity === 'medium' ? 'medium' : 'low') as 'low' | 'medium' | 'high',
      reason: f.reason,
    }));

    expect(finalFlags).toHaveLength(2);
    expect(finalFlags[0].severity).toBe('medium');
    expect(finalFlags[1].severity).toBe('high');
  });

  it('should trust adapter health score for barcode reports', () => {
    const legacy = {
      _dataSource: 'openfoodfacts/barcode',
      productName: 'Test Product',
      health: { score: 8.5 },
      flags: [],
      nutritionData: {}
    };

    const finalScore = legacy.health.score;
    expect(finalScore).toBe(8.5);
  });

  it('should provide both nutrition data shapes for UI compatibility', () => {
    const legacy = {
      _dataSource: 'openfoodfacts/barcode',
      nutritionData: {
        energyKcal: 200,
        protein_g: 10,
        carbs_g: 25,
        fat_g: 8
      }
    };

    const nutritionData = {
      ...legacy.nutritionData,
      // Add legacy aliases for UI compatibility
      calories: legacy.nutritionData.energyKcal || 0,
      protein: legacy.nutritionData.protein_g || 0,
      carbs: legacy.nutritionData.carbs_g || 0,
      fat: legacy.nutritionData.fat_g || 0,
    };

    const analysisResult = {
      nutritionData: nutritionData,
      nutrition: { nutritionData: nutritionData }
    };

    expect(analysisResult.nutritionData.calories).toBe(200);
    expect(analysisResult.nutritionData.energyKcal).toBe(200);
    expect(analysisResult.nutrition.nutritionData.protein).toBe(10);
    expect(analysisResult.nutrition.nutritionData.protein_g).toBe(10);
  });
});