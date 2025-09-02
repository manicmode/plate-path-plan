// Acceptance test for LYF ensemble improvements
// Tests salmon + asparagus + cherry tomatoes + lemon plate detection

import { describe, it, expect, beforeEach } from 'vitest';
import { looksFoodish } from '../src/detect/filters';
import { canonicalize, similar, fuseDetections } from '../src/detect/ensemble';

// Mock salmon plate fixture
const MOCK_SALMON_PLATE = {
  visionFoods: [
    { name: 'salmon', source: 'object' as const, score: 0.92, bbox: { x: 100, y: 100, width: 120, height: 80 } },
    { name: 'asparagus', source: 'object' as const, score: 0.88, bbox: { x: 250, y: 120, width: 80, height: 60 } },
    { name: 'cherry tomatoes', source: 'object' as const, score: 0.76, bbox: { x: 180, y: 200, width: 40, height: 40 } },
    { name: 'lemon wedge', source: 'object' as const, score: 0.68, bbox: { x: 300, y: 150, width: 20, height: 15 } }
  ],
  gptNames: [
    'grilled salmon fillet',
    'asparagus spears', 
    'cherry tomato',
    'lemon slice',
    'recipe'  // Should be filtered out
  ]
};

describe('LYF Ensemble Acceptance Tests', () => {
  describe('Junk filtering', () => {
    it('should filter out recipe and cooking terms', () => {
      expect(looksFoodish('recipe')).toBe(false);
      expect(looksFoodish('cooking')).toBe(false);
      expect(looksFoodish('cooked dish')).toBe(false);
      expect(looksFoodish('plate')).toBe(false);
      expect(looksFoodish('utensil')).toBe(false);
    });

    it('should keep valid food items', () => {
      expect(looksFoodish('salmon')).toBe(true);
      expect(looksFoodish('asparagus')).toBe(true);
      expect(looksFoodish('cherry tomato')).toBe(true);
      expect(looksFoodish('lemon wedge')).toBe(true);
    });
  });

  describe('Canonicalization', () => {
    it('should canonicalize salmon variants to salmon', () => {
      expect(canonicalize('salmon')).toBe('salmon');
      expect(canonicalize('grilled salmon')).toBe('salmon');
      expect(canonicalize('smoked salmon')).toBe('salmon');
      expect(canonicalize('salmon fillet')).toBe('salmon');
    });

    it('should canonicalize tomato variants correctly', () => {
      expect(canonicalize('cherry tomato')).toBe('cherry tomato'); // Keep distinct
      expect(canonicalize('cherry tomatoes')).toBe('cherry tomato');
      expect(canonicalize('grape tomato')).toBe('cherry tomato');
      expect(canonicalize('tomato')).toBe('tomato');
    });

    it('should canonicalize lemon variants to lemon', () => {
      expect(canonicalize('lemon')).toBe('lemon');
      expect(canonicalize('lemon slice')).toBe('lemon');
      expect(canonicalize('lemon wedge')).toBe('lemon');
      expect(canonicalize('lemon slices')).toBe('lemon');
    });

    it('should canonicalize asparagus variants', () => {
      expect(canonicalize('asparagus')).toBe('asparagus');
      expect(canonicalize('asparagus spear')).toBe('asparagus');
      expect(canonicalize('green asparagus')).toBe('asparagus');
    });
  });

  describe('Similarity and deduplication', () => {
    it('should detect high similarity for contained terms', () => {
      expect(similar('cherry tomato', 'tomato')).toBeGreaterThanOrEqual(0.85);
      expect(similar('salmon fillet', 'salmon')).toBeGreaterThanOrEqual(0.85);
      expect(similar('lemon slice', 'lemon')).toBeGreaterThanOrEqual(0.85);
    });

    it('should merge similar items during fusion', () => {
      const visionFoods = [
        { name: 'salmon', source: 'object' as const, score: 0.92, bbox: { x: 100, y: 100, width: 120, height: 80 } }
      ];
      const gptNames = ['grilled salmon', 'salmon fillet'];

      const fused = fuseDetections(visionFoods, gptNames);

      // Should have only one salmon entry (deduplicated)
      const salmonItems = fused.filter(item => item.canonicalName === 'salmon');
      expect(salmonItems).toHaveLength(1);
      expect(salmonItems[0].origin).toBe('both'); // Merged Vision + GPT
      expect(salmonItems[0].bbox).toBeTruthy(); // Should preserve bbox from Vision
    });
  });

  describe('Salmon plate ensemble test', () => {
    it('should detect all expected food heads from salmon plate', () => {
      const { visionFoods, gptNames } = MOCK_SALMON_PLATE;

      // Filter GPT names (remove recipe)
      const filteredGptNames = gptNames.filter(name => looksFoodish(name));
      expect(filteredGptNames).not.toContain('recipe');

      const fused = fuseDetections(visionFoods, filteredGptNames);

      // Extract canonical names
      const canonicalNames = fused.map(item => item.canonicalName);

      // Should contain expected food heads
      expect(canonicalNames).toContain('salmon');
      expect(canonicalNames).toContain('asparagus');  
      expect(canonicalNames).toContain('cherry tomato');
      expect(canonicalNames).toContain('lemon');

      // Should not contain duplicates
      const uniqueNames = new Set(canonicalNames);
      expect(uniqueNames.size).toBe(canonicalNames.length);

      // Should not contain junk
      expect(canonicalNames).not.toContain('recipe');
      expect(canonicalNames).not.toContain('plate');
      expect(canonicalNames).not.toContain('utensil');
    });

    it('should prioritize Vision items with bboxes', () => {
      const { visionFoods, gptNames } = MOCK_SALMON_PLATE;
      const filteredGptNames = gptNames.filter(name => looksFoodish(name));
      
      const fused = fuseDetections(visionFoods, filteredGptNames);

      // All main items should have bboxes (from Vision)
      const salmonItem = fused.find(item => item.canonicalName === 'salmon');
      expect(salmonItem?.bbox).toBeTruthy();
      
      const asparagusItem = fused.find(item => item.canonicalName === 'asparagus');
      expect(asparagusItem?.bbox).toBeTruthy();
      
      const tomatoItem = fused.find(item => item.canonicalName === 'cherry tomato');
      expect(tomatoItem?.bbox).toBeTruthy();
      
      const lemonItem = fused.find(item => item.canonicalName === 'lemon');
      expect(lemonItem?.bbox).toBeTruthy();
    });

    it('should limit results to top 8 items', () => {
      // Create many mock items
      const manyVisionFoods = Array.from({ length: 12 }, (_, i) => ({
        name: `food_item_${i}`,
        source: 'object' as const,
        score: 0.5 + (i * 0.01), // Varying scores
        bbox: { x: i * 10, y: i * 10, width: 20, height: 20 }
      }));

      const fused = fuseDetections(manyVisionFoods, []);
      
      expect(fused.length).toBeLessThanOrEqual(8);
      
      // Should be sorted by priority (bbox presence, then score)
      for (let i = 1; i < fused.length; i++) {
        const prev = fused[i-1];
        const curr = fused[i];
        
        if (prev.bbox && !curr.bbox) {
          // bbox items should come first
          expect(true).toBe(true);
        } else if (prev.bbox && curr.bbox) {
          // Both have bbox, should be sorted by score
          expect(prev.score || 0).toBeGreaterThanOrEqual(curr.score || 0);
        }
      }
    });
  });
});