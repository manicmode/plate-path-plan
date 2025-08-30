// CSP utility functions for development and debugging

export const logActiveCSP = (context: string = 'ACTIVE') => {
  if (import.meta.env.DEV || import.meta.env.VITE_DEBUG_CSP === 'true') {
    const cspElement = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const cspContent = cspElement?.getAttribute('content') || 'No CSP found';
    
    console.info(`[CSP][${context}]`, cspContent);
    
    // Also log specific connect-src for debugging Supabase connections
    const connectSrcMatch = cspContent.match(/connect-src ([^;]+)/);
    if (connectSrcMatch) {
      console.info(`[CSP][CONNECT-SRC]`, connectSrcMatch[1]);
    }
  }
};

export const validateSupabaseCSP = () => {
  if (import.meta.env.DEV || import.meta.env.VITE_DEBUG_CSP === 'true') {
    const cspElement = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const cspContent = cspElement?.getAttribute('content') || '';
    
    const requiredDomains = [
      'https://*.supabase.co',
      'wss://*.supabase.co'
    ];
    
    const missing = requiredDomains.filter(domain => !cspContent.includes(domain));
    
    if (missing.length > 0) {
      console.warn('[CSP][SUPABASE]', 'Missing required Supabase domains:', missing);
      return false;
    }
    
    console.info('[CSP][SUPABASE]', 'All required Supabase domains present');
    return true;
  }
  
  return true;
};