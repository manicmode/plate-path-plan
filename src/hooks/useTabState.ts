import { useState, useEffect } from 'react';
import { store } from '@/lib/storage';

/**
 * Hook to persist and manage tab state per card
 */
export const useTabState = (cardKey: string, defaultTab: string, userId?: string) => {
  const storageKey = `tabs.${cardKey}`;
  const [activeTab, setActiveTab] = useState<string>(() => {
    return store.get<string>(storageKey, defaultTab, userId);
  });

  useEffect(() => {
    store.set(storageKey, userId, activeTab);
  }, [activeTab, storageKey, userId]);

  return [activeTab, setActiveTab] as const;
};