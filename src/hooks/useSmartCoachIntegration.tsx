import { useState, useCallback } from "react";
import type { FlaggedIngredient } from "@/types/ingredients";
import { useCoachFlaggedResponse } from "@/hooks/useCoachFlaggedResponse";
import { useNutrition } from "@/contexts/NutritionContext";
import { useAuth } from "@/contexts/auth";

export function useSmartCoachIntegration() {
  const { generateFlaggedIngredientsResponse, isGeneratingResponse } = useCoachFlaggedResponse();
  const { currentDay } = useNutrition();
  const { user } = useAuth();

  const triggerCoachResponseForIngredients = useCallback(async (
    flaggedIngredients: FlaggedIngredient[],
    onCoachMessage?: (message: any) => void
  ) => {
    if (!flaggedIngredients.length || !onCoachMessage) return;

    // Build user context for the coach
    const progress = {
      calories: currentDay.foods.reduce((sum, food) => sum + (food.calories || 0), 0),
      protein: currentDay.foods.reduce((sum, food) => sum + (food.protein || 0), 0),
      carbs: currentDay.foods.reduce((sum, food) => sum + (food.carbs || 0), 0),
      fat: currentDay.foods.reduce((sum, food) => sum + (food.fat || 0), 0),
    };

    const userContext = {
      user: {
        name: user?.name,
        targetCalories: user?.targetCalories,
        targetProtein: user?.targetProtein,
        targetCarbs: user?.targetCarbs,
        targetFat: user?.targetFat,
        allergies: user?.allergies,
        dietaryGoals: user?.dietaryGoals,
      },
      progress,
      todaysFoods: currentDay.foods.map(f => ({
        name: f.name,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
      })),
      hydration: currentDay.totalHydration,
      supplements: currentDay.supplements.length,
    };

    try {
      const coachMessage = await generateFlaggedIngredientsResponse(flaggedIngredients, userContext);
      if (coachMessage) {
        onCoachMessage(coachMessage);
      }
    } catch (error) {
      console.error('Error triggering coach response:', error);
    }
  }, [generateFlaggedIngredientsResponse, currentDay, user]);

  return {
    triggerCoachResponseForIngredients,
    isGeneratingResponse
  };
}