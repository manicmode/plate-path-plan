const REV = "2025-08-31T16:55Z-r2";

export const DEBUG_NUDGE = import.meta.env.VITE_DEBUG_NUDGE === "1";

export function nlog(tag: string, payload: Record<string, unknown> = {}) {
  if (!DEBUG_NUDGE) return;
  const now = new Date();
  console.log(`[${tag}]`, { rev: REV, utc: now.toISOString(), local: now.toString(), ...payload });
}

export const HERO_REV = "2025-08-31T16:55Z-r2";

// Dev-only QA helpers
if (DEBUG_NUDGE && typeof window !== 'undefined') {
  // Clear today's seen nudges (local)
  (window as any).__debugResetNudges = () => {
    const localDateKey = new Date().toISOString().split('T')[0]; // Simplified for now
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(`nudge:seen:${localDateKey}`)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`[DEBUG] Reset ${keysToRemove.length} nudge keys for ${localDateKey}`);
  };

  // Force show a nudge once
  (window as any).__debugShowNudge = (id: string) => {
    console.log(`[DEBUG] Force show nudge: ${id} (implementation depends on your nudge state management)`);
  };
}