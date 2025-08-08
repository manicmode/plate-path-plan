import { useState, useCallback, useRef } from 'react';

/**
 * Hook to prevent duplicate nutrition logs from being processed
 * when both immediate save and realtime subscription updates fire
 */
export const useNutritionDeduplication = () => {
  const recentlySavedIds = useRef<Set<string>>(new Set());
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const addToRecentlySaved = useCallback((id: string) => {
    // Add to the set
    recentlySavedIds.current.add(id);
    
    // Clear any existing timeout for this ID
    const existingTimeout = timeoutRefs.current.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set timeout to remove after 5 seconds
    const timeout = setTimeout(() => {
      recentlySavedIds.current.delete(id);
      timeoutRefs.current.delete(id);
    }, 5000);
    
    timeoutRefs.current.set(id, timeout);
  }, []);

  const isRecentlySaved = useCallback((id: string): boolean => {
    return recentlySavedIds.current.has(id);
  }, []);

  const clearAll = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();
    recentlySavedIds.current.clear();
  }, []);

  return {
    addToRecentlySaved,
    isRecentlySaved,
    clearAll
  };
};