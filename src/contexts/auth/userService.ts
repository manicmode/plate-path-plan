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
  const profile = await loadUserProfile(supabaseUser.id);
  
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