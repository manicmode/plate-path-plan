import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToxinDetections } from './useToxinDetections';

export const useAutomaticToxinDetection = () => {
  const { user } = useAuth();
  const { detectToxinsForFood } = useToxinDetections();

  useEffect(() => {
    if (!user) return;

    // Subscribe to new nutrition log insertions
    const channel = supabase
      .channel('nutrition-log-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'nutrition_logs',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('New nutrition log detected:', payload.new);
          
          // Extract food information
          const { id, food_name, ingredient_analysis } = payload.new;
          
          // Trigger toxin detection for the new food log
          if (id && food_name) {
            try {
              // Extract ingredients from ingredient_analysis if available
              let ingredients = '';
              if (ingredient_analysis) {
                try {
                  const analysis = typeof ingredient_analysis === 'string' 
                    ? JSON.parse(ingredient_analysis) 
                    : ingredient_analysis;
                  
                  if (analysis.ingredients) {
                    ingredients = Array.isArray(analysis.ingredients) 
                      ? analysis.ingredients.join(', ')
                      : analysis.ingredients;
                  }
                } catch (e) {
                  console.warn('Failed to parse ingredient analysis for toxin detection:', e);
                }
              }
              
              await detectToxinsForFood(id, food_name, ingredients);
              console.log('✅ Automatic toxin detection completed for:', food_name);
            } catch (error) {
              console.error('❌ Error in automatic toxin detection:', error);
            }
          }
        }
      )
      .subscribe((status) => {
        
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, detectToxinsForFood]);
};