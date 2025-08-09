export function lockViewportDuring<T>(fn: () => T): T {
  const y = window.scrollY;
  
  const result = fn();
  requestAnimationFrame(() => {
    window.scrollTo({ top: y });
    
  });
  return result;
}
