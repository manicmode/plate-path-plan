import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { useNutritionDeduplication } from './useNutritionDeduplication';
import { safeSetJSON } from '@/lib/safeStorage';
import { useMealScoring } from './useMealScoring';
import { getLocalDateString } from '@/lib/dateUtils';
import { FLAGS } from '@/constants/flags';
import { isDev } from '@/utils/dev';

interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  saturated_fat: number;
  image?: string;
  confidence?: number;
  timestamp: Date;
  confirmed: boolean;
}

interface HydrationItem {
  id: string;
  name: string;
  volume: number;
  type: 'water' | 'other';
  image?: string;
  timestamp: Date;
}

interface SupplementItem {
  id: string;
  name: string;
  dosage: number;
  unit: string;
  frequency?: string;
  image?: string;
  timestamp: Date;
}

export const useNutritionPersistence = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToRecentlySaved } = useNutritionDeduplication();
  const { scoreMealAfterInsert } = useMealScoring();

  const saveFood = useCallback(async (food: FoodItem): Promise<string | null> => {
    if (!user || !food.confirmed) return null;

    try {
      // Ensure confidence is always an integer for database compatibility
      const confidenceInteger = food.confidence ? Math.round(food.confidence) : 100;
      

      const insertData = {
        user_id: user.id,
        food_name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
        sugar: food.sugar,
        sodium: food.sodium,
        saturated_fat: food.saturated_fat || (food.fat * 0.3), // Fallback: 30% of total fat
        confidence: confidenceInteger, // Use integer version
        image_url: food.image,
        created_at: food.timestamp.toISOString()
      };

      if (isDev) {
        // eslint-disable-next-line no-console
        console.info("[MEAL-PERSIST]", {
          fn: "saveFood",
          action: "insert nutrition_logs",
          payload: {
            userIdTail: user?.id ? String(user.id).slice(-6) : "anon",
            food_name: insertData.food_name,
            calories: insertData.calories,
            protein: insertData.protein,
            carbs: insertData.carbs,
            fat: insertData.fat,
          },
        });
      }
      const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
      const { data, error } = await supabase
        .from('nutrition_logs')
        .insert(insertData)
        .select();
      const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();

      if (isDev) {
        // eslint-disable-next-line no-console
        console.info("[MEAL-PERSIST]", {
          fn: "saveFood",
          action: "insert result",
          status: error ? "error" : "success",
          ms: Math.round(t1 - t0),
          ids: Array.isArray(data) ? data.map((d: any) => d.id) : [],
          error: error
            ? { message: (error as any).message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code }
            : undefined,
        });
      }


      
      if (error) {
        console.error('🚨 Database insert error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      console.log('✅ Food saved to database successfully:', food.name);
      
      if (data && data.length > 0) {
        const savedId = data[0].id;
        console.log(`✅ Food saved with ID: ${savedId}`);
        
        // Add to deduplication set to prevent processing duplicate saves
        addToRecentlySaved(savedId);
        
        // Award nutrition XP (with feature flag)
        if (FLAGS.ENABLE_XP) {
          try {
            const { error: xpError } = await supabase.functions.invoke('award-nutrition-xp', {
              body: { 
                user_id: user.id, 
                activity_type: 'nutrition',
                activity_id: savedId
              }
            });
            if (xpError) console.warn('XP award failed:', xpError);
          } catch (xpError) {
            console.warn('XP award error:', xpError);
            toast({
              title: "XP award failed",
              description: "Food was saved successfully, but XP couldn't be awarded",
              variant: "destructive"
            });
          }
        }

        return savedId;
      }
      
      // Score the meal quality
      const scoringResult = await scoreMealAfterInsert(data, error);
      
      // Automatically generate meal suggestions in the background (silent)
      if (scoringResult) {
        console.log('🎯 Triggering meal suggestions generation...');
        // Call generate-meal-suggestions edge function silently
        supabase.functions.invoke('generate-meal-suggestions', {
          body: {}
        }).then(({ data: suggestionData, error: suggestionError }) => {
          if (suggestionError) {
            console.warn('Background meal suggestion generation failed:', suggestionError);
          } else {
            console.log('✅ Meal suggestions generated:', suggestionData);
          }
        }).catch(error => {
          console.warn('Background meal suggestion generation error:', error);
        });
        
        // Check if today is Sunday and generate weekly summary
        const today = new Date();
        if (today.getDay() === 0) { // 0 = Sunday
          console.log('📅 Sunday detected, generating weekly summary...');
          supabase.functions.invoke('generate-weekly-summary', {
            body: {}
          }).then(({ data: summaryData, error: summaryError }) => {
            if (summaryError) {
              console.warn('Weekly summary generation failed:', summaryError);
            } else {
              console.log('✅ Weekly summary generated:', summaryData);
            }
          }).catch(error => {
            console.warn('Weekly summary generation error:', error);
          });
        } else {
          console.log('📅 Not Sunday, skipping weekly summary generation');
        }

        // Check if it's month-end or month-start and generate monthly summary
        const isLastDayOfMonth = today.getDate() === new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const isFirstDayOfMonth = today.getDate() === 1;
        
        if (isLastDayOfMonth || isFirstDayOfMonth) {
          console.log(`📅 ${isLastDayOfMonth ? 'Last day of month' : 'First day of month'} detected, generating monthly summary...`);
          supabase.functions.invoke('generate-monthly-summary', {
            body: {}
          }).then(({ data: monthlySummaryData, error: monthlySummaryError }) => {
            if (monthlySummaryError) {
              console.warn('Monthly summary generation failed:', monthlySummaryError);
            } else {
              console.log('✅ Monthly summary generated:', monthlySummaryData);
            }
          }).catch(error => {
            console.warn('Monthly summary generation error:', error);
          });

          // On the 1st day of a new month, also assign monthly rankings
          if (isFirstDayOfMonth) {
            console.log('🏆 First day of month detected, assigning monthly rankings...');
            supabase.functions.invoke('assign-monthly-rankings', {
              body: {}
            }).then(({ data: rankingsData, error: rankingsError }) => {
              if (rankingsError) {
                console.warn('Monthly rankings assignment failed:', rankingsError);
              } else {
                console.log('✅ Monthly rankings assigned:', rankingsData);
              }
            }).catch(error => {
              console.warn('Monthly rankings assignment error:', error);
            });
          }
        } else {
          console.log('📅 Not month-end or month-start, skipping monthly summary generation');
        }
      }
      
      // Return the database ID
      return data && data[0] ? data[0].id : null;
    } catch (error) {
      console.error('Error saving food:', error);
      // Save to localStorage as fallback using local date
      const date = getLocalDateString(food.timestamp);
      const localKey = `nutrition_${user.id}_${date}_backup`;
      const existing = JSON.parse(localStorage.getItem(localKey) || '{"foods":[]}');
      existing.foods.push(food);
      safeSetJSON(localKey, existing);
      if (isDev) {
        // eslint-disable-next-line no-console
        console.info('[MEAL-PERSIST]', { fn: 'saveFood', action: 'fallback to local store', food_name: food.name, userIdTail: user?.id ? String(user.id).slice(-6) : 'anon' });
      }
      return null;
    }
  }, [user, scoreMealAfterInsert]);

  const saveHydration = useCallback(async (hydration: HydrationItem) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('hydration_logs')
        .insert({
          user_id: user.id,
          name: hydration.name,
          volume: hydration.volume,
          type: hydration.type,
          image_url: hydration.image,
          created_at: hydration.timestamp.toISOString()
        });

      if (error) throw error;
      console.log('Hydration saved to database:', hydration.name);
    } catch (error) {
      console.error('Error saving hydration:', error);
      // Save to localStorage as fallback using local date
      const date = getLocalDateString(hydration.timestamp);
      const localKey = `nutrition_${user.id}_${date}_backup`;
      const existing = JSON.parse(localStorage.getItem(localKey) || '{"hydration":[]}');
      existing.hydration = existing.hydration || [];
      existing.hydration.push(hydration);
      safeSetJSON(localKey, existing);
    }
  }, [user]);

  const saveSupplement = useCallback(async (supplement: SupplementItem) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('supplement_logs')
        .insert({
          user_id: user.id,
          name: supplement.name,
          dosage: supplement.dosage,
          unit: supplement.unit,
          frequency: supplement.frequency,
          image_url: supplement.image,
          created_at: supplement.timestamp.toISOString()
        });

      if (error) throw error;
      console.log('Supplement saved to database:', supplement.name);
    } catch (error) {
      console.error('Error saving supplement:', error);
      // Save to localStorage as fallback using local date
      const date = getLocalDateString(supplement.timestamp);
      const localKey = `nutrition_${user.id}_${date}_backup`;
      const existing = JSON.parse(localStorage.getItem(localKey) || '{"supplements":[]}');
      existing.supplements = existing.supplements || [];
      existing.supplements.push(supplement);
      safeSetJSON(localKey, existing);
    }
  }, [user]);

  const removeFood = useCallback(async (foodId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('nutrition_logs')
        .delete()
        .eq('id', foodId)
        .eq('user_id', user.id);

      if (error) throw error;
      console.log('Food removed from database:', foodId);
    } catch (error) {
      console.error('Error removing food:', error);
    }
  }, [user]);

  return {
    saveFood,
    saveHydration,
    saveSupplement,
    removeFood
  };
};
