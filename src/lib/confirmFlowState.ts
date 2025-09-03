/**
 * Global state for confirm flow to prevent ScanHub navigation
 * Simple implementation to track when any confirm modal is active
 */

let confirmFlowActive = false;
let listeners: Set<() => void> = new Set();

export function setConfirmFlowActive(active: boolean) {
  if (confirmFlowActive !== active) {
    confirmFlowActive = active;
    listeners.forEach(listener => listener());
  }
}

export function useConfirmFlowActive() {
  const [state, setState] = React.useState(confirmFlowActive);
  
  React.useEffect(() => {
    const listener = () => setState(confirmFlowActive);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  
  return state;
}

export function isConfirmFlowActive() {
  return confirmFlowActive;
}

// React import for the hook
import React from 'react';