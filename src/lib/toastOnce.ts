import { toast } from 'sonner';

interface ToastRecord {
  timestamp: number;
  message: string;
  kind: string;
}

// Module-level cache to track recent toasts
const recentToasts = new Map<string, ToastRecord>();
const DEDUPE_WINDOW_MS = 2000; // 2 seconds

/**
 * Show a toast only if the same message+kind hasn't been shown within the dedupe window
 */
export function toastOnce(
  kind: 'success' | 'error' | 'info', 
  message: string, 
  opts?: any
): void {
  const key = `${kind}:${message}`;
  const now = Date.now();
  
  // Check if this toast was recently shown
  const recent = recentToasts.get(key);
  if (recent && (now - recent.timestamp) < DEDUPE_WINDOW_MS) {
    return; // Skip duplicate
  }
  
  // Update cache
  recentToasts.set(key, { timestamp: now, message, kind });
  
  // Clean up old entries to prevent memory leaks
  for (const [cacheKey, record] of recentToasts.entries()) {
    if (now - record.timestamp > DEDUPE_WINDOW_MS * 2) {
      recentToasts.delete(cacheKey);
    }
  }
  
  // Show the toast
  switch (kind) {
    case 'success':
      toast.success(message, opts);
      break;
    case 'error':
      toast.error(message, opts);
      break;
    case 'info':
      toast.info(message, opts);
      break;
  }
}