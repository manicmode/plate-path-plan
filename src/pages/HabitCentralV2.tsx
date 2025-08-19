import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Play, Settings, BarChart3, Shield, AlertTriangle, Clock, Target, Pause } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// Types for our data
interface HabitTemplate {
  id: string;
  slug: string;
  title: string;
  description: string;
  domain: 'nutrition' | 'exercise' | 'recovery';
  difficulty: string;
  category: string;
}

interface UserHabit {
  habit_slug: string;
  title: string;
  domain: 'nutrition' | 'exercise' | 'recovery';
  difficulty: string;
  target_per_week: number;
  is_paused: boolean;
  last_30d_count: number;
}

interface ProgressData {
  day: string;
  logs_count: number;
}

export default function HabitCentralV2() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();
  
  // Tab and data state
  const [activeTab, setActiveTab] = useState('browse');
  const [habits, setHabits] = useState<HabitTemplate[]>([]);
  const [myHabits, setMyHabits] = useState<UserHabit[]>([]);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filters and search
  const [domainFilter, setDomainFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Admin health check
  const [healthIssues, setHealthIssues] = useState<any[]>([]);
  const [showHealthModal, setShowHealthModal] = useState(false);

  // Load active habits on browse tab
  const loadHabits = async (domain?: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const domainParam = domain && ['nutrition', 'exercise', 'recovery'].includes(domain) 
        ? domain as 'nutrition' | 'exercise' | 'recovery' 
        : null;
      
      const { data, error } = await supabase.rpc('rpc_list_active_habits', {
        p_domain: domainParam
      });
      
      if (error) throw error;
      setHabits(data || []);
    } catch (error) {
      console.error('Error loading habits:', error);
      toast({ title: "Failed to load habits", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Load user's habits
  const loadMyHabits = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('rpc_get_my_habits_with_stats');
      
      if (error) throw error;
      setMyHabits(data || []);
    } catch (error) {
      console.error('Error loading my habits:', error);
      toast({ title: "Failed to load your habits", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Load progress data
  const loadProgress = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('rpc_get_habit_progress', {
        p_window: 'last_30d'
      });
      
      if (error) throw error;
      setProgressData(data || []);
    } catch (error) {
      console.error('Error loading progress:', error);
      toast({ title: "Failed to load progress", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Add habit to user's list
  const handleAddHabit = async (slug: string, target: number) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('rpc_upsert_user_habit_by_slug', {
        p_habit_slug: slug,
        p_target_per_week: target
      });
      
      if (error) throw error;
      toast({ title: "Habit added successfully!" });
      
      // Refresh my habits if on that tab
      if (activeTab === 'my-habits') {
        loadMyHabits();
      }
    } catch (error) {
      console.error('Error adding habit:', error);
      toast({ title: "Failed to add habit", variant: "destructive" });
    }
  };

  // Log habit completion
  const handleLogHabit = async (slug: string, note?: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('rpc_log_habit_by_slug', {
        p_habit_slug: slug,
        p_occurred_at: new Date().toISOString(),
        p_note: note || null
      });
      
      if (error) throw error;
      toast({ title: "Habit logged successfully!" });
      
      // Refresh data
      if (activeTab === 'my-habits') loadMyHabits();
      if (activeTab === 'analytics') loadProgress();
    } catch (error) {
      console.error('Error logging habit:', error);
      toast({ title: "Failed to log habit", variant: "destructive" });
    }
  };

  // Update habit target or pause state
  const handleUpdateHabit = async (slug: string, updates: { target_per_week?: number; is_paused?: boolean }) => {
    if (!user) return;
    
    try {
      // Get current habit data first, then update
      const currentHabit = myHabits.find(h => h.habit_slug === slug);
      if (!currentHabit) return;
      
      const { data, error } = await supabase.rpc('rpc_upsert_user_habit_by_slug', {
        p_habit_slug: slug,
        p_target_per_week: updates.target_per_week ?? currentHabit.target_per_week
      });
      
      if (error) throw error;
      toast({ title: "Habit updated successfully!" });
      loadMyHabits();
    } catch (error) {
      console.error('Error updating habit:', error);
      toast({ title: "Failed to update habit", variant: "destructive" });
    }
  };

  // Load admin health data
  const loadHealthData = async () => {
    if (!isAdmin) return;
    
    try {
      // Simple health checks
      const { data: templateCount, error: e1 } = await supabase
        .from('habit_template')
        .select('id', { count: 'exact' });
      
      const { data: userHabitCount, error: e2 } = await supabase
        .from('user_habit')
        .select('id', { count: 'exact' });
        
      const { data: logCount, error: e3 } = await supabase
        .from('habit_log')
        .select('id', { count: 'exact' });
      
      if (e1 || e2 || e3) throw e1 || e2 || e3;
      
      const issues = [];
      if ((templateCount?.length || 0) < 10) {
        issues.push({ type: 'warning', message: 'Low template count' });
      }
      
      setHealthIssues(issues);
    } catch (error) {
      console.error('Error loading health data:', error);
    }
  };

  // Tab change handler
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Load data for specific tabs
    if (value === 'browse') loadHabits(domainFilter);
    if (value === 'my-habits') loadMyHabits();
    if (value === 'analytics') loadProgress();
    if (value === 'admin' && isAdmin) loadHealthData();
  };

  // Initial load
  useEffect(() => {
    if (user && activeTab === 'browse') {
      loadHabits(domainFilter);
    }
  }, [user, domainFilter]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Habit Central</h1>
          <p className="text-lg text-muted-foreground">Please sign in to access Habit Central</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Habit Central</h1>
          <p className="text-lg text-muted-foreground">
            Build better habits with proven templates and smart tracking
          </p>
        </div>

        {/* 5-Tab Interface */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="my-habits" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              My Habits
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Reminders
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="space-y-4">
            <div className="flex gap-4 items-center">
              <Select value={domainFilter} onValueChange={setDomainFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All domains" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All domains</SelectItem>
                  <SelectItem value="nutrition">Nutrition</SelectItem>
                  <SelectItem value="exercise">Exercise</SelectItem>
                  <SelectItem value="recovery">Recovery</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => loadHabits(domainFilter)} disabled={loading}>
                Refresh
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                <div className="col-span-full text-center py-8">Loading habits...</div>
              ) : (
                habits.map((habit) => (
                  <Card key={habit.id} className="relative">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{habit.title}</CardTitle>
                        <Badge variant="secondary">{habit.domain}</Badge>
                      </div>
                      <CardDescription className="line-clamp-3">
                        {habit.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <Badge variant="outline">{habit.difficulty}</Badge>
                        <Button 
                          size="sm" 
                          onClick={() => handleAddHabit(habit.slug, 5)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* My Habits Tab */}
          <TabsContent value="my-habits" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Your Active Habits</h3>
              <Button onClick={loadMyHabits} disabled={loading} size="sm">
                Refresh
              </Button>
            </div>

            <div className="grid gap-4">
              {loading ? (
                <div className="text-center py-8">Loading your habits...</div>
              ) : myHabits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No habits yet. Browse habits to get started!
                </div>
              ) : (
                myHabits.map((habit) => (
                  <Card key={habit.habit_slug}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{habit.title}</CardTitle>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary">{habit.domain}</Badge>
                            <Badge variant="outline">{habit.difficulty}</Badge>
                            {habit.is_paused && <Badge variant="destructive">Paused</Badge>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            {habit.last_30d_count} logs (30d)
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Target: {habit.target_per_week}/week
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleLogHabit(habit.habit_slug)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Log Now
                        </Button>
                        <Input 
                          placeholder="Target/week"
                          type="number"
                          min="1"
                          max="7"
                          defaultValue={habit.target_per_week}
                          className="w-24"
                          onBlur={(e) => {
                            const newTarget = parseInt(e.target.value);
                            if (newTarget !== habit.target_per_week && newTarget >= 1 && newTarget <= 7) {
                              handleUpdateHabit(habit.habit_slug, { target_per_week: newTarget });
                            }
                          }}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUpdateHabit(habit.habit_slug, { is_paused: !habit.is_paused })}
                        >
                          {habit.is_paused ? 'Resume' : <Pause className="h-4 w-4" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Reminders Tab */}
          <TabsContent value="reminders" className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-8 w-8 mx-auto mb-2" />
              <p>Reminder management coming soon!</p>
              <p className="text-sm">Set up daily and weekly reminders for your habits.</p>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Habit Progress (Last 30 Days)</h3>
              <Button onClick={loadProgress} disabled={loading} size="sm">
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">Loading analytics...</div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Daily Habit Logs</CardTitle>
                  <CardDescription>Your habit completion over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={progressData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="day" 
                          tickFormatter={(date) => new Date(date).getDate().toString()}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(date) => new Date(date).toLocaleDateString()}
                          formatter={(value) => [`${value} logs`, 'Completions']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="logs_count" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Admin Tab */}
          {isAdmin && (
            <TabsContent value="admin" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">System Health</h3>
                <AlertDialog open={showHealthModal} onOpenChange={setShowHealthModal}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Health Check
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>System Health Report</AlertDialogTitle>
                      <AlertDialogDescription>
                        {healthIssues.length === 0 ? (
                          "All systems operational"
                        ) : (
                          `Found ${healthIssues.length} issues`
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                      {healthIssues.map((issue, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span>{issue.message}</span>
                        </div>
                      ))}
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogAction>Close</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Templates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{habits.length}</p>
                    <p className="text-sm text-muted-foreground">Active templates</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Active Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{myHabits.length}</p>
                    <p className="text-sm text-muted-foreground">User habits</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>RPCs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">6</p>
                    <p className="text-sm text-muted-foreground">Available functions</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}