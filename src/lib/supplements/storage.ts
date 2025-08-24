const key = (userId?: string) => `supplement.tips.lastIndex:${userId ?? 'anon'}`;

export const getLastIndex = (userId?: string): number => {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem(key(userId));
  return stored ? Number(stored) || 0 : 0;
};

export const setLastIndex = (i: number, userId?: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key(userId), String(i));
};