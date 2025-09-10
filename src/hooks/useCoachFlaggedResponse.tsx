import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FlaggedIngredient } from "@/types/ingredients";

export interface CoachMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export function useCoachFlaggedResponse() {
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);

  const generateFlaggedIngredientsResponse = useCallback(async (
    flaggedIngredients: FlaggedIngredient[],
    userContext?: any
  ): Promise<CoachMessage | null> => {
    if (!flaggedIngredients.length) return null;

    setIsGeneratingResponse(true);
    try {
      // Create a summary message about the flagged ingredients
      const ingredientSummary = `I just logged food that contains these concerning ingredients: ${flaggedIngredients.map(ing => ing.name).join(', ')}. Can you help me understand what's concerning about these and suggest healthier alternatives?`;

      const { data, error } = await supabase.functions.invoke('ai-coach-chat', {
        body: {
          message: ingredientSummary,
          userContext,
          flaggedIngredients
        },
      });

      if (error) {
        console.error('Error generating coach response:', error);
        return null;
      }

      return {
        id: Date.now().toString(),
        content: data.response,
        isUser: false,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error calling coach for flagged ingredients:', error);
      return null;
    } finally {
      setIsGeneratingResponse(false);
    }
  }, []);

  return {
    generateFlaggedIngredientsResponse,
    isGeneratingResponse
  };
}