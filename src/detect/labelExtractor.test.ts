import { describe, test, expect } from 'vitest';

// Mock the food extraction logic from the edge function for testing
const FOOD_DICTIONARY = new Set([
  'salmon', 'asparagus', 'chicken', 'beef', 'pork', 'tuna', 'shrimp', 'egg', 'eggs',
  'bread', 'bun', 'baguette', 'tortilla', 'pasta', 'noodles', 'rice', 'quinoa',
  'potato', 'potatoes', 'tomato', 'tomatoes', 'lettuce', 'spinach', 'kale', 'broccoli'
]);

const extractFoodNouns = (labels: string[]): string[] => {
  const foodNouns: string[] = [];
  
  for (const label of labels) {
    const words = label.toLowerCase().split(/\s+/);
    for (const word of words) {
      const cleanWord = word.replace(/[^a-z]/g, '');
      if (FOOD_DICTIONARY.has(cleanWord)) {
        foodNouns.push(cleanWord);
      }
    }
  }
  
  return [...new Set(foodNouns)]; // dedupe
};

describe('Label Food Extractor', () => {
  test('should extract food nouns from labels', () => {
    const labels = ['recipe', 'cooking', 'dishware', 'salmon', 'asparagus'];
    const result = extractFoodNouns(labels);
    expect(result).toEqual(['salmon', 'asparagus']);
  });
  
  test('should handle compound labels', () => {
    const labels = ['grilled salmon dish', 'fresh asparagus recipe'];
    const result = extractFoodNouns(labels);
    expect(result).toEqual(['salmon', 'asparagus']);
  });
  
  test('should dedupe results', () => {
    const labels = ['salmon dish', 'salmon recipe', 'asparagus'];
    const result = extractFoodNouns(labels);
    expect(result).toEqual(['salmon', 'asparagus']);
  });
  
  test('should handle empty input', () => {
    const result = extractFoodNouns([]);
    expect(result).toEqual([]);
  });
  
  test('should handle non-food labels', () => {
    const labels = ['plate', 'dishware', 'kitchen', 'utensil'];
    const result = extractFoodNouns(labels);
    expect(result).toEqual([]);
  });
});