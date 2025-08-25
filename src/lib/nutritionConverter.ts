import { RecognizedFood } from '@/hooks/useCameraState';

export interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  image?: string;
  barcode?: string;
  ingredientsText?: string;
  ingredientsAvailable?: boolean;
  source?: string;
  confidence?: number;
}

export const convertRecognizedFoodToFoodItem = (recognizedFood: RecognizedFood): FoodItem => {
  return {
    name: recognizedFood.name,
    calories: recognizedFood.calories,
    protein: recognizedFood.protein,
    carbs: recognizedFood.carbs,
    fat: recognizedFood.fat,
    fiber: recognizedFood.fiber,
    sugar: recognizedFood.sugar,
    sodium: recognizedFood.sodium,
    barcode: recognizedFood.barcode,
    ingredientsText: recognizedFood.ingredients,
    ingredientsAvailable: !!recognizedFood.ingredients,
    source: recognizedFood.source,
    confidence: recognizedFood.confidence
  };
};