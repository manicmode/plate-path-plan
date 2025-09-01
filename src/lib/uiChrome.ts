/**
 * UI Chrome Controller
 * 
 * Single source of truth for immersive mode state across the app.
 * Controls bottom navigation visibility to prevent scanner/modal overlaps.
 * 
 * Usage:
 * - Call setImmersive(true) in scanner routes and take-photo modals
 * - Call setImmersive(false) on unmount to restore navigation
 * - Layout components use useImmersive() to conditionally render UI chrome
 * 
 * Rev: NAV_REV=2025-08-31T17:35Z-r2
 */

import { useState, useEffect, useCallback } from 'react';

const NAV_REV = "2025-08-31T17:35Z-r2";
const DEBUG_NAV = import.meta.env.VITE_DEBUG_NAV === "1";

function nlog(tag: string, payload: Record<string, unknown> = {}) {
  if (!DEBUG_NAV) return;
  const now = new Date();
  console.log(`[${tag}]`, { rev: NAV_REV, utc: now.toISOString(), local: now.toString(), ...payload });
}

// Global state for immersive mode
let immersiveState = false;
let immersiveListeners: Set<(immersive: boolean) => void> = new Set();

/**
 * Set immersive mode on/off
 * @param on - true to hide bottom nav (immersive), false to show it
 */
export function setImmersive(on: boolean): void {
  if (immersiveState === on) return;
  
  immersiveState = on;
  
  // Update DOM data attribute for CSS targeting
  if (typeof document !== 'undefined') {
    document.body.dataset.immersive = on ? 'true' : 'false';
  }
  
  nlog("NAV][IMMERSIVE", { 
    route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
    on 
  });
  
  // Notify all listeners
  immersiveListeners.forEach(listener => {
    try {
      listener(on);
    } catch (error) {
      console.error('[UIChrome] Listener error:', error);
    }
  });
}

/**
 * React hook to subscribe to immersive state changes
 * @returns current immersive state
 */
export function useImmersive(): boolean {
  const [immersive, setImmersiveLocal] = useState(immersiveState);
  
  useEffect(() => {
    // Add listener
    immersiveListeners.add(setImmersiveLocal);
    
    // Sync with current state in case it changed before hook mounted
    setImmersiveLocal(immersiveState);
    
    // Cleanup
    return () => {
      immersiveListeners.delete(setImmersiveLocal);
    };
  }, []);
  
  return immersive;
}

/**
 * React hook that automatically sets immersive mode for the component lifecycle
 * @param shouldBeImmersive - whether this component should be immersive
 */
export function useAutoImmersive(shouldBeImmersive: boolean): void {
  useEffect(() => {
    if (shouldBeImmersive) {
      setImmersive(true);
      return () => setImmersive(false);
    }
  }, [shouldBeImmersive]);
}

// Dev helpers (guarded by DEBUG_NAV)  
if (DEBUG_NAV && typeof window !== 'undefined') {
  (window as any).__debugUIChrome = {
    getState: () => immersiveState,
    setImmersive,
    listenerCount: () => immersiveListeners.size
  };
}