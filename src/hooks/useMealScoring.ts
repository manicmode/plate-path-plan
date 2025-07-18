import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export const useMealScoring = () => {
  const { user } = useAuth();

  const scoreMeal = useCallback(async (mealId: string) => {
    if (!user || !mealId) {
      console.warn('Cannot score meal: missing user or meal ID');
      return null;
    }

    try {
      console.log('🎯 Scoring meal quality for meal ID:', mealId);
      
      const { data, error } = await supabase.functions.invoke('score-meal-quality', {
        body: {
          meal_id: mealId
        }
      });

      if (error) {
        console.error('❌ Error scoring meal:', error);
        return null;
      }

      console.log('✅ Meal scored successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Exception scoring meal:', error);
      return null;
    }
  }, [user]);

  const scoreMealAfterInsert = useCallback(async (insertData: any, insertError: any) => {
    if (insertError || !insertData) {
      console.warn('Cannot score meal: insert failed or no data returned');
      return null;
    }

    // Handle both single insert and array response
    const mealData = Array.isArray(insertData) ? insertData[0] : insertData;
    
    if (!mealData?.id) {
      console.warn('Cannot score meal: no meal ID in insert response');
      return null;
    }

    return await scoreMeal(mealData.id);
  }, [scoreMeal]);

  return {
    scoreMeal,
    scoreMealAfterInsert
  };
};