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
  if (sessionStorage.getItem("mc:inflight") === "1") {
    return true; // Already handled
  }

  // Feature is enabled - proceed with handoff
  sessionStorage.setItem("mc:inflight", "1");

  const nonce = crypto.randomUUID();
  sessionStorage.setItem("mc:photoUrl", photoUrl);
  sessionStorage.setItem("mc:entry", "photo");
  sessionStorage.setItem("mc:ts", String(Date.now()));
  sessionStorage.setItem("mc:n", nonce);

  console.log("[MEAL][GATEWAY][HANDOFF]", { 
    to: `/meal-capture?entry=photo&n=${nonce}`,
    size: photoUrl.length 
  });

  return true;
}