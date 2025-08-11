
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_GLASS_SIZE_ML } from '@/utils/hydrationUnits';

export const useOnboardingStatus = () => {
  const { user, isAuthenticated } = useAuth();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReminder, setShowReminder] = useState(false);
  const [onboardingSkipped, setOnboardingSkipped] = useState<boolean>(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!isAuthenticated || !user) {
        setIsOnboardingComplete(null);
        setIsLoading(false);
        setShowReminder(false);
        setOnboardingSkipped(false);
        return;
      }

      try {
        console.log('Checking onboarding status for user:', user.id);
        
        // Check localStorage first for immediate state restoration
        const cacheKey = `onboarding_complete_${user.id}`;
        const cachedStatus = localStorage.getItem(cacheKey);
        if (cachedStatus === 'true') {
          console.log('Found cached onboarding completion status');
          setIsOnboardingComplete(true);
          setShowReminder(false);
          setIsLoading(false);
          return;
        }
        
        const result = await supabase
          .from('user_profiles')
          .select('onboarding_completed, onboarding_skipped, show_onboarding_reminder')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data, error } = result;

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking onboarding status:', error);
          setIsOnboardingComplete(false);
          setShowReminder(false);
          setOnboardingSkipped(false);
        } else if (!data) {
          console.log('No profile found, assuming onboarding not complete');
          setIsOnboardingComplete(false);
          setShowReminder(false);
          setOnboardingSkipped(false);
        } else {
          const isComplete = data.onboarding_completed || false;
          const wasSkipped = data.onboarding_skipped || false;
          const shouldShowReminder = data.show_onboarding_reminder || false;
          
          console.log('Onboarding status:', { isComplete, wasSkipped, shouldShowReminder });
          
          setIsOnboardingComplete(isComplete);
          setShowReminder(wasSkipped && shouldShowReminder);
          
          // Update localStorage cache
          if (isComplete) {
            localStorage.setItem(cacheKey, 'true');
          } else {
            localStorage.removeItem(cacheKey);
          }
        }
      } catch (error) {
        console.error('Error in onboarding status check:', error);
        setIsOnboardingComplete(false);
        setShowReminder(false);
        setOnboardingSkipped(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user, isAuthenticated]);


  const dismissReminder = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('user_profiles')
        .update({ show_onboarding_reminder: false })
        .eq('user_id', user.id);
      
      setShowReminder(false);
    } catch (error) {
      console.error('Error dismissing reminder:', error);
    }
  };

  const markOnboardingComplete = async () => {
    console.log('[DEBUG] markOnboardingComplete: Starting database update...');
    if (!user) {
      console.log('[DEBUG] markOnboardingComplete: No user found');
      return;
    }
    
    try {
      // Optimistic local state to prevent flicker
      console.log('[DEBUG] markOnboardingComplete: Updating local state immediately');
      setIsOnboardingComplete(true);
      setShowReminder(false);
      const cacheKey = `onboarding_complete_${user.id}`;
      localStorage.setItem(cacheKey, 'true');

      // 1) Load minimal profile fields to determine if defaults are needed
      let profile: any = null;
      try {
        // Ensure profile row exists (idempotent)
        await supabase
          .from('user_profiles')
          .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true });

        const cols = [
          'user_id',
          'onboarding_completed',
          'activity_level',
          'meal_frequency',
          'fasting_schedule',
          'food_allergies',
          'hydration_target_ml',
          'target_hydration_glasses'
        ].join(',');
        
        const { data: prof, error: fetchErr, status: fetchStatus } = await supabase
          .from('user_profiles')
          .select(cols)
          .eq('user_id', user.id)
          .maybeSingle();
        if (fetchErr) {
          console.warn('[ONB] load profile failed', { status: fetchStatus, error: fetchErr });
        } else {
          profile = prof;
        }
      } catch (e) {
        console.warn('[ONB] load profile exception', e);
      }

      // 2) Build and apply defaults patch only for missing values
      const patch: Record<string, any> = {};
      let applied = false;
      const isMissing = (v: any) => v === null || v === undefined || v === '';

      if (!profile || isMissing(profile?.activity_level)) { patch.activity_level = 'light'; applied = true; }
      if (!profile || isMissing(profile?.meal_frequency)) { patch.meal_frequency = 3; applied = true; }
      if (!profile || isMissing(profile?.fasting_schedule)) { patch.fasting_schedule = 'none'; applied = true; }
      if (!profile || profile?.food_allergies == null) { patch.food_allergies = {}; applied = true; }
      if (!profile || isMissing(profile?.hydration_target_ml)) {
        const g = Number((profile as any)?.target_hydration_glasses);
        const ml = Number.isFinite(g) ? g * DEFAULT_GLASS_SIZE_ML : 2500;
        patch.hydration_target_ml = Math.max(800, Math.min(6000, ml));
        applied = true;
      }

      if (applied) {
        patch.onboarding_defaults_applied = true;
        try {
          if ((import.meta as any)?.env?.MODE !== 'production') {
            console.info('[ONB DEFAULTS]', patch);
          }
        } catch {}
        const { error: updErr } = await supabase
          .from('user_profiles')
          .update(patch)
          .eq('user_id', user.id);
        if (updErr) console.warn('[ONB] apply defaults failed', updErr);
      }

      // 3) Finalize onboarding flags
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          onboarding_completed: true,
          onboarding_skipped: false,
          show_onboarding_reminder: false 
        })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('[DEBUG] markOnboardingComplete: Database error:', error);
        // Revert local state on error
        setIsOnboardingComplete(null);
        localStorage.removeItem(cacheKey);
        throw error;
      }
      
      console.log('[DEBUG] markOnboardingComplete: Database update successful');
      
      // Set optimistic completion flags for gate to prevent flicker
      try {
        sessionStorage.setItem('onb_completed_optimistic', '1');
        sessionStorage.setItem('onb_completed_optimistic_at', String(Date.now()));
      } catch {}
      
      // 4) Generate daily nutrition targets after onboarding completion
      try {
        const callOnce = async () => {
          console.debug('[DEBUG] daily-targets: calling...');
          const result = await supabase.functions.invoke('calculate-daily-targets', {
            body: { userId: user.id }
          });
          const { data, error } = result;
          if (error) {
            console.warn('[DEBUG] daily-targets: non-2xx', { error });
          } else {
            console.debug('[DEBUG] daily-targets: ok', { data });
          }
          return result;
        };

        let resp = await callOnce();
        if (!resp || resp.error) {
          console.debug('[DEBUG] daily-targets: retrying once in 750ms');
          await new Promise((r) => setTimeout(r, 750));
          resp = await callOnce();
        }
      } catch (e) {
        console.warn('[DEBUG] daily-targets: threw', e);
      }
      
    } catch (error) {
      console.error('[DEBUG] markOnboardingComplete: Error updating completion status:', error);
      throw error;
    }
  };

  const forceRefresh = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      console.log('Force refreshing onboarding status for user:', user.id);
      
      // Check localStorage first for immediate state restoration
      const cacheKey = `onboarding_complete_${user.id}`;
      const cachedStatus = localStorage.getItem(cacheKey);
      if (cachedStatus === 'true') {
        console.log('Found cached onboarding completion status during refresh');
        setIsOnboardingComplete(true);
        setShowReminder(false);
        setOnboardingSkipped(false);
        setIsLoading(false);
        return;
      }
      
      const result = await supabase
        .from('user_profiles')
        .select('onboarding_completed, onboarding_skipped, show_onboarding_reminder')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data, error } = result;

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking onboarding status:', error);
        setIsOnboardingComplete(false);
        setShowReminder(false);
        setOnboardingSkipped(false);
      } else if (!data) {
        console.log('No profile found, assuming onboarding not complete');
        setIsOnboardingComplete(false);
        setShowReminder(false);
        setOnboardingSkipped(false);
      } else {
        const isComplete = data.onboarding_completed || false;
        const wasSkipped = data.onboarding_skipped || false;
        const shouldShowReminder = data.show_onboarding_reminder || false;
        
        console.log('Onboarding status:', { isComplete, wasSkipped, shouldShowReminder });
        
        setIsOnboardingComplete(isComplete);
        setShowReminder(wasSkipped && shouldShowReminder);
        
        // Update localStorage cache
        if (isComplete) {
          localStorage.setItem(cacheKey, 'true');
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.error('Error in onboarding status check:', error);
      setIsOnboardingComplete(false);
      setShowReminder(false);
      setOnboardingSkipped(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Optimistic local setter for onboardingSkipped (used by soft-skip)
  const setOnboardingSkippedLocal = (value: boolean) => {
    setOnboardingSkipped(value);
  };

  return {
    isOnboardingComplete,
    isLoading,
    showReminder,
    onboardingSkipped,
    dismissReminder,
    markOnboardingComplete,
    forceRefresh,
    setOnboardingSkippedLocal,
  };
};
