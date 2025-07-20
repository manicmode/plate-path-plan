import { User, Session } from '@supabase/supabase-js';

export interface ExtendedUser extends User {
  first_name?: string;
  last_name?: string;
  name?: string;
  age?: number;
  weight?: number;
  height?: number;
  gender?: string;
  activity_level?: string;
  weight_goal_type?: string;
  health_conditions?: string[];
  main_health_goal?: string;
  dietary_restrictions?: string[];
  allergies?: string[];
  supplements?: string[];
  selectedTrackers: string[];
  phone?: string;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  targetHydration?: number;
  targetSupplements?: number;
  diet_styles?: string[];
  foods_to_avoid?: string;
  dietaryGoals?: string[];
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
  login: (email: string, password: string) => Promise<{ error: any }>;
  register: (email: string, password: string, name?: string) => Promise<RegistrationResult>;
  resendEmailConfirmation: (email: string) => Promise<{ success: boolean }>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<ExtendedUser>) => void;
  updateSelectedTrackers: (trackers: string[]) => Promise<void>;
  refreshUser: () => Promise<void>;
  error?: string | null;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}
