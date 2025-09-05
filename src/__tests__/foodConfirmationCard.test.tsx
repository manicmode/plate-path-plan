/**
 * Tests for FoodConfirmationCard hydration behavior
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    render(
      <FoodConfirmationCard
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        foodItem={mockFoodItem}
        skipNutritionGuard={false}
        bypassHydration={false}
      />
    );

    // Dialog should be open and show loading state
    expect(screen.getByText('Loading nutrition data...')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we fetch detailed nutrition information')).toBeInTheDocument();
  });

  it('should show nutrition data when hydration is complete', () => {
    render(
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
    expect(screen.getByText('5g')).toBeInTheDocument(); // protein
    expect(screen.getByText('15g')).toBeInTheDocument(); // carbs
    expect(screen.getByText('3g')).toBeInTheDocument(); // fat
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

    render(
      <FoodConfirmationCard
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        foodItem={v3FoodItem}
        skipNutritionGuard={true}
      />
    );

    // Should show candidate picker
    expect(screen.getByText('Select the correct food:')).toBeInTheDocument();
    expect(screen.getByText('Alternative Food 1')).toBeInTheDocument();
    expect(screen.getByText('Alternative Food 2')).toBeInTheDocument();
    expect(screen.getByText('Generic')).toBeInTheDocument();
    expect(screen.getByText('Brand')).toBeInTheDocument();
  });
});