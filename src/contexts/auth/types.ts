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
}

export interface RegistrationResult {
  requiresEmailConfirmation: boolean;
  message: string;
}

export interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<RegistrationResult>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profileData: Partial<ExtendedUser>) => void;
  updateSelectedTrackers: (trackers: string[]) => Promise<void>;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}