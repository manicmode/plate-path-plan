import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { isDev } from '@/utils/dev';

export const useMealScoring = () => {
  const { user } = useAuth();

  const scoreMeal = useCallback(async (mealId: string) => {
    if (!user || !mealId) {
      console.warn('Cannot score meal: missing user or meal ID');
      return null;
    }

    try {
      console.log('🎯 Scoring meal quality for meal ID:', mealId);
      
      if (isDev) {
        // eslint-disable-next-line no-console
        console.info('[MEAL-SCORE]', { fn: 'scoreMeal', action: 'invoke', body: { meal_id: mealId }, userIdTail: user?.id ? String(user.id).slice(-6) : 'anon' });
      }
      
      const { data, error } = await supabase.functions.invoke('score-meal-quality', {
        body: {
          meal_id: mealId
        }
      });
      
      if (isDev) {
        // eslint-disable-next-line no-console
        console.info('[MEAL-SCORE]', {
          fn: 'scoreMeal',
          action: 'result',
          status: error ? 'error' : 'success',
          data: error ? undefined : { score: (data as any)?.score, rating_text: (data as any)?.rating_text, meal_id: (data as any)?.meal_id },
          error: error ? { message: (error as any).message, code: (error as any).code, details: (error as any).details, name: (error as any).name } : undefined,
        });
      }


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