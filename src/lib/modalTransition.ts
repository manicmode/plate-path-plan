/**
 * Simple modal transition guard system
 * Prevents ScanHub fallback navigation during modal transitions
 */

// Global route guards to prevent navigation during transitions
const routeGuards = new Set<string>();

export const modalTransition = {
  // Set a guard to prevent fallback navigation
  setGuard: (key: string) => {
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.info('[MODAL][TRANSITION][GUARD_SET]', key);
    }
    routeGuards.add(key);
  },
  
  // Remove a guard
  clearGuard: (key: string) => {
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.info('[MODAL][TRANSITION][GUARD_CLEAR]', key);
    }
    routeGuards.delete(key);
  },
  
  // Check if any guards are active
  hasGuard: (key?: string) => {
    return key ? routeGuards.has(key) : routeGuards.size > 0;
  },
  
  // Atomic replace: close one modal and open another without intermediate state
  async replaceModal(fromKey: string, to: { key: string; props?: any }, actions: {
    onClose: () => void;
    onOpen: () => void;
  }) {
    // Set guard to prevent ScanHub fallback during transition
    this.setGuard('modalTransition');
    
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.info('[MODAL][TRANSITION][REPLACE]', { from: fromKey, to: to.key });
    }
    
    try {
      // Close the from modal
      actions.onClose();
      
      // Wait for next tick to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Open the to modal
      actions.onOpen();
      
    } finally {
      // Clear guard after transition
      setTimeout(() => {
        this.clearGuard('modalTransition');
      }, 100); // Small delay to ensure new modal is fully mounted
    }
  }
};

// Export route guard helpers for use in ScanHub fallback logic
export const routeGuardHelpers = {
  has: (key: string) => modalTransition.hasGuard(key),
  set: (key: string, value: string) => modalTransition.setGuard(`${key}:${value}`),
  delete: (key: string) => {
    // Delete all guards with this prefix
    const internalGuards = (modalTransition as any).routeGuards || new Set();
    const toDelete = Array.from(internalGuards).filter((guard: string) => guard.startsWith(`${key}:`));
    toDelete.forEach((guard: string) => internalGuards.delete(guard));
  }
};