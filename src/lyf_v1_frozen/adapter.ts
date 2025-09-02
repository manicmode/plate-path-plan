import { detectAndFuse } from '@/detect'

// Legacy adapter that returns just names + grams, like the old v1 path expected
export async function analyzePhotoForLyfV1Legacy(base64: string) {
  const dets = await detectAndFuse({ base64 })
  return {
    items: dets.map(d => ({
      name: d.canonicalName ?? d.name,
      grams: d.gramsEstimate ?? null,
      confidence: d.confidence,
      source: d.source,
    })),
  }
}