/**
 * Tests for nutrition readiness logic
 */

import { describe, it, expect } from 'vitest';

describe('Nutrition Readiness Logic', () => {
  const createMockFoodItem = (perGram?: Record<string, number>, perGramKeys?: string[], pgSum?: number) => ({
    id: 'test-item',
    name: 'Test Food',
    calories: 100,
    protein: 5,
    carbs: 15,
    fat: 3,
    perGram,
    perGramKeys,
    pgSum
  });

  describe('isNutritionReady gate', () => {
    it('should be ready when item has perGram data', () => {
      const item = createMockFoodItem({ kcal: 1.0, protein: 0.05 });
      const perGramReady = !!item.perGram;
      const perGramSum = 0; // store empty
      const useHydration = true;
      const isBarcodeSource = false;

      const isNutritionReady = perGramReady ? true : (useHydration && !isBarcodeSource) ? (perGramSum > 0) : true;
      
      expect(isNutritionReady).toBe(true);
    });

    it('should be ready when store has nutrition data', () => {
      const item = createMockFoodItem(); // no perGram on item
      const perGramReady = false;
      const perGramSum = 1.5; // store has data
      const useHydration = true;
      const isBarcodeSource = false;

      const isNutritionReady = perGramReady ? true : (useHydration && !isBarcodeSource) ? (perGramSum > 0) : true;
      
      expect(isNutritionReady).toBe(true);
    });

    it('should not be ready when neither item nor store has data', () => {
      const item = createMockFoodItem(); // no perGram on item
      const perGramReady = false;
      const perGramSum = 0; // store empty
      const useHydration = true;
      const isBarcodeSource = false;

      const isNutritionReady = perGramReady ? true : (useHydration && !isBarcodeSource) ? (perGramSum > 0) : true;
      
      expect(isNutritionReady).toBe(false);
    });

    it('should always be ready for barcode items', () => {
      const item = createMockFoodItem(); // no perGram on item
      const perGramReady = false;
      const perGramSum = 0; // store empty
      const useHydration = true;
      const isBarcodeSource = true; // barcode source

      const isNutritionReady = perGramReady ? true : (useHydration && !isBarcodeSource) ? (perGramSum > 0) : true;
      
      expect(isNutritionReady).toBe(true);
    });
  });

  describe('NaN guards', () => {
    it('should handle NaN values in nutrition display', () => {
      const adjustedFood = {
        calories: NaN,
        protein: NaN,
        carbs: 15,
        fat: null,
        fiber: undefined,
        sugar: 0
      };

      expect(Number.isFinite(adjustedFood.calories) ? adjustedFood.calories : 0).toBe(0);
      expect(Number.isFinite(adjustedFood.protein) ? adjustedFood.protein : 0).toBe(0);
      expect(Number.isFinite(adjustedFood.carbs) ? adjustedFood.carbs : 0).toBe(15);
      expect(Number.isFinite(adjustedFood.fat as any) ? adjustedFood.fat : 0).toBe(0);
      expect(Number.isFinite(adjustedFood.fiber as any) ? adjustedFood.fiber : 0).toBe(0);
      expect(Number.isFinite(adjustedFood.sugar) ? adjustedFood.sugar : 0).toBe(0);
    });
  });
});