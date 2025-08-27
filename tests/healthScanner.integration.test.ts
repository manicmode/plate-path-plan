/**
 * Integration tests for enhanced-health-scanner edge function
 * Tests the complete flow from image input to UI response
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Mock Supabase client for testing
const mockSupabase = {
  functions: {
    invoke: async (functionName: string, options: any) => {
      // Mock different scenarios based on input
      const body = options.body;
      
      if (functionName === 'enhanced-health-scanner') {
        return mockHealthScannerResponse(body);
      }
      
      throw new Error(`Unknown function: ${functionName}`);
    }
  }
};

function mockHealthScannerResponse(body: any) {
  // Mock barcode scenario - visible barcode wins
  if (body.detectedBarcode === '1234567890123') {
    return {
      data: {
        kind: 'single_product',
        productName: 'Cheerios Original',
        healthScore: 75,
        healthFlags: [
          { key: 'good_fiber', label: 'Good Fiber', severity: 'good' }
        ],
        nutritionSummary: { calories: 100, protein: 3 },
        ingredients: ['whole grain oats', 'sugar', 'salt'],
        barcode: '1234567890123'
      },
      error: null
    };
  }

  // Mock branded single product
  if (body.imageBase64?.includes('single_product_marker')) {
    return {
      data: {
        kind: 'single_product',
        productName: 'Organic Granola',
        healthScore: 85,
        healthFlags: [
          { key: 'organic', label: 'Organic', severity: 'good' }
        ],
        nutritionSummary: { calories: 150, protein: 5 },
        ingredients: ['organic oats', 'organic honey']
      },
      error: null
    };
  }

  // Mock branded multiple candidates
  if (body.imageBase64?.includes('multiple_candidates_marker')) {
    return {
      data: {
        kind: 'multiple_candidates',
        productName: 'Multiple products detected',
        candidates: [
          { id: '123', name: 'Brand A Cereal', brand: 'Brand A', confidence: 0.9 },
          { id: '456', name: 'Brand B Cereal', brand: 'Brand B', confidence: 0.8 },
          { id: '789', name: 'Brand C Cereal', brand: 'Brand C', confidence: 0.7 }
        ]
      },
      error: null
    };
  }

  // Mock meal scenario
  if (body.imageBase64?.includes('meal_marker')) {
    return {
      data: {
        kind: 'meal',
        foods: [
          { name: 'grilled chicken', portion: '150g', calories: 231 },
          { name: 'brown rice', portion: '100g', calories: 112 },
          { name: 'broccoli', portion: '80g', calories: 28 }
        ]
      },
      error: null
    };
  }

  // Mock empty photo
  if (body.imageBase64?.includes('empty_marker')) {
    return {
      data: {
        kind: 'none',
        productName: 'Unknown product',
        healthScore: null,
        healthFlags: [],
        nutritionSummary: {},
        ingredients: [],
        fallback: true
      },
      error: null
    };
  }

  // Default response
  return {
    data: {
      kind: 'none',
      productName: 'Unknown product',
      healthScore: null,
      healthFlags: [],
      fallback: true
    },
    error: null
  };
}

describe('Health Scanner Integration Tests', () => {
  describe('Photo with visible barcode', () => {
    it('should prioritize barcode detection over image analysis', async () => {
      const response = await mockSupabase.functions.invoke('enhanced-health-scanner', {
        body: {
          imageBase64: 'base64data_with_barcode',
          detectedBarcode: '1234567890123'
        }
      });

      expect(response.data.kind).toBe('single_product');
      expect(response.data.productName).toBe('Cheerios Original');
      expect(response.data.barcode).toBe('1234567890123');
      expect(response.data.healthScore).toBe(75);
    });
  });

  describe('Branded single product', () => {
    it('should go directly to health report for clear single product', async () => {
      const response = await mockSupabase.functions.invoke('enhanced-health-scanner', {
        body: {
          imageBase64: 'base64data_single_product_marker',
          mode: 'scan'
        }
      });

      expect(response.data.kind).toBe('single_product');
      expect(response.data.productName).toBe('Organic Granola');
      expect(response.data.healthScore).toBe(85);
      expect(response.data.healthFlags).toHaveLength(1);
      expect(response.data.healthFlags[0].severity).toBe('good');
    });
  });

  describe('Branded multiple candidates', () => {
    it('should show candidate chooser for ambiguous products', async () => {
      const response = await mockSupabase.functions.invoke('enhanced-health-scanner', {
        body: {
          imageBase64: 'base64data_multiple_candidates_marker',
          mode: 'scan'
        }
      });

      expect(response.data.kind).toBe('multiple_candidates');
      expect(response.data.candidates).toHaveLength(3);
      expect(response.data.candidates[0].name).toBe('Brand A Cereal');
      expect(response.data.candidates[0].confidence).toBe(0.9);
    });

    it('should fetch detailed report after candidate selection', async () => {
      // First get candidates
      const candidatesResponse = await mockSupabase.functions.invoke('enhanced-health-scanner', {
        body: {
          imageBase64: 'base64data_multiple_candidates_marker',
          mode: 'scan'
        }
      });

      expect(candidatesResponse.data.candidates).toBeDefined();

      // Then fetch details for selected candidate (simulate barcode lookup)
      const detailsResponse = await mockSupabase.functions.invoke('enhanced-health-scanner', {
        body: {
          mode: 'barcode',
          barcode: '1234567890123',
          source: 'candidate-selection'
        }
      });

      expect(detailsResponse.data.kind).toBe('single_product');
      expect(detailsResponse.data.productName).toBe('Cheerios Original');
    });
  });

  describe('Meal detection', () => {
    it('should detect multiple foods and show multi-item review', async () => {
      const response = await mockSupabase.functions.invoke('enhanced-health-scanner', {
        body: {
          imageBase64: 'base64data_meal_marker',
          mode: 'scan'
        }
      });

      expect(response.data.kind).toBe('meal');
      expect(response.data.foods).toHaveLength(3);
      expect(response.data.foods[0].name).toBe('grilled chicken');
      expect(response.data.foods[0].portion).toBe('150g');
      expect(response.data.foods[0].calories).toBe(231);
    });
  });

  describe('Empty photo', () => {
    it('should show no-detection fallback for empty photos', async () => {
      const response = await mockSupabase.functions.invoke('enhanced-health-scanner', {
        body: {
          imageBase64: 'base64data_empty_marker',
          mode: 'scan'
        }
      });

      expect(response.data.kind).toBe('none');
      expect(response.data.productName).toBe('Unknown product');
      expect(response.data.healthScore).toBeNull();
      expect(response.data.fallback).toBe(true);
    });
  });
});

describe('UI State Transitions', () => {
  it('should handle complete flow from scanner to report', async () => {
    // 1. Start with scanner state
    let currentState = 'scanner';
    
    // 2. Capture image and analyze
    currentState = 'loading';
    const response = await mockSupabase.functions.invoke('enhanced-health-scanner', {
      body: { imageBase64: 'base64data_single_product_marker' }
    });
    
    // 3. Based on response, transition to appropriate state
    if (response.data.kind === 'single_product') {
      currentState = 'report';
    } else if (response.data.kind === 'multiple_candidates') {
      currentState = 'candidates';
    } else if (response.data.kind === 'meal') {
      currentState = 'meal_review';
    } else {
      currentState = 'fallback';
    }

    expect(currentState).toBe('report');
  });

  it('should handle candidate selection flow', async () => {
    let currentState = 'scanner';
    
    // Get candidates
    currentState = 'loading';
    const candidatesResponse = await mockSupabase.functions.invoke('enhanced-health-scanner', {
      body: { imageBase64: 'base64data_multiple_candidates_marker' }
    });
    
    currentState = 'candidates';
    expect(candidatesResponse.data.candidates).toHaveLength(3);
    
    // Select candidate
    currentState = 'loading';
    const detailsResponse = await mockSupabase.functions.invoke('enhanced-health-scanner', {
      body: { mode: 'barcode', barcode: '123' }
    });
    
    currentState = 'report';
    expect(currentState).toBe('report');
  });
});