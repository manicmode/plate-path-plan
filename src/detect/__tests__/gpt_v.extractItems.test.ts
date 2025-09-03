import { describe, test, expect } from 'vitest';
import { extractItems } from '../gpt_v';

describe('extractItems', () => {
  test('extracts from items', () => {
    expect(extractItems({ items: [1] })).toHaveLength(1);
  });

  test('extracts from result.items', () => {
    expect(extractItems({ result: { items: [1] } })).toHaveLength(1);
  });

  test('extracts from foods', () => {
    expect(extractItems({ foods: [1] })).toHaveLength(1);
  });

  test('extracts from detections', () => {
    expect(extractItems({ detections: [1] })).toHaveLength(1);
  });

  test('returns [] for unknown shapes', () => {
    expect(extractItems({})).toHaveLength(0);
  });

  test('returns [] for null/undefined', () => {
    expect(extractItems(null)).toHaveLength(0);
    expect(extractItems(undefined)).toHaveLength(0);
  });

  test('prefers items over other fields', () => {
    const result = extractItems({ 
      items: ['a', 'b'], 
      foods: ['c'], 
      detections: ['d'] 
    });
    expect(result).toEqual(['a', 'b']);
  });

  test('falls back to result.items when items not present', () => {
    const result = extractItems({ 
      result: { items: ['x', 'y'] }, 
      foods: ['c'] 
    });
    expect(result).toEqual(['x', 'y']);
  });

  test('falls back to foods when items and result.items not present', () => {
    const result = extractItems({ 
      foods: ['food1', 'food2'], 
      detections: ['d'] 
    });
    expect(result).toEqual(['food1', 'food2']);
  });

  test('falls back to detections when other fields not present', () => {
    const result = extractItems({ 
      detections: ['detection1'] 
    });
    expect(result).toEqual(['detection1']);
  });
});