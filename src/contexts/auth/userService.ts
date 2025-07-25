import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ExtendedUser } from './types';
import { getAutoFilledTrackers } from '@/lib/trackerUtils';

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
  // Check if we have a valid user with proper authentication
  if (!supabaseUser?.id || !supabaseUser?.email) {
    console.warn('Invalid user object provided to createExtendedUser');
    throw new Error('Invalid user data');
  }

  // For new users, profile might not exist yet due to trigger timing
  // Try to load profile with retries for new users
  let profile = null;
  
  try {
    const userCreatedAt = new Date(supabaseUser.created_at || '');
    const now = new Date();
    const isNewUser = (now.getTime() - userCreatedAt.getTime()) < 10000; // Created within last 10 seconds

    if (isNewUser) {
      console.log('New user detected, attempting profile load with retries');
      // For new users, try a few times with delays to handle trigger timing
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          profile = await loadUserProfile(supabaseUser.id);
          if (profile) break;
          
          console.log(`Profile not found on attempt ${attempt + 1}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Progressive delay
        } catch (error) {
          console.warn(`Profile load attempt ${attempt + 1} failed:`, error);
          if (attempt === 2) {
            // On final attempt failure, continue without profile
            console.log('All profile load attempts failed, continuing without profile');
            break;
          }
        }
      }
    } else {
      // For existing users, load normally
      try {
        profile = await loadUserProfile(supabaseUser.id);
      } catch (error) {
        console.warn('Failed to load existing user profile:', error);
        // Continue without profile rather than failing completely
      }
    }
  } catch (error) {
    console.error('Error in profile loading logic:', error);
    // Continue without profile
  }
  
  // Ensure exactly 3 trackers using auto-fill logic
  const userTrackers = profile?.selected_trackers || ['calories', 'protein', 'supplements'];
  const autoFilledTrackers = getAutoFilledTrackers(userTrackers);

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
    selectedTrackers: autoFilledTrackers,
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
    // Ensure exactly 3 trackers using auto-fill logic
    const autoFilledTrackers = getAutoFilledTrackers(trackers);
    
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        selected_trackers: autoFilledTrackers,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error updating trackers in database:', error);
    }

    localStorage.setItem('user_preferences', JSON.stringify({ selectedTrackers: autoFilledTrackers }));
    
  } catch (error) {
    console.error('Error updating selected trackers:', error);
  }
};