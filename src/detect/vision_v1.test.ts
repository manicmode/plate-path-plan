import { describe, test, expect } from 'vitest';
import { filterFoodish } from './vision_v1';

describe('filterFoodish', () => {
  test('should filter out non-food items but keep specific foods', () => {
    const input = ['plate', 'fork', 'salmon', 'asparagus'];
    const result = filterFoodish(input);
    expect(result).toEqual(['salmon', 'asparagus']);
  });
  
  test('should handle empty input', () => {
    const result = filterFoodish([]);
    expect(result).toEqual([]);
  });
  
  test('should filter out short items', () => {
    const input = ['aa', 'bb', 'salmon', 'asparagus'];
    const result = filterFoodish(input);
    expect(result).toEqual(['salmon', 'asparagus']);
  });
  
  test('should filter out common non-food items', () => {
    const input = ['plate', 'dish', 'bowl', 'cutlery', 'fork', 'spoon', 'knife', 'napkin', 'logo', 'brand', 'salmon', 'asparagus'];
    const result = filterFoodish(input);
    expect(result).toEqual(['salmon', 'asparagus']);
  });
});