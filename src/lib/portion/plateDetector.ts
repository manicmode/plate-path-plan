/**
 * Plate Detection for Portion Estimation v3
 * Detects plate ellipse and estimates plate area
 */

interface PlateEllipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  angle: number;
}

interface PlateDetectionResult {
  ellipse?: PlateEllipse;
  area?: number;
  confidence: number;
}

export function detectPlateEllipse(
  image: HTMLImageElement | OffscreenCanvas | ImageBitmap,
  visionPlate?: { bbox: { x: number; y: number; w: number; h: number }; score: number }
): PlateDetectionResult {
  try {
    // Strategy 1: Use Vision label "plate" with bbox if available
    if (visionPlate && visionPlate.score > 0.6) {
      const { bbox, score } = visionPlate;
      const cx = bbox.x + bbox.w / 2;
      const cy = bbox.y + bbox.h / 2;
      const rx = bbox.w / 2;
      const ry = bbox.h / 2;
      
      const ellipse: PlateEllipse = { cx, cy, rx, ry, angle: 0 };
      const area = Math.PI * rx * ry;
      
      return {
        ellipse,
        area,
        confidence: Math.min(score, 0.9) // Cap confidence from vision
      };
    }

    // Strategy 2: Lightweight heuristic detection
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { confidence: 0 };

    // Downscale for performance
    const scale = Math.min(320 / (image.width || 320), 320 / (image.height || 320));
    canvas.width = Math.floor((image.width || 320) * scale);
    canvas.height = Math.floor((image.height || 320) * scale);

    ctx.drawImage(image as any, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Find brightest circular-ish region (simplified plate detection)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(canvas.width, canvas.height) * 0.4;
    
    let bestEllipse: PlateEllipse | undefined;
    let bestScore = 0;
    
    // Test ellipses at different sizes and positions
    for (let rx = maxRadius * 0.3; rx <= maxRadius; rx += maxRadius * 0.1) {
      for (let ry = rx * 0.7; ry <= rx * 1.3; ry += rx * 0.1) {
        for (let cx = centerX - canvas.width * 0.1; cx <= centerX + canvas.width * 0.1; cx += canvas.width * 0.05) {
          for (let cy = centerY - canvas.height * 0.1; cy <= centerY + canvas.height * 0.1; cy += canvas.height * 0.05) {
            
            const score = scoreEllipse(data, canvas.width, canvas.height, cx, cy, rx, ry, 0);
            if (score > bestScore) {
              bestScore = score;
              bestEllipse = { cx, cy, rx, ry, angle: 0 };
            }
          }
        }
      }
    }
    
    if (bestEllipse && bestScore > 0.3) {
      // Scale back to original image coordinates
      const ellipse: PlateEllipse = {
        cx: bestEllipse.cx / scale,
        cy: bestEllipse.cy / scale,
        rx: bestEllipse.rx / scale,
        ry: bestEllipse.ry / scale,
        angle: bestEllipse.angle
      };
      
      const area = Math.PI * ellipse.rx * ellipse.ry;
      
      return {
        ellipse,
        area,
        confidence: Math.min(bestScore, 0.7) // Heuristic has lower max confidence
      };
    }
    
    return { confidence: 0 };
    
  } catch (error) {
    console.warn('[PLATE] Detection error:', error);
    return { confidence: 0 };
  }
}

// Score how well an ellipse matches a plate-like region
function scoreEllipse(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  angle: number
): number {
  let insideSum = 0;
  let outsideSum = 0;
  let insideCount = 0;
  let outsideCount = 0;
  
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  // Sample points in and around the ellipse
  const samples = 200;
  for (let i = 0; i < samples; i++) {
    const theta = (i / samples) * 2 * Math.PI;
    const r = 0.8 + Math.random() * 0.4; // Random radius 0.8-1.2
    
    const localX = rx * r * Math.cos(theta);
    const localY = ry * r * Math.sin(theta);
    
    const x = Math.round(cx + localX * cos - localY * sin);
    const y = Math.round(cy + localX * sin + localY * cos);
    
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = (y * width + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      
      if (r <= 1.0) {
        insideSum += brightness;
        insideCount++;
      } else {
        outsideSum += brightness;
        outsideCount++;
      }
    }
  }
  
  if (insideCount === 0 || outsideCount === 0) return 0;
  
  const insideAvg = insideSum / insideCount;
  const outsideAvg = outsideSum / outsideCount;
  
  // Plates tend to be brighter than surroundings
  const contrast = Math.max(0, insideAvg - outsideAvg) / 255;
  const minBrightness = Math.min(insideAvg, 120) / 255; // Plates should be reasonably bright
  
  return contrast * minBrightness;
}