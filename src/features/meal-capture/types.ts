/**
 * Meal Capture Feature Types
 * REV: MEAL_REV_SBX=2025-08-31T17:55Z-r2
 */

export interface MealItem {
  id: string;
  label: string;         // e.g., 'potato', 'eggs', 'noodles'
  confidence: number;    // 0..1
  cropUrl?: string;      // small thumb for UI
  bbox?: [number, number, number, number]; // x,y,w,h
  gramsEstimate?: number; // rough portion
}

export interface MealCaptureState {
  mode: 'meal-capture';
  imageHttpUrl?: string;
  items?: MealItem[];
}

export interface MealGateResult {
  isMeal: boolean;
  reason: string;
  foodScore?: number;
  packageScore?: number;
}