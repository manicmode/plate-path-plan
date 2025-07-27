import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer } from 'recharts';
import { ArrowLeft, TrendingUp, Clock, Award, Calendar, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, startOfMonth, endOfMonth, subDays, isWithinInterval } from 'date-fns';

const CATEGORY_META = {
  meditation: { emoji: '🧠', color: 'hsl(var(--primary))' },
  breathing: { emoji: '🌬️', color: 'hsl(210 100% 45%)' },
  stretching: { emoji: '🧘‍♂️', color: 'hsl(270 100% 45%)' },
  'muscle-recovery': { emoji: '🧪', color: 'hsl(30 100% 45%)' },
  sleep: { emoji: '😴', color: 'hsl(220 100% 45%)' },
  yoga: { emoji: '🧎‍♀️', color: 'hsl(320 100% 45%)' },
};

const RecoveryAnalytics = () => {
  useScrollToTop();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedTab, setSelectedTab] = useState('all');
  const [showInsights, setShowInsights] = useState(false);

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

  // Fetch session titles separately
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

  // Filter sessions based on selected tab
  const filteredSessions = useMemo(() => {
    if (selectedTab === 'all') return sessionLogs;
    
    const categoryMap = {
      'breathing': 'breathing',
      'stretching': 'stretching', 
      'muscle-recovery': 'muscle-recovery',
      'sleep': 'sleep',
      'yoga': 'yoga'
    };
    
    return sessionLogs.filter(log => log.category === categoryMap[selectedTab]);
  }, [sessionLogs, selectedTab]);

  // Calculate summary stats for current month
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const thisMonthSessions = sessionLogs.filter(log => 
      isWithinInterval(new Date(log.completed_at), { start: monthStart, end: monthEnd })
    );
    
    const totalMinutes = thisMonthSessions.reduce((sum, log) => sum + log.duration_minutes, 0);
    
    // Most frequent category
    const categoryCount = thisMonthSessions.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostFrequentCategory = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'meditation';
    
    const longestSession = Math.max(...thisMonthSessions.map(log => log.duration_minutes), 0);
    
    // Active days this month
    const activeDays = new Set(
      thisMonthSessions.map(log => format(new Date(log.completed_at), 'yyyy-MM-dd'))
    ).size;
    
    return {
      totalMinutes,
      mostFrequentCategory,
      longestSession,
      activeDays
    };
  }, [sessionLogs]);

  // Prepare chart data
  const categoryChartData = useMemo(() => {
    const categoryCount = filteredSessions.reduce((acc, log) => {
      const category = log.category || 'meditation';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categoryCount).map(([category, count]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' '),
      sessions: count,
      fill: CATEGORY_META[category as keyof typeof CATEGORY_META]?.color || 'hsl(var(--primary))'
    }));
  }, [filteredSessions]);

  // Daily activity chart data (last 14 days)
  const dailyChartData = useMemo(() => {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), 13 - i);
      return format(date, 'yyyy-MM-dd');
    });
    
    return last14Days.map(date => {
      const dayLogs = sessionLogs.filter(log => 
        format(new Date(log.completed_at), 'yyyy-MM-dd') === date
      );
      
      const totalMinutes = dayLogs.reduce((sum, log) => sum + log.duration_minutes, 0);
      
      return {
        date: format(new Date(date), 'MMM dd'),
        minutes: totalMinutes
      };
    });
  }, [sessionLogs]);

  // AI-generated suggestions
  const suggestions = useMemo(() => {
    const suggestions: string[] = [];
    
    // Check for consistency patterns
    const last7Days = sessionLogs.filter(log => 
      isWithinInterval(new Date(log.completed_at), { 
        start: subDays(new Date(), 7), 
        end: new Date() 
      })
    );
    
    const categoryCount = last7Days.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Most active category
    const mostActiveCategory = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (mostActiveCategory && mostActiveCategory[1] >= 3) {
      const [category, count] = mostActiveCategory;
      const emoji = CATEGORY_META[category as keyof typeof CATEGORY_META]?.emoji || '✨';
      suggestions.push(`${emoji} You've been consistent with ${category.replace('-', ' ')} exercises! Keep up the great momentum.`);
    }
    
    // Check for missing categories
    const allCategories = ['breathing', 'stretching', 'muscle-recovery', 'sleep', 'yoga'];
    const missingCategories = allCategories.filter(cat => !categoryCount[cat]);
    
    if (missingCategories.length > 0) {
      const randomMissing = missingCategories[Math.floor(Math.random() * missingCategories.length)];
      const emoji = CATEGORY_META[randomMissing as keyof typeof CATEGORY_META]?.emoji || '💡';
      suggestions.push(`${emoji} Try adding a ${randomMissing.replace('-', ' ')} session to round out your recovery routine.`);
    }
    
    // Activity level feedback
    if (monthlyStats.activeDays >= 15) {
      suggestions.push("🔥 Incredible dedication! You're on track for an amazing month of recovery.");
    } else if (monthlyStats.activeDays >= 8) {
      suggestions.push("⭐ Great consistency! A few more sessions could make this your best month yet.");
    } else if (monthlyStats.activeDays >= 3) {
      suggestions.push("🌱 Nice start! Building a daily recovery habit will compound your wellness gains.");
    }
    
    return suggestions.slice(0, 2); // Show max 2 suggestions
  }, [sessionLogs, monthlyStats.activeDays]);

  const tabOptions = [
    { value: 'all', label: 'All' },
    { value: 'breathing', label: 'Breathing' },
    { value: 'stretching', label: 'Stretching' },
    { value: 'muscle-recovery', label: 'Muscle Recovery' },
    { value: 'sleep', label: 'Sleep Prep' },
    { value: 'yoga', label: 'Yoga' }
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
                Recovery Progress & Insights
              </h1>
              <p className="text-sm text-muted-foreground">
                Track your wellness journey
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto space-y-6">
        {/* Tab Filters */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-6">
            {tabOptions.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-xs sm:text-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Summary Stats */}
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          <Card className="visible-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">This Month</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {monthlyStats.totalMinutes}
              </div>
              <div className="text-xs text-muted-foreground">minutes logged</div>
            </CardContent>
          </Card>

          <Card className="visible-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Top Category</span>
              </div>
              <div className="text-lg font-semibold text-foreground flex items-center gap-1">
                {CATEGORY_META[monthlyStats.mostFrequentCategory as keyof typeof CATEGORY_META]?.emoji}
                {monthlyStats.mostFrequentCategory.replace('-', ' ')}
              </div>
            </CardContent>
          </Card>

          <Card className="visible-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Longest</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {monthlyStats.longestSession}
              </div>
              <div className="text-xs text-muted-foreground">minutes</div>
            </CardContent>
          </Card>

          <Card className="visible-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">Active Days</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {monthlyStats.activeDays}
              </div>
              <div className="text-xs text-muted-foreground">this month</div>
            </CardContent>
          </Card>
        </div>

        {/* Insights & Charts Section */}
        <Card className="visible-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Insights & Charts
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInsights(!showInsights)}
                className="hover:bg-accent/50"
              >
                {showInsights ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          
          {showInsights && (
            <CardContent className="space-y-6">
              {/* Category Distribution Chart */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Sessions by Category</h3>
                <ChartContainer
                  config={{}}
                  className="h-[200px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              {/* Daily Activity Chart */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Daily Minutes (Last 14 Days)</h3>
                <ChartContainer
                  config={{}}
                  className="h-[200px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="minutes" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          )}
        </Card>

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <Card className="visible-card border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                Personalized Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-background/50 border border-border/30"
                >
                  <p className="text-sm text-foreground">{suggestion}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Session Log Cards */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Recent Sessions</h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="visible-card animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <Card className="visible-card">
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground mb-2">No sessions found</div>
                <p className="text-sm text-muted-foreground">
                  Start your recovery journey by completing some sessions!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((log) => {
                const category = log.category || 'meditation';
                const categoryMeta = CATEGORY_META[category as keyof typeof CATEGORY_META];
                
                return (
                  <Card key={log.id} className="visible-card hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">
                              {sessionData.find(s => s.id === log.session_id)?.title || 'Recovery Session'}
                            </h3>
                            {log.is_favorite && (
                              <Sparkles className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-muted border border-border/30">
                              {categoryMeta?.emoji}
                              {category.replace('-', ' ')}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {log.duration_minutes} min
                            </span>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(log.completed_at), 'MMM dd, yyyy • h:mm a')}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Spacing */}
        <div className="h-20" />
      </div>
    </div>
  );
};

export default RecoveryAnalytics;