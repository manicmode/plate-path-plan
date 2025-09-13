export type WithMaybeImage = { imageUrl?: string | null } & Record<string, any>;

export function resolveImageUrl(x?: WithMaybeImage | null): string | null {
  if (!x) return null;

  return (
    x.imageUrl || x.photoUrl || x.image || x.thumbnailUrl ||
    x.photo?.highres || x.photo?.thumb ||
    x.images?.[0]?.url || x.selected_images?.front?.display?.[0] ||
    x.image_url || x.image_front_url || x.image_small_url ||
    null
  );
}