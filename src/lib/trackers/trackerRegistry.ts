import React from 'react';
import { Zap, Target, Droplets, Pill, Activity, Sparkles, Atom } from 'lucide-react';

export type TrackerKey = 
  | "calories" | "hydration" | "supplements"
  | "protein" | "carbs" | "fat" | "fiber" 
  | "sugar" | "sodium" | "saturated_fat" | "micronutrients";

export interface TrackerConfig {
  label: string;
  icon: React.ReactNode;
  supportsHomeTile: boolean;
  emoji: string;
}

export const TRACKER_REGISTRY: Record<TrackerKey, TrackerConfig> = {
  calories: {
    label: 'Calories',
    icon: React.createElement(Zap, { className: 'h-5 w-5' }),
    supportsHomeTile: true,
    emoji: '🔥'
  },
  protein: {
    label: 'Protein', 
    icon: React.createElement(Target, { className: 'h-5 w-5' }),
    supportsHomeTile: true,
    emoji: '💪'
  },
  carbs: {
    label: 'Carbs',
    icon: React.createElement(Activity, { className: 'h-5 w-5' }),
    supportsHomeTile: true,
    emoji: '🍞'
  },
  fat: {
    label: 'Fat',
    icon: React.createElement(Target, { className: 'h-5 w-5' }),
    supportsHomeTile: true,
    emoji: '🧈'
  },
  hydration: {
    label: 'Hydration',
    icon: React.createElement(Droplets, { className: 'h-5 w-5' }),
    supportsHomeTile: true,
    emoji: '💧'
  },
  supplements: {
    label: 'Supplements',
    icon: React.createElement(Pill, { className: 'h-5 w-5' }),
    supportsHomeTile: true,
    emoji: '💊'
  },
  fiber: {
    label: 'Fiber',
    icon: React.createElement(Activity, { className: 'h-5 w-5' }),
    supportsHomeTile: true,
    emoji: '🌾'
  },
  sugar: {
    label: 'Sugar',
    icon: React.createElement(Sparkles, { className: 'h-5 w-5' }),
    supportsHomeTile: true,
    emoji: '🍬'
  },
  sodium: {
    label: 'Sodium',
    icon: React.createElement(Activity, { className: 'h-5 w-5' }),
    supportsHomeTile: true,
    emoji: '🧂'
  },
  saturated_fat: {
    label: 'Sat Fat',
    icon: React.createElement(Target, { className: 'h-5 w-5' }),
    supportsHomeTile: true,
    emoji: '🧈'
  },
  micronutrients: {
    label: 'Micronutrients',
    icon: React.createElement(Atom, { className: 'h-5 w-5' }),
    supportsHomeTile: true,
    emoji: '🧬'
  }
};

export const getEligibleTrackers = (currentTrackers: TrackerKey[]): TrackerKey[] => {
  return Object.keys(TRACKER_REGISTRY)
    .filter((key) => {
      const trackerKey = key as TrackerKey;
      return !currentTrackers.includes(trackerKey) && TRACKER_REGISTRY[trackerKey].supportsHomeTile;
    }) as TrackerKey[];
};