/**
 * Multi-Item Meal Detection with Portion Estimation
 * REV: MEAL_REV_SBX=2025-08-31T17:55Z-r2
 */

import { MealItem } from './types';

const MEAL_REV_SBX = "2025-08-31T17:55Z-r2";

// Food category portion estimates (in grams)
const PORTION_ESTIMATES: Record<string, number> = {
  // Proteins
  'chicken': 120,
  'beef': 100,
  'fish': 120,
  'egg': 50,
  'eggs': 100, // 2 eggs
  'tofu': 80,
  
  // Carbs
  'rice': 150,
  'pasta': 150,
  'noodles': 150,
  'bread': 60,
  'potato': 120,
  'potatoes': 200,
  
  // Vegetables
  'salad': 100,
  'broccoli': 80,
  'carrots': 80,
  'spinach': 60,
  'tomato': 120,
  'onion': 80,
  
  // Default portions
  'small': 60,
  'medium': 120,
  'large': 200,
  'default': 100
};

/**
 * Detect multiple food items in a meal image
 */
export async function detectMealItems(input: HTMLCanvasElement | string): Promise<MealItem[]> {
  try {
    if (import.meta.env.VITE_DEBUG_MEAL === '1') {
      console.log('[MEAL][DETECT] Starting meal item detection', { rev: MEAL_REV_SBX });
    }
    
    // Mock detection - in real implementation this would use computer vision
    const mockItems = await getMockDetectedItems();
    
    const items: MealItem[] = mockItems.map((item, index) => {
      const bbox = generateMockBbox(index, mockItems.length);
      const gramsEstimate = estimatePortionFromLabel(item.label, bbox);
      
      if (import.meta.env.VITE_DEBUG_MEAL === '1') {
        console.log('[MEAL][PORTION]', { 
          label: item.label, 
          bboxArea: bbox[2] * bbox[3], 
          gramsEstimate 
        });
      }
      
      return {
        id: `item-${index}`,
        label: item.label,
        confidence: item.confidence,
        bbox,
        gramsEstimate,
        cropUrl: generateMockCropUrl(item.label)
      };
    });
    
    if (import.meta.env.VITE_DEBUG_MEAL === '1') {
      console.log('[MEAL][DETECT]', { 
        total: items.length, 
        labels: items.map(i => i.label) 
      });
    }
    
    return items;
    
  } catch (error) {
    console.error('[MEAL][DETECT] Error detecting meal items:', error);
    return [];
  }
}

/**
 * Mock food item detection - replace with real computer vision API
 */
async function getMockDetectedItems(): Promise<Array<{label: string; confidence: number}>> {
  const possibleItems = [
    { label: 'grilled chicken', confidence: 0.85 },
    { label: 'steamed rice', confidence: 0.92 },
    { label: 'mixed vegetables', confidence: 0.78 },
    { label: 'roasted potato', confidence: 0.88 },
    { label: 'green salad', confidence: 0.73 },
    { label: 'scrambled eggs', confidence: 0.90 },
    { label: 'pasta', confidence: 0.82 },
    { label: 'broccoli', confidence: 0.76 }
  ];
  
  // Return 2-4 random items for testing
  const numItems = Math.floor(Math.random() * 3) + 2;
  const shuffled = [...possibleItems].sort(() => 0.5 - Math.random());
  
  return shuffled.slice(0, numItems);
}

/**
 * Generate mock bounding box for detected item
 */
function generateMockBbox(index: number, totalItems: number): [number, number, number, number] {
  // Distribute items across the image based on index
  const cols = Math.ceil(Math.sqrt(totalItems));
  const row = Math.floor(index / cols);
  const col = index % cols;
  
  const itemWidth = 200;
  const itemHeight = 150;
  const spacing = 20;
  
  const x = col * (itemWidth + spacing) + spacing;
  const y = row * (itemHeight + spacing) + spacing;
  
  return [x, y, itemWidth, itemHeight];
}

/**
 * Estimate portion size from label and bbox
 */
function estimatePortionFromLabel(label: string, bbox: [number, number, number, number]): number {
  const lowerLabel = label.toLowerCase();
  
  // Look for exact matches first
  for (const [key, grams] of Object.entries(PORTION_ESTIMATES)) {
    if (lowerLabel.includes(key)) {
      // Scale based on bbox size relative to a "medium" size
      const bboxArea = bbox[2] * bbox[3];
      const mediumArea = 200 * 150; // Base area for "medium" portion
      const scaleFactor = Math.sqrt(bboxArea / mediumArea);
      
      return Math.round(grams * Math.max(0.5, Math.min(2.0, scaleFactor)));
    }
  }
  
  // Default estimation
  return PORTION_ESTIMATES.default;
}

/**
 * Generate mock crop URL for UI thumbnail
 */
function generateMockCropUrl(label: string): string {
  // In real implementation, this would be a cropped image from the original
  // For now, return a data URL with emoji representation
  const emoji = getFoodEmoji(label);
  const canvas = document.createElement('canvas');
  canvas.width = 60;
  canvas.height = 60;
  const ctx = canvas.getContext('2d')!;
  
  // Simple gradient background
  const gradient = ctx.createLinearGradient(0, 0, 60, 60);
  gradient.addColorStop(0, '#f0f9ff');
  gradient.addColorStop(1, '#e0f2fe');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 60, 60);
  
  // Add emoji
  ctx.font = '32px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 30, 30);
  
  return canvas.toDataURL('image/png');
}

/**
 * Get emoji representation for food item
 */
function getFoodEmoji(label: string): string {
  const lowerLabel = label.toLowerCase();
  
  if (lowerLabel.includes('chicken')) return '🍗';
  if (lowerLabel.includes('beef')) return '🥩';
  if (lowerLabel.includes('fish')) return '🐟';
  if (lowerLabel.includes('egg')) return '🥚';
  if (lowerLabel.includes('rice')) return '🍚';
  if (lowerLabel.includes('pasta') || lowerLabel.includes('noodles')) return '🍝';
  if (lowerLabel.includes('bread')) return '🍞';
  if (lowerLabel.includes('potato')) return '🥔';
  if (lowerLabel.includes('salad')) return '🥗';
  if (lowerLabel.includes('broccoli')) return '🥦';
  if (lowerLabel.includes('carrot')) return '🥕';
  if (lowerLabel.includes('tomato')) return '🍅';
  
  return '🍽️'; // Default food emoji
}