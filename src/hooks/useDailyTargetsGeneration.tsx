
import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useDailyTargetsGeneration = () => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const generationRef = useRef(false);

  const generateDailyTargets = async (userId?: string) => {
    const targetUserId = userId || user?.id;
    
    if (!targetUserId) {
      console.error('No user ID provided for target generation');
      return null;
    }

    if (generationRef.current) {
      console.log('Target generation already in progress, skipping...');
      return null;
    }

    generationRef.current = true;
    setIsGenerating(true);
    
    try {
      console.log(`Generating daily nutrition targets for user: ${targetUserId}`);
      
      const { data, error } = await supabase.functions.invoke('calculate-daily-targets', {
        body: { userId: targetUserId }
      });

      if (error) {
        console.error('Error generating daily targets:', error);
        // Only show toast for user-initiated actions, not automatic background calls
        if (userId) {
          toast.error('Failed to generate daily nutrition targets');
        }
        throw error;
      }

      console.log('Daily nutrition targets generated successfully:', data);
      // Only show success toast for user-initiated actions
      if (userId) {
        toast.success('Daily nutrition targets updated successfully!');
      }
      return data;
      
    } catch (error) {
      console.error('Error in generateDailyTargets:', error);
      // Only show toast for user-initiated actions
      if (userId) {
        toast.error('Failed to generate daily nutrition targets');
      }
      throw error;
    } finally {
      setIsGenerating(false);
      generationRef.current = false;
    }
  };

  const ensureUserHasTargets = async () => {
    if (!user?.id || generationRef.current) return null;

    try {
      // Check if user already has targets for today
      const today = new Date().toISOString().split('T')[0];
      const { data: existingTargets, error: checkError } = await supabase
        .from('daily_nutrition_targets')
        .select('id')
        .eq('user_id', user.id)
        .eq('target_date', today)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing targets:', checkError);
        return null;
      }

      if (existingTargets) {
        console.log('User already has targets for today');
        return existingTargets;
      }

      // Check if user has completed onboarding
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('onboarding_completed, age, gender, weight, activity_level')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return null;
      }

      if (!profile?.onboarding_completed) {
        console.log('User has not completed onboarding, skipping target generation');
        return null;
      }

      // Generate targets if user has completed onboarding but no targets exist
      console.log('User has completed onboarding but no targets exist, generating...');
      // Don't pass userId to avoid showing toast for automatic generation
      return await generateDailyTargets();
      
    } catch (error) {
      console.error('Error in ensureUserHasTargets:', error);
      return null;
    }
  };

  const regenerateTargetsAfterProfileUpdate = async () => {
    if (!user?.id || generationRef.current) return null;

    try {
      console.log('Regenerating targets after profile update...');
      // Pass userId to show toast for this user-initiated action
      const result = await generateDailyTargets(user.id);
      
      if (result) {
        toast.success('Your daily nutrition targets have been updated based on your new profile!');
      }
      
      return result;
    } catch (error) {
      console.error('Error regenerating targets after profile update:', error);
      return null;
    }
  };

  return {
    generateDailyTargets,
    ensureUserHasTargets,
    regenerateTargetsAfterProfileUpdate,
    isGenerating
  };
};
