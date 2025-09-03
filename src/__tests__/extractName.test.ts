import { describe, it, expect } from 'vitest';
import { extractName, normalizeItem, applySampleFlags } from '@/lib/debug/extractName';

describe('extractName', () => {
  it('picks name from name', () => {
    expect(extractName({ name: 'Granola' })).toBe('Granola');
  });

  it('picks name from productName', () => {
    expect(extractName({ productName: 'Granola' })).toBe('Granola');
  });

  it('picks name from displayName', () => {
    expect(extractName({ displayName: 'Granola' })).toBe('Granola');
  });

  it('picks name from title', () => {
    expect(extractName({ title: 'Granola' })).toBe('Granola');
  });

  it('picks name from description', () => {
    expect(extractName({ description: 'Granola Bar' })).toBe('Granola Bar');
  });

  it('picks name from label', () => {
    expect(extractName({ label: 'Granola Mix' })).toBe('Granola Mix');
  });

  it('falls back to Unknown when no name fields', () => {
    expect(extractName({})).toBe('Unknown');
  });

  it('falls back to Unknown when name is empty string', () => {
    expect(extractName({ name: '' })).toBe('Unknown');
  });

  it('falls back to Unknown when name is whitespace', () => {
    expect(extractName({ name: '   ' })).toBe('Unknown');
  });

  it('trims whitespace from name', () => {
    expect(extractName({ name: '  Granola  ' })).toBe('Granola');
  });

  it('handles null/undefined input', () => {
    expect(extractName(null)).toBe('Unknown');
    expect(extractName(undefined)).toBe('Unknown');
  });
});

describe('normalizeItem', () => {
  it('normalizes item with all fields', () => {
    const item = normalizeItem({
      name: 'Test Food',
      confidence: 0.95,
      category: 'protein',
      calories: 200,
      nutrition: { protein: 20 },
      flags: ['test-flag']
    });

    expect(item.name).toBe('Test Food');
    expect(item.confidence).toBe(0.95);
    expect(item.category).toBe('protein');
    expect(item.calories).toBe(200);
    expect(item.nutrition).toEqual({ protein: 20 });
    expect(item.flags).toEqual(['test-flag']);
  });

  it('provides defaults for missing fields', () => {
    const item = normalizeItem({});
    
    expect(item.name).toBe('Unknown');
    expect(item.confidence).toBe(0.8);
    expect(item.category).toBe('unknown');
    expect(item.flags).toEqual([]);
  });
});

describe('applySampleFlags', () => {
  it('applies sugar flag', () => {
    const item = applySampleFlags(
      { name: 'Sour Punch' },
      'corn syrup, sugar, citric acid'
    );
    expect(item.flags).toContainEqual(expect.stringMatching(/sugar/i));
  });

  it('applies sodium flag', () => {
    const item = applySampleFlags(
      { name: 'Chips' },
      'potatoes, salt, sodium chloride'
    );
    expect(item.flags).toContainEqual(expect.stringMatching(/sodium/i));
  });

  it('handles no ingredients', () => {
    const item = applySampleFlags({ name: 'Apple' });
    expect(item.flags).toEqual([]);
  });

  it('handles empty ingredients', () => {
    const item = applySampleFlags({ name: 'Apple' }, '');
    expect(item.flags).toEqual([]);
  });
});