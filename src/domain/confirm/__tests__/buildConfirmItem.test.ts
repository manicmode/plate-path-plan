import { buildConfirmItem } from '../buildConfirmItem';
import { describe, it, expect } from 'vitest';

describe('buildConfirmItem', () => {
  it('preserves image from selected when both have images', () => {
    const selected = { 
      name: 'Hot Dog', 
      imageUrl: 'https://img/sel.jpg',
      imageAttribution: 'selected'
    };
    const enriched = { 
      imageUrl: 'https://img/enr.jpg',
      imageAttribution: 'enriched'
    };
    const c = buildConfirmItem(selected, enriched);
    expect(c.imageUrl).toBe('https://img/sel.jpg'); // preserve-first
    expect(c.imageAttribution).toBe('selected');
  });

  it('uses enriched image when selected has none', () => {
    const selected = { name: 'Hot Dog' };
    const enriched = { 
      imageUrl: 'https://img/enr.jpg',
      imageAttribution: 'enriched'
    };
    const c = buildConfirmItem(selected, enriched);
    expect(c.imageUrl).toBe('https://img/enr.jpg');
    expect(c.imageAttribution).toBe('enriched');
  });

  it('returns null image when neither has images', () => {
    const selected = { name: 'Hot Dog' };
    const enriched = { name: 'Enhanced Hot Dog' };
    const c = buildConfirmItem(selected, enriched);
    expect(c.imageUrl).toBe(null);
    expect(c.imageAttribution).toBe(null);
  });

  it('builds complete confirm item with all fields', () => {
    const selected = { 
      name: 'Test Food',
      calories: 150,
      protein: 10,
      carbs: 20,
      fat: 5,
      source: 'manual',
      imageUrl: 'https://test.jpg'
    };
    const c = buildConfirmItem(selected, undefined);
    
    expect(c.name).toBe('Test Food');
    expect(c.calories).toBe(150);
    expect(c.protein).toBe(10);
    expect(c.carbs).toBe(20);
    expect(c.fat).toBe(5);
    expect(c.source).toBe('manual');
    expect(c.imageUrl).toBe('https://test.jpg');
  });

  it('merges fields with preserve-first semantics', () => {
    const selected = { 
      name: 'Selected Name',
      calories: 100
    };
    const enriched = { 
      name: 'Enriched Name',
      calories: 200,
      protein: 15
    };
    const c = buildConfirmItem(selected, enriched);
    
    expect(c.name).toBe('Selected Name'); // selected wins
    expect(c.calories).toBe(100); // selected wins
    expect(c.protein).toBe(15); // enriched fills gap
  });
});