import { supabase } from '@/integrations/supabase/client';

export interface ConsistencyScore {
  type: 'meal' | 'hydration' | 'supplements' | 'mood';
  label: string;
  percentage: number;
  daysCounted: number;
  totalDays: number;
  motivationalMessage?: string;
}

export const calculateConsistencyScores = async (userId: string, days: number): Promise<ConsistencyScore[]> => {
  if (!userId) return [];

  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);
  const dateStr = dateThreshold.toISOString().split('T')[0];

  // Fetch all logs in parallel
  const [nutritionData, hydrationData, supplementData, moodData] = await Promise.all([
    supabase
      .from('nutrition_logs')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', dateStr),
    supabase
      .from('hydration_logs')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', dateStr),
    supabase
      .from('supplement_logs')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', dateStr),
    supabase
      .from('mood_logs')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', dateStr)
  ]);

  // Calculate unique days for each habit
  const mealDays = new Set(nutritionData.data?.map(n => n.created_at.split('T')[0])).size || 0;
  const hydrationDays = new Set(hydrationData.data?.map(h => h.created_at.split('T')[0])).size || 0;
  const supplementDays = new Set(supplementData.data?.map(s => s.created_at.split('T')[0])).size || 0;
  const moodDays = new Set(moodData.data?.map(m => m.created_at.split('T')[0])).size || 0;

  // Calculate percentages
  const mealPercentage = Math.round((mealDays / days) * 100);
  const hydrationPercentage = Math.round((hydrationDays / days) * 100);
  const supplementPercentage = Math.round((supplementDays / days) * 100);
  const moodPercentage = Math.round((moodDays / days) * 100);

  // Generate motivational messages
  const generateMessage = (percentage: number, type: string): string | undefined => {
    if (percentage >= 90) {
      switch (type) {
        case 'meal': return 'Exceptional meal tracking! 🔥';
        case 'hydration': return 'Hydration was solid 💪 — keep that water bottle nearby!';
        case 'supplements': return 'Perfect supplement consistency! 🌟';
        case 'mood': return 'Amazing mood tracking dedication! 📝';
      }
    } else if (percentage >= 70) {
      switch (type) {
        case 'meal': return 'Good meal logging rhythm! 👍';
        case 'hydration': return 'Solid hydration habits forming! 💧';
        case 'supplements': return 'Great supplement routine! 💊';
        case 'mood': return 'Strong journaling habits! ✨';
      }
    } else if (percentage >= 50) {
      switch (type) {
        case 'meal': return 'Room to improve meal logging consistency 📈';
        case 'hydration': return 'Hydration needs more attention 🚰';
        case 'supplements': return 'Consider setting supplement reminders ⏰';
        case 'mood': return 'More journaling could reveal patterns! 🧠';
      }
    } else {
      switch (type) {
        case 'meal': return 'Let\'s focus on daily meal tracking! 🎯';
        case 'hydration': return 'Hydration tracking needs work — try reminders! 💡';
        case 'supplements': return 'Supplement consistency dropped — set up alerts! 🔔';
        case 'mood': return 'Mood logs dropped this week — journaling helps reveal patterns!';
      }
    }
  };

  return [
    {
      type: 'meal',
      label: 'Meal logging',
      percentage: mealPercentage,
      daysCounted: mealDays,
      totalDays: days,
      motivationalMessage: generateMessage(mealPercentage, 'meal')
    },
    {
      type: 'hydration',
      label: 'Hydration',
      percentage: hydrationPercentage,
      daysCounted: hydrationDays,
      totalDays: days,
      motivationalMessage: generateMessage(hydrationPercentage, 'hydration')
    },
    {
      type: 'supplements',
      label: 'Supplements',
      percentage: supplementPercentage,
      daysCounted: supplementDays,
      totalDays: days,
      motivationalMessage: generateMessage(supplementPercentage, 'supplements')
    },
    {
      type: 'mood',
      label: 'Mood log',
      percentage: moodPercentage,
      daysCounted: moodDays,
      totalDays: days,
      motivationalMessage: generateMessage(moodPercentage, 'mood')
    }
  ];
};