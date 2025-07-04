
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  console.log('AuthProvider initializing...');
  
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

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
    };
    setUser(extendedUser);
  };

  useEffect(() => {
    console.log('AuthProvider effect starting...');
    
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        console.log('Getting initial session...');
        
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Session timeout')), 5000);
        });
        
        const { data: { session: initialSession }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        if (error) {
          console.error('Error getting initial session:', error);
        } else if (mounted && initialSession?.user) {
          console.log('Initial session found');
          setSession(initialSession);
          await updateUserWithProfile(initialSession.user);
        }
        
        if (mounted) {
          setLoading(false);
          setIsInitialized(true);
          console.log('Auth initialized successfully');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
          setIsInitialized(true);
        }
      }
    };

    initializeAuth();

    let authListener: any = null;
    
    try {
      authListener = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event, session?.user?.id || 'no user');
        
        try {
          setSession(session);
          
          if (session?.user) {
            await updateUserWithProfile(session.user);
          } else {
            setUser(null);
          }
          
          if (event === 'SIGNED_OUT') {
            console.log('User signed out');
          } else if (event === 'SIGNED_IN') {
            console.log('User signed in');
          }
        } catch (error) {
          console.error('Error handling auth state change:', error);
        }
      });
    } catch (error) {
      console.error('Error setting up auth listener:', error);
    }

    return () => {
      console.log('AuthProvider cleanup');
      mounted = false;
      if (authListener) {
        try {
          authListener.data?.subscription?.unsubscribe?.();
        } catch (error) {
          console.error('Error cleaning up auth listener:', error);
        }
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      console.log('Login successful');
    } catch (error: any) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      console.log('Attempting registration...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: name ? { name } : undefined,
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) throw error;
      
      console.log('Registration successful');
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out...');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log('Signed out successfully');
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
      console.log('Profile updated locally:', profileData);
    }
  };

  const updateSelectedTrackers = async (trackers: string[]) => {
    try {
      if (!user) return;
      
      // Update in database
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          selected_trackers: trackers,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error updating trackers in database:', error);
      } else {
        console.log('Trackers updated in database:', trackers);
      }

      // Update local storage
      localStorage.setItem('user_preferences', JSON.stringify({ selectedTrackers: trackers }));
      
      // Update local user state
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

  console.log('AuthProvider rendering, loading:', loading, 'user:', user ? 'present' : 'none');

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
