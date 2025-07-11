// Auth state cleanup utility to prevent authentication limbo states
export const cleanupAuthState = () => {
  console.log('🧹 Cleaning up auth state...');
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-') || key.includes('supabase')) {
      console.log('🗑️ Removing localStorage key:', key);
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if available
  if (typeof sessionStorage !== 'undefined') {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-') || key.includes('supabase')) {
        console.log('🗑️ Removing sessionStorage key:', key);
        sessionStorage.removeItem(key);
      }
    });
  }
  
  // Clear common auth-related keys
  const authKeys = [
    'supabase.auth.token',
    'user_preferences',
    'auth_token',
    'refresh_token',
    'supabase-auth-token'
  ];
  
  authKeys.forEach(key => {
    localStorage.removeItem(key);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(key);
    }
  });
  
  console.log('✅ Auth state cleanup completed');
};