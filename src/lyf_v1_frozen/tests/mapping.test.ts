import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzePhotoForLyfV1 } from '../index';
import { looksFoodish } from '../filters';

// Mock the food search function
vi.mock('@/lib/foodSearch', () => ({
  searchFoodByName: vi.fn()
}));

describe('LYF v1 Frozen Mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('looksFoodish filter', () => {
    it('should accept food items', () => {
      expect(looksFoodish('salmon')).toBe(true);
      expect(looksFoodish('asparagus')).toBe(true);
      expect(looksFoodish('chicken breast')).toBe(true);
    });

    it('should reject junk items', () => {
      expect(looksFoodish('plate')).toBe(false);
      expect(looksFoodish('fork')).toBe(false);
      expect(looksFoodish('logo')).toBe(false);
      expect(looksFoodish('tableware')).toBe(false);
      expect(looksFoodish('brand')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(looksFoodish('')).toBe(false);
      expect(looksFoodish('ab')).toBe(false); // too short
      expect(looksFoodish('   ')).toBe(false);
    });
  });

  describe('analyzePhotoForLyfV1', () => {
    it('should filter out junk and map food items', async () => {
      const mockSupabase = {
        functions: {
          invoke: vi.fn().mockResolvedValue({
            data: {
              items: [
                { name: 'salmon', confidence: 0.9, source: 'object' },
                { name: 'asparagus', confidence: 0.8, source: 'object' },
                { name: 'plate', confidence: 0.7, source: 'object' },
                { name: 'logo', confidence: 0.6, source: 'label' }
              ],
              _debug: { from: 'objects', count: 4 }
            },
            error: null
          })
        }
      };

      const { searchFoodByName } = await import('@/lib/foodSearch');
      (searchFoodByName as any).mockImplementation((name: string) => {
        const mockResults = {
          'salmon': [{ name: 'Salmon, cooked', calories: 200 }],
          'asparagus': [{ name: 'Asparagus, cooked', calories: 25 }]
        };
        return Promise.resolve(mockResults[name as keyof typeof mockResults] || []);
      });

      const result = await analyzePhotoForLyfV1(mockSupabase, 'fake-base64');

      expect(result.mapped).toHaveLength(2);
      expect(result.mapped[0].vision).toBe('salmon');
      expect(result.mapped[1].vision).toBe('asparagus');
      expect(result.mapped.find((m: any) => m.vision === 'plate')).toBeUndefined();
      expect(result.mapped.find((m: any) => m.vision === 'logo')).toBeUndefined();
    });
  });
});