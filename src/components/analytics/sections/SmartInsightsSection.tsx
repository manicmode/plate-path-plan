
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, AlertTriangle, Sparkles, Heart } from 'lucide-react';
import { SectionHeader } from '@/components/analytics/ui/SectionHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { Skeleton } from '@/components/ui/skeleton';

interface Insight {
  type: 'positive' | 'warning' | 'tip';
  title: string;
  message: string;
}

export const SmartInsightsSection = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateSmartInsights = async () => {
      if (!user) return;

      try {
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const generatedInsights: Insight[] = [];

        // Get recent mood logs
        const { data: moodLogs } = await supabase
          .from('mood_logs')
          .select('date, mood, energy, wellness, ai_detected_tags')
          .eq('user_id', user.id)
          .gte('date', lastWeek.toISOString().split('T')[0])
          .order('date', { ascending: false });

        // Get recent nutrition logs
        const { data: nutritionLogs } = await supabase
          .from('nutrition_logs')
          .select('created_at, food_name, quality_score, protein, sugar')
          .eq('user_id', user.id)
          .gte('created_at', lastWeek.toISOString())
          .order('created_at', { ascending: false });

        // Get recent supplement logs
        const { data: supplementLogs } = await supabase
          .from('supplement_logs')
          .select('created_at, name')
          .eq('user_id', user.id)
          .gte('created_at', lastWeek.toISOString());

        if (moodLogs && moodLogs.length > 0) {
          // Analyze energy patterns
          const lowEnergyDays = moodLogs.filter(log => (log.energy || 0) <= 4);
          const highEnergyDays = moodLogs.filter(log => (log.energy || 0) >= 8);
          
          if (highEnergyDays.length >= 3) {
            generatedInsights.push({
              type: 'positive',
              title: '🌟 Great Energy Streak!',
              message: `You had high energy levels on ${highEnergyDays.length} days this week. Keep up the great habits!`
            });
          }

          if (lowEnergyDays.length >= 3) {
            // Check breakfast patterns
            let breakfastMissed = 0;
            lowEnergyDays.forEach(moodLog => {
              const date = moodLog.date;
              const morningMeals = nutritionLogs?.filter(nutLog => {
                const nutDate = nutLog.created_at.split('T')[0];
                const nutHour = parseInt(nutLog.created_at.split('T')[1].split(':')[0]);
                return nutDate === date && nutHour <= 10;
              }) || [];
              if (morningMeals.length === 0) breakfastMissed++;
            });

            if (breakfastMissed >= Math.floor(lowEnergyDays.length * 0.6)) {
              generatedInsights.push({
                type: 'tip',
                title: '☀️ Morning Fuel Strategy',
                message: `You had low energy on ${lowEnergyDays.length} days, and skipped breakfast on ${breakfastMissed} of those. Try eating within 2 hours of waking up.`
              });
            }
          }

          // Check for digestive issues
          const digestiveIssues = moodLogs.filter(log => 
            log.ai_detected_tags?.some((tag: string) => 
              tag.toLowerCase().includes('stomach') || 
              tag.toLowerCase().includes('bloated') ||
              tag.toLowerCase().includes('nausea')
            )
          );

          if (digestiveIssues.length >= 2 && supplementLogs && supplementLogs.length > 0) {
            const supplementCounts: Record<string, number> = {};
            digestiveIssues.forEach(moodLog => {
              const date = moodLog.date;
              const daySupplements = supplementLogs.filter(suppLog => 
                suppLog.created_at.split('T')[0] === date
              );
              daySupplements.forEach(supp => {
                supplementCounts[supp.name] = (supplementCounts[supp.name] || 0) + 1;
              });
            });

            for (const [suppName, count] of Object.entries(supplementCounts)) {
              if (count >= 2) {
                generatedInsights.push({
                  type: 'warning',
                  title: '⚠️ Pattern Detected',
                  message: `Digestive discomfort mentioned ${count} times after taking ${suppName}. Consider spacing it out from meals.`
                });
                break;
              }
            }
          }
        }

        // Analyze nutrition patterns
        if (nutritionLogs && nutritionLogs.length > 0) {
          const highQualityMeals = nutritionLogs.filter(log => (log.quality_score || 0) >= 80).length;
          const totalMeals = nutritionLogs.length;
          
          if (highQualityMeals / totalMeals >= 0.7) {
            generatedInsights.push({
              type: 'positive',
              title: '🏆 Quality Champion!',
              message: `${Math.round((highQualityMeals / totalMeals) * 100)}% of your meals this week were high quality. Outstanding choices!`
            });
          }

          // Check protein consistency
          const proteinMeals = nutritionLogs.filter(log => 
            log.food_name?.toLowerCase().includes('protein') ||
            log.food_name?.toLowerCase().includes('chicken') ||
            log.food_name?.toLowerCase().includes('fish') ||
            log.food_name?.toLowerCase().includes('egg') ||
            (log.protein && log.protein > 15)
          );

          if (proteinMeals.length >= 5) {
            generatedInsights.push({
              type: 'positive',
              title: '💪 Protein Power Week',
              message: `Great protein intake this week! You logged protein-rich foods ${proteinMeals.length} times.`
            });
          }
        }

        // If no specific insights, provide general encouragement
        if (generatedInsights.length === 0) {
          generatedInsights.push({
            type: 'tip',
            title: '📈 Keep Building',
            message: 'Every meal logged is valuable data for understanding your wellness patterns. Keep it up!'
          });
        }

        setInsights(generatedInsights.slice(0, 3)); // Show max 3 insights
      } catch (error) {
        console.error('Error generating insights:', error);
        setInsights([{
          type: 'tip',
          title: '🔄 Check Back Soon',
          message: 'Keep logging your meals and mood to unlock personalized insights!'
        }]);
      } finally {
        setLoading(false);
      }
    };

    generateSmartInsights();
  }, [user]);

  const getInsightStyles = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-500',
          titleColor: 'text-green-700 dark:text-green-300',
          icon: <Sparkles className="h-4 w-4" />
        };
      case 'warning':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-500',
          titleColor: 'text-orange-700 dark:text-orange-300',
          icon: <AlertTriangle className="h-4 w-4" />
        };
      case 'tip':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-500',
          titleColor: 'text-blue-700 dark:text-blue-300',
          icon: <Heart className="h-4 w-4" />
        };
    }
  };

  if (loading) {
    return (
      <div>
        <SectionHeader icon={Brain} title="Smart Insights" subtitle="Personalized recommendations" />
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
          <CardContent className="p-6">
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader icon={Brain} title="Smart Insights" subtitle="Personalized recommendations" />
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardContent className="p-6">
          <div className="space-y-3">
            {insights.map((insight, index) => {
              const styles = getInsightStyles(insight.type);
              return (
                <div 
                  key={index}
                  className={`p-4 ${styles.bg} rounded-xl border-l-4 ${styles.border} shadow-sm`}
                >
                  <div className={`text-sm ${styles.titleColor} font-semibold flex items-center gap-2`}>
                    {styles.icon}
                    {insight.title}
                  </div>
                  <div className="text-gray-900 dark:text-gray-100 text-sm mt-1">
                    {insight.message}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
