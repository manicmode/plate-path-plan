/**
 * Unit tests for search-to-analysis enrichment fixes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
const mockSupabase = {
  functions: {
    invoke: vi.fn()
  }
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

// Import after mocking
import { enrichViaExtractIfNeeded } from './search-to-analysis';

describe('enrichViaExtractIfNeeded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not call enrichment when no barcode present', async () => {
    const product = {
      name: 'Test Product',
      _dataSource: undefined
    };

    const result = await enrichViaExtractIfNeeded(product);

    expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    expect(result._dataSource).toBe('manual/no_barcode');
  });

  it('should call enhanced-health-scanner with barcode mode when barcode present', async () => {
    const product = {
      name: 'Test Product',
      barcode: '1234567890123'
    };

    mockSupabase.functions.invoke.mockResolvedValue({
      data: {
        ok: true,
        product: {
          productName: 'OFF Product',
          nutriments: {
            'energy-kcal_100g': 100,
            proteins_100g: 5
          }
        }
      },
      error: null
    });

    const result = await enrichViaExtractIfNeeded(product);

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
      'enhanced-health-scanner',
      { body: { mode: 'barcode', barcode: '1234567890123' } }
    );
    expect(result._dataSource).toBe('openfoodfacts/barcode');
  });

  it('should return original product when enrichment fails', async () => {
    const product = {
      name: 'Test Product',
      barcode: '1234567890123'
    };

    mockSupabase.functions.invoke.mockResolvedValue({
      data: null,
      error: { message: 'Not found' }
    });

    const result = await enrichViaExtractIfNeeded(product);

    expect(result._dataSource).toBe('manual/failed_barcode');
    expect(result.name).toBe('Test Product');
  });

  it('should skip enrichment when product already has macros', async () => {
    const product = {
      name: 'Test Product',
      barcode: '1234567890123',
      nutriments: {
        energy_kcal: 200,
        proteins_100g: 10
      }
    };

    const result = await enrichViaExtractIfNeeded(product);

    expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    expect(result).toEqual(product);
  });
});

describe('Golden tests - distinct products produce distinct fingerprints', () => {
  it('should produce different fingerprints for different barcodes', async () => {
    // Mock console.log to capture fingerprints
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Set debug flag
    vi.stubEnv('VITE_DEBUG_PERF', 'true');

    const product1 = {
      name: 'Granola Bar',
      barcode: '00818148'
    };

    const product2 = {
      name: 'Candy Bar',
      barcode: '12345678'
    };

    // Mock different OFF responses
    mockSupabase.functions.invoke
      .mockResolvedValueOnce({
        data: {
          ok: true,
          product: {
            productName: 'Healthy Granola',
            nutriments: {
              'energy-kcal_100g': 400,
              proteins_100g: 8,
              carbohydrates_100g: 60,
              fat_100g: 12
            }
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          product: {
            productName: 'Sweet Candy',
            nutriments: {
              'energy-kcal_100g': 500,
              proteins_100g: 1,
              carbohydrates_100g: 90,
              fat_100g: 5
            }
          }
        }
      });

    await enrichViaExtractIfNeeded(product1);
    await enrichViaExtractIfNeeded(product2);

    // Extract fingerprints from console logs
    const fingerprints = consoleSpy.mock.calls
      .filter(call => call[0] === '[ENRICH][FINGERPRINT]')
      .map(call => call[1]);

    expect(fingerprints).toHaveLength(2);
    expect(fingerprints[0]).not.toBe(fingerprints[1]);
    expect(fingerprints[0]).toContain('Healthy Granola');
    expect(fingerprints[1]).toContain('Sweet Candy');

    consoleSpy.mockRestore();
    vi.unstubAllEnvs();
  });
});