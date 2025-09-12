export interface BBox { 
  x: number; 
  y: number; 
  w: number; 
  h: number; 
}

export type DetectorSource = 'vision' | 'gpt' | 'fusion' | 'manual' | 'speech' | 'barcode'

export interface DetectedFood {
  id: string
  name: string              // raw detector name
  canonicalName?: string    // normalized name used for nutrition search
  confidence: number        // 0..1
  source: DetectorSource
  bbox?: BBox
  gramsEstimate?: number | null
}

export type PerGram = {
  kcal: number;     // kcal per gram
  protein: number;  // grams per gram
  carbs: number;    // grams per gram
  fat: number;      // grams per gram
};

export interface ConfirmItem {
  id: string;
  name: string;
  perGram?: PerGram;         // present when known
  servingG?: number | null;  // null/undefined when unknown
  imageUrl?: string;         // data URL or remote URL for preview
}