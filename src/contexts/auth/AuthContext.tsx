
import React, { createContext, useEffect, useState, useRef } from 'react';
import * as ReactModule from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType, AuthProviderProps, ExtendedUser } from './types';
import { loginUser, registerUser, resendEmailConfirmation, signOutUser, setSignOutNavigationCallback } from './authService';
import { createExtendedUser, updateUserTrackers, loadUserProfile } from './userService';
import { Session } from '@supabase/supabase-js';
import { triggerDailyScoreCalculation, triggerDailyTargetsGeneration } from '@/lib/dailyScoreUtils';
import { cleanupAuthState } from '@/lib/authUtils';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  console.log('🔐 AuthProvider: Starting initialization...');
  
  // Defensive check for React hooks availability
  if (!ReactModule.useState) {
    console.error('🚨 AuthProvider: React hooks not available, falling back to basic render');
    return children as React.ReactElement;
  }

  try {

  const [user, setUser] = ReactModule.useState<ExtendedUser | null>(null);
  const [session, setSession] = ReactModule.useState<Session | null>(null);
  const [loading, setLoading] = ReactModule.useState(true);
  const [signingOut, setSigningOut] = ReactModule.useState(false);
  const [profileLoading, setProfileLoading] = ReactModule.useState(false);
  const [profileError, setProfileError] = ReactModule.useState<string | null>(null);


  // Load user profile in background
  const loadExtendedProfile = async (supabaseUser: any) => {
    if (!supabaseUser) return;
    
    try {
      setProfileLoading(true);
      setProfileError(null);
      console.log('Loading extended user profile...');
      
      const extendedUser = await createExtendedUser(supabaseUser);
      setUser(extendedUser);
      console.log('Extended user profile loaded successfully');
    } catch (error) {
      console.error('Error loading extended user profile:', error);
      setProfileError(error instanceof Error ? error.message : 'Failed to load profile');
      // Set basic user info even if profile creation fails
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email,
        created_at: supabaseUser.created_at,
        selectedTrackers: ['calories', 'hydration', 'supplements']
      } as ExtendedUser);
    } finally {
      setProfileLoading(false);
    }
  };

  // Custom signOut function with proper state management
  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      
      // Immediately clear local state
      setUser(null);
      setSession(null);
      
      console.log('🔓 Signing out user...');
      
      // Call the signOut function - it will handle navigation
      await signOutUser();
      
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setSigningOut(false);
    }
  };

  // Set up navigation callback for signOut
  ReactModule.useEffect(() => {
    setSignOutNavigationCallback(() => {
      console.log('📍 Navigating to home after sign out');
      window.location.href = '/';
    });
  }, []);

  // ⚡ Enhanced auth initialization with proper sequencing for mobile Safari
  useEffect(() => {
    console.log('🔄 AuthProvider: Starting auth initialization sequence...');
    
    let isInitialized = false;
    let authSubscription: any = null;
    
    const initializeAuth = async () => {
      try {
        console.log('📱 STEP 1: Setting up auth state change listener...');
        
        // Set up auth state change listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log(`🔄 Auth state change: ${event}, Session: ${session?.user?.id || 'null'}, Initialized: ${isInitialized}`);

            if (event === 'PASSWORD_RECOVERY') {
              console.log('🔑 Password recovery session detected');
              setSession(session);
              setUser(session?.user ?? null);
              setLoading(false);
              return;
            }

            if (event === 'TOKEN_REFRESHED' && session) {
              console.log('🔄 Token refreshed during recovery');
              setSession(session);
              setUser(session?.user ?? null);
              setLoading(false);
              return;
            }

            // Update session state immediately
            console.log('📝 Updating session state from auth change...');
            setSession(session);
            setUser(session?.user ?? null);
            
            // Only set loading to false after first initialization
            if (isInitialized) {
              setLoading(false);
            }

            // Load extended profile for new sign-ins
            if (event === 'SIGNED_IN' && session?.user && !window.location.hash.includes('type=recovery')) {
              console.log('👤 Loading extended profile after sign-in...');
              setTimeout(() => {
                loadExtendedProfile(session.user);
              }, 0);
            }
          }
        );
        
        authSubscription = subscription;
        console.log('✅ Auth state listener established');

        // STEP 2: Get initial session with retry logic for mobile Safari
        console.log('📱 STEP 2: Fetching initial session...');
        
        const fetchSessionWithRetry = async (attempt = 1): Promise<void> => {
          try {
            console.log(`🔄 Attempt ${attempt}: Getting session from Supabase...`);
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error(`❌ Session fetch error (attempt ${attempt}):`, error);
              if (attempt < 3) {
                console.log(`🔄 Retrying session fetch in ${attempt * 500}ms...`);
                setTimeout(() => fetchSessionWithRetry(attempt + 1), attempt * 500);
                return;
              }
              throw error;
            }
            
            console.log(`📱 STEP 3: Initial session resolved - Session: ${session?.user?.id || 'null'}`);
            
            // Update state with session data
            setSession(session);
            setUser(session?.user ?? null);
            isInitialized = true;
            setLoading(false);
            
            // If we have a session, load the extended profile
            if (session?.user) {
              console.log('👤 Loading extended profile for existing session...');
              setTimeout(() => {
                loadExtendedProfile(session.user);
              }, 100);
            }
            
            console.log('✅ Auth initialization complete');
            
          } catch (fetchError) {
            console.error('🚨 Failed to fetch initial session after retries:', fetchError);
            setSession(null);
            setUser(null);
            isInitialized = true;
            setLoading(false);
          }
        };

        // Start the session fetch
        await fetchSessionWithRetry();
        
      } catch (initError) {
        console.error('🚨 Auth initialization failed:', initError);
        setSession(null);
        setUser(null);
        isInitialized = true;
        setLoading(false);
      }
    };

    // Start initialization
    initializeAuth();

    // Cleanup function
    return () => {
      console.log('🔄 AuthProvider: Cleaning up auth state listener');
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  // ✅ STEP 1: Persistent cleanup state using useRef
  const hasAttemptedCleanup = useRef(false);
  const lastCleanupTimestamp = useRef<number>(0);
  const maxCleanupAttempts = useRef(0);

  // 📱 Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // 🧠 STEP 2: Improved corruption detection logic
  const hasCorruptedAuth = (): boolean => {
    try {
      const keys = Object.keys(localStorage);
      const authKeys = keys.filter(key => key.includes('supabase') || key.startsWith('sb-'));
      
      if (authKeys.length === 0) return false; // No auth data = not corrupted
      
      // Check for specific corruption indicators
      for (const key of authKeys) {
        const value = localStorage.getItem(key);
        if (value) {
          // More specific corruption detection
          if (value.includes('"error"') && (
            value.includes('403') || 
            value.includes('invalid_claim') || 
            value.includes('JWT expired') ||
            value.includes('invalid_grant')
          )) {
            console.log(`⚠️ Found suspicious key: ${key} = ${value.substring(0, 100)}...`);
            return true;
          }
          
          // Check for malformed JSON in auth tokens
          if (key.includes('auth') && !value.startsWith('{') && !value.startsWith('"')) {
            console.log(`⚠️ Found malformed auth data: ${key} = ${value.substring(0, 50)}...`);
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.warn('Error checking auth corruption:', error);
      return false; // More conservative - don't assume corruption on error
    }
  };

  // 🧹 Enhanced token cleanup function
  const clearAllAuthTokens = () => {
    console.log('🧹 Clearing all auth tokens...');
    try {
      // Clear all localStorage items that could contain auth tokens
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || 
            key.includes('supabase') || 
            key.includes('auth') || 
            key.includes('session')) {
          console.log(`🗑️ Removing storage key: ${key}`);
          localStorage.removeItem(key);
        }
      });
      
      // Clear sessionStorage too
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('sb-') || 
            key.includes('supabase') || 
            key.includes('auth') || 
            key.includes('session')) {
          console.log(`🗑️ Removing sessionStorage key: ${key}`);
          sessionStorage.removeItem(key);
        }
      });
      
      // Force sign out to clear any server-side sessions
      supabase.auth.signOut({ scope: 'global' }).catch(() => {
        // Ignore errors during cleanup
      });
      
    } catch (error) {
      console.warn('Error during auth cleanup:', error);
    }
  };

  // ⏱ STEP 3: Dedicated useEffect for corrupted token cleanup - runs ONLY after init
  ReactModule.useEffect(() => {
    // Wait for auth to be fully initialized
    if (loading) {
      console.log('⏳ Waiting for auth initialization...');
      return;
    }

    // 🚨 STEP 5: Fail-safe guards
    // NEVER trigger reload if session is null and no corrupted tokens present
    if (session === null && !hasCorruptedAuth()) {
      console.log('✅ Session is null but no corrupted tokens detected - normal state');
      return;
    }

    // Don't reload if already on login page or recovery URL
    const isOnLoginPage = window.location.pathname === '/' || 
                         window.location.pathname.includes('auth') ||
                         window.location.hash.includes('type=recovery');
    
    if (isOnLoginPage) {
      console.log('⏭️ On login/recovery page - skipping corruption check');
      return;
    }

    // Prevent repeated cleanup attempts
    if (hasAttemptedCleanup.current && maxCleanupAttempts.current >= 2) {
      console.log('⏭️ Max cleanup attempts reached - stopping to prevent infinite loop');
      return;
    }

    // Rate limiting: Don't attempt cleanup more than once per 10 seconds
    const now = Date.now();
    if (now - lastCleanupTimestamp.current < 10000) {
      console.log('⏭️ Rate limiting: Cleanup attempted too recently');
      return;
    }

    // 📱 STEP 6: Mobile-safe timing - Add delay on mobile before checking
    const checkDelay = isMobile ? 3000 : 1000;
    
    console.log(`🔎 Corrupted token check triggered at ${new Date().toISOString()}`);
    if (isMobile) {
      console.log('📱 Mobile detected — delaying corruption check by 3s');
    }

    setTimeout(() => {
      // Double-check loading state after delay
      if (loading) {
        console.log('⏳ Still loading after delay - skipping corruption check');
        return;
      }

      const hasCorruption = hasCorruptedAuth();
      
      if (hasCorruption) {
        console.log('🚨 Detected corrupted auth tokens, proceeding with cleanup...');
        
        hasAttemptedCleanup.current = true;
        lastCleanupTimestamp.current = now;
        maxCleanupAttempts.current += 1;
        
        clearAllAuthTokens();
        
        // 🪵 STEP 4: Enhanced logging before reload
        const reloadDelay = isMobile ? 3000 : 2000;
        console.log(`✅ Cleanup complete, reloading in ${reloadDelay}ms`);
        console.log(`🔄 [RELOAD TRIGGER] Auth corruption detected - forcing page reload at ${new Date().toISOString()}`);
        
        setTimeout(() => {
          window.location.reload();
        }, reloadDelay);
      } else {
        console.log('✅ No corrupted tokens detected - auth state is clean');
      }
    }, checkDelay);

  }, [loading, session]); // Only depend on loading and session state

  // Load extended profile when session is established (only once per session)
  ReactModule.useEffect(() => {
    if (session?.user && !profileLoading) {
      try {
        loadExtendedProfile(session.user);
        console.log('Extended profile loading initiated once per session');
      } catch (error) {
        console.error('Failed to initiate profile loading:', error);
        setProfileError(error instanceof Error ? error.message : 'Failed to load profile');
      }
    }
  }, [session?.user?.id]); // Only depend on user ID, not profileLoading state

  const updateProfile = (profileData: Partial<ExtendedUser>) => {
    if (user) {
      const updatedUser = { ...user, ...profileData };
      setUser(updatedUser);
      
      // Trigger daily score calculation when profile is updated
      triggerDailyScoreCalculation(user.id);
      
      // Also regenerate daily targets if significant profile changes occurred
      const significantFields = ['weight', 'age', 'gender', 'activity_level', 'weight_goal_type', 'health_conditions', 'main_health_goal'];
      const hasSignificantChanges = significantFields.some(field => profileData[field as keyof ExtendedUser] !== undefined);
      
      if (hasSignificantChanges) {
        console.log('Significant profile changes detected, regenerating daily targets...');
        triggerDailyTargetsGeneration(user.id);
      }
    }
  };

  const updateSelectedTrackers = async (trackers: string[]) => {
    if (!user) return;
    
    await updateUserTrackers(user.id, trackers);
    updateProfile({ selectedTrackers: trackers });
  };

  const refreshUser = async () => {
    if (!session?.user) return;
    
    console.log('[DEBUG] AuthContext: Refreshing user profile...');
    await loadExtendedProfile(session.user);
    console.log('[DEBUG] AuthContext: User profile refresh complete');
  };

    const contextValue: AuthContextType = {
      user,
      session,
      loading: loading || signingOut,
      isAuthenticated: !!session?.user && !!session?.user?.email_confirmed_at,
      isEmailConfirmed: !!session?.user?.email_confirmed_at,
      login: loginUser,
      register: registerUser,
      resendEmailConfirmation,
      signOut: handleSignOut,
      logout: handleSignOut,
      updateProfile,
      updateSelectedTrackers,
      refreshUser,
    };

    console.log('✅ AuthProvider: Context value prepared, rendering children');

    return (
      <AuthContext.Provider value={contextValue}>
        {children}
      </AuthContext.Provider>
    );
  } catch (error) {
    console.error('🚨 AuthProvider: Critical error during initialization:', error);
    
    // Provide a minimal fallback context to prevent complete app crash
    const fallbackContextValue: AuthContextType = {
      user: null,
      session: null,
      loading: false,
      isAuthenticated: false,
      isEmailConfirmed: false,
      login: async () => {},
      register: async () => ({ 
        requiresEmailConfirmation: false, 
        message: 'Auth provider crashed',
        error: { message: 'Auth provider crashed' } 
      }),
      resendEmailConfirmation: async () => ({ 
        success: false,
        error: { message: 'Auth provider crashed' } 
      }),
      signOut: async () => {},
      logout: async () => {},
      updateProfile: () => {},
      updateSelectedTrackers: async () => {},
      refreshUser: async () => {},
    };

    return (
      <AuthContext.Provider value={fallbackContextValue}>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-4xl mb-4">🔐</div>
            <h2 className="text-xl font-bold text-foreground">Authentication Error</h2>
            <p className="text-sm text-muted-foreground">
              The authentication system failed to initialize properly.
            </p>
            <details className="text-left bg-muted p-3 rounded text-xs">
              <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
              <p className="text-xs break-words">
                {error instanceof Error ? error.message : 'Unknown authentication error'}
              </p>
            </details>
            <button 
              onClick={() => {
                console.log('🔄 [AUTH RELOAD] User clicked reload after auth error');
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded"
            >
              Clear Auth Data & Reload
            </button>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }
};
