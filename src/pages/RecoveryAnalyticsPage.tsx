import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowLeft, TrendingUp, Clock, Award, Calendar, Filter, Sparkles, Brain, Wind, Zap, Moon, Flower2, RefreshCw } from "lucide-react";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, startOfWeek, endOfWeek, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const CATEGORY_META = {
  meditation: { 
    emoji: '🧠', 
    color: 'hsl(270 100% 45%)', 
    icon: Brain,
    label: 'Meditation',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    textColor: 'text-purple-700 dark:text-purple-300'
  },
  breathing: { 
    emoji: '🌬️', 
    color: 'hsl(210 100% 45%)', 
    icon: Wind,
    label: 'Breathing',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-300'
  },
  stretching: { 
    emoji: '🧘‍♂️', 
    color: 'hsl(150 100% 45%)', 
    icon: Zap,
    label: 'Stretching',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    textColor: 'text-green-700 dark:text-green-300'
  },
  'muscle-recovery': { 
    emoji: '🧪', 
    color: 'hsl(30 100% 45%)', 
    icon: Award,
    label: 'Muscle Recovery',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    textColor: 'text-orange-700 dark:text-orange-300'
  },
  sleep: { 
    emoji: '😴', 
    color: 'hsl(220 100% 45%)', 
    icon: Moon,
    label: 'Sleep Prep',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/20',
    textColor: 'text-indigo-700 dark:text-indigo-300'
  },
  yoga: { 
    emoji: '🧎‍♀️', 
    color: 'hsl(320 100% 45%)', 
    icon: Flower2,
    label: 'Yoga',
    bgColor: 'bg-pink-100 dark:bg-pink-900/20',
    textColor: 'text-pink-700 dark:text-pink-300'
  },
};

