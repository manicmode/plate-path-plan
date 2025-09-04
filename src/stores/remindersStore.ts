import { create } from 'zustand';

export type ReminderKind = 'food_item' | 'meal_set';
export interface Reminder {
  id: string;            // stable id, e.g. set-<hash>
  kind: ReminderKind;
  title: string;
  cron?: string;         // optional, e.g. "0 12 * * 1-5"
  enabled: boolean;
  createdAt: number;
}

type State = {
  byId: Record<string, Reminder>;
  upsert(r: Reminder): void;
  remove(id: string): void;
  get(id: string): Reminder | undefined;
};

export const useRemindersStore = create<State>((set, get) => ({
  byId: {},
  upsert: (r) => set((s) => ({ byId: { ...s.byId, [r.id]: r } })),
  remove: (id) => set((s) => {
    const copy = { ...s.byId };
    delete copy[id];
    return { byId: copy };
  }),
  get: (id) => get().byId[id],
}));

// ↓ Stub backend calls you can replace with real API
export async function scheduleReminder(r: Reminder) {
  // await fetch('/api/reminders', { method:'POST', body: JSON.stringify(r) })
  console.log('[API][Schedule]', r);
  return true;
}
export async function cancelReminder(id: string) {
  // await fetch(`/api/reminders/${id}`, { method:'DELETE' })
  console.log('[API][Cancel]', id);
  return true;
}