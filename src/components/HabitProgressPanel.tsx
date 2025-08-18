import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { Calendar, TrendingUp, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface WeeklyProgress {
  user_id: string;
  slug: string;
  period_start: string;
  completions: number;
  minutes: number;
}

interface MonthlyProgress {
  user_id: string;
  slug: string;
  period_start: string;
  completions: number;
  minutes: number;
}

interface HabitProgressPanelProps {}

export function HabitProgressPanel({}: HabitProgressPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [habitNames, setHabitNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const fetchProgressData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch active habits first
        const { data: activeHabits, error: habitsError } = await supabase
          .from('user_habit')
          .select('slug')
          .eq('status', 'active');

        if (habitsError) throw habitsError;

        if (!activeHabits || activeHabits.length === 0) {
          setHasData(false);
          setLoading(false);
          return;
        }

        const activeSlugs = activeHabits.map(h => h.slug);

        // Fetch habit names for display
        const { data: templates, error: templatesError } = await supabase
          .from('habit_templates')
          .select('slug, name')
          .in('slug', activeSlugs);

        if (templatesError) throw templatesError;

        const namesMap = (templates || []).reduce((acc, template) => {
          acc[template.slug] = template.name;
          return acc;
        }, {} as Record<string, string>);

        setHabitNames(namesMap);

        // Fetch weekly progress (current week)
        const { data: weeklyProgress, error: weeklyError } = await supabase
          .from('vw_habit_progress_week')
          .select('*')
          .eq('user_id', user.id)
          .in('slug', activeSlugs)
          .gte('period_start', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        if (weeklyError) throw weeklyError;

        // Process weekly data for chart
        const weeklyChartData = (weeklyProgress || []).map((item: WeeklyProgress) => ({
          name: (namesMap[item.slug] || item.slug).slice(0, 12) + 
                (namesMap[item.slug]?.length > 12 ? '...' : ''),
          fullName: namesMap[item.slug] || item.slug,
          completions: item.completions || 0,
          minutes: Math.round(item.minutes || 0)
        }));

        setWeeklyData(weeklyChartData);

        // Fetch monthly progress (last 3 months)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const { data: monthlyProgress, error: monthlyError } = await supabase
          .from('vw_habit_progress_month')
          .select('*')
          .eq('user_id', user.id)
          .in('slug', activeSlugs)
          .gte('period_start', threeMonthsAgo.toISOString().split('T')[0]);

        if (monthlyError) throw monthlyError;

        // Process monthly data by month
        const monthlyMap = new Map<string, any>();
        
        (monthlyProgress || []).forEach((item: MonthlyProgress) => {
          const monthKey = new Date(item.period_start).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short' 
          });
          
          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, { month: monthKey, total: 0 });
          }
          
          const monthData = monthlyMap.get(monthKey);
          monthData.total += item.completions || 0;
          monthData[item.slug] = item.completions || 0;
        });

        const monthlyChartData = Array.from(monthlyMap.values()).sort((a, b) => 
          new Date(a.month + ' 1, 2020').getTime() - new Date(b.month + ' 1, 2020').getTime()
        );

        setMonthlyData(monthlyChartData);
        setHasData(weeklyChartData.length > 0 || monthlyChartData.length > 0);

      } catch (error) {
        console.error('Error fetching progress data:', error);
        toast({
          title: "Couldn't load progress",
          description: "Please retry.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProgressData();
  }, [user, toast]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <motion.div 
        className="text-center py-12"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">🟡</span>
        </div>
        <h3 className="text-lg font-medium mb-2">Your first check-in will light up this chart</h3>
        <p className="text-muted-foreground">
          Start logging your habits to see beautiful progress visualizations here.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Your progress</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Weekly Progress */}
        {weeklyData.length > 0 && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  This Week
                </CardTitle>
                <p className="text-sm text-muted-foreground">Completions by habit (this week)</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value, name) => [value, name === 'completions' ? 'Completions' : 'Minutes']}
                      labelFormatter={(label, payload) => {
                        const data = payload?.[0]?.payload;
                        return `Habit: ${data?.fullName || label}`;
                      }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="completions" fill="hsl(var(--primary))" name="completions" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Monthly Progress */}
        {monthlyData.length > 0 && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Last 3 Months
                </CardTitle>
                <p className="text-sm text-muted-foreground">Completions (last 3 months)</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value) => [value, 'Total Completions']}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" name="total" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}