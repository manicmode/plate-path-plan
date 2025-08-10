export const isDev =
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.MODE !== 'production') ||
  (typeof process !== 'undefined' && (process as any)?.env?.NODE_ENV !== 'production') ||
  (typeof window !== 'undefined' && (
    new URLSearchParams(window.location.search).get('audit') === '1' ||
    window.localStorage?.getItem('AUDIT_SOUND') === '1'
  ));
