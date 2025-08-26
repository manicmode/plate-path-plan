export type HealthFlagLevel = "danger" | "warning" | "info" | "ok";
export type HealthFlag = { id: string; level: HealthFlagLevel; label: string; details?: string };

export type NormalizedProduct = {
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  nutrition: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    sugar_g?: number;
    fiber_g?: number;
    sodium_mg?: number;
    serving_size?: string;
  };
  ingredients: string[];            // parsed tokens (preferred)
  ingredients_text?: string;        // original text fallback
  additives?: string[];             // e.g., ["e129","e110"]
  allergens?: string[];
  health: {
    score?: number;                 // 0..100
    flags: HealthFlag[];
  };
};