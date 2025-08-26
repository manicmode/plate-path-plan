export type HealthFlagLevel = "danger" | "warning" | "info" | "ok";
export type HealthFlag = { id: string; level: HealthFlagLevel; label: string; details?: string };

export type LogProduct = {
  productName: string;
  barcode: string;
  imageUrl?: string;

  nutrition: {
    calories: number;    // kcal per serving (or per 100g mapped to serving if serving exists)
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sugar_g: number;
    sodium_mg: number;
  };

  ingredients: string[]; // flat, cleaned list

  health: {
    score: number; // 0..100
    flags: Array<{
      id: string;                         // 'high_sugar' | 'high_sodium' | 'artificial_colors' | 'preservatives' | 'good_fiber' | ...
      label: string;                      // human label, e.g., 'High Sugar'
      level: 'good' | 'warning' | 'danger';
      emoji?: string;                     // optional emoji
      details?: string;                   // optional short note
    }>;
  };
};