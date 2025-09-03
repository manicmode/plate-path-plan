import { ReviewItem } from '@/components/camera/ReviewItemsScreen';

/**
 * Parse manual text input into detected food items
 * Splits by commas or new lines, normalizes names, and provides default estimates
 */
export function parseManualText(text: string): ReviewItem[] {
  if (!text?.trim()) return [];

  // Split by commas or newlines, clean up whitespace
  const items = text
    .split(/[,\n]/)
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .filter(item => item.length <= 100); // Reasonable max length

  return items.map((name, index) => ({
    id: `manual-${index}`,
    name: name.toLowerCase(),
    canonicalName: name.toLowerCase(),
    portion: '100g', // Default portion
    grams: 100, // Default grams estimate
    selected: true,
    mapped: true,
    confidence: 0.9, // High confidence for manual entry
    portionSource: 'heuristic' as const,
    portionRange: [50, 200] // Reasonable range for manual estimates
  }));
}