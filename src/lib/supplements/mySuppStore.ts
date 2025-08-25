import { store } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

export type MySupp = {
  id: string;              // uuid v4
  slug?: string;           // registry slug if known
  name: string;            // display name (from registry or custom)
  dosage?: string;         // e.g., "1000 mg", free text
  unit?: string;           // optional structured unit
  source: 'manual' | 'purchase';
  createdAt: number;       // epoch ms
  updatedAt: number;
};

export const MY_SUPP_STORAGE_KEY = 'supp.my.v1';

// Get current user ID from auth context (simplified for now)
let currentUserId: string | undefined;

export const setCurrentUserId = (userId: string | undefined) => {
  currentUserId = userId;
};

const emitChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mySupp.changed'));
  }
};

export function listMySupplements(): MySupp[] {
  return store.get(MY_SUPP_STORAGE_KEY, [], currentUserId);  
}

export function addMySupplement(input: Omit<MySupp, 'id' | 'createdAt' | 'updatedAt'>): MySupp {
  const now = Date.now();
  const existing = listMySupplements();
  
  // Check for duplicates by slug (if provided) or name
  const isDuplicate = existing.some(supp => 
    (input.slug && supp.slug === input.slug) || 
    (!input.slug && supp.name.toLowerCase() === input.name.toLowerCase())
  );
  
  if (isDuplicate) {
    // Return existing item instead of creating duplicate
    const existingItem = existing.find(supp => 
      (input.slug && supp.slug === input.slug) || 
      (!input.slug && supp.name.toLowerCase() === input.name.toLowerCase())
    )!;
    return existingItem;
  }

  const newSupp: MySupp = {
    ...input,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };

  const updated = [...existing, newSupp];
  store.set(MY_SUPP_STORAGE_KEY, currentUserId, updated);
  
  emitChange();
  return newSupp;
}

export function removeMySupplement(id: string): void {
  const existing = listMySupplements();
  const filtered = existing.filter(s => s.id !== id);
  store.set(MY_SUPP_STORAGE_KEY, currentUserId, filtered);
  
  emitChange();
}

export function replaceAllMySupplements(next: MySupp[]): void {
  store.set(MY_SUPP_STORAGE_KEY, currentUserId, next);
  emitChange();
}

export function updateMySupplement(id: string, updates: Partial<Omit<MySupp, 'id' | 'createdAt'>>): MySupp | null {
  const existing = listMySupplements();
  const index = existing.findIndex(s => s.id === id);
  
  if (index === -1) return null;
  
  const updated = {
    ...existing[index],
    ...updates,
    updatedAt: Date.now(),
  };
  
  existing[index] = updated;
  store.set(MY_SUPP_STORAGE_KEY, currentUserId, existing);
  
  emitChange();
  return updated;
}