// Regression test for LYF v1 pipeline improvements
// Tests that salmon + asparagus + cherry tomatoes + lemon plate yields expected items

import { describe, it, expect } from 'vitest';
import { analyzePhotoForLyfV1 } from '../src/lyf_v1_frozen/index';
import { looksFoodish } from '../src/lyf_v1_frozen/filters';

// Mock fixture simulating Vision API response for salmon plate
const MOCK_SALMON_PLATE_RESPONSE = {
  items: [
    { name: 'salmon', source: 'object', confidence: 0.92 },
    { name: 'smoked salmon', source: 'label', confidence: 0.85 },
    { name: 'asparagus', source: 'object', confidence: 0.88 },
    { name: 'cherry tomatoes', source: 'object', confidence: 0.76 },
    { name: 'tomato', source: 'label', confidence: 0.71 },
    { name: 'lemon wedge', source: 'object', confidence: 0.68 },
    { name: 'lemon slice', source: 'label', confidence: 0.65 },
    { name: 'plate', source: 'object', confidence: 0.95 }, // Should be filtered
    { name: 'fork', source: 'object', confidence: 0.82 }, // Should be filtered
    { name: 'vegetable', source: 'label', confidence: 0.60 } // Generic, should be kept but unmapped
  ],
  _debug: { mockFixture: true }
};

describe('LYF v1 Regression Tests', () => {
  it('should correctly filter food vs junk items', () => {
    expect(looksFoodish('salmon')).toBe(true);
    expect(looksFoodish('cherry tomatoes')).toBe(true);
    expect(looksFoodish('asparagus')).toBe(true);
    expect(looksFoodish('lemon wedge')).toBe(true);
    
    // Junk should be filtered
    expect(looksFoodish('plate')).toBe(false);
    expect(looksFoodish('fork')).toBe(false);
    expect(looksFoodish('napkin')).toBe(false);
    expect(looksFoodish('logo')).toBe(false);
  });

  it('should include expected food heads for salmon plate', async () => {
    // Mock the detector client
    const mockSupabase = {};
    
    // Mock analyzeLyfV1 to return our fixture
    const originalAnalyzeLyfV1 = await import('../src/lyf_v1_frozen/detectorClient');
    jest.spyOn(originalAnalyzeLyfV1, 'analyzeLyfV1').mockResolvedValue(MOCK_SALMON_PLATE_RESPONSE);
    
    const result = await analyzePhotoForLyfV1(mockSupabase, 'mock-base64');
    
    // Extract canonical names from results
    const canonicalNames = result.mapped.map(item => item.canonicalName);
    
    // Should contain the expected food heads
    expect(canonicalNames).toContain('salmon');
    expect(canonicalNames).toContain('asparagus');  
    expect(canonicalNames).toContain('tomato');
    expect(canonicalNames).toContain('lemon');
    
    // Should not contain duplicates (salmon + smoked salmon → salmon)
    const salmonCount = canonicalNames.filter(name => name === 'salmon').length;
    expect(salmonCount).toBe(1);
    
    const tomatoCount = canonicalNames.filter(name => name === 'tomato').length;
    expect(tomatoCount).toBe(1);
    
    // Should not contain junk
    expect(canonicalNames).not.toContain('plate');
    expect(canonicalNames).not.toContain('fork');
    
    // Should have reasonable portion estimates
    const salmonItem = result.mapped.find(item => item.canonicalName === 'salmon');
    expect(salmonItem?.grams).toBeGreaterThanOrEqual(120);
    expect(salmonItem?.grams).toBeLessThanOrEqual(160);
    
    const asparagusItem = result.mapped.find(item => item.canonicalName === 'asparagus');
    expect(asparagusItem?.grams).toBeGreaterThanOrEqual(80);
    expect(asparagusItem?.grams).toBeLessThanOrEqual(100);
    
    const tomatoItem = result.mapped.find(item => item.canonicalName === 'tomato');
    expect(tomatoItem?.grams).toBeGreaterThanOrEqual(25);
    expect(tomatoItem?.grams).toBeLessThanOrEqual(40);
    
    const lemonItem = result.mapped.find(item => item.canonicalName === 'lemon');
    expect(lemonItem?.grams).toBeGreaterThanOrEqual(8);
    expect(lemonItem?.grams).toBeLessThanOrEqual(15);
  });

  it('should keep unmapped items with mapped:false flag', async () => {
    const mockSupabase = {};
    
    // Mock response with an item that won't map to nutrition 
    const mockResponse = {
      items: [
        { name: 'salmon', source: 'object', confidence: 0.92 },
        { name: 'exotic_fruit_xyz', source: 'label', confidence: 0.70 } // Won't map
      ],
      _debug: { mockFixture: true }
    };
    
    const originalAnalyzeLyfV1 = await import('../src/lyf_v1_frozen/detectorClient');
    jest.spyOn(originalAnalyzeLyfV1, 'analyzeLyfV1').mockResolvedValue(mockResponse);
    
    const result = await analyzePhotoForLyfV1(mockSupabase, 'mock-base64');
    
    // Should have both items
    expect(result.mapped).toHaveLength(2);
    
    // Salmon should be mapped
    const salmonItem = result.mapped.find(item => item.canonicalName === 'salmon');
    expect(salmonItem?.mapped).toBe(true);
    expect(salmonItem?.hit).toBeTruthy();
    
    // Exotic fruit should be unmapped but kept
    const exoticItem = result.mapped.find(item => item.canonicalName === 'exotic_fruit_xyz');
    expect(exoticItem?.mapped).toBe(false);
    expect(exoticItem?.hit).toBeNull();
    expect(exoticItem?.grams).toBe(100); // Default fallback
  });
});