import { describe, it, expect } from 'vitest';
import { substituteTokens, buildClosingLine, buildSystemPrompt } from '@/utils/coachPrompt';

describe('token substitution', () => {
  it('removes unknown tokens cleanly', () => {
    const out = substituteTokens('Hi {{unknown}}!', {});
    expect(out).toBe('Hi !');
  });

  it('substitutes known tokens and omits nulls', () => {
    const out = substituteTokens('Cals {{avg_cals_7d}}, Protein {{protein_g_7d}}, X {{missing}}', {
      avg_cals_7d: 1900,
      protein_g_7d: 110,
      missing: null,
    });
    expect(out).toBe('Cals 1900, Protein 110, X ');
  });
});

describe('closing line builder', () => {
  it('omits null fragments (recovery)', () => {
    const line = buildClosingLine('recovery', { sleep_avg_7d: 7.2, stress_avg_7d: null, recovery_score: 82 });
    expect(line).toBe('Closing: Sleep 7.2h, recovery 82/100.');
  });

  it('adds next_small_goal when present (exercise)', () => {
    const line = buildClosingLine('exercise', { workouts_7d: 3, avg_duration_min_7d: 42, consistency_pct_30d: 25, next_small_goal: 'Add 10 min walk Tue' });
    expect(line).toContain('Next step: Add 10 min walk Tue.');
  });

  it('includes protein target when present (nutrition)', () => {
    const line = buildClosingLine('nutrition', { avg_cals_7d: 1900, protein_g_7d: 110, protein_target_g: 130 });
    expect(line).toContain('Target next: 130g.');
  });
});

describe('prompt builder', () => {
  const ctx = { profile: { age: 29 }, exercise: { workouts_7d: 3 } };

  it('includes context when toggle ON', () => {
    const p = buildSystemPrompt('exercise', true, ctx);
    expect(p).toContain('context:*');
    expect(p).toContain('workouts_7d');
  });

  it('excludes real context when toggle OFF', () => {
    const p = buildSystemPrompt('exercise', false, ctx);
    expect(p).toContain('Personalization off or no context available.');
    expect(p.includes('workouts_7d')).toBe(false);
  });
});
