import { describe, test, expect, vi, beforeEach } from 'vitest';
import { getUserPortionPreference, generateProductKey } from '@/lib/nutrition/userPortionPrefs';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user-123' } } })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ 
            data: { portion_grams: 85, portion_display: '85g custom' },
            error: null 
          })
        })
      })
    })
  }
}));

describe('Barcode User Preference Override', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('generates consistent product keys', () => {
    const product1 = { barcode: '123456789012' };
    const product2 = { barcode: '123456789012' };
    expect(generateProductKey(product1)).toBe(generateProductKey(product2));
    expect(generateProductKey(product1)).toBe('barcode:123456789012');
  });

  test('generates keys from brand/name when no barcode', () => {
    const product = { brand: 'TestBrand', name: 'TestProduct' };
    const key = generateProductKey(product);
    expect(key).toMatch(/^hash:/);
    expect(key).toBe(generateProductKey(product)); // Should be consistent
  });

  test('retrieves user portion preference', async () => {
    const product = { barcode: '123456789012', name: 'Test Product' };
    const pref = await getUserPortionPreference(product);
    
    expect(pref).toEqual({
      productKey: 'barcode:123456789012',
      portionGrams: 85,
      portionDisplay: '85g custom'
    });
  });

  test('handles missing preferences gracefully', async () => {
    // Mock no preference found
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: {
        auth: {
          getUser: () => Promise.resolve({ data: { user: { id: 'test-user-123' } } })
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: new Error('No rows') })
            })
          })
        })
      }
    }));

    const product = { barcode: '999999999999', name: 'Unknown Product' };
    const pref = await getUserPortionPreference(product);
    expect(pref).toBeNull();
  });
});