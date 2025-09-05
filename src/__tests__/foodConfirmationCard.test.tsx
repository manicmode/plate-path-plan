/**
 * Tests for FoodConfirmationCard hydration behavior
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import FoodConfirmationCard from '@/components/FoodConfirmationCard';

// Mock the hooks and dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

vi.mock('@/hooks/useIngredientAlert', () => ({
  useIngredientAlert: () => ({
    checkIngredients: vi.fn(),
    flaggedIngredients: [],
    isLoading: false
  })
}));

vi.mock('@/hooks/useSmartCoachIntegration', () => ({
  useSmartCoachIntegration: () => ({
    triggerCoachResponseForIngredients: vi.fn()
  })
}));

vi.mock('@/hooks/useSound', () => ({
  useSound: () => ({
    playFoodLogConfirm: vi.fn()
  })
}));

vi.mock('@/stores/nutritionStore', () => ({
  useNutritionStore: () => ({})
}));

vi.mock('@/lib/debug/extractName', () => ({
  extractName: ({ name }: { name: string }) => name
}));

describe('FoodConfirmationCard Hydration', () => {
  const mockFoodItem = {
    id: 'test-item',
    name: 'Test Food',
    calories: 100,
    protein: 5,
    carbs: 15,
    fat: 3,
    fiber: 2,
    sugar: 8,
    sodium: 200,
    source: 'manual',
    __source: 'manual'
  };

  it('should render dialog when nutrition is loading', () => {
    const { container } = render(
      <FoodConfirmationCard
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        foodItem={mockFoodItem}
        skipNutritionGuard={false}
        bypassHydration={false}
      />
    );

    // Dialog should be open and contain loading text
    expect(container.textContent).toContain('Loading nutrition data...');
  });

  it('should show nutrition data when hydration is complete', () => {
    const { container } = render(
      <FoodConfirmationCard
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        foodItem={mockFoodItem}
        skipNutritionGuard={true}
        bypassHydration={false}
      />
    );

    // Should show actual nutrition values
    expect(container.textContent).toContain('5g'); // protein
    expect(container.textContent).toContain('15g'); // carbs
    expect(container.textContent).toContain('3g'); // fat
  });

  it('should show candidate picker for v3 items with alt candidates', () => {
    const v3FoodItem = {
      ...mockFoodItem,
      __altCandidates: [
        {
          id: 'alt-1', 
          name: 'Alternative Food 1',
          servingG: 125,
          calories: 150,
          kind: 'generic'
        },
        {
          id: 'alt-2',
          name: 'Alternative Food 2', 
          servingG: 100,
          calories: 120,
          kind: 'brand'
        }
      ]
    };

    const { container } = render(
      <FoodConfirmationCard
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        foodItem={v3FoodItem}
        skipNutritionGuard={true}
      />
    );

    // Should show candidate picker text
    expect(container.textContent).toContain('Alternative Food 1');
    expect(container.textContent).toContain('Alternative Food 2');
  });
});