import { isDev } from "@/utils/dev";

export function audit(event: string, data: Record<string, any> = {}) {
  if (!isDev) return;
  const t = (typeof performance !== "undefined" ? performance.now() : Date.now());
  // eslint-disable-next-line no-console
  console.warn("[SOUND_AUDIT]", { t: Math.round(t), event, ...data });
}

// Generate a short action id per user tap to correlate events
export function newActionId(prefix = "A"): string {
  const n = Math.floor(Math.random() * 1e6).toString(36);
  return `${prefix}-${n}`;
}
