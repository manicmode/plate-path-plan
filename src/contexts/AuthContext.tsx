import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout';

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
  const { isLoading, hasTimedOut, setLoading, retry } = useLoadingTimeout(true, 10000);
  const appLifecycle = useAppLifecycle();

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
    try {
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
      };
      setUser(extendedUser);
      console.log('User profile updated successfully');
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  };

  // Emergency recovery function
  const emergencyReload = () => {
    console.log('Emergency reload triggered');
    localStorage.removeItem('user_preferences');
    window.location.reload();
  };

  useEffect(() => {
    let mounted = true;
    let initializationStarted = false;
    
    const initializeAuth = async () => {
      if (initializationStarted) return;
      initializationStarted = true;
      
      console.log('Auth initialization starting...');
      
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
        } else if (mounted && initialSession?.user) {
          console.log('Initial session found');
          setSession(initialSession);
          await updateUserWithProfile(initialSession.user);
        } else {
          console.log('No initial session found');
        }
        
        if (mounted) {
          console.log('Auth initialization completed');
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Handle app returning from background
    if (appLifecycle.wasBackground && appLifecycle.isVisible && appLifecycle.timeInBackground > 30000) {
      console.log('App returned from background after long time, reinitializing auth');
      initializeAuth();
    } else if (!appLifecycle.wasBackground) {
      // Initial load
      initializeAuth();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('Auth state changed:', { event, hasSession: !!session });
      setSession(session);
      
      if (session?.user) {
        // Defer profile loading to prevent deadlocks
        setTimeout(() => {
          if (mounted) {
            updateUserWithProfile(session.user);
          }
        }, 0);
      } else {
        setUser(null);
      }
      
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [appLifecycle.wasBackground, appLifecycle.isVisible, appLifecycle.timeInBackground]);

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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: name ? { name } : undefined,
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
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
    loading: isLoading,
    isAuthenticated: !!session?.user,
    login,
    register,
    signOut,
    logout,
    updateProfile,
    updateSelectedTrackers,
  };

  // Emergency recovery UI
  if (hasTimedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-2xl font-bold text-foreground">Loading Taking Too Long</h2>
          <p className="text-muted-foreground">
            The app seems to be stuck loading. This sometimes happens after your phone was locked.
          </p>
          <div className="space-y-2">
            <button 
              onClick={retry}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Try Again
            </button>
            <button 
              onClick={emergencyReload}
              className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90"
            >
              Reload App
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
