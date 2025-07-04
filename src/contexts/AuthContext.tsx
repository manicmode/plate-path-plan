
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { safeGetJSON, safeSetJSON, safeStorage } from '@/lib/safeStorage';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetHydration: number;
  targetSupplements: number;
  allergies: string[];
  dietaryGoals: string[];
  selectedTrackers: string[];
  // New onboarding fields
  age?: number;
  heightFeet?: number;
  heightInches?: number;
  heightCm?: number;
  weight?: number;
  weightUnit?: 'lb' | 'kg';
  heightUnit?: 'ft' | 'cm';
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  onboardingCompleted?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<AuthUser>) => void;
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

// Utility functions for localStorage-based preferences using safe storage
const loadUserPreferences = () => {
  try {
    return safeGetJSON('user_preferences', {});
  } catch (error) {
    console.error('Failed to load preferences:', error);
    return {};
  }
};

const saveUserPreferences = (preferences: any) => {
  try {
    safeSetJSON('user_preferences', preferences);
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event, session?.user?.id);
        setSession(session);
        
        if (session?.user) {
          try {
            // Create AuthUser object from Supabase user
            const preferences = loadUserPreferences();
            const selectedTrackers = preferences.selectedTrackers || ['calories', 'hydration', 'supplements'];
            
            const authUser: AuthUser = {
              id: session.user.id,
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
              email: session.user.email || '',
              targetCalories: 2000,
              targetProtein: 150,
              targetCarbs: 200,
              targetFat: 65,
              targetHydration: 8,
              targetSupplements: 3,
              allergies: [],
              dietaryGoals: ['general_health'],
              selectedTrackers,
              onboardingCompleted: false,
            };
            
            setUser(authUser);
            setIsAuthenticated(true);

            // Create user profile in database if it doesn't exist (but don't fail if it already exists)
            if (event === 'SIGNED_IN') {
              setTimeout(async () => {
                if (!mounted) return;
                try {
                  const { error } = await supabase
                    .from('user_profiles')
                    .upsert({
                      user_id: session.user.id,
                      selected_trackers: selectedTrackers,
                      onboarding_completed: false,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    }, {
                      onConflict: 'user_id'
                    });
                  
                  if (error && !error.message.includes('duplicate key')) {
                    console.error('Error creating user profile:', error);
                  }
                } catch (error) {
                  console.log('Profile creation handled by trigger or already exists');
                }
              }, 0);
            }
          } catch (error) {
            console.error('Error processing auth state:', error);
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      if (session?.user) {
        try {
          const preferences = loadUserPreferences();
          const selectedTrackers = preferences.selectedTrackers || ['calories', 'hydration', 'supplements'];
          
          const authUser: AuthUser = {
            id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            targetCalories: 2000,
            targetProtein: 150,
            targetCarbs: 200,
            targetFat: 65,
            targetHydration: 8,
            targetSupplements: 3,
            allergies: [],
            dietaryGoals: ['general_health'],
            selectedTrackers,
            onboardingCompleted: false,
          };
          
          setUser(authUser);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error loading existing session:', error);
        }
      }
    }).catch(error => {
      console.error('Error getting session:', error);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      throw error;
    }
    
    console.log('User logged in:', data.user?.id);
  };

  const register = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
        emailRedirectTo: redirectUrl
      }
    });
    
    if (error) {
      throw error;
    }
    
    console.log('User registered:', data.user?.id);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      safeStorage.removeItem('user_preferences');
    } catch (error) {
      console.error('Error during logout:', error);
      // Force cleanup even if logout fails
      setUser(null);
      setIsAuthenticated(false);
      safeStorage.removeItem('user_preferences');
    }
  };

  const updateProfile = (updates: Partial<AuthUser>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
    }
  };

  const updateSelectedTrackers = async (trackers: string[]) => {
    console.log('Updating selected trackers to:', trackers);
    
    if (user) {
      const updatedUser = { ...user, selectedTrackers: trackers };
      setUser(updatedUser);
      
      // Save to safe storage preferences
      saveUserPreferences({ selectedTrackers: trackers });
      
      // Also try to save to Supabase as backup (but don't fail if it doesn't work)
      try {
        const { error } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            selected_trackers: trackers,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
        
        if (error) {
          console.log('Supabase backup failed (using safe storage instead):', error);
        } else {
          console.log('Preferences saved to Supabase as backup');
        }
      } catch (error) {
        console.log('Supabase not available (using safe storage instead):', error);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        register,
        logout,
        updateProfile,
        updateSelectedTrackers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
