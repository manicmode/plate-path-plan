// Original confirm flow entrypoint - immediate modal opening
import { ReviewItem } from '@/components/camera/ReviewItemsScreen';

interface ConfirmFlowState {
  active: boolean;
  items: any[];
  index: number;
  origin: string;
}

// Global state for confirm flow
let confirmState: ConfirmFlowState = {
  active: false,
  items: [],
  index: 0,
  origin: ''
};

// Global listeners for modal state
const modalListeners = new Set<(items: any[], active: boolean) => void>();

export function addConfirmFlowListener(listener: (items: any[], active: boolean) => void) {
  modalListeners.add(listener);
}

export function removeConfirmFlowListener(listener: (items: any[], active: boolean) => void) {
  modalListeners.delete(listener);
}

function notifyModalListeners() {
  modalListeners.forEach(listener => {
    try {
      listener(confirmState.items, confirmState.active);
    } catch (error) {
      console.error('[ConfirmFlow] Listener error:', error);
    }
  });
}

function normalizeItems(items: ReviewItem[]): any[] {
  return items.map(item => ({
    name: item.name,
    category: 'food',
    portion_estimate: item.grams || 100,
    confidence: 0.9,
    displayText: `${item.grams || 100}g • est.`,
    canonicalName: item.canonicalName || item.name
  }));
}

export function beginConfirmSequence(items: ReviewItem[], opts: { origin: string }) {
  if (import.meta.env.VITE_LOG_DEBUG === 'true') {
    console.info('[DL][FLOW] start', { 
      count: items.length, 
      origin: opts.origin,
      items: items.map(i => i.name)
    });
  }

  // Set state immediately
  confirmState.active = true;
  confirmState.items = normalizeItems(items);
  confirmState.index = 0;
  confirmState.origin = opts.origin;

  // Open modal immediately
  if (import.meta.env.VITE_LOG_DEBUG === 'true') {
    console.info('[DL][FLOW] open', { 
      index: 0, 
      name: confirmState.items[0]?.name 
    });
  }

  notifyModalListeners();

  // DEV watchdog to force open if stalled
  if (import.meta.env.VITE_LOG_DEBUG === 'true') {
    const openedAt = performance.now();
    setTimeout(() => {
      if (!confirmState.active) {
        console.warn('[DL][FLOW][WATCHDOG] modal not active after 700ms, forcing open');
        confirmState.active = true;
        notifyModalListeners();
      } else {
        console.info('[DL][FLOW] modal opened in', Math.round(performance.now() - openedAt), 'ms');
      }
    }, 700);
  }
}

export function handleConfirmFlowComplete(confirmedItems: any[]) {
  if (import.meta.env.VITE_LOG_DEBUG === 'true') {
    console.info('[DL][FLOW] end', { 
      confirmed: confirmedItems.length, 
      origin: confirmState.origin 
    });
    confirmedItems.forEach((item, index) => {
      console.info('[DL][FLOW] confirm', { index: index + 1, name: item.name });
    });
  }

  // Reset state
  confirmState.active = false;
  confirmState.items = [];
  confirmState.index = 0;
  confirmState.origin = '';

  notifyModalListeners();

  // Handle logging
  return handleItemLogging(confirmedItems);
}

export function handleConfirmFlowReject() {
  if (import.meta.env.VITE_LOG_DEBUG === 'true') {
    console.info('[DL][FLOW] rejected', { origin: confirmState.origin });
  }

  // Reset state
  confirmState.active = false;
  confirmState.items = [];
  confirmState.index = 0;
  confirmState.origin = '';

  notifyModalListeners();
}

async function handleItemLogging(confirmedItems: any[]) {
  try {
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.info('[LOG][DETAILED][CONFIRM][START]', { count: confirmedItems.length });
      confirmedItems.forEach((item, index) => {
        console.info('[LOG][INSERT][START]', { 
          index: index + 1, 
          name: item.name, 
          grams: item.portion_estimate || 100 
        });
      });
    }

    // Import here to avoid circular dependencies
    const { oneTapLog } = await import('@/lib/nutritionLog');
    
    const logEntries = confirmedItems.map(item => ({
      name: item.name,
      canonicalName: item.canonicalName || item.name,
      grams: item.portion_estimate || 100
    }));

    await oneTapLog(logEntries);
    
    // Log successful inserts
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      logEntries.forEach((entry, index) => {
        console.info('[LOG][INSERT][OK]', { 
          index: index + 1, 
          name: entry.name,
          grams: entry.grams
        });
      });
      console.info('[LOG][DETAILED][CONFIRM][DONE]');
    }

    // Import toast dynamically to avoid circular deps
    const { toast } = await import('sonner');
    toast.success(`Logged ${confirmedItems.length} item${confirmedItems.length > 1 ? 's' : ''} ✓`);
    
    // Navigate to home
    const { useNavigate } = await import('react-router-dom');
    // We can't use useNavigate here since this isn't a component
    // Instead, use window navigation
    window.location.href = '/home';
    
  } catch (error) {
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.error('[DL][FLOW] log failed', error);
      confirmedItems.forEach((item, index) => {
        console.error('[LOG][INSERT][FAIL]', { 
          index: index + 1, 
          name: item.name, 
          error: error.message 
        });
      });
    }
    
    // Import toast dynamically
    const { toast } = await import('sonner');
    toast.error('Failed to log items. Please try again.');
  }
}

export function getConfirmFlowState() {
  return confirmState;
}