export type ScanSource = 'manual' | 'voice' | 'barcode' | 'photo' | 'off';

export interface NormalizedProduct {
  id?: string | null;
  barcode?: string | null;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  nutriments?: {
    energy_kcal?: number | null;
    proteins?: number | null;
    carbohydrates?: number | null;
    fat?: number | null;
    fiber?: number | null;
    sugars?: number | null;
    sodium?: number | null;
    saturated_fat?: number | null;
  };
  ingredients?: any;
  novaGroup?: number | null;
  serving?: string | null;
}

export interface HealthAnalysis {
  itemName: string;
  productName?: string;
  title?: string;
  healthScore: number;
  ingredientsText?: string;
  ingredientFlags: Array<{
    ingredient: string;
    flag: string;
    severity: 'low' | 'medium' | 'high';
    reason?: string;
  }>;
  nutritionData: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    saturated_fat?: number;
  };
  analysis?: {
    summary?: string;
    positives?: string[];
    concerns?: string[];
    recommendations?: string[];
  };
  source?: ScanSource;
  confidence?: number;
}