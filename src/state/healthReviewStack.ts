// Health Review Stack State Management
import { create } from 'zustand';

interface HealthReviewItem {
  name: string;
  status: 'pending' | 'loading' | 'ready' | 'error';
  healthData?: any;
  error?: string;
}

interface HealthReviewStackState {
  items: HealthReviewItem[];
  setItems: (items: HealthReviewItem[]) => void;
  addItems: (newItems: HealthReviewItem[]) => void;
  updateItem: (name: string, updates: Partial<HealthReviewItem>) => void;
  clearItems: () => void;
}

export const useHealthReviewStack = create<HealthReviewStackState>((set, get) => ({
  items: [],
  
  setItems: (items) => set({ items }),
  
  addItems: (newItems) => set((state) => {
    // Avoid duplicates based on canonical name
    const existingNames = new Set(state.items.map(item => item.name.toLowerCase()));
    const uniqueNewItems = newItems.filter(item => 
      !existingNames.has(item.name.toLowerCase())
    );
    return { items: [...state.items, ...uniqueNewItems] };
  }),
  
  updateItem: (name, updates) => set((state) => ({
    items: state.items.map(item =>
      item.name.toLowerCase() === name.toLowerCase()
        ? { ...item, ...updates }
        : item
    )
  })),
  
  clearItems: () => set({ items: [] }),
}));

export const healthReviewStack = {
  set: (items: { name: string; status?: 'pending' }[]) => {
    const reviewItems = items.map(item => ({
      name: item.name,
      status: 'pending' as const,
    }));
    useHealthReviewStack.getState().setItems(reviewItems);
  },
  
  add: (items: { name: string }[]) => {
    const reviewItems = items.map(item => ({
      name: item.name,
      status: 'pending' as const,
    }));
    useHealthReviewStack.getState().addItems(reviewItems);
  },
};