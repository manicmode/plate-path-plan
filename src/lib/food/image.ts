export type WithMaybeImage = { imageUrl?: string | null } & Record<string, any>;

export function resolveImageUrl(x?: WithMaybeImage | null): string | null {
  if (!x) return null;

  // Try common fields first, then provider-specific ones
  const url = (
    x.imageUrl || x.photoUrl || x.image?.url || x.thumbnailUrl ||
    x.photo?.highres || x.photo?.thumb ||  // Nutritionix
    x.images?.[0]?.url || x.selected_images?.front?.display?.[0] ||  // OpenFoodFacts
    x.image_url || x.image_front_url || x.image_small_url ||  // OpenFoodFacts legacy
    x.image ||  // Generic fallback
    null
  );
  
  return url;
}