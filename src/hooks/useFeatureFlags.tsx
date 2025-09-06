import { useState, useEffect } from 'react';

interface FeatureFlags {
  FEATURE_ENRICH_MANUAL_FOOD: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  FEATURE_ENRICH_MANUAL_FOOD: true
};

export function useFeatureFlags(): FeatureFlags {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);

  useEffect(() => {
    // Read from localStorage
    const stored = localStorage.getItem('featureFlags');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setFlags({ ...DEFAULT_FLAGS, ...parsed });
      } catch (e) {
        console.warn('Failed to parse feature flags from localStorage');
      }
    }
  }, []);

  return flags;
}

// Helper to update individual flags
export function setFeatureFlag(key: keyof FeatureFlags, value: boolean) {
  const current = JSON.parse(localStorage.getItem('featureFlags') || '{}');
  const updated = { ...current, [key]: value };
  localStorage.setItem('featureFlags', JSON.stringify(updated));
  
  // Trigger storage event for other tabs
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'featureFlags',
    newValue: JSON.stringify(updated)
  }));
}