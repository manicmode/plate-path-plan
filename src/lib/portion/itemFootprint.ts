/**
 * Item Footprint Estimation for Portion v3
 * Estimates item area and plate ratio for scaling
 */

interface DetectionBounds {
  name: string;
  bbox?: { x: number; y: number; w: number; h: number };
  maskArea?: number;
}

interface FootprintResult {
  pxArea: number;
  plateRatio?: number;
}

export function estimateItemFootprint(
  det: DetectionBounds,
  plateArea?: number
): FootprintResult {
  // Prefer maskArea if available (future hook for segmentation)
  let pxArea: number;
  
  if (det.maskArea && det.maskArea > 0) {
    pxArea = det.maskArea;
  } else if (det.bbox) {
    // Use bounding box area
    pxArea = det.bbox.w * det.bbox.h;
  } else {
    // No area information available
    return { pxArea: 0 };
  }
  
  // Calculate plate ratio if plate area is available
  let plateRatio: number | undefined;
  if (plateArea && plateArea > 0 && pxArea > 0) {
    const rawRatio = pxArea / plateArea;
    // Clamp to reasonable bounds (0.5% to 65% of plate)
    plateRatio = Math.max(0.005, Math.min(0.65, rawRatio));
  }
  
  return {
    pxArea,
    plateRatio
  };
}

// Utility to normalize plate ratio to 0-1 scale for lerp operations
export function normalizePlateRatio(
  plateRatio: number,
  minRatio: number,
  maxRatio: number
): number {
  return Math.max(0, Math.min(1, (plateRatio - minRatio) / (maxRatio - minRatio)));
}

// Linear interpolation helper
export function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * Math.max(0, Math.min(1, t));
}