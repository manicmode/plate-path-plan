export interface FlaggedIngredient {
  name: string;
  category: string;
  description: string;
  severity: string;
}

export interface IngredientAlertProps {
  flaggedIngredients: FlaggedIngredient[];
  onDismiss: () => void;
  autoHideDuration?: number;
}