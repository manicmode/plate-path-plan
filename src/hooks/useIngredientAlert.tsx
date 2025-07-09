import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FlaggedIngredient {
  name: string;
  category: string;
  description: string;
  severity: string;
}

export function useIngredientAlert() {
  const [flaggedIngredients, setFlaggedIngredients] = useState<FlaggedIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const checkIngredients = useCallback(async (ingredientsText: string) => {
    if (!ingredientsText?.trim()) {
      setFlaggedIngredients([]);
      return [];
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-flagged-ingredients', {
        body: { ingredients: ingredientsText }
      });

      if (error) {
        console.error('Error checking ingredients:', error);
        return [];
      }

      const flagged = data?.flaggedIngredients || [];
      setFlaggedIngredients(flagged);
      return flagged;
    } catch (error) {
      console.error('Error calling ingredient detection:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAlert = useCallback(() => {
    setFlaggedIngredients([]);
  }, []);

  return {
    flaggedIngredients,
    isLoading,
    checkIngredients,
    clearAlert,
    hasFlags: flaggedIngredients.length > 0
  };
}