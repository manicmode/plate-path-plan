export type EmojiValue = { emoji: string; value: number };

export const ENERGY_MAP: EmojiValue[] = [
  { emoji: '😵‍💫', value: 2 },
  { emoji: '😫', value: 3 },
  { emoji: '😐', value: 5 },
  { emoji: '🙂', value: 7 },
  { emoji: '😌', value: 8 },
  { emoji: '😄', value: 9 },
  { emoji: '⚡️', value: 10 },
];

export const MOOD_MAP: EmojiValue[] = [
  { emoji: '😞', value: 2 },
  { emoji: '😕', value: 4 },
  { emoji: '🙂', value: 6 },
  { emoji: '😊', value: 8 },
  { emoji: '😄', value: 10 },
];

export const WELLNESS_MAP: EmojiValue[] = [
  { emoji: '😣', value: 2 },
  { emoji: '😐', value: 5 },
  { emoji: '🙂', value: 7 },
  { emoji: '😌', value: 8 },
  { emoji: '😎', value: 10 },
];

export function emojiFromScore(map: EmojiValue[], score: number): string {
  const v = Math.max(1, Math.min(10, Math.round(score)));
  // Find nearest by absolute distance; if tie, prefer higher value
  let nearest = map[0];
  let minDiff = Infinity;
  for (const item of map) {
    const diff = Math.abs(item.value - v);
    if (diff < minDiff || (diff === minDiff && item.value > nearest.value)) {
      nearest = item;
      minDiff = diff;
    }
  }
  return nearest.emoji;
}
