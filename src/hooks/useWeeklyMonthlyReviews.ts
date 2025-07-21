import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';

interface ReviewInsight {
  title: string;
  insights: string[];
  period: string;
}

export const useWeeklyMonthlyReviews = () => {
  const { user } = useAuth();
  const [weeklyReview, setWeeklyReview] = useState<ReviewInsight | null>(null);
  const [monthlyReview, setMonthlyReview] = useState<ReviewInsight | null>(null);
  const [loading, setLoading] = useState(true);

  // Generate weekly review
  const generateWeeklyReview = async (): Promise<ReviewInsight | null> => {
    if (!user?.id) return null;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    try {
      // Fetch data from past 7 days
      const [nutritionData, hydrationData, supplementData, moodData] = await Promise.all([
        supabase.from('nutrition_logs').select('*').eq('user_id', user.id).gte('created_at', weekAgoStr),
        supabase.from('hydration_logs').select('*').eq('user_id', user.id).gte('created_at', weekAgoStr),
        supabase.from('supplement_logs').select('*').eq('user_id', user.id).gte('created_at', weekAgoStr),
        supabase.from('mood_logs').select('*').eq('user_id', user.id).gte('created_at', weekAgoStr)
      ]);

      const insights = [];
      
      // Hydration analysis
      const hydrationDays = new Set(hydrationData.data?.map(h => h.created_at.split('T')[0])).size || 0;
      if (hydrationDays >= 5) {
        insights.push(`💧 You met your hydration goal ${hydrationDays}/7 days, well done!`);
      } else if (hydrationDays >= 3) {
        insights.push(`💧 Hydration tracked ${hydrationDays}/7 days - room for improvement!`);
      } else if (hydrationDays > 0) {
        insights.push(`💧 Only ${hydrationDays} hydration days logged. Let's aim for daily tracking!`);
      }

      // Supplement analysis
      const supplementDays = new Set(supplementData.data?.map(s => s.created_at.split('T')[0])).size || 0;
      if (supplementDays < 4 && supplementDays > 0) {
        insights.push(`💊 Supplements were missed on several days. Want to try a reminder system?`);
      } else if (supplementDays >= 5) {
        insights.push(`💊 Great supplement consistency! ${supplementDays}/7 days logged.`);
      }

      // Mood patterns
      const moodEntries = moodData.data || [];
      if (moodEntries.length > 0) {
        const avgMood = moodEntries.reduce((sum, m) => sum + (m.mood || 5), 0) / moodEntries.length;
        if (avgMood >= 7) {
          insights.push(`😊 Great week for mood! Average rating: ${avgMood.toFixed(1)}/10`);
        } else if (avgMood < 5) {
          insights.push(`🤗 Mood averaged ${avgMood.toFixed(1)}/10 - consider reviewing your patterns`);
        } else {
          insights.push(`😌 Mood this week: ${avgMood.toFixed(1)}/10 - steady progress!`);
        }
      }

      // Nutrition consistency
      const nutritionDays = new Set(nutritionData.data?.map(n => n.created_at.split('T')[0])).size || 0;
      if (nutritionDays >= 5) {
        insights.push(`🍎 Excellent food tracking! ${nutritionDays}/7 days logged.`);
      } else if (nutritionDays >= 3) {
        insights.push(`🍎 Food logged ${nutritionDays}/7 days - try for daily consistency!`);
      }

      // Default insight if no data
      if (insights.length === 0) {
        insights.push(`📊 Start logging more consistently to unlock personalized weekly insights!`);
      }

      return {
        title: 'Weekly Review',
        insights: insights.slice(0, 3),
        period: '7 days'
      };
    } catch (error) {
      console.error('Error generating weekly review:', error);
      return {
        title: 'Weekly Review',
        insights: ['📊 Unable to generate review. Keep logging to see insights!'],
        period: '7 days'
      };
    }
  };

  // Generate monthly review
  const generateMonthlyReview = async (): Promise<ReviewInsight | null> => {
    if (!user?.id) return null;

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoStr = monthAgo.toISOString().split('T')[0];

    try {
      const [nutritionData, supplementData, moodData, hydrationData] = await Promise.all([
        supabase.from('nutrition_logs').select('*').eq('user_id', user.id).gte('created_at', monthAgoStr),
        supabase.from('supplement_logs').select('*').eq('user_id', user.id).gte('created_at', monthAgoStr),
        supabase.from('mood_logs').select('*').eq('user_id', user.id).gte('created_at', monthAgoStr),
        supabase.from('hydration_logs').select('*').eq('user_id', user.id).gte('created_at', monthAgoStr)
      ]);

      const insights = [];
      
      // Consistency score
      const logDays = new Set([
        ...(nutritionData.data?.map(n => n.created_at.split('T')[0]) || []),
        ...(supplementData.data?.map(s => s.created_at.split('T')[0]) || []),
        ...(moodData.data?.map(m => m.created_at.split('T')[0]) || []),
        ...(hydrationData.data?.map(h => h.created_at.split('T')[0]) || [])
      ]).size;
      
      const consistencyScore = Math.round((logDays / 30) * 100);
      if (consistencyScore >= 80) {
        insights.push(`⭐ This month's consistency score: ${consistencyScore}% — impressive commitment!`);
      } else if (consistencyScore >= 50) {
        insights.push(`📈 Consistency score: ${consistencyScore}% — aim for 80%+ next month!`);
      } else {
        insights.push(`💪 Consistency score: ${consistencyScore}% — small daily steps lead to big changes!`);
      }

      // Top supplement
      const supplementCounts: Record<string, number> = {};
      supplementData.data?.forEach(s => {
        supplementCounts[s.name] = (supplementCounts[s.name] || 0) + 1;
      });
      const topSupplement = Object.entries(supplementCounts).sort(([,a], [,b]) => b - a)[0];
      if (topSupplement && topSupplement[1] >= 5) {
        insights.push(`💊 Top supplement: ${topSupplement[0]} (logged ${topSupplement[1]} times)`);
      }

      // Mood improvements
      const moodEntries = moodData.data || [];
      if (moodEntries.length >= 10) {
        const recentMoods = moodEntries.slice(-10).map(m => m.mood || 5);
        const earlierMoods = moodEntries.slice(0, 10).map(m => m.mood || 5);
        const recentAvg = recentMoods.reduce((sum, m) => sum + m, 0) / recentMoods.length;
        const earlierAvg = earlierMoods.reduce((sum, m) => sum + m, 0) / earlierMoods.length;
        
        if (recentAvg > earlierAvg + 0.5) {
          const improvement = Math.round(((recentAvg - earlierAvg) / earlierAvg) * 100);
          insights.push(`🧠 Mood improved by ${improvement}% this month — great progress!`);
        } else if (recentAvg < earlierAvg - 0.5) {
          insights.push(`🤗 Mood dipped recently — consider reviewing your patterns and self-care`);
        } else {
          insights.push(`😌 Mood remained stable this month — consistency is key!`);
        }
      }

      // Trigger tag analysis
      const taggedEntries = [
        ...(nutritionData.data?.filter(n => n.trigger_tags?.length > 0) || []),
        ...(supplementData.data?.filter(s => s.trigger_tags?.length > 0) || []),
        ...(hydrationData.data?.filter(h => h.trigger_tags?.length > 0) || [])
      ];
      
      if (taggedEntries.length > 0) {
        insights.push(`🏷️ You tagged ${taggedEntries.length} entries this month — great pattern awareness!`);
      }

      if (insights.length === 0) {
        insights.push(`🌟 Keep tracking to unlock detailed monthly insights and patterns!`);
      }

      return {
        title: 'Monthly Review',
        insights: insights.slice(0, 3),
        period: '30 days'
      };
    } catch (error) {
      console.error('Error generating monthly review:', error);
      return {
        title: 'Monthly Review',
        insights: ['🌟 Unable to generate review. Keep logging to see insights!'],
        period: '30 days'
      };
    }
  };

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      const [weekly, monthly] = await Promise.all([
        generateWeeklyReview(),
        generateMonthlyReview()
      ]);
      setWeeklyReview(weekly);
      setMonthlyReview(monthly);
      setLoading(false);
    };

    if (user?.id) {
      fetchReviews();
    }
  }, [user?.id]);

  return {
    weeklyReview,
    monthlyReview,
    loading,
    refreshReviews: async () => {
      setLoading(true);
      const [weekly, monthly] = await Promise.all([
        generateWeeklyReview(),
        generateMonthlyReview()
      ]);
      setWeeklyReview(weekly);
      setMonthlyReview(monthly);
      setLoading(false);
    }
  };
};