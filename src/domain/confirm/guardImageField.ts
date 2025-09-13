/**
 * Type guard to ensure currentFoodItem always has imageUrl and imageAttribution fields
 * This prevents any future regressions where these fields get accidentally dropped
 */

export type WithRequiredImageFields<T> = T & {
  imageUrl: string | null;
  imageAttribution: string | null;
};

/**
 * Runtime validator that ensures an object has the required image fields
 */
export function validateImageFields<T>(item: T): WithRequiredImageFields<T> {
  const validated = item as any;
  
  // Ensure fields exist (even if null)
  if (!('imageUrl' in validated)) {
    validated.imageUrl = null;
  }
  if (!('imageAttribution' in validated)) {
    validated.imageAttribution = null;
  }
  
  return validated as WithRequiredImageFields<T>;
}

/**
 * Development-only strict validator that throws if image fields are missing
 */
export function strictValidateImageFields<T>(item: T, context = 'unknown'): WithRequiredImageFields<T> {
  if (import.meta.env.DEV) {
    const anyItem = item as any;
    
    if (!('imageUrl' in anyItem)) {
      throw new Error(`[GUARD] Missing imageUrl field in ${context}`);
    }
    
    if (!('imageAttribution' in anyItem)) {
      throw new Error(`[GUARD] Missing imageAttribution field in ${context}`);
    }
  }
  
  return validateImageFields(item);
}