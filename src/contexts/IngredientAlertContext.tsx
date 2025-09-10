import React, { createContext, useContext, useState, ReactNode } from "react";
import { IngredientAlert } from "@/components/IngredientAlert";
import type { FlaggedIngredient } from "@/types/ingredients";

interface IngredientAlertContextType {
  showAlert: (ingredients: FlaggedIngredient[]) => void;
  hideAlert: () => void;
  isVisible: boolean;
}

const IngredientAlertContext = createContext<IngredientAlertContextType | undefined>(undefined);

export function useIngredientAlertContext() {
  const context = useContext(IngredientAlertContext);
  if (!context) {
    throw new Error("useIngredientAlertContext must be used within IngredientAlertProvider");
  }
  return context;
}

interface IngredientAlertProviderProps {
  children: ReactNode;
}

export function IngredientAlertProvider({ children }: IngredientAlertProviderProps) {
  const [flaggedIngredients, setFlaggedIngredients] = useState<FlaggedIngredient[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const showAlert = (ingredients: FlaggedIngredient[]) => {
    if (ingredients.length > 0) {
      setFlaggedIngredients(ingredients);
      setIsVisible(true);
    }
  };

  const hideAlert = () => {
    setIsVisible(false);
    setTimeout(() => {
      setFlaggedIngredients([]);
    }, 300);
  };

  return (
    <IngredientAlertContext.Provider value={{ showAlert, hideAlert, isVisible }}>
      {children}
      {isVisible && (
        <IngredientAlert
          flaggedIngredients={flaggedIngredients}
          onDismiss={hideAlert}
        />
      )}
    </IngredientAlertContext.Provider>
  );
}