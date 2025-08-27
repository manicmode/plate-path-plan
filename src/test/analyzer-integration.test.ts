import { describe, it, expect } from 'vitest';
import { normalizeBrandComprehensive } from '@/analyzer/brand/normalizeBrandComprehensive';

describe('Analyzer Integration Tests', () => {
  describe('Trader Joes Granola - Brand Normalization', () => {
    it('should normalize granola OCR tokens to Trader Joes', () => {
      // Expected OCR tokens from the Vanilla Almond Granola image
      const ocrTokens = ['trader', 'joe', 'just', 'the', 'clusters', 'vanilla', 'almond', 'granola'];
      
      const result = normalizeBrandComprehensive({ ocrTokens });
      
      expect(result.brandGuess).toBe("Trader Joe's");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should prioritize logo detection over OCR', () => {
      const result = normalizeBrandComprehensive({
        logoBrands: ['trader joes'],
        ocrTokens: ['vanilla', 'granola']
      });
      
      expect(result.brandGuess).toBe("Trader Joe's");
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should handle partial OCR matches', () => {
      const result = normalizeBrandComprehensive({
        ocrTokens: ['trader', 'clusters', 'vanilla']
      });
      
      expect(result.brandGuess).toBe("Trader Joe's");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should normalize LLM guesses correctly', () => {
      const result = normalizeBrandComprehensive({
        llmGuess: 'trader joes'
      });
      
      expect(result.brandGuess).toBe("Trader Joe's");
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should meet branded_candidates threshold', () => {
      // Test various input combinations that should trigger branded_candidates
      const testCases = [
        { ocrTokens: ['trader', 'joe'] },
        { logoBrands: ['trader joes'] },
        { llmGuess: 'trader joe\'s' },
        { ocrTokens: ['trader'], llmGuess: 'joe' }
      ];

      testCases.forEach((testCase, index) => {
        const result = normalizeBrandComprehensive(testCase);
        expect(result.confidence, `Test case ${index} should meet threshold`).toBeGreaterThan(0.6);
        expect(result.brandGuess, `Test case ${index} should identify Trader Joe's`).toBe("Trader Joe's");
      });
    });
  });

  describe('Early Exit and Cancellation Logic', () => {
    it('should trigger early exit for high confidence brand detection', () => {
      const googleResult = normalizeBrandComprehensive({
        ocrTokens: ['trader', 'joe', 'clusters'],
        logoBrands: ['trader joes']
      });

      // Should meet criteria for early exit (high confidence + recognizable brand)
      expect(googleResult.confidence).toBeGreaterThan(0.8);
      expect(googleResult.brandGuess).toBe("Trader Joe's");
      
      // This confidence level should trigger branded_candidates decision
      const shouldTriggerEarlyExit = googleResult.confidence > 0.7 && googleResult.brandGuess;
      expect(shouldTriggerEarlyExit).toBe(true);
    });

    it('should not trigger early exit for low confidence results', () => {
      const result = normalizeBrandComprehensive({
        ocrTokens: ['vanilla', 'clusters', 'granola'] // No brand tokens
      });

      expect(result.confidence).toBeLessThan(0.7);
      expect(result.brandGuess).toBeUndefined();
    });
  });

  describe('Provider Response Format', () => {
    it('should handle expected OpenAI response structure', () => {
      // Simulate OpenAI strict JSON response
      const mockOpenAIBrand = 'trader joes';
      
      const result = normalizeBrandComprehensive({
        llmGuess: mockOpenAIBrand
      });

      expect(result.brandGuess).toBe("Trader Joe's");
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should handle expected Google Vision response structure', () => {
      // Simulate Google Vision OCR + Logo response
      const mockGoogleTokens = ['trader', 'joe', 'just', 'clusters'];
      const mockGoogleLogos = ['trader joes'];
      
      const result = normalizeBrandComprehensive({
        ocrTokens: mockGoogleTokens,
        logoBrands: mockGoogleLogos
      });

      expect(result.brandGuess).toBe("Trader Joe's");
      expect(result.confidence).toBeGreaterThan(0.9); // Logo detection = high confidence
    });
  });
});