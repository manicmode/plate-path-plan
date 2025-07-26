import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { safeSetJSON } from '@/lib/safeStorage';
import { useMealScoring } from './useMealScoring';
import { getLocalDateString } from '@/lib/dateUtils';

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
  const { scoreMealAfterInsert } = useMealScoring();

  const saveFood = useCallback(async (food: FoodItem): Promise<string | null> => {
    if (!user || !food.confirmed) return null;

    try {
      const { data, error } = await supabase
        .from('nutrition_logs')
        .insert({
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
          confidence: food.confidence,
          image_url: food.image,
          created_at: food.timestamp.toISOString()
        })
        .select();

      if (error) throw error;
      console.log('Food saved to database:', food.name);
      
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
