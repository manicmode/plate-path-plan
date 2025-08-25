export type Detection =
  | { kind: "barcode"; value: string; confidence: number }
  | { kind: "logo"; brand: string; confidence: number }
  | { kind: "ocr"; text: string; confidence: number }
  | { kind: "food"; labels: Array<{ name: string; confidence: number }> };

export type ProductMatch = {
  source: "barcode" | "brand_search" | "generic";
  brand?: string;
  productName?: string;
  offId?: string;
  ingredients?: string[];
  nutrients?: Record<string, number>;
};

export type ScanResult = {
  status: "ok" | "needs_retake" | "partial" | "error";
  quality?: { blurScore: number; width: number; height: number };
  detections: Detection[];
  productMatch?: ProductMatch;
  flags: Array<{ code: string; severity: "low" | "med" | "high"; reason: string }>;
  insights: string[]; // 2–6 succinct bullets
  nextActions: Array<{
    label: string;
    action: "confirm_item" | "choose_portion" | "open_facts" | "retake" | "manual_search";
  }>;
  // Optional internal fields from server:
  requestId?: string;
  latencyMs?: number;
};

// Adapter if server keys differ; otherwise passthrough.
export function adaptScanResult(raw: any): ScanResult {
  return {
    status: raw.status ?? "partial",
    quality: raw.quality,
    detections: raw.detections ?? [],
    productMatch: raw.productMatch,
    flags: raw.flags ?? [],
    insights: raw.insights ?? [],
    nextActions: raw.nextActions ?? [{ label: "Manual search", action: "manual_search" }],
    requestId: raw.requestId,
    latencyMs: raw.latencyMs,
  };
}