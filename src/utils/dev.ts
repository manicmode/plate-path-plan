export const isDev =
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.MODE !== 'production') ||
  (typeof process !== 'undefined' && (process as any)?.env?.NODE_ENV !== 'production');
