
// Auth state cleanup utility to prevent authentication limbo states
export const cleanupAuthState = () => {
  console.log('🧹 Cleaning up auth state...');
  
  try {
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
  } catch (error) {
    console.error('❌ Error during auth cleanup:', error);
  }
};

// Force auth state reset for recovery scenarios
export const forceAuthReset = () => {
  console.log('🔄 Forcing auth state reset...');
  
  cleanupAuthState();
  
  // Add a small delay before reload to ensure cleanup completes
  setTimeout(() => {
    window.location.href = '/';
  }, 100);
};

// Check for corrupted auth state
export const isAuthStateCorrupted = () => {
  try {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith('supabase.auth.') || key.includes('sb-')
    );
    
    // If we have partial auth data but no valid session, state might be corrupted
    if (keys.length > 0) {
      const tokenKey = keys.find(key => key.includes('token'));
      if (tokenKey) {
        const tokenData = localStorage.getItem(tokenKey);
        if (!tokenData || tokenData === 'null' || tokenData === 'undefined') {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking auth state:', error);
    return true; // Assume corrupted if we can't check
  }
};
