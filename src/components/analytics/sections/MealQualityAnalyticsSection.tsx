import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Award, TrendingUp, Filter, ArrowUpDown, Calendar, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MealQualityLog {
  id: string;
  food_name: string;
  calories: number;
  quality_score: number;
  quality_verdict: 'Excellent' | 'Good' | 'Moderate' | 'Poor';
  quality_reasons: string[];
  processing_level: 'whole' | 'minimally_processed' | 'processed' | 'ultra_processed';
  created_at: string;
}

interface MealQualityAnalyticsSectionProps {
  className?: string;
}

export const MealQualityAnalyticsSection: React.FC<MealQualityAnalyticsSectionProps> = ({ className }) => {
  const { user } = useAuth();
  const [meals, setMeals] = useState<MealQualityLog[]>([]);
  const [filteredMeals, setFilteredMeals] = useState<MealQualityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [weeklyAverage, setWeeklyAverage] = useState<number>(0);
  const [trendData, setTrendData] = useState<any[]>([]);

  // Fetch meal quality data
  useEffect(() => {
    const fetchMealQualityData = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        // Get last 30 days of nutrition logs with quality data
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
          .from('nutrition_logs')
          .select('id, food_name, calories, quality_score, quality_verdict, quality_reasons, processing_level, created_at')
          .eq('user_id', user.id)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .not('quality_score', 'is', null)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching meal quality data:', error);
          return;
        }

        setMeals((data || []) as MealQualityLog[]);
        
        // Calculate weekly average
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const weeklyMeals = data?.filter(meal => new Date(meal.created_at) >= lastWeek) || [];
        const average = weeklyMeals.length > 0 
          ? weeklyMeals.reduce((sum, meal) => sum + (meal.quality_score || 0), 0) / weeklyMeals.length 
          : 0;
        setWeeklyAverage(Math.round(average));

        // Generate trend data for the last 7 days
        const trendData = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayMeals = data?.filter(meal => {
            const mealDate = new Date(meal.created_at);
            return mealDate.toDateString() === date.toDateString();
          }) || [];
          
          const dayAverage = dayMeals.length > 0 
            ? dayMeals.reduce((sum, meal) => sum + (meal.quality_score || 0), 0) / dayMeals.length 
            : null;
          
          trendData.push({
            date: format(date, 'MMM dd'),
            average: dayAverage ? Math.round(dayAverage) : null,
            count: dayMeals.length
          });
        }
        setTrendData(trendData);

      } catch (error) {
        console.error('Error fetching meal quality data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMealQualityData();
  }, [user?.id]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...meals];

    // Apply quality filter
    if (qualityFilter !== 'all') {
      filtered = filtered.filter(meal => meal.quality_verdict?.toLowerCase() === qualityFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const scoreA = a.quality_score || 0;
      const scoreB = b.quality_score || 0;
      return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
    });

    setFilteredMeals(filtered);
  }, [meals, qualityFilter, sortOrder]);

  const getQualityBadgeColor = (verdict: string) => {
    switch (verdict) {
      case 'Excellent': return 'bg-green-500 text-white';
      case 'Good': return 'bg-blue-500 text-white';
      case 'Moderate': return 'bg-yellow-500 text-white';
      case 'Poor': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getProcessingLevelColor = (level: string) => {
    switch (level) {
      case 'whole': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'minimally_processed': return 'bg-green-50 text-green-700 dark:bg-green-900/10 dark:text-green-400';
      case 'processed': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'ultra_processed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getProcessingLevelLabel = (level: string) => {
    switch (level) {
      case 'whole': return 'Whole Food';
      case 'minimally_processed': return 'Minimally Processed';
      case 'processed': return 'Processed';
      case 'ultra_processed': return 'Ultra-Processed';
      default: return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Meal Quality Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Meal Quality Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{meals.length}</div>
            <div className="text-sm text-purple-700 dark:text-purple-300">Total Meals</div>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{weeklyAverage}</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">Weekly Avg</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {meals.filter(m => m.quality_verdict === 'Excellent').length}
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">Excellent</div>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {meals.filter(m => m.quality_verdict === 'Poor').length}
            </div>
            <div className="text-sm text-red-700 dark:text-red-300">Poor</div>
          </div>
        </div>

        {/* Weekly Trend Chart */}
        {trendData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              7-Day Quality Trend
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value, name) => [
                    value ? `${value}/100` : 'No meals',
                    'Avg Quality Score'
                  ]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="average" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Filters and Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <Select value={qualityFilter} onValueChange={setQualityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Meals</SelectItem>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-2"
          >
            <ArrowUpDown className="h-4 w-4" />
            Score {sortOrder === 'desc' ? '(High to Low)' : '(Low to High)'}
          </Button>
        </div>

        {/* Meal History List */}
        <ScrollArea className="h-[400px] w-full">
          <div className="space-y-3">
            {filteredMeals.length > 0 ? (
              filteredMeals.map((meal) => (
                <div key={meal.id} className="p-4 border rounded-lg bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {meal.food_name}
                        </h4>
                        <div className="text-xl font-bold text-purple-600">
                          {meal.quality_score}/100
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge className={getQualityBadgeColor(meal.quality_verdict)}>
                          {meal.quality_verdict}
                        </Badge>
                        {meal.processing_level && (
                          <Badge variant="outline" className={getProcessingLevelColor(meal.processing_level)}>
                            {getProcessingLevelLabel(meal.processing_level)}
                          </Badge>
                        )}
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {meal.calories} kcal
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(meal.created_at), 'MMM dd, yyyy')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(meal.created_at), 'h:mm a')}
                        </div>
                      </div>

                      {meal.quality_reasons && meal.quality_reasons.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Key factors:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {meal.quality_reasons.slice(0, 3).map((reason, index) => (
                              <span 
                                key={index}
                                className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300"
                              >
                                {reason}
                              </span>
                            ))}
                            {meal.quality_reasons.length > 3 && (
                              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300">
                                +{meal.quality_reasons.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {qualityFilter === 'all' 
                  ? 'No meals with quality scores found. Start logging meals to see quality analytics!'
                  : `No ${qualityFilter} quality meals found. Try changing the filter.`
                }
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};