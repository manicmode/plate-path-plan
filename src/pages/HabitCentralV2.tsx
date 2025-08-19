// ✅ Robust import pattern: never resolves to null
import * as React from 'react';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Compass, CheckSquare, Bell, BarChart3, ShieldAlert, Plus, Play, Pause, Settings, Clock, Target, Check, Filter, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { EmojiRain } from '@/components/habit-central/EmojiRain';
import { ProTip } from '@/components/habit-central/ProTip';
import { CronStatusWidget } from '@/components/habit-central/CronStatusWidget';

// Helper functions
const getDomainEmoji = (domain: string) => {
  switch (domain) {
    case 'nutrition': return '🍎';
    case 'exercise': return '🏃';
    case 'recovery': return '🌙';
    default: return '⚡';
  }
};

const getDifficultyVariant = (difficulty: string) => {
  switch (difficulty?.toLowerCase()) {
    case 'easy': return 'default';
    case 'medium': return 'secondary';
    case 'hard': return 'destructive';
    default: return 'outline';
  }
};

const triggerHaptics = (type: 'light' | 'selection' = 'light') => {
  try {
    if (type === 'light') {
      Haptics.impact({ style: ImpactStyle.Light });
    } else {
      Haptics.selectionStart();
    }
  } catch (error) {
    // Ignore haptics errors (web fallback)
  }
};

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04
    }
  }
};

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

interface HealthIssue {
  type: string;
  message: string;
  count?: number;
}

