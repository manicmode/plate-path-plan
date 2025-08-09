export function lockViewportDuring<T>(fn: () => T): T {
  const y = window.scrollY;
  if (import.meta.env.DEV) console.log("[Profile Edit] before:", y);
  const result = fn();
  requestAnimationFrame(() => {
    window.scrollTo({ top: y });
    if (import.meta.env.DEV) console.log("[Profile Edit] after:", window.scrollY);
  });
  return result;
}
