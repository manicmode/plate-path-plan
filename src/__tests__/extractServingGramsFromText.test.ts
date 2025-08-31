import { describe, test, expect } from 'vitest';
import { extractServingGramsFromText } from '@/lib/nutrition/parsers/nutritionFactsParser';

describe('extractServingGramsFromText', () => {
  // Test cases per spec requirements

  test('extracts serving size with parentheses format', () => {
    expect(extractServingGramsFromText("Serving size 2/3 cup (55g)")).toBe(55);
    expect(extractServingGramsFromText("SERVING SIZE: 1 cup (240 g)")).toBe(240);
    expect(extractServingGramsFromText("Serving Size 1/2 cup (30g)")).toBe(30);
  });

  test('extracts per serving format', () => {
    expect(extractServingGramsFromText("Per serving 30 g")).toBe(30);
    expect(extractServingGramsFromText("Per portion 45 g")).toBe(45);
    expect(extractServingGramsFromText("PER SERVING 25g")).toBe(25);
  });

  test('handles wrapped lines with parentheses', () => {
    expect(extractServingGramsFromText("Nutrition Facts\nServing size 1/2 cup\n(55 g)")).toBe(55);
    expect(extractServingGramsFromText("Serving size 3/4 cup\n(60g)")).toBe(60);
  });

  test('prefers per portion over per 100g in EU format', () => {
    expect(extractServingGramsFromText("Per 100 g; Per portion 35 g")).toBe(35);
    expect(extractServingGramsFromText("Nutritional values per 100g: ... Per portion 40g")).toBe(40);
  });

  test('extracts inline serving size without parentheses', () => {
    expect(extractServingGramsFromText("Serving size about 50 g")).toBe(50);
    expect(extractServingGramsFromText("Serving size: 75g per container")).toBe(75);
  });

  test('handles decimal values', () => {
    expect(extractServingGramsFromText("Serving size (22.5g)")).toBe(22.5);
    expect(extractServingGramsFromText("Per serving 33.3 g")).toBe(33.3);
  });

  test('ignores ml values (returns null for category fallback)', () => {
    expect(extractServingGramsFromText("Serving size 250 ml")).toBeNull();
    expect(extractServingGramsFromText("Per serving 100ml")).toBeNull();
  });

  test('returns null for ingredients-only text', () => {
    expect(extractServingGramsFromText("Ingredients: ROLLED OATS, SUGAR, SALT")).toBeNull();
    expect(extractServingGramsFromText("Contains: wheat, milk, soy")).toBeNull();
  });

  test('returns null for empty or invalid input', () => {
    expect(extractServingGramsFromText("")).toBeNull();
    expect(extractServingGramsFromText("   ")).toBeNull();
    expect(extractServingGramsFromText("No nutritional information")).toBeNull();
  });

  test('case insensitive matching', () => {
    expect(extractServingGramsFromText("SERVING SIZE (40G)")).toBe(40);
    expect(extractServingGramsFromText("per SERVING 25 G")).toBe(25);
  });

  test('handles extra whitespace and formatting', () => {
    expect(extractServingGramsFromText("Serving  size   :   1/2   cup   (  55  g  )")).toBe(55);
    expect(extractServingGramsFromText("Per\n  serving\n30 g")).toBe(30);
  });
});