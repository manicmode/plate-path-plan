/**
 * Source badge helper for consistent data source display
 */

export interface SourceBadgeInfo {
  label: string;
  tone: 'brand' | 'generic' | 'neutral';
}

export function sourceBadge(source: "FDC" | "EDAMAM" | "NUTRITIONIX" | "CURATED" | "ESTIMATED"): SourceBadgeInfo {
  if (source === "NUTRITIONIX") return { label: "Brand", tone: "brand" };
  if (source === "ESTIMATED") return { label: "Estimated", tone: "neutral" };
  // FDC/EDAMAM/CURATED are generic
  return { label: "Generic", tone: "generic" };
}