import { canonicalizeName } from '@/lib/detect/canonicalize';

type StackItem = { name: string; status?: 'pending' | 'loading' | 'ready' | 'error' };
const s = new Map<string, StackItem>();

export const healthReviewStack = {
  set(items: string[]) {
    s.clear();
    for (const n of items) {
      const key = canonicalizeName(n);
      s.set(key, { name: key, status: 'pending' });
    }
  },
  append(items: string[]) {
    for (const n of items) {
      const key = canonicalizeName(n);
      if (!s.has(key)) {
        s.set(key, { name: key, status: 'pending' });
      }
    }
  },
  all(): StackItem[] {
    return [...s.values()];
  },
  update(name: string, patch: Partial<StackItem>) {
    const key = canonicalizeName(name);
    const cur = s.get(key);
    if (cur) {
      s.set(key, { ...cur, ...patch });
    }
  },
  clear() {
    s.clear();
  },
};