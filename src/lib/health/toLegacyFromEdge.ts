/* Maps the enhanced-health-scanner response into the legacy shape
 * the existing Health/Confirm modals already consume.
 */
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

  const name =
    p?.name ?? envelope?.productName ?? envelope?.name ?? null;

  const barcode =
    p?.barcode ?? p?.code ?? envelope?.barcode ?? null;

  const ingredientsText =
    p?.ingredientsText ??
    (Array.isArray(p?.ingredients) ? p.ingredients.join(", ") : null) ??
    null;

  const healthScore =
    p?.health?.score ?? envelope?.health?.score ?? null;

  const healthFlags =
    coerceFlags(p?.health?.flags ?? envelope?.health?.flags);

  const nutrition =
    p?.nutrition ?? envelope?.nutrition ?? null;

  return {
    productName: typeof name === "string" ? name.trim() : null,
    barcode: typeof barcode === "string" ? barcode : null,
    ingredientsText,
    healthScore:
      typeof healthScore === "number"
        ? healthScore
        : healthScore == null
        ? null
        : Number(healthScore) || null,
    healthFlags,
    nutrition,
  };
}