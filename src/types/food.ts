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