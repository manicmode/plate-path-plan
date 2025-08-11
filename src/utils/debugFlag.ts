export const isDebug = () => {
  try {
    const qs = typeof window !== 'undefined' ? window.location.search : '';
    return /\bdebug=1\b/.test(qs) || (window as any).__VOYAGE_DEBUG === true;
  } catch { 
    return false; 
  }
};