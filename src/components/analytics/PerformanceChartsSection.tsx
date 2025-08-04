import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { format, subDays, subWeeks } from 'date-fns';

interface PerformanceData {
  performance_score: number;
  total_sets_count: number;
  completed_sets_count: number;
  skipped_steps_count: number;
  difficulty_rating: string;
  created_at: string;
}

interface AdaptationData {
  adaptation_type: string;
  created_at: string;
}

export const PerformanceChartsSection = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [adaptationData, setAdaptationData] = useState<AdaptationData[]>([]);
  const [loading, setLoading] = useState(true);

  console.log("PerformanceChartsSection rendered");

  const fetchPerformanceData = useCallback(async () => {
    if (!user?.id) {
      console.warn('fetchPerformanceData: No user ID available');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      const startDate = viewMode === 'week' 
        ? subDays(new Date(), 7)
        : subWeeks(new Date(), 4);

      // Add timeout for mobile performance
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        // Fetch workout performance logs
        const { data: performanceLogs, error: perfError } = await supabase
          .from('workout_performance_logs')
          .select('performance_score, total_sets_count, completed_sets_count, skipped_steps_count, difficulty_rating, created_at')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true })
          .abortSignal(controller.signal);

        if (perfError) {
          console.error('Performance logs error:', perfError);
          throw perfError;
        }

        // Fetch workout adaptations
        const { data: adaptations, error: adaptError } = await supabase
          .from('workout_adaptations')
          .select('adaptation_type, created_at')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true })
          .abortSignal(controller.signal);

        clearTimeout(timeoutId);

        // Don't fail if adaptations fail - it's secondary data
        if (adaptError) {
          console.warn('Adaptations fetch failed:', adaptError);
        }

        setPerformanceData(performanceLogs || []);
        setAdaptationData(adaptations || []);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
      // Set empty arrays to prevent crashes
      setPerformanceData([]);
      setAdaptationData([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, viewMode]);

  useEffect(() => {
    if (user?.id) {
      fetchPerformanceData();
    }
  }, [user?.id, fetchPerformanceData]);

  // Chart 1: Performance Score Over Time
  const performanceScoreData = performanceData.map(item => ({
    date: format(new Date(item.created_at), 'MM/dd'),
    score: item.performance_score
  }));

  // Chart 2: Workout Completion Rate
  const completionRateData = performanceData.map(item => {
    const completionRate = item.total_sets_count > 0 
      ? (item.completed_sets_count / item.total_sets_count) * 100 
      : 0;
    
    let color = '#3b82f6'; // blue - just_right
    if (item.difficulty_rating === 'too_easy') color = '#22c55e'; // green
    if (item.difficulty_rating === 'too_hard') color = '#ef4444'; // red
    
    return {
      date: format(new Date(item.created_at), 'MM/dd'),
      completion: Math.round(completionRate),
      fill: color
    };
  });

  // Chart 3: Adaptation Types
  const adaptationCounts = adaptationData.reduce((acc, item) => {
    acc[item.adaptation_type] = (acc[item.adaptation_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const adaptationPieData = Object.entries(adaptationCounts).map(([type, count]) => {
    const labels = {
      increase_intensity: '🔥 Boosted',
      decrease_difficulty: '💤 Eased',
      adjust_rest: '⏱️ Tuned',
      maintain_current: '✅ Stable'
    };
    
    return {
      name: labels[type as keyof typeof labels] || '🧠 Adapted',
      value: count,
      type
    };
  });

  const COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];

  // Chart 4: Skipped Sets and Exercises
  const stackedData = performanceData.map(item => ({
    date: format(new Date(item.created_at), 'MM/dd'),
    completed: item.completed_sets_count,
    skipped: item.skipped_steps_count
  }));

  // Chart 5: Difficulty Feedback Over Time
  const difficultyData = performanceData.map(item => {
    const difficultyMap = { too_easy: 1, just_right: 2, too_hard: 3 };
    const emoji = { too_easy: '😴', just_right: '👌', too_hard: '😰' };
    
    return {
      date: format(new Date(item.created_at), 'MM/dd'),
      difficulty: difficultyMap[item.difficulty_rating as keyof typeof difficultyMap] || 2,
      emoji: emoji[item.difficulty_rating as keyof typeof emoji] || '🤔'
    };
  });

  const EmptyState = ({ title, description }: { title: string; description: string }) => (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl">📊</span>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );

  if (loading) {
    return (
      <Card className="w-full shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            📊 Your Progress Journey
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg bg-card dark:!border-2 dark:!border-cyan-500/60 dark:bg-gradient-to-r dark:from-cyan-500/20 dark:to-blue-500/20">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            📊 Your Progress Journey
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="transition-all duration-200"
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
              className="transition-all duration-200"
            >
              Month
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {performanceData.length === 0 ? (
          <EmptyState
            title="No Performance Data Yet"
            description="Complete some AI-generated workouts to see your progress charts here!"
          />
        ) : (
          <div className="space-y-6">
            {/* Performance Score Over Time */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Performance Score Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceScoreData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Workout Completion Rate */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Completion Rate by Difficulty</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={completionRateData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [`${value}%`, 'Completion Rate']}
                    />
                    <Bar dataKey="completion" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Too Easy</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Just Right</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Too Hard</span>
                </div>
              </div>
            </div>

            {/* Adaptation Types & Skipped Sets (2-column grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Adaptation Types Pie Chart */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">AI Adaptations</h3>
                {adaptationPieData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={adaptationPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {adaptationPieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No adaptations yet - keep training!
                  </div>
                )}
              </div>

              {/* Skipped vs Completed Stacked Bar */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Sets Completion</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stackedData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="completed" stackId="a" fill="hsl(var(--primary))" name="Completed" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="skipped" stackId="a" fill="hsl(var(--destructive))" name="Skipped" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Difficulty Feedback Over Time */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Difficulty Feedback Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={difficultyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis 
                      domain={[0.5, 3.5]} 
                      ticks={[1, 2, 3]}
                      tickFormatter={(value) => {
                        const labels = { 1: '😴 Easy', 2: '👌 Right', 3: '😰 Hard' };
                        return labels[value as keyof typeof labels] || '';
                      }}
                      stroke="hsl(var(--muted-foreground))" 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => {
                        const labels = { 1: 'Too Easy', 2: 'Just Right', 3: 'Too Hard' };
                        return [labels[value as keyof typeof labels], 'Difficulty'];
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="difficulty" 
                      stroke="hsl(var(--accent-foreground))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--accent-foreground))', strokeWidth: 2, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};