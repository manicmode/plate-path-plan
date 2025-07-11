import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { cleanupAuthState } from '@/lib/authUtils';

// Extended user type with profile data
interface ExtendedUser extends User {
  name?: string;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  targetHydration?: number;
  targetSupplements?: number;
  allergies?: string[];
  dietaryGoals?: string[];
  selectedTrackers?: string[];
  main_health_goal?: string;
  diet_styles?: string[];
  foods_to_avoid?: string;
  activity_level?: string;
  health_conditions?: string[];
}

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profileData: Partial<ExtendedUser>) => void;
  updateSelectedTrackers: (trackers: string[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializationAttempts, setInitializationAttempts] = useState(0);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      return null;
    }
  };

  const updateUserWithProfile = async (supabaseUser: User) => {
    const profile = await loadUserProfile(supabaseUser.id);
    const extendedUser: ExtendedUser = {
      ...supabaseUser,
      name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || '',
      targetCalories: 2000,
      targetProtein: 150,
      targetCarbs: 200,
      targetFat: 65,
      targetHydration: 8,
      targetSupplements: 3,
      allergies: [],
      dietaryGoals: [],
      selectedTrackers: profile?.selected_trackers || ['calories', 'hydration', 'supplements'],
      main_health_goal: profile?.main_health_goal || undefined,
      diet_styles: profile?.diet_styles || [],
      foods_to_avoid: profile?.foods_to_avoid || undefined,
      activity_level: profile?.activity_level || undefined,
      health_conditions: profile?.health_conditions || [],
    };
    setUser(extendedUser);
  };

  const initializeAuth = async (retryCount = 0) => {
    try {
      console.log(`Auth initialization attempt ${retryCount + 1}`);
      
      const { data: { session: initialSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting initial session:', error);
        if (retryCount < 2) {
          setTimeout(() => initializeAuth(retryCount + 1), 1000);
          return;
        }
      } else if (initialSession?.user) {
        setSession(initialSession);
        await updateUserWithProfile(initialSession.user);
      }
      
      setLoading(false);
      setInitializationAttempts(retryCount + 1);
    } catch (error) {
      console.error('Auth initialization error:', error);
      if (retryCount < 2) {
        setTimeout(() => initializeAuth(retryCount + 1), 1000);
      } else {
        setLoading(false);
      }
    }
  };

  // App lifecycle callbacks
  const handleAppForeground = () => {
    console.log('App came to foreground - refreshing auth state');
    if (loading && initializationAttempts > 0) {
      initializeAuth();
    }
  };

  const handleAppBackground = () => {
    console.log('App went to background');
  };

  useAppLifecycle({
    onForeground: handleAppForeground,
    onBackground: handleAppBackground,
  });

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('Auth state changed:', event);
      setSession(session);
      
      if (session?.user) {
        // Defer profile loading to prevent deadlocks
        setTimeout(async () => {
          if (mounted) {
            await updateUserWithProfile(session.user);
          }
        }, 0);
      } else {
        setUser(null);
      }
    });

    // Initialize auth with timeout
    const initTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth initialization timeout - forcing completion');
        setLoading(false);
      }
    }, 10000);

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(initTimeout);
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      console.log('🚀 Starting registration process for:', email);
      
      // Clean up any existing auth state before registration
      cleanupAuthState();
      
      // Add a small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Attempt global sign out to clear any lingering sessions
      try {
        console.log('🔓 Attempting global signout before registration...');
        await supabase.auth.signOut({ scope: 'global' });
        console.log('✅ Global signout completed');
      } catch (err) {
        // Continue even if this fails
        console.log('⚠️ Global signout failed during registration cleanup:', err);
      }
      
      // Add another small delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('📧 Calling Supabase signUp...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: name ? { name } : undefined,
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      
      console.log('📊 Supabase signUp response:', {
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userId: data?.user?.id,
        userEmail: data?.user?.email,
        userEmailConfirmed: data?.user?.email_confirmed_at,
        error: error
      });
      
      // Check if there's a Supabase error
      if (error) {
        console.error('❌ Supabase returned error:', error);
        throw error;
      }
      
      // Check if user was actually created
      if (!data?.user) {
        console.error('❌ No user object in response - signup may have been silently rejected');
        console.log('🔍 Full response data:', data);
        
        // This typically happens when the user already exists
        throw new Error('Account creation failed. This email may already be registered. Please try signing in instead.');
      }
      
      // Check if user needs email confirmation
      if (data.user && !data.user.email_confirmed_at && !data.session) {
        console.log('📬 User created but needs email confirmation');
        return; // This is actually success - user needs to confirm email
      }
      
      console.log('✅ Registration successful!');
      
    } catch (error: any) {
      console.error('💥 Registration failed:', error);
      console.error('📋 Error details:', {
        status: error.status,
        message: error.message,
        name: error.name,
        code: error.code,
        details: error.details
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Clean up auth state first
      cleanupAuthState();
      
      // Attempt global sign out
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      
      // Force page refresh for completely clean state
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
      // Force refresh even if signout fails
      window.location.href = '/';
    }
  };

  const logout = signOut;

  const updateProfile = (profileData: Partial<ExtendedUser>) => {
    if (user) {
      const updatedUser = { ...user, ...profileData };
      setUser(updatedUser);
    }
  };

  const updateSelectedTrackers = async (trackers: string[]) => {
    try {
      if (!user) return;
      
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          selected_trackers: trackers,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error updating trackers in database:', error);
      }

      localStorage.setItem('user_preferences', JSON.stringify({ selectedTrackers: trackers }));
      updateProfile({ selectedTrackers: trackers });
      
    } catch (error) {
      console.error('Error updating selected trackers:', error);
    }
  };

  const contextValue: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!session?.user,
    login,
    register,
    signOut,
    logout,
    updateProfile,
    updateSelectedTrackers,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
