
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AllergenPreferences {
  allergens: string[];
  restrictedIngredients: string[];
}

export const useAllergenDetection = () => {
  const { user } = useAuth();
  const [allergenPreferences, setAllergenPreferences] = useState<AllergenPreferences>({
    allergens: [],
    restrictedIngredients: []
  });
  const [detectedAllergens, setDetectedAllergens] = useState<string[]>([]);

  // Load user allergen preferences from localStorage
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`allergen_preferences_${user.id}`);
      if (saved) {
        setAllergenPreferences(JSON.parse(saved));
      }
    }
  }, [user]);

  // Save allergen preferences
  const updateAllergenPreferences = useCallback((preferences: AllergenPreferences) => {
    setAllergenPreferences(preferences);
    if (user) {
      localStorage.setItem(`allergen_preferences_${user.id}`, JSON.stringify(preferences));
    }
  }, [user]);

  // Check for allergens in detected ingredients
  const checkForAllergens = useCallback((ingredients: string[]) => {
    const allRestrictedItems = [
      ...allergenPreferences.allergens,
      ...allergenPreferences.restrictedIngredients
    ].map(item => item.toLowerCase());

    const detected = ingredients.filter(ingredient => 
      allRestrictedItems.some(restricted => 
        ingredient.toLowerCase().includes(restricted) ||
        restricted.includes(ingredient.toLowerCase())
      )
    );

    if (detected.length > 0) {
      setDetectedAllergens(detected);
      return true;
    }
    return false;
  }, [allergenPreferences]);

  const clearAllergenAlert = useCallback(() => {
    setDetectedAllergens([]);
  }, []);

  return {
    allergenPreferences,
    updateAllergenPreferences,
    checkForAllergens,
    detectedAllergens,
    clearAllergenAlert
  };
};
