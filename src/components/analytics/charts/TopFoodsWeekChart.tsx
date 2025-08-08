import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Apple, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { Skeleton } from '@/components/ui/skeleton';

interface TopFood {
  food_name: string;
  count: number;
  avg_quality_score: number;
  total_calories: number;
  image_url?: string;
}

interface TopFoodsData {
  healthy: TopFood[];
  unhealthy: TopFood[];
}

export const TopFoodsWeekChart = () => {
  const { user } = useAuth();
  const [data, setData] = useState<TopFoodsData>({ healthy: [], unhealthy: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopFoods = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Get this week's data
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
        weekStart.setHours(0, 0, 0, 0);

        const { data: nutritionLogs, error: logsError } = await supabase
          .from('nutrition_logs')
          .select('food_name, quality_score, calories, image_url')
          .eq('user_id', user.id)
          .gte('created_at', weekStart.toISOString())
          .order('created_at', { ascending: false });

        if (logsError) {
          throw logsError;
        }

        // Group and aggregate foods
        const foodCounts: Record<string, {
          count: number;
          total_quality: number;
          total_calories: number;
          image_url?: string;
        }> = {};

        nutritionLogs?.forEach(log => {
          const foodName = log.food_name;
          if (!foodCounts[foodName]) {
            foodCounts[foodName] = {
              count: 0,
              total_quality: 0,
              total_calories: 0,
              image_url: log.image_url || undefined
            };
          }

          foodCounts[foodName].count++;
          foodCounts[foodName].total_quality += log.quality_score || 0;
          foodCounts[foodName].total_calories += log.calories || 0;
        });

        // Convert to TopFood array and sort by count
        const allFoods: TopFood[] = Object.entries(foodCounts)
          .map(([food_name, counts]) => ({
            food_name,
            count: counts.count,
            avg_quality_score: counts.total_quality / counts.count,
            total_calories: counts.total_calories,
            image_url: counts.image_url
          }))
          .sort((a, b) => b.count - a.count);

        // Split into healthy (quality score >= 70) and unhealthy (< 70)
        const healthy = allFoods
          .filter(food => food.avg_quality_score >= 70)
          .slice(0, 5);

        const unhealthy = allFoods
          .filter(food => food.avg_quality_score < 70)
          .slice(0, 5);

        setData({ healthy, unhealthy });
      } catch (err) {
        console.error('Error fetching top foods:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTopFoods();
  }, [user]);

  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Top Foods This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || (data.healthy.length === 0 && data.unhealthy.length === 0)) {
    // Mock data for demonstration
    const mockHealthy = [
      { food_name: 'Greek Yogurt with Berries', count: 5, avg_quality_score: 85, total_calories: 150 },
      { food_name: 'Grilled Chicken Salad', count: 4, avg_quality_score: 82, total_calories: 320 },
      { food_name: 'Quinoa Bowl', count: 3, avg_quality_score: 78, total_calories: 280 },
    ];

    const mockUnhealthy = [
      { food_name: 'Pizza Slice', count: 3, avg_quality_score: 45, total_calories: 450 },
      { food_name: 'Chocolate Chip Cookies', count: 2, avg_quality_score: 35, total_calories: 200 },
    ];

    return (
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Top Foods This Week
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your most frequently logged foods this week
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Healthy Foods */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Apple className="h-4 w-4 text-green-500" />
                <h3 className="text-sm font-semibold text-green-600 dark:text-green-400">
                  Healthy Choices
                </h3>
              </div>
              <div className="space-y-2">
                {mockHealthy.map((food, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {food.food_name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {food.total_calories} cal total
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                        {food.count}x
                      </Badge>
                      <span className="text-xs text-green-600 dark:text-green-400">
                        {food.avg_quality_score}/100
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Unhealthy Foods */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Watch These
                </h3>
              </div>
              <div className="space-y-2">
                {mockUnhealthy.map((food, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {food.food_name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {food.total_calories} cal total
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                        {food.count}x
                      </Badge>
                      <span className="text-xs text-red-600 dark:text-red-400">
                        {food.avg_quality_score}/100
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sample data - Start logging meals to see your real top foods
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          Top Foods This Week
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your most frequently logged foods this week
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Healthy Foods */}
          {data.healthy.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Apple className="h-4 w-4 text-green-500" />
                <h3 className="text-sm font-semibold text-green-600 dark:text-green-400">
                  Healthy Choices
                </h3>
              </div>
              <div className="space-y-2">
                {data.healthy.map((food, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {food.food_name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {Math.round(food.total_calories)} cal total
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                        {food.count}x
                      </Badge>
                      <span className="text-xs text-green-600 dark:text-green-400">
                        {Math.round(food.avg_quality_score)}/100
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unhealthy Foods */}
          {data.unhealthy.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Watch These
                </h3>
              </div>
              <div className="space-y-2">
                {data.unhealthy.map((food, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {food.food_name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {Math.round(food.total_calories)} cal total
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                        {food.count}x
                      </Badge>
                      <span className="text-xs text-red-600 dark:text-red-400">
                        {Math.round(food.avg_quality_score)}/100
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.healthy.length === 0 && data.unhealthy.length === 0 && (
            <div className="text-center py-8">
              <Crown className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400">
                No foods logged this week yet. Start tracking to see your top foods!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};