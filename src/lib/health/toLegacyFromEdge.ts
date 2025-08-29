/* Maps the enhanced-health-scanner response into the legacy shape
 * the existing Health/Confirm modals already consume.
 */

// Helper to pick first non-empty string with min length
const pick = (...vals: Array<unknown>) =>
  vals.find(v => typeof v === 'string' && v.trim().length >= 3) as string | undefined;

const pickName = (...vals: Array<unknown>) =>
  vals.find(v => typeof v === 'string' && v.trim().length >= 3)?.toString().trim();

function extractName(edge: any): string | undefined {
  const p = edge?.product ?? edge;

  // Try all common OFF + normalized fields + itemName fallback
  const name = pickName(
    p?.displayName,
    p?.name,
    p?.productName,         // camelCase from LogProduct
    p?.title,               // alternative title field
    p?.product_name_en,
    p?.product_name,
    p?.generic_name_en,
    p?.generic_name,
    edge?.productName, // some functions return this top-level
    edge?.name,
    p?.itemName,            // new-schema fallback
    edge?.itemName          // top-level itemName fallback
  ) ?? (
    // brand + product_name fallback
    p?.brands && p?.product_name
      ? `${String(p.brands).split(',')[0].trim()} ${String(p.product_name).trim()}`
      : undefined
  );

  return name?.replace(/\s+/g, ' ').trim();
}

export type LegacyHealthFlag = {
  key: string;
  label: string;
  severity: "good" | "warning" | "danger";
  description?: string | null;
};

export type LegacyRecognized = {
  productName: string | null;
  barcode: string | null;
  ingredientsText: string | null;
  healthScore: number | null;
  healthFlags: LegacyHealthFlag[];
  nutrition?: any | null; // pass-through; existing UI already knows how to read it
  status?: 'ok' | 'no_detection' | 'not_found';
  recommendation?: string | null;
};

function coerceFlags(raw: any): LegacyHealthFlag[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((f: any): LegacyHealthFlag => {
    const sevRaw = f?.severity ?? f?.level ?? f?.type ?? "info";
    const severity: LegacyHealthFlag["severity"] =
      sevRaw === "danger" || sevRaw === "high" ? "danger"
      : sevRaw === "warning" || sevRaw === "medium" ? "warning"
      : "good";

    return {
      key: (f?.key ?? f?.id ?? f?.slug ?? f?.label ?? "flag").toString(),
      label: f?.label ?? f?.title ?? f?.name ?? f?.key ?? "Flag",
      description: f?.description ?? f?.detail ?? null,
      severity,
    };
  });
}

export function toLegacyFromEdge(edge: any): LegacyRecognized {
  // The function sometimes returns { data, error }, sometimes directly an object.
  const envelope = edge?.data ?? edge;
  const p = envelope?.product ?? envelope ?? {};

  const productName = extractName(edge);

  const barcode =
    p?.barcode ?? p?.code ?? envelope?.barcode ?? null;

  const ingredientsText =
    p?.ingredientsText ??
    (Array.isArray(p?.ingredients) ? p.ingredients.join(", ") : null) ??
    null;

  // Extract health score with quality.score fallback and scale normalization
  const extractScore = (env: any, p: any) => {
    let score = p?.health?.score ?? env?.health?.score ?? p?.quality?.score ?? env?.quality?.score;
    
    if (typeof score === 'number') {
      // Scale normalization: ensure 0-10 range for legacy compatibility
      if (score <= 1) score = score * 10;        // 0–1 -> 0–10
      if (score > 100) score = score / 10;       // 0–100 -> 0–10
      score = Math.max(0, Math.min(10, score));  // clamp to 0-10
      return score;
    }

    return null;
  };

  const healthScore = extractScore(envelope, p);

  const healthFlags =
    coerceFlags(p?.health?.flags ?? envelope?.health?.flags ?? envelope?.healthFlags);

  const nutrition =
    p?.nutrition ?? envelope?.nutrition ?? envelope?.nutritionSummary ?? null;

  // Detect any meaningful signal
  const hasAnySignal = !!(
    barcode ||
    (productName && productName !== 'Unknown item' && productName !== 'Unknown product') ||
    nutrition ||
    (ingredientsText && ingredientsText.trim().length > 5) ||
    (Array.isArray(envelope?.detections) && envelope.detections.length > 0)
  );

  // Determine status and set defaults for no detection
  let status: 'ok' | 'no_detection' | 'not_found' = 'ok';
  let finalHealthScore = typeof healthScore === "number"
    ? healthScore
    : healthScore == null
    ? null
    : Number(healthScore) || null;
  let finalHealthFlags = healthFlags;
  let recommendation: string | null = null;

  // Handle explicit fallback flag first
  if (envelope?.fallback === true) {
    status = 'no_detection';
    finalHealthScore = null;
    finalHealthFlags = [];
    recommendation = null;
  } else if (!hasAnySignal) {
    status = 'no_detection';
    finalHealthScore = null;
    finalHealthFlags = [];
    recommendation = null;
  } else if (barcode && !productName) {
    // Has barcode but no product found
    status = 'not_found';
  }

  return {
    productName,
    barcode: typeof barcode === "string" ? barcode : null,
    ingredientsText,
    healthScore: finalHealthScore,
    healthFlags: finalHealthFlags,
    nutrition,
    status,
    recommendation,
  };
}