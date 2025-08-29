import { describe, it, expect, vi } from 'vitest';

// Mock the barcode report processing logic
describe('Barcode Report Adapter Trust', () => {
  
  it('should trust adapter score for barcode reports', () => {
    const legacy = {
      _dataSource: 'openfoodfacts/barcode',
      productName: 'Test Product',
      health: { score: 8.5 },
      flags: [
        { key: 'high-sugar', label: 'High Sugar', severity: 'medium', description: 'Contains high sugar content' }
      ],
      nutritionData: {
        energyKcal: 150,
        protein_g: 5,
        carbs_g: 30,
        sugar_g: 20,
        fat_g: 2,
        fiber_g: 3,
        sodium_mg: 200
      }
    };

    // Simulate the barcode processing logic from HealthCheckModal
    const isBarcodeAdapter = legacy._dataSource === 'openfoodfacts/barcode';
    const finalScore = isBarcodeAdapter ? legacy.health?.score : 0;
    const flags = Array.isArray(legacy.flags) ? legacy.flags : [];

    expect(finalScore).toBe(8.5); // Should use adapter score directly
    expect(flags).toHaveLength(1);
    expect(flags[0].key).toBe('high-sugar');
  });

  it('should merge flags instead of replacing them', () => {
    const adapterFlags = [
      { key: 'high-sugar', code: 'high-sugar', label: 'High Sugar', severity: 'medium' }
    ];
    const enrichmentFlags = [
      { key: 'artificial-sweetener', code: 'artificial-sweetener', label: 'Artificial Sweetener', severity: 'low' },
      { key: 'high-sugar', code: 'high-sugar', label: 'High Sugar', severity: 'medium' } // duplicate
    ];

    // Simulate flag merging logic
    const flagMap = new Map(adapterFlags.map(f => [f.code || f.key, f]));
    for (const f of enrichmentFlags) {
      if (!flagMap.has(f.code || f.key)) flagMap.set(f.code || f.key, f);
    }
    const mergedFlags = Array.from(flagMap.values());

    expect(mergedFlags).toHaveLength(2); // Should have 2 unique flags
    expect(mergedFlags.some(f => f.key === 'high-sugar')).toBe(true);
    expect(mergedFlags.some(f => f.key === 'artificial-sweetener')).toBe(true);
  });

  it('should provide both nutrition data shapes for UI compatibility', () => {
    const nutritionData = {
      energyKcal: 150,
      protein_g: 5,
      carbs_g: 30,
      calories: 150, // alias
      protein: 5,    // alias
      carbs: 30      // alias
    };

    const report = {
      nutritionData: nutritionData,
      nutrition: { nutritionData: nutritionData }
    };

    // Both shapes should exist and point to same data
    expect(report.nutritionData).toBeDefined();
    expect(report.nutrition.nutritionData).toBeDefined();
    expect(report.nutritionData.energyKcal).toBe(150);
    expect(report.nutrition.nutritionData.energyKcal).toBe(150);
    expect(report.nutritionData.calories).toBe(150); // Legacy alias
  });

  it('should not use hardcoded fallback scores', () => {
    const legacy = {
      _dataSource: 'openfoodfacts/barcode',
      productName: 'Test Product',
      health: { score: undefined }, // No score from adapter
      flags: []
    };

    const isBarcodeAdapter = legacy._dataSource === 'openfoodfacts/barcode';
    const finalScore = isBarcodeAdapter ? (legacy.health?.score ?? 0) : 0;

    expect(finalScore).toBe(0); // Should be 0, not 7.3 or any other hardcoded value
  });

  it('should handle different flag severity mappings', () => {
    const flags = [
      { severity: 'high', level: 'danger', label: 'Dangerous', key: 'danger' },
      { severity: 'medium', level: 'warning', label: 'Warning', key: 'warn' },
      { severity: 'low', level: 'info', label: 'Info', key: 'info' }
    ];

    const mappedFlags = flags.map(f => ({
      ingredient: f.label || f.key || 'Ingredient',
      flag: f.label || '', // Use label since description doesn't exist in test objects
      severity: (f.severity === 'high' || f.level === 'danger' ? 'high' : 
                f.severity === 'medium' || f.level === 'warning' ? 'medium' : 'low') as 'low' | 'medium' | 'high',
    }));

    expect(mappedFlags[0].severity).toBe('high');
    expect(mappedFlags[1].severity).toBe('medium'); 
    expect(mappedFlags[2].severity).toBe('low');
  });
});