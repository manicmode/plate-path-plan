import { detectAndFuseFoods as coreDetect } from '@/detect/detectAndFuse'
import { DetectedFood } from '@/types/food'
import { FF } from '@/featureFlags'

export async function detectAndFuse(opts: {
  base64: string
  minConf?: number
  enableGpt?: boolean
}): Promise<DetectedFood[]> {
  const { base64, minConf = 0.35, enableGpt = FF.FEATURE_LYF_ENSEMBLE } = opts
  
  // Call the core ensemble detector
  const result = await coreDetect(base64, { useEnsemble: enableGpt })
  
  // Transform to stable DetectedFood format
  const detectedFoods: DetectedFood[] = []
  
  // Combine fused items with portions
  result.fused.forEach((fusedItem, i) => {
    const portion = result.portions.find(p => p.name === fusedItem.canonicalName)
    
    // Convert bbox format if present (from {x, y, width, height} to {x, y, w, h})
    let bbox = undefined
    if (fusedItem.bbox) {
      bbox = {
        x: fusedItem.bbox.x,
        y: fusedItem.bbox.y,
        w: fusedItem.bbox.width,
        h: fusedItem.bbox.height
      }
    }
    
    detectedFoods.push({
      id: `det-${i}`,
      name: fusedItem.canonicalName,
      canonicalName: fusedItem.canonicalName,
      confidence: Math.max(0, Math.min(1, fusedItem.score ?? 0.5)),
      source: fusedItem.origin === 'both' ? 'fusion' : fusedItem.origin,
      bbox,
      gramsEstimate: portion?.grams_est ?? null,
    })
  })
  
  // Filter by confidence if specified
  return detectedFoods.filter(d => d.confidence >= minConf)
}