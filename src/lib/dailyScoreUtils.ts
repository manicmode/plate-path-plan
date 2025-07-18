import { supabase } from '@/integrations/supabase/client';

export const triggerDailyScoreCalculation = async (userId: string, targetDate?: string) => {
  try {
    console.log('🎯 Triggering daily score calculation for user:', userId);
    
    const { data, error } = await supabase.functions.invoke('calculate-daily-score', {
      body: { 
        user_id: userId,
        target_date: targetDate
      }
    });

    if (error) {
      console.error('❌ Error calculating daily score:', error);
      return null;
    }

    console.log('✅ Daily score calculated successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to trigger daily score calculation:', error);
    return null;
  }
};

export const triggerDailyTargetsGeneration = async (userId: string) => {
  try {
    console.log('🎯 Triggering daily targets generation for user:', userId);
    
    const { data, error } = await supabase.functions.invoke('calculate-daily-targets', {
      body: { userId }
    });

    if (error) {
      console.error('❌ Error generating daily targets:', error);
      return null;
    }

    console.log('✅ Daily targets generated successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Error in triggerDailyTargetsGeneration:', error);
    return null;
  }
};