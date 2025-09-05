/**
 * Integration test for FoodConfirmationCard with manual entry
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FoodConfirmationCard from '@/components/FoodConfirmationCard';

// Mock dependencies
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

vi.mock('@/lib/nutrition/hydrateV3', () => ({
  hydrateNutritionV3: vi.fn()
}));

describe('FoodConfirmationCard Manual Entry Integration', () => {
  const mockHydrateV3 = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful hydration
    mockHydrateV3.mockResolvedValue({
      perGram: {
        kcal: 2.66,
        protein: 0.11,
        carbs: 0.33,
        fat: 0.10
      },
      perGramKeys: ['kcal', 'protein', 'carbs', 'fat'],
      dataSource: 'canonical',
      isEstimated: false,
      fromStore: false
    });
  });

  it('should show nutrition data for hawaiian pizza without infinite spinner', async () => {
    const mockFoodItem = {
      id: 'manual-pizza',
      name: 'Hawaiian Pizza',
      __source: 'manual',
      servingGrams: 125,
      calories: 333,
      protein: 14,
      carbs: 41,
      fat: 13,
      fiber: 2,
      sugar: 5,
      sodium: 600
    };

    const mockOnClose = vi.fn();
    const mockOnConfirm = vi.fn();

    render(
      FoodConfirmationCard({
        isOpen: true,
        onClose: mockOnClose,
        onConfirm: mockOnConfirm,
        foodItem: mockFoodItem,
        skipNutritionGuard: false,
        bypassHydration: false
      })
    );

    // Should show the food name
    expect(screen.getByText('Hawaiian Pizza')).toBeInTheDocument();

    // Should show Per serving text
    await waitFor(() => {
      expect(screen.getByText(/Per serving \(125 g\)/)).toBeInTheDocument();
    });

    // Should show macros (with NaN guards applied)  
    await waitFor(() => {
      expect(screen.getByText('14g')).toBeInTheDocument(); // protein
      expect(screen.getByText('41g')).toBeInTheDocument(); // carbs  
      expect(screen.getByText('13g')).toBeInTheDocument(); // fat
    });

    // Should show database lookup badge when dataSource is canonical
    await waitFor(() => {
      expect(screen.getByText('Database lookup')).toBeInTheDocument();
    });

    // Should NOT show infinite loading spinner
    expect(screen.queryByText('Loading nutrition data...')).not.toBeInTheDocument();
  });
});