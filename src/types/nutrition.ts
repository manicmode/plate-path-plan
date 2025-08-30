/**
 * Standardized Nutrition Types
 * Unified types for nutrition data across the app
 */

export type PortionSource = 
  | 'ocr_declared'         // Found "serving size: 30g" in OCR
  | 'db_declared'          // Database has serving_size field
  | 'nutrition_ratio'      // Calculated from per100g vs perServing ratio
  | 'category_estimate'    // ML model estimate based on food category
  | 'user_set'            // User manually adjusted portion
  | 'fallback_default';   // 30g fallback when nothing else works

export interface PortionInfo {
  grams: number;                    // Resolved portion size in grams
  unit?: string;                    // Display unit: 'g' | 'ml' | 'cup' | 'tbsp' etc.
  source: PortionSource;            // How this portion was determined
  label?: string;                   // Human-readable: "45g · OCR" | "30g · est."
  confidence?: number;              // 0-2, higher = more reliable
  densityApplied?: boolean;         // True if ml→g conversion happened
  isEstimated?: boolean;            // Backwards compatibility
  display?: string;                 // Backwards compatibility
}

export interface NutritionPer100g {
  calories?: number;
  energy_kcal?: number;        // Alternative name for calories
  protein?: number;
  carbs?: number;
  fat?: number;
  saturated_fat?: number;
  sugar?: number;
  fiber?: number;
  sodium?: number;             // in mg
  [key: string]: any;          // Allow additional fields
}

export interface NutritionPerServing extends NutritionPer100g {
  // Same structure as NutritionPer100g but calculated for serving size
}

export interface FlagInfo {
  flag: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  source: 'ocr' | 'db' | 'calculation';
}

export interface HealthAnalysis {
  score: number;                    // 0-100 health score
  flags: FlagInfo[];
  portionInfo: PortionInfo;
  per100g: NutritionPer100g;
  perServing: NutritionPerServing;
}