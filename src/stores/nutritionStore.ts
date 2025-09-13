/**
 * Unified Nutrition Store - Source of Truth for Health Report ↔ Confirm Food Log
 * Ensures identical nutrition/health data across all flows
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type PerGram = Partial<Record<'calories'|'protein'|'carbs'|'fat'|'sugar'|'fiber'|'sodium', number>>;

export interface NutritionAnalysis {
  // Core nutrition data (canonical per-gram basis)
  perGram?: PerGram;
  
  // Health analysis
  healthScore?: number;
  flags?: Array<{
    id?: string;
    label: string;
    level?: 'warn'|'info'|'good'|'danger'|'warning';
    severity?: string;
  }>;
  
  // Product metadata
  ingredients?: string[];
  imageUrl: string | null;              // not optional – present but null when absent
  imageAttribution: string | null;      // not optional – present but null when absent
  source?: string;
  confidence?: number;
  
  // Store metadata
  v?: number;              // version for schema evolution
  updatedAt?: number;      // timestamp for TTL/freshness
  __hydrated?: boolean;    // marker for successful hydration
}

interface NutritionState {
  // ID-keyed nutrition data
  byId: Record<string, NutritionAnalysis>;
  
  // LRU tracking for cache eviction
  accessOrder: string[];
  maxSize: number;
  
  // Core operations
  get: (id: string) => NutritionAnalysis | undefined;
  upsertMany: (patch: Record<string, NutritionAnalysis>) => void;
  upsert: (id: string, analysis: NutritionAnalysis) => void;
  clear: () => void;
  
  // Debug/monitoring
  getStats: () => { count: number; hydrated: number; recent: string[] };
}

// Generate stable ID from item data
export function generateFoodId(item: any): string {
  // Prefer explicit IDs
  if (item.foodId) return String(item.foodId);
  if (item.id && item.id !== `idx-${item.index}`) return String(item.id);
  if (item.uid) return String(item.uid);
  
  // Fallback: stable hash of identifying attributes
  const key = [
    item.name || item.displayName || item.canonicalName,
    item.brand || item.productName,
    item.barcode,
  ].filter(Boolean).join('|').toLowerCase();
  
  // Simple hash for consistency
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const hashStr = Math.abs(hash).toString(36);
  
  // Log when using fallback for monitoring
  if (import.meta.env.DEV) {
    console.log('[SST][ID][FALLBACK]', { key, hash: hashStr, item: item.name });
  }
  
  return `hash-${hashStr}`;
}

export const useNutritionStore = create<NutritionState>()(
  devtools(
    (set, get) => ({
      byId: {},
      accessOrder: [],
      maxSize: 1000, // LRU limit

      get: (id: string) => {
        const state = get();
        const analysis = state.byId[id];
        
        if (analysis) {
          // Update LRU order
          set((state) => ({
            accessOrder: [id, ...state.accessOrder.filter(aid => aid !== id)].slice(0, state.maxSize)
          }));
        }
        
        return analysis;
      },

      upsert: (id: string, analysis: NutritionAnalysis) => {
        set((state) => {
          const existing = state.byId[id];
          const updatedAt = Date.now();
          
          // Only update if newer or missing
          const shouldUpdate = !existing || 
            !existing.updatedAt || 
            (analysis.updatedAt && analysis.updatedAt > existing.updatedAt) ||
            (!existing.perGram && analysis.perGram);
            
          if (!shouldUpdate) return state;
          
          const newById = {
            ...state.byId,
            [id]: {
              ...existing,
              ...analysis,
              updatedAt,
              v: 1
            }
          };
          
          // Update LRU order
          const newAccessOrder = [id, ...state.accessOrder.filter(aid => aid !== id)];
          
          // Evict oldest if over limit
          if (newAccessOrder.length > state.maxSize) {
            const evicted = newAccessOrder.slice(state.maxSize);
            evicted.forEach(eid => delete newById[eid]);
          }
          
          return {
            byId: newById,
            accessOrder: newAccessOrder.slice(0, state.maxSize)
          };
        });
      },

      upsertMany: (patch: Record<string, NutritionAnalysis>) => {
        const { upsert } = get();
        Object.entries(patch).forEach(([id, analysis]) => {
          upsert(id, analysis);
        });
      },

      clear: () => set({ byId: {}, accessOrder: [] }),

      getStats: () => {
        const state = get();
        const entries = Object.values(state.byId);
        return {
          count: entries.length,
          hydrated: entries.filter(a => a.__hydrated).length,
          recent: state.accessOrder.slice(0, 5)
        };
      }
    }),
    { name: 'nutrition-store' }
  )
);