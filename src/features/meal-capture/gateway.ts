/**
 * Meal Capture Gateway - Safe handoff from PhotoCaptureModal
 * Only activates when feature flag is enabled
 */

import { mealCaptureEnabledFromSearch } from '@/features/meal-capture/flags';
import { putMealPhoto } from './photoStore';

/**
 * Handle meal capture handoff from PhotoCaptureModal
 * Returns true if handoff succeeded, false if should continue legacy path
 */
export async function handoffFromPhotoCapture(
  blob: Blob,
  searchParams?: string
): Promise<{ success: boolean; token?: string }> {
  // Early exit if feature is disabled - completely inert
  if (!mealCaptureEnabledFromSearch(searchParams || window.location.search)) {
    return { success: false };
  }

  // Prevent double-fires with inflight lock
  if (sessionStorage.getItem("mc:handoff:inflight") === "1") {
    return { success: true }; // Already handled
  }

  try {
    // Feature is enabled - proceed with handoff
    sessionStorage.setItem("mc:handoff:inflight", "1");

    const token = crypto.randomUUID();
    
    // Store blob in memory instead of using blob URLs
    putMealPhoto(token, blob);
    
    // Store token for entry route
    sessionStorage.setItem('mc:token', token);
    
    // Debug logging behind feature flag
    if (import.meta.env.VITE_DEBUG_MEAL === '1') {
      console.log("[MEAL][GATEWAY][CAPTURED]", { size: blob.size, mime: blob.type });
      console.log("[MEAL][GATEWAY][HANDOFF]", { token });
    }

    return { success: true, token };
  } finally {
    // Always remove inflight lock
    sessionStorage.removeItem("mc:handoff:inflight");
  }
}