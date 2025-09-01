/**
 * Meal Capture Gateway - Safe handoff from PhotoCaptureModal
 * Only activates when feature flag is enabled
 */

import { mealCaptureEnabledFromSearch } from '@/features/meal-capture/flags';

/**
 * Handle meal capture handoff from PhotoCaptureModal
 * Returns true if handoff succeeded, false if should continue legacy path
 */
export async function handoffFromPhotoCapture(
  photoUrl: string,
  searchParams?: string
): Promise<boolean> {
  // Early exit if feature is disabled - completely inert
  if (!mealCaptureEnabledFromSearch(searchParams || window.location.search)) {
    return false;
  }

  // Prevent double-fires with inflight lock
  if (sessionStorage.getItem("mc:handoff:inflight") === "1") {
    return true; // Already handled
  }

  try {
    // Feature is enabled - proceed with handoff
    sessionStorage.setItem("mc:handoff:inflight", "1");

    const nonce = crypto.randomUUID();
    const blob = await fetch(photoUrl).then(r => r.blob());
    const payload = {
      nonce,
      mime: blob.type || 'image/jpeg', 
      size: blob.size,
      blobUrl: photoUrl
    };

    sessionStorage.setItem(`mc:entry:${nonce}`, JSON.stringify(payload));
    
    // Debug logging behind feature flag
    if (import.meta.env.VITE_DEBUG_MEAL === '1') {
      console.log("[MEAL][GATEWAY][CAPTURED]", { size: blob.size, mime: blob.type });
      console.log("[MEAL][GATEWAY][HANDOFF]", { url: `/meal-capture/entry?photoToken=${nonce}` });
    }

    return true;
  } finally {
    // Always remove inflight lock
    sessionStorage.removeItem("mc:handoff:inflight");
  }
}