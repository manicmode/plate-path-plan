export const DEFAULT_GLASS_SIZE_ML = 250;

export const mlToGlasses = (ml: number, glassSizeMl = DEFAULT_GLASS_SIZE_ML) =>
  Math.max(0, Math.round((ml || 0) / (glassSizeMl || DEFAULT_GLASS_SIZE_ML)));
