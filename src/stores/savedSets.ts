import { create } from 'zustand';

type SavedSet = {
  id: string;
  name: string;
  items: Array<{ id: string; name: string; grams?: number; imageUrl?: string }>;
  createdAt: number;
};

type SavedSetsState = {
  byId: Record<string, SavedSet>;
  upsertSet: (s: SavedSet) => void;
  remove: (id: string) => void;
  all: () => SavedSet[];
};

export const useSavedSetsStore = create<SavedSetsState>((set, get) => ({
  byId: {},
  upsertSet: (s) => set((st) => ({ byId: { ...st.byId, [s.id]: s } })),
  remove: (id) => set((st) => { const c = { ...st.byId }; delete c[id]; return { byId: c }; }),
  all: () => Object.values(get().byId).sort((a,b)=>b.createdAt-a.createdAt),
}));