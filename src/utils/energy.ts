export const ENERGY_EMOJIS: string[] = ['😵‍💫', '😫', '😐', '🙂', '😌', '😄', '⚡️'];

export type EnergyMode = 'auto' | 'override';

export function energyEmojiFromScore(score: number): string {
  const v = Math.max(1, Math.min(10, Math.round(score)));
  if (v <= 2) return '😵‍💫';
  if (v <= 4) return '😫';
  if (v <= 6) return '😐';
  if (v === 7) return '🙂';
  if (v === 8) return '😌';
  if (v === 9) return '😄';
  return '⚡️';
}