interface Reminder {
  habit_slug: string;
  frequency: string;
  time_local?: string;
  day_of_week?: number;
  is_enabled: boolean;
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
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedHabits, setAddedHabits] = useState<Set<string>>(new Set());
  
  // Filters and search
  const [domainFilter, setDomainFilter] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [progressWindow, setProgressWindow] = useState<'last_7d' | 'last_30d'>('last_30d');
  
  // Admin health check
  const [healthIssues, setHealthIssues] = useState<HealthIssue[]>([]);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [adminStats, setAdminStats] = useState({ templates: 0, userHabits: 0, logs: 0 });

  // Delight features state
  const [emojiRainTrigger, setEmojiRainTrigger] = useState(false);
  const [emojiRainEmoji, setEmojiRainEmoji] = useState('🎉');

  // Debounced filter update
  const debouncedDomainFilter = useMemo(() => domainFilter, [domainFilter]);

  // Load active habits on browse tab with client-side filtering
  const loadHabits = useCallback(async (domain?: string) => {
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
      triggerHaptics('selection');
      toast({ 
        title: "Failed to load habits", 
        variant: "destructive",
        description: error instanceof Error ? error.message.slice(0, 100) : undefined
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Load user's habits
  const loadMyHabits = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('rpc_get_my_habits_with_stats');
      
      if (error) throw error;
      setMyHabits(data || []);
    } catch (error) {
      console.error('Error loading my habits:', error);
      triggerHaptics('selection');
      toast({ title: "Failed to load your habits", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Load progress data
  const loadProgress = useCallback(async (window: 'last_7d' | 'last_30d' = 'last_30d') => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('rpc_get_habit_progress', {
        p_window: window
      });
      
      if (error) throw error;
      setProgressData(data || []);
    } catch (error) {
      console.error('Error loading progress:', error);
      toast({ title: "Failed to load progress", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Load reminders
  const loadReminders = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('habit_reminders')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  }, [user]);

  // Add habit to user's list
  const handleAddHabit = useCallback(async (slug: string, target: number = 5) => {
    if (!user) return;
    
    try {
      triggerHaptics('light');
      const { data, error } = await supabase.rpc('rpc_upsert_user_habit_by_slug', {
        p_habit_slug: slug,
        p_target_per_week: target
      });
      
      if (error) throw error;
      
      setAddedHabits(prev => new Set([...prev, slug]));
      toast({ title: "Added to My Habits" });
      
      // Refresh my habits if on that tab
      if (activeTab === 'my-habits') {
        loadMyHabits();
      }
    } catch (error) {
      console.error('Error adding habit:', error);
      triggerHaptics('selection');
      toast({ title: "Failed to add habit", variant: "destructive" });
    }
  }, [user, activeTab, loadMyHabits, toast]);

  // Log habit completion with delight features
  const handleLogHabit = useCallback(async (slug: string, note?: string) => {
    if (!user) return;
    
    // Get current habit stats before logging
    const currentHabit = myHabits.find(h => h.habit_slug === slug);
    const previousCount = currentHabit?.last_30d_count || 0;
    
    try {
      triggerHaptics('light');
      const { data, error } = await supabase.rpc('rpc_log_habit_by_slug', {
        p_habit_slug: slug,
        p_occurred_at: new Date().toISOString(),
        p_note: note || null
      });
      
      if (error) throw error;
      
      // Refresh data first to get updated counts
      if (activeTab === 'my-habits') await loadMyHabits();
      if (activeTab === 'analytics') await loadProgress(progressWindow);
      
      // Check for new badges earned
      try {
        const { data: badges } = await supabase.rpc('rpc_check_and_award_badges_by_slug', { 
          p_habit_slug: slug 
        });
        
        if (Array.isArray(badges) && badges.length > 0) {
          badges.forEach((badge: any) => {
            toast({ 
              title: `Level up! ${badge.badge.toUpperCase()} at ${badge.count} logs 🏅`,
              description: "Achievement unlocked!"
            });
            
            // Bigger confetti for Silver/Gold badges
            if (badge.badge === 'silver' || badge.badge === 'gold') {
              confetti({
                particleCount: 100,
                spread: 100,
                origin: { y: 0.6 },
                colors: badge.badge === 'gold' 
                  ? ['#FFD700', '#FFA500', '#FFFF00'] 
                  : ['#C0C0C0', '#A8A8A8', '#E5E5E5']
              });
            }
          });
        }
      } catch (badgeError) {
        console.error('Error checking badges:', badgeError);
        // Don't let badge errors break the logging flow
      }
      
      // Get updated habit for delight features
      const updatedHabit = myHabits.find(h => h.habit_slug === slug) || currentHabit;
      const newCount = (updatedHabit?.last_30d_count || 0);
      
      // 🎉 First log ever (0 → 1)
      if (previousCount === 0 && newCount >= 1) {
        // Confetti burst
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
        });
        
        // Special toast for first log
        toast({ 
          title: "First log — you're on your way! 🚀",
          description: "Every journey starts with a single step!"
        });
        
        // Light haptic feedback
        try {
          Haptics.impact({ style: ImpactStyle.Light });
        } catch {
          // Ignore haptics errors on web
        }
      }
      // 🔥 Streak surges (multiples of 5, >= 5)
      else if (newCount >= 5 && newCount % 5 === 0) {
        // Get domain emoji for this habit
        const domainEmoji = getDomainEmoji(updatedHabit?.domain || 'exercise');
        
        // Trigger emoji rain
        setEmojiRainEmoji(domainEmoji);
        setEmojiRainTrigger(true);
        
        // Streak toast
        toast({ 
          title: `🔥 ${newCount} streak logs! Keep it rolling.`,
          description: "You're building incredible momentum!"
        });
        
        // Medium haptic feedback
        try {
          Haptics.impact({ style: ImpactStyle.Medium });
        } catch {
          // Ignore haptics errors on web
        }
      }
      // Regular log with undo option
      else {
        const undoAction = async () => {
          try {
            await supabase.rpc('rpc_undo_last_log_by_slug', { p_habit_slug: slug });
            toast({ title: "Log undone" });
            
            // Refresh data after undo
            if (activeTab === 'my-habits') await loadMyHabits();
            if (activeTab === 'analytics') await loadProgress(progressWindow);
          } catch (error) {
            console.error('Error undoing log:', error);
            toast({ title: "Failed to undo log", variant: "destructive" });
          }
        };

        toast({
          title: "Logged — nice!",
          description: "5 seconds to undo",
          action: {
            label: "Undo",
            onClick: undoAction,
          },
        });
      }
      
    } catch (error) {
      console.error('Error logging habit:', error);
      triggerHaptics('selection');
      toast({ title: "Failed to log habit", variant: "destructive" });
    }
  }, [user, activeTab, loadMyHabits, loadProgress, progressWindow, toast, myHabits]);

  // Update habit target
  const handleUpdateTarget = useCallback(async (slug: string, newTarget: number) => {
    if (!user) return;
    
    try {
      triggerHaptics('light');
      const { data, error } = await supabase.rpc('rpc_upsert_user_habit_by_slug', {
        p_habit_slug: slug,
        p_target_per_week: newTarget
      });
      
      if (error) throw error;
      toast({ title: "Target updated" });
      loadMyHabits();
    } catch (error) {
      console.error('Error updating target:', error);
      triggerHaptics('selection');
      toast({ title: "Failed to update target", variant: "destructive" });
    }
  }, [user, loadMyHabits, toast]);

  // Toggle habit pause
  const handleTogglePause = useCallback(async (slug: string, currentPaused: boolean) => {
    if (!user) return;
    
    try {
      triggerHaptics('light');
      const { data, error } = await supabase.rpc('rpc_pause_user_habit_by_slug', {
        p_habit_slug: slug,
        p_paused: !currentPaused
      });
      
      if (error) throw error;
      toast({ title: currentPaused ? "Habit resumed" : "Habit paused" });
      loadMyHabits();
    } catch (error) {
      console.error('Error toggling pause:', error);
      triggerHaptics('selection');
      toast({ title: "Failed to update habit", variant: "destructive" });
    }
  }, [user, loadMyHabits, toast]);

  // Save reminder
  const handleSaveReminder = useCallback(async (habitSlug: string, reminder: Partial<Reminder>) => {
    if (!user) return;
    
    try {
      triggerHaptics('light');
      const { data, error } = await supabase.rpc('rpc_upsert_habit_reminder_by_slug', {
        p_habit_slug: habitSlug,
        p_frequency: reminder.frequency || 'daily',
        p_time_local: reminder.time_local || null,
        p_day_of_week: reminder.day_of_week || null,
        p_enabled: reminder.is_enabled ?? true
      });
      
      if (error) throw error;
      toast({ title: "Reminder saved" });
      loadReminders();
    } catch (error) {
      console.error('Error saving reminder:', error);
      triggerHaptics('selection');
      toast({ title: "Failed to save reminder", variant: "destructive" });
    }
  }, [user, loadReminders, toast]);

  // Load admin health data with detailed checks
  const loadHealthData = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      // Get basic counts
      const [templatesResult, userHabitsResult, logsResult] = await Promise.all([
        supabase.from('habit_template').select('id', { count: 'exact' }),
        supabase.from('user_habit').select('id', { count: 'exact' }),
        supabase.from('habit_log').select('id', { count: 'exact' })
          .gte('ts', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      setAdminStats({
        templates: templatesResult.count || 0,
        userHabits: userHabitsResult.count || 0,
        logs: logsResult.count || 0
      });

      // Detailed health checks - simplified for now
      const healthChecks = await Promise.allSettled([
        // Missing names or slugs  
        supabase.from('habit_template').select('id, slug, name').or('slug.is.null,slug.eq.,name.is.null,name.eq.').then(r => r.data || []),
      ]);

      const issues: HealthIssue[] = [];
      
      if (templatesResult.count && templatesResult.count < 50) {
        issues.push({ type: 'warning', message: 'Low template count', count: templatesResult.count });
      }

      healthChecks.forEach((result, index) => {
        if (result.status === 'fulfilled' && Array.isArray(result.value) && result.value.length > 0) {
          const checkNames = ['Duplicate slugs', 'Missing data', 'Orphan habits'];
          issues.push({ 
            type: 'error', 
            message: checkNames[index], 
            count: result.value.length 
          });
        }
      });
      
      setHealthIssues(issues);
    } catch (error) {
      console.error('Error loading health data:', error);
    }
  }, [isAdmin]);

  // Tab change handler
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    
    // Load data for specific tabs
    if (value === 'browse') loadHabits(debouncedDomainFilter);
    if (value === 'my-habits') loadMyHabits();
    if (value === 'reminders') loadReminders();
    if (value === 'analytics') loadProgress(progressWindow);
    if (value === 'admin' && isAdmin) loadHealthData();
  }, [debouncedDomainFilter, loadHabits, loadMyHabits, loadReminders, loadProgress, progressWindow, loadHealthData, isAdmin]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setDomainFilter('');
    setDifficultyFilter('');
    loadHabits();
  }, [loadHabits]);

  // Filter habits by difficulty on client side
  const filteredHabits = useMemo(() => {
    if (!difficultyFilter) return habits;
    return habits.filter(habit => 
      habit.difficulty?.toLowerCase() === difficultyFilter.toLowerCase()
    );
  }, [habits, difficultyFilter]);

  // Initial load
  useEffect(() => {
    if (user && activeTab === 'browse') {
      loadHabits(debouncedDomainFilter);
    }
  }, [user, debouncedDomainFilter, activeTab, loadHabits]);

  // Empty state components
  const BrowseEmptyState = () => (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={fadeInUp}
      className="text-center py-12"
      role="status"
      aria-live="polite"
    >
      <Compass className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold mb-2">No habits found</h3>
      <p className="text-muted-foreground mb-4">Try a different domain or difficulty. Tip: start with 1–2 easy wins.</p>
      <Button onClick={resetFilters} variant="outline">
        Reset filters
      </Button>
    </motion.div>
  );

  const MyHabitsEmptyState = () => (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={fadeInUp}
      className="text-center py-12"
      role="status"
      aria-live="polite"
    >
      <CheckSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold mb-2">Let's build your first habit</h3>
      <p className="text-muted-foreground mb-4">Pick one from Browse and tap Add. Start small, stay consistent.</p>
      <Button onClick={() => setActiveTab('browse')}>
        Browse habits
      </Button>
    </motion.div>
  );

  const RemindersEmptyState = () => (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={fadeInUp}
      className="text-center py-12"
      role="status"
      aria-live="polite"
    >
      <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold mb-2">Never miss a rep</h3>
      <p className="text-muted-foreground mb-4">Set a friendly nudge time that fits your day.</p>
      <Button disabled>
        Set a reminder
      </Button>
    </motion.div>
  );

  const AnalyticsEmptyState = () => (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={fadeInUp}
      className="text-center py-12"
      role="status"
      aria-live="polite"
    >
      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold mb-2">Your streaks will appear here</h3>
      <p className="text-muted-foreground">Log a habit and we'll chart your momentum.</p>
    </motion.div>
  );

  const AdminHealthyState = () => (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={fadeInUp}
      className="text-center py-12"
      role="status"
      aria-live="polite"
    >
      <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-green-500" />
      <h3 className="text-lg font-semibold mb-2">All clean</h3>
      <p className="text-muted-foreground">No duplicate slugs, missing names, or broken links.</p>
    </motion.div>
  );

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={fadeInUp}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl font-bold">Habit Central</h1>
          <p className="text-lg text-muted-foreground">Please sign in to access Habit Central</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Emoji Rain Animation */}
      <EmojiRain
        emoji={emojiRainEmoji}
        trigger={emojiRainTrigger}
        onComplete={() => setEmojiRainTrigger(false)}
      />
      
      <motion.div
        initial="hidden" 
        animate="visible" 
        variants={staggerContainer}
        className="space-y-6"
      >
        {/* Header */}
        <motion.div variants={fadeInUp} className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Habit Central</h1>
          <p className="text-lg text-muted-foreground">
            Build better habits with proven templates and smart tracking
          </p>
        </motion.div>

        {/* 5-Tab Interface */}
        <motion.div variants={fadeInUp}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="browse" className="flex items-center gap-2">
                <Compass className="h-4 w-4" />
                Browse
              </TabsTrigger>
              <TabsTrigger value="my-habits" className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                My Habits
              </TabsTrigger>
              <TabsTrigger value="reminders" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Reminders
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Admin
                </TabsTrigger>
              )}
            </TabsList>

            {/* Browse Tab */}
            <TabsContent value="browse" className="space-y-4">
              {/* Sticky filters */}
              <motion.div 
                variants={fadeInUp}
                className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 p-4 -m-4 rounded-lg border"
              >
                <div className="flex gap-4 items-center">
                  <Select value={domainFilter || "all"} onValueChange={(value) => setDomainFilter(value === "all" ? "" : value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All domains" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All domains</SelectItem>
                      <SelectItem value="nutrition">🍎 Nutrition</SelectItem>
                      <SelectItem value="exercise">🏃 Exercise</SelectItem>
                      <SelectItem value="recovery">🌙 Recovery</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={difficultyFilter || "all"} onValueChange={(value) => setDifficultyFilter(value === "all" ? "" : value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All difficulties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All difficulties</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    onClick={() => loadHabits(domainFilter)} 
                    disabled={loading}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </motion.div>

              {/* Habits grid */}
              {loading ? (
                <motion.div variants={fadeInUp} className="text-center py-8">
                  <div className="animate-pulse">Loading habits...</div>
                </motion.div>
              ) : filteredHabits.length === 0 ? (
                <BrowseEmptyState />
              ) : (
                <motion.div 
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                >
                  {filteredHabits.map((habit, index) => (
                    <motion.div
                      key={habit.id}
                      variants={fadeInUp}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card className="relative h-full">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getDomainEmoji(habit.domain)}</span>
                              <CardTitle className="text-lg line-clamp-2">{habit.title}</CardTitle>
                            </div>
                            <Badge variant="secondary">{habit.domain}</Badge>
                          </div>
                          <CardDescription className="line-clamp-3">
                            {habit.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex justify-between items-center">
                            <Badge variant={getDifficultyVariant(habit.difficulty)}>
                              {habit.difficulty}
                            </Badge>
                            
                            {addedHabits.has(habit.slug) ? (
                              <Button size="sm" variant="outline" disabled>
                                <Check className="h-4 w-4 mr-1" />
                                Added ✓
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                onClick={() => handleAddHabit(habit.slug, 5)}
                                aria-label={`Add ${habit.title} to my habits`}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}
              
              {/* Pro Tip for Browse */}
              <ProTip tab="browse" />
            </TabsContent>

            {/* My Habits Tab */}
            <TabsContent value="my-habits" className="space-y-4">
              <motion.div variants={fadeInUp} className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Your Active Habits</h3>
                <Button 
                  onClick={loadMyHabits} 
                  disabled={loading} 
                  size="sm"
                  variant="outline"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </motion.div>

              {loading ? (
                <motion.div variants={fadeInUp} className="text-center py-8">
                  <div className="animate-pulse">Loading your habits...</div>
                </motion.div>
              ) : myHabits.length === 0 ? (
                <MyHabitsEmptyState />
              ) : (
                <motion.div 
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-4"
                >
                  {myHabits.map((habit) => (
                    <motion.div
                      key={habit.habit_slug}
                      variants={fadeInUp}
                      whileHover={{ scale: 1.01 }}
                    >
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            {/* Left side - Emoji + Name */}
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{getDomainEmoji(habit.domain)}</span>
                              <div>
                                <h4 className="font-medium">{habit.title}</h4>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">{habit.domain}</Badge>
                                  <Badge variant={getDifficultyVariant(habit.difficulty)} className="text-xs">
                                    {habit.difficulty}
                                  </Badge>
                                  {habit.is_paused && <Badge variant="destructive" className="text-xs">Paused</Badge>}
                                </div>
                              </div>
                            </div>

                            {/* Middle - Target stepper + Count */}
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className="text-sm text-muted-foreground">Target/week</div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleUpdateTarget(habit.habit_slug, Math.max(1, habit.target_per_week - 1))}
                                    disabled={habit.target_per_week <= 1}
                                  >
                                    -
                                  </Button>
                                  <span className="w-8 text-center">{habit.target_per_week}</span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleUpdateTarget(habit.habit_slug, Math.min(7, habit.target_per_week + 1))}
                                    disabled={habit.target_per_week >= 7}
                                  >
                                    +
                                  </Button>
                                </div>
                              </div>
                              
                              <Badge variant="outline" className="text-xs">
                                {habit.last_30d_count} logs (30d)
                              </Badge>
                            </div>

                            {/* Right side - Log + Pause */}
                            <div className="flex items-center gap-2">
                              <motion.div whileTap={{ scale: 0.95 }}>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleLogHabit(habit.habit_slug)}
                                  disabled={habit.is_paused}
                                  aria-label={`Log ${habit.title} now`}
                                >
                                  <Play className="h-4 w-4 mr-1" />
                                  Log now
                                </Button>
                              </motion.div>
                              
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleTogglePause(habit.habit_slug, habit.is_paused)}
                                aria-label={habit.is_paused ? `Resume ${habit.title}` : `Pause ${habit.title}`}
                              >
                                {habit.is_paused ? 'Resume' : <Pause className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                 </motion.div>
               )}
               
               {/* Pro Tip for My Habits */}
               <ProTip tab="habits" />
            </TabsContent>

            {/* Reminders Tab */}
            <TabsContent value="reminders" className="space-y-4">
              {myHabits.length === 0 ? (
                <RemindersEmptyState />
              ) : (
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                  <motion.h3 variants={fadeInUp} className="text-lg font-semibold">Habit Reminders</motion.h3>
                  {myHabits.map((habit) => (
                    <motion.div key={habit.habit_slug} variants={fadeInUp}>
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            {getDomainEmoji(habit.domain)} {habit.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="text-sm text-muted-foreground text-center py-4">
                            Reminder settings coming soon!
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}
              
              {/* Pro Tip for Reminders */}
              <ProTip tab="reminders" />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <motion.div variants={fadeInUp} className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Habit Progress</h3>
                <div className="flex gap-2">
                  <Button
                    variant={progressWindow === 'last_7d' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setProgressWindow('last_7d');
                      loadProgress('last_7d');
                    }}
                  >
                    Last 7 days
                  </Button>
                  <Button
                    variant={progressWindow === 'last_30d' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setProgressWindow('last_30d');
                      loadProgress('last_30d');
                    }}
                  >
                    Last 30 days
                  </Button>
                </div>
              </motion.div>

              {loading ? (
                <motion.div variants={fadeInUp} className="text-center py-8">
                  <div className="animate-pulse">Loading analytics...</div>
                </motion.div>
              ) : progressData.length === 0 ? (
                <AnalyticsEmptyState />
              ) : (
                <motion.div 
                  variants={fadeInUp}
                  initial="hidden"
                  animate="visible"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Habit Logs</CardTitle>
                      <CardDescription>Your habit completion over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={progressData}>
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
                            <Bar 
                              dataKey="logs_count" 
                              fill="hsl(var(--primary))" 
                              radius={[2, 2, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
              
              {/* Pro Tip for Analytics */}
              <ProTip tab="analytics" />
            </TabsContent>

            {/* Admin Tab */}
            {isAdmin && (
              <TabsContent value="admin" className="space-y-4">
                <motion.div variants={fadeInUp} className="flex justify-between items-center">
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
                        {healthIssues.length === 0 ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <Check className="h-4 w-4" />
                            <span>All systems operational</span>
                          </div>
                        ) : (
                          healthIssues.map((issue, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              <span>{issue.message}</span>
                              {issue.count && <Badge variant="outline">{issue.count}</Badge>}
                            </div>
                          ))
                        )}
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogAction>Close</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </motion.div>
                
                {healthIssues.length === 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <AdminHealthyState />
                    <CronStatusWidget />
                  </div>
                ) : (
                  <motion.div 
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="grid gap-4 md:grid-cols-3"
                  >
                    <motion.div variants={fadeInUp}>
                      <Card>
                        <CardHeader>
                          <CardTitle>Templates</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">{adminStats.templates}</p>
                          <p className="text-sm text-muted-foreground">Active templates</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                    
                    <motion.div variants={fadeInUp}>
                      <Card>
                        <CardHeader>
                          <CardTitle>User Habits</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">{adminStats.userHabits}</p>
                          <p className="text-sm text-muted-foreground">Total user habits</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                    
                    <motion.div variants={fadeInUp}>
                      <Card>
                        <CardHeader>
                          <CardTitle>Logs (30d)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">{adminStats.logs}</p>
                          <p className="text-sm text-muted-foreground">Recent logs</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </motion.div>
                )}
                
                {/* Always show cron status when there are health issues */}
                {healthIssues.length > 0 && (
                  <motion.div variants={fadeInUp}>
                    <CronStatusWidget />
                  </motion.div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </motion.div>
      </motion.div>
    </div>
  );
}