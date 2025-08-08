
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Heart, Zap, Shield, AlertTriangle, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isValid } from 'date-fns';
import { DayDetailModal } from '@/components/analytics/DayDetailModal';

type ViewMode = 'daily' | '7day' | 'monthly';

interface MoodLogData {
  id: string;
  date: string;
  mood: number;
  energy: number;
  wellness: number;
  journal_text?: string;
  ai_detected_tags?: string[];
}

interface ChartDataPoint {
  date: string;
  dateObj: Date;
  mood: number;
  energy: number;
  wellness: number;
  hasPattern?: boolean;
  patternMessage?: string;
  formattedDate: string;
}

interface AIPattern {
  date: string;
  message: string;
  severity: 'warning' | 'info';
}

export const MoodWellnessTrendChart: React.FC<{ hideTitle?: boolean }> = ({ hideTitle = false }) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [moodLogs, setMoodLogs] = useState<MoodLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiPatterns, setAiPatterns] = useState<AIPattern[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showDayDetail, setShowDayDetail] = useState(false);

  // Stabilize the user ID dependency
  const userId = user?.id;

  const loadMoodData = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Calculate date range based on view mode
      let startDate: Date;
      const endDate = new Date();

      switch (viewMode) {
        case '7day':
          startDate = subDays(endDate, 7);
          break;
        case 'monthly':
          startDate = subDays(endDate, 30);
          break;
        default: // daily
          startDate = subDays(endDate, 14);
      }

      console.log('[MoodChart] Loading mood data for user:', userId, 'viewMode:', viewMode);

      const { data, error } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        console.error('Error loading mood data:', error);
        return;
      }

      console.log('[MoodChart] Loaded mood data:', data?.length || 0, 'entries');
      setMoodLogs(data || []);
      
      // Analyze patterns
      if (data && data.length > 0) {
        analyzePatterns(data);
      }
    } catch (error) {
      console.error('Error loading mood data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, viewMode]);

  useEffect(() => {
    if (userId) {
      loadMoodData();
    }
  }, [loadMoodData, userId]);

  const analyzePatterns = useCallback(async (logs: MoodLogData[]) => {
    const patterns: AIPattern[] = [];

    // Simple pattern detection
    for (let i = 1; i < logs.length; i++) {
      const current = logs[i];
      const previous = logs[i - 1];

      // Detect mood dips
      if (current.mood < previous.mood - 2 && current.mood < 5) {
        // Check for food correlations in journal text
        if (current.journal_text) {
          const text = current.journal_text.toLowerCase();
          let foodTrigger = '';
          
          if (text.includes('dairy') || text.includes('milk') || text.includes('cheese')) {
            foodTrigger = 'dairy';
          } else if (text.includes('gluten') || text.includes('bread') || text.includes('wheat')) {
            foodTrigger = 'gluten';
          } else if (text.includes('sugar') || text.includes('sweet')) {
            foodTrigger = 'sugar';
          }

          if (foodTrigger) {
            patterns.push({
              date: current.date,
              message: `You felt worse after eating ${foodTrigger}. Might be worth exploring.`,
              severity: 'warning'
            });
          }
        }

        // Check AI detected tags
        if (current.ai_detected_tags && current.ai_detected_tags.length > 0) {
          const negativeSymptoms = current.ai_detected_tags.filter(tag => 
            ['headache', 'bloating', 'fatigue', 'pain', 'stress', 'low_mood'].includes(tag)
          );
          
          if (negativeSymptoms.length > 0) {
            patterns.push({
              date: current.date,
              message: `Symptoms detected: ${negativeSymptoms.join(', ')}. Consider tracking triggers.`,
              severity: 'warning'
            });
          }
        }
      }

      // Detect positive patterns
      if (current.mood > previous.mood + 2 && current.energy > 7) {
        patterns.push({
          date: current.date,
          message: `Great mood and energy boost! Check what you did differently.`,
          severity: 'info'
        });
      }
    }

    setAiPatterns(patterns);
  }, []);

  const chartData = useMemo(() => {
    if (!moodLogs.length) return [];

    const processedData: ChartDataPoint[] = [];

    // Group data based on view mode
    if (viewMode === 'daily') {
      // Daily view - show individual days
      moodLogs.forEach(log => {
        const dateObj = new Date(log.date);
        const pattern = aiPatterns.find(p => p.date === log.date);
        
        processedData.push({
          date: log.date,
          dateObj,
          mood: log.mood,
          energy: log.energy,
          wellness: log.wellness,
          hasPattern: !!pattern,
          patternMessage: pattern?.message,
          formattedDate: format(dateObj, 'MMM dd')
        });
      });
    } else if (viewMode === '7day') {
      // 7-day average view
      const weeks = new Map<string, MoodLogData[]>();
      
      moodLogs.forEach(log => {
        const dateObj = new Date(log.date);
        const weekStart = startOfWeek(dateObj);
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        
        if (!weeks.has(weekKey)) {
          weeks.set(weekKey, []);
        }
        weeks.get(weekKey)!.push(log);
      });

      weeks.forEach((weekLogs, weekKey) => {
        const avgMood = weekLogs.reduce((sum, log) => sum + log.mood, 0) / weekLogs.length;
        const avgEnergy = weekLogs.reduce((sum, log) => sum + log.energy, 0) / weekLogs.length;
        const avgWellness = weekLogs.reduce((sum, log) => sum + log.wellness, 0) / weekLogs.length;
        
        const weekStart = new Date(weekKey);
        const weekEnd = endOfWeek(weekStart);
        
        processedData.push({
          date: weekKey,
          dateObj: weekStart,
          mood: Math.round(avgMood * 10) / 10,
          energy: Math.round(avgEnergy * 10) / 10,
          wellness: Math.round(avgWellness * 10) / 10,
          formattedDate: `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'dd')}`
        });
      });
    } else {
      // Monthly average view
      const months = new Map<string, MoodLogData[]>();
      
      moodLogs.forEach(log => {
        const dateObj = new Date(log.date);
        const monthStart = startOfMonth(dateObj);
        const monthKey = format(monthStart, 'yyyy-MM');
        
        if (!months.has(monthKey)) {
          months.set(monthKey, []);
        }
        months.get(monthKey)!.push(log);
      });

      months.forEach((monthLogs, monthKey) => {
        const avgMood = monthLogs.reduce((sum, log) => sum + log.mood, 0) / monthLogs.length;
        const avgEnergy = monthLogs.reduce((sum, log) => sum + log.energy, 0) / monthLogs.length;
        const avgWellness = monthLogs.reduce((sum, log) => sum + log.wellness, 0) / monthLogs.length;
        
        const monthStart = new Date(monthKey + '-01');
        
        processedData.push({
          date: monthKey,
          dateObj: monthStart,
          mood: Math.round(avgMood * 10) / 10,
          energy: Math.round(avgEnergy * 10) / 10,
          wellness: Math.round(avgWellness * 10) / 10,
          formattedDate: format(monthStart, 'MMM yyyy')
        });
      });
    }

    return processedData.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [moodLogs, viewMode, aiPatterns]);

  const handleChartClick = useCallback((data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const clickedData = data.activePayload[0].payload as ChartDataPoint;
      if (clickedData.date) {
        setSelectedDate(clickedData.date);
        setShowDayDetail(true);
      }
    }
  }, []);

  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint;
      
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
          <p className="font-semibold text-gray-900 dark:text-white">{data.formattedDate}</p>
          <div className="space-y-1 mt-2">
            <div className="flex items-center space-x-2">
              <Heart className="h-3 w-3 text-pink-500" />
              <span className="text-sm">Mood: {payload.find((p: any) => p.dataKey === 'mood')?.value}/10</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-3 w-3 text-yellow-500" />
              <span className="text-sm">Energy: {payload.find((p: any) => p.dataKey === 'energy')?.value}/10</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-3 w-3 text-green-500" />
              <span className="text-sm">Wellness: {payload.find((p: any) => p.dataKey === 'wellness')?.value}/10</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">👆 Tap to see details</p>
          {data.hasPattern && (
            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
              <div className="flex items-start space-x-1">
                <AlertTriangle className="h-3 w-3 text-amber-600 mt-0.5" />
                <span className="text-xs text-amber-800 dark:text-amber-200">{data.patternMessage}</span>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  }, []);

  const CustomDot = useCallback((props: any) => {
    const { cx, cy, payload } = props;
    if (payload?.hasPattern) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <circle 
                cx={cx} 
                cy={cy} 
                r={6} 
                fill="#F59E0B" 
                stroke="#FFFFFF" 
                strokeWidth={2}
              />
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium">Pattern Detected</p>
                  <p className="text-sm text-gray-600">{payload.patternMessage}</p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return null;
  }, []);

  if (loading) {
    return (
      <Card className="animate-slide-up glass-card border-0 rounded-3xl">
{!hideTitle && (
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <span>Mood & Wellness Trends</span>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-gray-500">Loading mood data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card className="animate-slide-up glass-card border-0 rounded-3xl">
{!hideTitle && (
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <span>Mood & Wellness Trends</span>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="h-80 flex flex-col items-center justify-center text-center space-y-4">
            <div className="text-gray-400 text-4xl">🌙</div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">No check-ins yet. Log your first mood today.</p>
              <p className="text-sm text-gray-500 mt-1">Track your daily mood, energy, and wellness to see trends over time</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up glass-card border-0 rounded-3xl">
      <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {!hideTitle && (
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <span>Mood & Wellness Trends</span>
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Track your emotional and physical wellbeing over time
                </p>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
                <SelectTrigger className="w-32 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="7day">7-Day Avg</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

        {/* Patterns Alert */}
        {aiPatterns.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {aiPatterns.length} pattern{aiPatterns.length > 1 ? 's' : ''} detected
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Look for ⚠️ icons on the chart for insights
                </p>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={chartData} 
              margin={{ 
                top: 20, 
                right: isMobile ? 10 : 30, 
                left: isMobile ? 10 : 20, 
                bottom: 5 
              }}
              onClick={handleChartClick}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="formattedDate" 
                fontSize={isMobile ? 9 : 12}
                tick={{ fill: 'currentColor' }}
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? 'end' : 'middle'}
                height={isMobile ? 60 : 30}
                interval={isMobile ? 1 : 0}
              />
              <YAxis 
                domain={[1, 10]} 
                fontSize={isMobile ? 9 : 12}
                tick={{ fill: 'currentColor' }}
                width={isMobile ? 25 : 60}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend 
                fontSize={isMobile ? 10 : 12}
                wrapperStyle={{ paddingTop: '10px' }}
              />
              
              <Line
                type="monotone"
                dataKey="mood"
                stroke="#EC4899"
                strokeWidth={isMobile ? 1.5 : 2}
                dot={{ fill: '#EC4899', strokeWidth: 2, r: isMobile ? 3 : 4, cursor: 'pointer' }}
                name="Mood"
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="energy"
                stroke="#F59E0B"
                strokeWidth={isMobile ? 1.5 : 2}
                dot={{ fill: '#F59E0B', strokeWidth: 2, r: isMobile ? 3 : 4, cursor: 'pointer' }}
                name="Energy"
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="wellness"
                stroke="#10B981"
                strokeWidth={isMobile ? 1.5 : 2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: isMobile ? 3 : 4, cursor: 'pointer' }}
                name="Wellness"
                connectNulls={false}
              />
              
              {/* Pattern indicators - using scatter plot for warning icons */}
              {viewMode === 'daily' && chartData.some(point => point.hasPattern) && (
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="transparent"
                  strokeWidth={0}
                  dot={(props: any) => {
                    const { payload } = props;
                    return payload?.hasPattern ? <CustomDot {...props} /> : null;
                  }}
                  name=""
                  connectNulls={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Legend */}
        <div className="flex flex-wrap items-center justify-center space-x-6 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-pink-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Mood</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Energy</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Wellness</span>
          </div>
          {viewMode === 'daily' && (
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Pattern Alert</span>
            </div>
          )}
        </div>
      </CardContent>

      {/* Day Detail Modal */}
      <DayDetailModal
        isOpen={showDayDetail}
        onClose={() => setShowDayDetail(false)}
        selectedDate={selectedDate}
        onEditMeal={(mealId) => {
          console.log('Edit meal:', mealId);
        }}
        onViewDay={(date) => {
          console.log('View full day:', date);
          setShowDayDetail(false);
        }}
      />
    </Card>
  );
};