const RecoveryAnalyticsPage = () => {
  useScrollToTop();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeRange, setTimeRange] = useState<'7' | '30'>('7');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Fetch recovery session logs
  const { data: sessionLogs = [], isLoading } = useQuery({
    queryKey: ['recovery-session-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recovery_session_logs')
        .select('*')
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch session titles
  const { data: sessionData = [] } = useQuery({
    queryKey: ['meditation-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meditation_sessions')
        .select('id, title, category');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch meditation streaks for meditation category
  const { data: meditationStreak } = useQuery({
    queryKey: ['meditation-streak'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meditation_streaks')
        .select('current_streak')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data?.current_streak || 0;
    },
  });

  // Calculate weekly stats
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    
    const weekSessions = sessionLogs.filter(log => 
      isWithinInterval(new Date(log.completed_at), { start: weekStart, end: weekEnd })
    );
    
    const totalMinutes = weekSessions.reduce((sum, log) => sum + log.duration_minutes, 0);
    const sessionCount = weekSessions.length;
    
    // Most used category this week
    const categoryCount = weekSessions.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostUsedCategory = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'meditation';
    
    return {
      totalMinutes,
      sessionCount,
      mostUsedCategory,
      longestStreak: meditationStreak || 0
    };
  }, [sessionLogs, meditationStreak]);

  // Filter sessions based on selected category
  const filteredSessions = useMemo(() => {
    if (selectedCategory === 'all') return sessionLogs;
    return sessionLogs.filter(log => log.category === selectedCategory);
  }, [sessionLogs, selectedCategory]);

  // Prepare trend chart data
  const trendChartData = useMemo(() => {
    const days = parseInt(timeRange);
    const chartDays = Array.from({ length: days }, (_, i) => {
      const date = subDays(new Date(), days - 1 - i);
      return format(date, 'yyyy-MM-dd');
    });
    
    return chartDays.map(date => {
      const dayLogs = sessionLogs.filter(log => 
        format(new Date(log.completed_at), 'yyyy-MM-dd') === date
      );
      
      const totalMinutes = dayLogs.reduce((sum, log) => sum + log.duration_minutes, 0);
      
      return {
        date: format(new Date(date), days === 7 ? 'EEE' : 'MMM dd'),
        minutes: totalMinutes,
        fullDate: date
      };
    });
  }, [sessionLogs, timeRange]);

  // Prepare pie chart data
  const pieChartData = useMemo(() => {
    const categoryMinutes = sessionLogs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + log.duration_minutes;
      return acc;
    }, {} as Record<string, number>);
    
    const total = Object.values(categoryMinutes).reduce((sum, val) => sum + val, 0);
    
    return Object.entries(categoryMinutes).map(([category, minutes]) => ({
      category: CATEGORY_META[category as keyof typeof CATEGORY_META]?.label || category,
      minutes,
      percentage: total > 0 ? Math.round((minutes / total) * 100) : 0,
      fill: CATEGORY_META[category as keyof typeof CATEGORY_META]?.color || 'hsl(var(--primary))'
    })).sort((a, b) => b.minutes - a.minutes);
  }, [sessionLogs]);

  // Generate AI summary
  const { data: aiSummary, isLoading: isLoadingAI } = useQuery({
    queryKey: ['ai-recovery-summary', sessionLogs.length],
    queryFn: async () => {
      if (sessionLogs.length === 0) return null;
      
      setIsGeneratingAI(true);
      
      try {
        const response = await fetch('https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/generate-recovery-summary', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw`
          },
          body: JSON.stringify({
            weeklyStats,
            totalSessions: sessionLogs.length,
            categoryBreakdown: pieChartData,
            recentTrend: trendChartData.slice(-7)
          }),
        });
        
        if (!response.ok) throw new Error('Failed to generate summary');
        
        const data = await response.json();
        return data.summary;
      } catch (error) {
        console.error('Error generating AI summary:', error);
        return "Great progress on your recovery journey! Keep up the consistent practice to build lasting wellness habits.";
      } finally {
        setIsGeneratingAI(false);
      }
    },
    enabled: sessionLogs.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get category insights
  const categoryInsight = useMemo(() => {
    if (pieChartData.length === 0) return null;
    
    const top = pieChartData[0];
    const topCategory = Object.entries(CATEGORY_META).find(([key, meta]) => 
      meta.label === top.category
    )?.[1];
    
    const suggestions = [
      'breathing', 'stretching', 'muscle-recovery', 'sleep', 'yoga'
    ].filter(cat => !pieChartData.find(p => CATEGORY_META[cat as keyof typeof CATEGORY_META]?.label === p.category));
    
    const randomSuggestion = suggestions.length > 0 ? suggestions[Math.floor(Math.random() * suggestions.length)] : null;
    const suggestionMeta = randomSuggestion ? CATEGORY_META[randomSuggestion as keyof typeof CATEGORY_META] : null;
    
    return {
      topCategory,
      suggestion: suggestionMeta,
      percentage: top.percentage
    };
  }, [pieChartData]);

  const categoryOptions = [
    { value: 'all', label: 'All' },
    ...Object.entries(CATEGORY_META).map(([key, meta]) => ({
      value: key,
      label: meta.label
    }))
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-accent/50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
                Recovery Analytics
              </h1>
              <p className="text-sm text-muted-foreground">
                Premium insights into your wellness journey
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto space-y-6">
        {/* Tab Filters - Fixed for Mobile */}
        <div className="w-full">
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            {categoryOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedCategory(option.value)}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  selectedCategory === option.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats - Fixed Heights */}
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          <Card className="visible-card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800 h-[120px]">
            <CardContent className="p-4 h-full flex flex-col justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-blue-700 dark:text-blue-300">This Week</span>
              </div>
              <div className="flex flex-col items-center justify-center flex-1">
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {weeklyStats.totalMinutes}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">minutes</div>
              </div>
            </CardContent>
          </Card>

          <Card className="visible-card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800 h-[120px]">
            <CardContent className="p-4 h-full flex flex-col justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-700 dark:text-green-300">Sessions</span>
              </div>
              <div className="flex flex-col items-center justify-center flex-1">
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {weeklyStats.sessionCount}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">this week</div>
              </div>
            </CardContent>
          </Card>

          <Card className="visible-card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800 h-[120px]">
            <CardContent className="p-4 h-full flex flex-col justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm text-purple-700 dark:text-purple-300">Streak</span>
              </div>
              <div className="flex flex-col items-center justify-center flex-1">
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {weeklyStats.longestStreak}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400">days</div>
              </div>
            </CardContent>
          </Card>

          <Card className="visible-card bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800 h-[120px]">
            <CardContent className="p-4 h-full flex flex-col justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm text-orange-700 dark:text-orange-300">Most Used</span>
              </div>
              <div className="flex flex-col items-center justify-center flex-1">
                <div className="text-sm font-semibold text-orange-900 dark:text-orange-100 flex items-center gap-1">
                  {CATEGORY_META[weeklyStats.mostUsedCategory as keyof typeof CATEGORY_META]?.emoji}
                  <span className="truncate">
                    {CATEGORY_META[weeklyStats.mostUsedCategory as keyof typeof CATEGORY_META]?.label}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card className="visible-card dark:border-cyan-500/60 dark:border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recovery Trend
              </CardTitle>
              <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as '7' | '30')}>
                <TabsList className="grid w-24 grid-cols-2">
                  <TabsTrigger value="7">7D</TabsTrigger>
                  <TabsTrigger value="30">30D</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return `${payload[0].payload.fullDate}`;
                      }
                      return label;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="minutes" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="visible-card dark:border-purple-500/60 dark:border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-r from-primary to-secondary"></div>
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center">
              <ChartContainer config={{}} className="h-[250px] w-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      dataKey="minutes"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={2}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload[0]) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
                              <p className="font-medium">{data.category}</p>
                              <p className="text-sm text-muted-foreground">
                                {data.minutes} min ({data.percentage}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {categoryInsight && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20">
                <p className="text-sm text-foreground">
                  You've been focusing most on {categoryInsight.topCategory?.emoji} <strong>{categoryInsight.topCategory?.label}</strong> ({categoryInsight.percentage}% of time).
                  {categoryInsight.suggestion && (
                    <> Consider adding more {categoryInsight.suggestion.emoji} <strong>{categoryInsight.suggestion.label}</strong> for better balance.</>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Logs */}
        <Card className="visible-card dark:border-emerald-500/60 dark:border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Session History
              </CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-sm border border-border rounded px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary z-50 min-w-[140px]"
                  style={{ backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}
                >
                  {categoryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sessions found for the selected category
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {filteredSessions.slice(0, 20).map((log) => {
                  const category = log.category || 'meditation';
                  const categoryMeta = CATEGORY_META[category as keyof typeof CATEGORY_META];
                  const sessionTitle = sessionData.find(s => s.id === log.session_id)?.title || 'Recovery Session';
                  
                  return (
                    <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${categoryMeta?.bgColor}`}>
                          {categoryMeta?.emoji}
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{sessionTitle}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className={`${categoryMeta?.bgColor} ${categoryMeta?.textColor} border-0`}>
                              {categoryMeta?.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {log.duration_minutes} min
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        {format(new Date(log.completed_at), 'MMM dd')}
                        <br />
                        {format(new Date(log.completed_at), 'h:mm a')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Summary */}
        <Card className="visible-card border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 dark:border-blue-500/60 dark:border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              AI Wellness Insights
              {(isLoadingAI || isGeneratingAI) && <RefreshCw className="h-4 w-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAI || isGeneratingAI ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-background/50 border border-border/30">
                <p className="text-sm text-foreground leading-relaxed">
                  {aiSummary || "Complete more recovery sessions to unlock personalized AI insights about your wellness journey!"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Spacing */}
        <div className="h-20" />
      </div>
    </div>
  );
};

export default RecoveryAnalyticsPage;