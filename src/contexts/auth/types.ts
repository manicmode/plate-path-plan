import { User, Session } from '@supabase/supabase-js';

// Extended user type with profile data
export interface ExtendedUser extends User {
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
  onboardingCompleted?: boolean;
}

export interface RegistrationResult {
  requiresEmailConfirmation: boolean;
  isExistingUnverified?: boolean;
  message: string;
}

export interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isEmailConfirmed: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<RegistrationResult>;
  resendEmailConfirmation: (email: string) => Promise<{ success: boolean }>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profileData: Partial<ExtendedUser>) => void;
  updateSelectedTrackers: (trackers: string[]) => Promise<void>;
  refreshUser: () => Promise<void>;
  dailyCalories?: any[];
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  dailyHydration?: any[];
  dailySupplements?: any[];
}

export interface AuthProviderProps {
  children: React.ReactNode;
}