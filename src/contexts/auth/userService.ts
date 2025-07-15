import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ExtendedUser } from './types';

export const loadUserProfile = async (userId: string) => {
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

export const createExtendedUser = async (supabaseUser: User): Promise<ExtendedUser> => {
  // For new users, profile might not exist yet due to trigger timing
  // Try to load profile with retries for new users
  let profile = null;
  const userCreatedAt = new Date(supabaseUser.created_at || '');
  const now = new Date();
  const isNewUser = (now.getTime() - userCreatedAt.getTime()) < 10000; // Created within last 10 seconds

  if (isNewUser) {
    console.log('New user detected, attempting profile load with retries');
    // For new users, try a few times with delays to handle trigger timing
    for (let attempt = 0; attempt < 3; attempt++) {
      profile = await loadUserProfile(supabaseUser.id);
      if (profile) break;
      
      console.log(`Profile not found on attempt ${attempt + 1}, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Progressive delay
    }
  } else {
    // For existing users, load normally
    profile = await loadUserProfile(supabaseUser.id);
  }
  
  return {
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
    onboardingCompleted: profile?.onboarding_completed || false,
  };
};

export const updateUserTrackers = async (userId: string, trackers: string[]) => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        selected_trackers: trackers,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error updating trackers in database:', error);
    }

    localStorage.setItem('user_preferences', JSON.stringify({ selectedTrackers: trackers }));
    
  } catch (error) {
    console.error('Error updating selected trackers:', error);
  }
};