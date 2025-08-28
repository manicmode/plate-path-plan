// ✅ Robust import pattern: never resolves to null
import * as React from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Compass, CheckSquare, Bell, BarChart3, ShieldAlert, Plus, Play, Pause, Settings, Clock, Target, Check, Filter, RefreshCw, AlertTriangle, Search, MoreHorizontal, Trash2, CheckCircle, Sparkles, ArrowLeft } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { EmojiRain } from '@/components/habit-central/EmojiRain';
import { ProTip } from '@/components/habit-central/ProTip';
import { ThemedDomainSection } from '@/components/habit-central/ThemedDomainSection';
import { HabitInfoModal } from '@/components/habit-central/HabitInfoModal';
import { HabitAddModal, HabitConfig } from '@/components/habit-central/HabitAddModal';
import type { HabitTemplate as ImportedHabitTemplate } from '@/components/habit-central/CarouselHabitCard';
const CronStatusWidget = React.lazy(() => import('@/components/habit-central/CronStatusWidget'));
const CreateDiscoverContent = React.lazy(() => import('@/pages/CreateDiscover'));

// Helper functions
const getDomainEmoji = (domain: string) => {
  switch (domain) {
    case 'nutrition': return '🍎';
    case 'exercise': return '🏃';
    case 'recovery': return '🌙';
    case 'lifestyle': return '⚡';
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

const formatStartedTime = (createdAt: string) => {
  try {
    const date = parseISO(createdAt);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.warn('Failed to format timestamp:', error);
    // Fallback to short ISO format
    return createdAt.split('T')[0]; // Just the date part
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
type HabitTemplate = ImportedHabitTemplate;

interface UserHabit {
  habit_slug: string;
  title: string;
  domain: 'nutrition' | 'exercise' | 'recovery' | 'lifestyle';
  difficulty: string;
  target_per_week: number;
  is_paused: boolean;
  last_30d_count: number;
  created_at: string;
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
  const { user, ready } = useSupabaseAuth();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Tab and data state
  const [activeTab, setActiveTab] = useState('browse');
  const [habits, setHabits] = useState<HabitTemplate[]>([]);
  const [myHabits, setMyHabits] = useState<UserHabit[]>([]);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedHabits, setAddedHabits] = useState<Set<string>>(new Set());
  
  // Filters and search with proper sentinels
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [progressWindow, setProgressWindow] = useState<'last_7d' | 'last_30d'>('last_30d');
  
  // Admin health check
  const [healthIssues, setHealthIssues] = useState<HealthIssue[]>([]);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [adminStats, setAdminStats] = useState({ templates: 0, userHabits: 0, logs: 0 });

  // Delight features state
  const [emojiRainTrigger, setEmojiRainTrigger] = useState(false);
  const [emojiRainEmoji, setEmojiRainEmoji] = useState('🎉');
  
  // Modal state
  const [selectedHabitForInfo, setSelectedHabitForInfo] = useState<ImportedHabitTemplate | null>(null);
  const [selectedHabitForAdd, setSelectedHabitForAdd] = useState<ImportedHabitTemplate | null>(null);
  const [isAddingHabit, setIsAddingHabit] = useState(false);

  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
  const [purgeLogsOnDelete, setPurgeLogsOnDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Back navigation logic - track entry point and provide proper back navigation
  const getEntryPoint = useCallback(() => {
    // Check session storage first (highest priority)
    const sessionEntry = sessionStorage.getItem('habitCentralEntryPoint');
    if (sessionEntry) return sessionEntry;
    
    // Check navigation state
    const stateEntry = location.state?.from;
    if (stateEntry) return stateEntry;
    
    // Default fallback
    return '/explore';
  }, [location.state]);

  const handleBackNavigation = useCallback(() => {
    const entryPoint = getEntryPoint();
    navigate(entryPoint, { replace: true });
  }, [navigate, getEntryPoint]);

  // Daily lock state for logged habits
  const [loggedToday, setLoggedToday] = useState<Set<string>>(new Set());
  const [isLogging, setIsLogging] = useState<Set<string>>(new Set());

  // Debounced filter update
  const debouncedDomainFilter = useMemo(() => domainFilter, [domainFilter]);

  // Daily lock utilities
  const todayKey = useCallback((slug: string) => 
    `vh:logged:${slug}:${new Date().toISOString().slice(0,10)}`, []);

  const isLoggedTodayLocal = useCallback((slug: string) => 
    localStorage.getItem(todayKey(slug)) === '1', [todayKey]);

  const markLoggedTodayLocal = useCallback((slug: string) => 
    localStorage.setItem(todayKey(slug), '1'), [todayKey]);

  // Auto-reset at midnight
  const useMidnightTick = useCallback((onMidnight: () => void) => {
    useEffect(() => {
      let d = new Date().toDateString();
      const id = setInterval(() => {
        const now = new Date().toDateString();
        if (now !== d) { 
          d = now; 
          onMidnight(); 
        }
      }, 60_000);
      return () => clearInterval(id);
    }, [onMidnight]);
  }, []);

  // Reset logged state at midnight
  useMidnightTick(() => {
    setLoggedToday(new Set());
  });

  // Initialize logged state from localStorage
  useEffect(() => {
    if (myHabits.length > 0) {
      const newLoggedToday = new Set<string>();
      myHabits.forEach(habit => {
        if (isLoggedTodayLocal(habit.habit_slug)) {
          newLoggedToday.add(habit.habit_slug);
        }
      });
      setLoggedToday(newLoggedToday);
    }
  }, [myHabits, isLoggedTodayLocal]);

  // Load active habits - templates are public, no auth needed
  const loadHabits = useCallback(async (domainUi?: string) => {
    setLoading(true);
    try {
      type HabitDomain = 'nutrition' | 'exercise' | 'recovery' | 'lifestyle';
      const p_domain: HabitDomain | null = 
        !domainUi || domainUi === 'all' ? null : (domainUi as HabitDomain);
      
      const { data, error } = await supabase.rpc('rpc_list_active_habits', {
        p_domain
      });
      
      if (error) {
        console.error('rpc_list_active_habits error:', error);
        setHabits([]);
        return;
      }
      setHabits(data ?? []);
    } catch (error) {
      console.error('Error loading habits:', error);
      triggerHaptics('selection');
      toast({ 
        title: "Failed to load habits", 
        variant: "destructive",
        description: error instanceof Error ? error.message.slice(0, 100) : undefined
      });
      setHabits([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load user's habits
  const loadMyHabits = useCallback(async () => {
    if (!ready) { 
      console.log('[MyHabits] auth not ready'); 
      return; 
    }
    if (!user) { 
      console.warn('[MyHabits] no user; show sign-in nudge'); 
      return; 
    }
    
    console.log('[MyHabits] load start');
    setLoading(true);
    try {
      console.log('[MyHabits] query filters: calling rpc_get_my_habits_with_stats()');
      const { data, error } = await supabase.rpc('rpc_get_my_habits_with_stats');
      
      console.log('[MyHabits] load result', { error, count: data?.length, sample: data?.[0] });
      if (error) throw error;
      setMyHabits(data || []);
    } catch (error) {
      console.error('Error loading my habits:', error);
      triggerHaptics('selection');
      toast({ title: "Failed to load your habits", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [ready, user, toast]);

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
    if (!ready) { 
      console.log('[Add] auth not ready'); 
      return; 
    }
    if (!user) { 
      console.warn('[Add] no user; show sign-in nudge'); 
      return; 
    }
    
    try {
      triggerHaptics('light');
      console.log('[Add] user', { userId: user.id });
      console.log('[Add] calling rpc_upsert_user_habit_by_slug with:', { p_habit_slug: slug, p_target_per_week: target });
      const { data, error } = await supabase.rpc('rpc_upsert_user_habit_by_slug', {
        p_habit_slug: slug,
        p_target_per_week: target
      });
      
      console.log('[Add] upsert_user_habit result', { error, data });
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
  }, [ready, user, activeTab, loadMyHabits, toast]);

  // Log habit completion with daily lock and delight features
  const handleLogHabit = useCallback(async (slug: string, note?: string) => {
    if (!ready || !user) {
      toast({
        title: "Please sign in",
        description: "Sign in to log your habits",
        variant: "destructive"
      });
      return;
    }

    // Check if already logged today
    if (loggedToday.has(slug)) {
      return;
    }

    // Check if currently logging (debounce)
    if (isLogging.has(slug)) {
      return;
    }

    // Get current habit stats before logging
    const currentHabit = myHabits.find(h => h.habit_slug === slug);
    const previousCount = currentHabit?.last_30d_count || 0;
    
    // Optimistically update UI
    setIsLogging(prev => new Set([...prev, slug]));
    setLoggedToday(prev => new Set([...prev, slug]));
    
    // Optimistically increment count in UI
    setMyHabits(prev => prev.map(h => 
      h.habit_slug === slug 
        ? { ...h, last_30d_count: h.last_30d_count + 1 }
        : h
    ));
    
    try {
      triggerHaptics('light');
      const { data, error } = await supabase.rpc('rpc_log_habit_by_slug', {
        p_habit_slug: slug,
        p_occurred_at: new Date().toISOString(),
        p_note: note || null
      });
      
      if (error) {
        if (error.message?.includes('permission denied')) {
          toast({
            title: "Please sign in",
            description: "Sign in to log your habits",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        // Revert optimistic updates
        setLoggedToday(prev => {
          const newSet = new Set(prev);
          newSet.delete(slug);
          return newSet;
        });
        setMyHabits(prev => prev.map(h => 
          h.habit_slug === slug 
            ? { ...h, last_30d_count: Math.max(0, h.last_30d_count - 1) }
            : h
        ));
        return;
      }
      
      // Persist the logged state
      markLoggedTodayLocal(slug);
      
      // Refresh data to get accurate counts
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
            
            // Reset logged state for today
            setLoggedToday(prev => {
              const newSet = new Set(prev);
              newSet.delete(slug);
              return newSet;
            });
            
            // Clear localStorage
            localStorage.removeItem(todayKey(slug));
            
            // Refresh data after undo
            if (activeTab === 'my-habits') await loadMyHabits();
            if (activeTab === 'analytics') await loadProgress(progressWindow);
          } catch (error) {
            console.error('Error undoing log:', error);
            toast({ title: "Failed to undo log", variant: "destructive" });
          }
        };

        toast({
          title: "Logged ✓",
          description: "5 seconds to undo",
          action: <ToastAction altText="Undo" onClick={undoAction}>Undo</ToastAction>,
          duration: 5000,
        });
      }
      
    } catch (error) {
      console.error('Error logging habit:', error);
      triggerHaptics('selection');
      
      // Revert optimistic updates on error
      setLoggedToday(prev => {
        const newSet = new Set(prev);
        newSet.delete(slug);
        return newSet;
      });
      setMyHabits(prev => prev.map(h => 
        h.habit_slug === slug 
          ? { ...h, last_30d_count: Math.max(0, h.last_30d_count - 1) }
          : h
      ));
      
      toast({ title: "Failed to log habit", variant: "destructive" });
    } finally {
      // Remove from logging set
      setIsLogging(prev => {
        const newSet = new Set(prev);
        newSet.delete(slug);
        return newSet;
      });
    }
  }, [ready, user, loggedToday, isLogging, myHabits, activeTab, loadMyHabits, loadProgress, progressWindow, toast, markLoggedTodayLocal, todayKey]);

  // Update habit target
  const handleUpdateTarget = useCallback(async (slug: string, newTarget: number) => {
    if (!ready || !user) return;
    
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
  }, [ready, user, loadMyHabits, toast]);

  // Toggle habit pause
  const handleTogglePause = useCallback(async (slug: string, currentPaused: boolean) => {
    if (!ready || !user) return;
    
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
  }, [ready, user, loadMyHabits, toast]);

  // Delete a single habit
  const handleDeleteHabit = useCallback(async (slug: string, purgeLogsChecked: boolean) => {
    if (!ready || !user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to delete habits",
        variant: "destructive"
      });
      return;
    }

    setIsDeleting(true);
    try {
      triggerHaptics('light');
      console.log('[Delete] Calling rpc_delete_user_habit with:', { p_slug: slug, p_purge_logs: purgeLogsChecked });
      
      const { error } = await supabase.rpc('rpc_delete_user_habit', {
        p_slug: slug,
        p_purge_logs: purgeLogsChecked
      });

      if (error) {
        if (error.message?.includes('permission denied')) {
          throw new Error('Authentication required. Please sign in again.');
        }
        throw error;
      }

      // Optimistically remove from UI
      setMyHabits(prev => prev.filter(h => h.habit_slug !== slug));
      
      // Refresh data to ensure accuracy
      await loadMyHabits();
      
      toast({ 
        title: "Deleted",
        description: purgeLogsChecked ? "Habit and logs removed" : "Habit removed (logs kept)"
      });
    } catch (error) {
      console.error('Error deleting habit:', error);
      triggerHaptics('selection');
      
      // Revert optimistic update on error
      await loadMyHabits();
      
      toast({ 
        title: "Failed to delete habit", 
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive" 
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setHabitToDelete(null);
      setPurgeLogsOnDelete(false);
    }
  }, [ready, user, loadMyHabits, toast]);

  // Delete all paused habits
  const handleDeleteAllPaused = useCallback(async (purgeLogsChecked: boolean) => {
    if (!ready || !user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to delete habits",
        variant: "destructive"
      });
      return;
    }

    const pausedCount = myHabits.filter(h => h.is_paused).length;
    if (pausedCount === 0) {
      toast({ title: "No paused habits to delete" });
      return;
    }

    setIsDeleting(true);
    try {
      triggerHaptics('light');
      console.log('[BulkDelete] Calling rpc_delete_all_paused_user_habits with:', { p_purge_logs: purgeLogsChecked });
      
      const { data, error } = await supabase.rpc('rpc_delete_all_paused_user_habits', {
        p_purge_logs: purgeLogsChecked
      });

      if (error) {
        if (error.message?.includes('permission denied')) {
          throw new Error('Authentication required. Please sign in again.');
        }
        throw error;
      }

      const deletedCount = data || 0;
      
      // Refresh data to get updated list
      await loadMyHabits();
      
      toast({ 
        title: `Removed ${deletedCount} paused habits`,
        description: purgeLogsChecked ? "Habits and logs removed" : "Habits removed (logs kept)"
      });
    } catch (error) {
      console.error('Error deleting paused habits:', error);
      triggerHaptics('selection');
      
      toast({ 
        title: "Failed to delete paused habits", 
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive" 
      });
    } finally {
      setIsDeleting(false);
      setShowBulkDeleteDialog(false);
      setPurgeLogsOnDelete(false);
    }
  }, [ready, user, myHabits, loadMyHabits, toast]);

  // Save reminder
  const handleSaveReminder = useCallback(async (habitSlug: string, reminder: Partial<Reminder>) => {
    if (!ready || !user) return;
    
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
  }, [ready, user, loadReminders, toast]);

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
      toast({ title: "Failed to load health data", variant: "destructive" });
    }
  }, [isAdmin, toast]);

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

  // 🎯 Load data on mount + dependencies
  useEffect(() => {
    if (ready && user) {
      handleTabChange(activeTab);
    }
  }, [ready, user, handleTabChange, activeTab]);

  // Realtime subscription for user habits
  useEffect(() => {
    if (!ready || !user) return;
    
    const ch = supabase
      .channel('user-habit-live')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_habit',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        console.log('[Realtime user_habit]', payload);
        // Refetch habits when changes occur
        if (activeTab === 'my-habits') {
          loadMyHabits();
        }
      })
      .subscribe();
    
    return () => { 
      supabase.removeChannel(ch); 
    };
  }, [ready, user?.id, activeTab, loadMyHabits]);

  // Update added habits from user's current habits
  useEffect(() => {
    const userHabitSlugs = new Set(myHabits.map(h => h.habit_slug));
    setAddedHabits(userHabitSlugs);
  }, [myHabits]);

  // Empty states
  const MyHabitsEmptyState = () => (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={fadeInUp}
      className="text-center py-12"
      role="status"
      aria-live="polite"
    >
      <Card className="max-w-md mx-auto border-dashed border-2">
        <CardContent className="p-8">
          <CheckSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Start your habit journey</h3>
          <p className="text-muted-foreground mb-6">
            Build lasting habits that improve your life. Track progress, set reminders, and achieve your goals.
          </p>
          <Button 
            onClick={() => setActiveTab('browse')} 
            size="lg"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Browse Habits
          </Button>
        </CardContent>
      </Card>
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
      <h3 className="text-lg font-semibold mb-2">No habits to remind</h3>
      <p className="text-muted-foreground">Add some habits to set up reminders.</p>
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
      <div className="mx-auto w-full max-w-screen-lg px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-24">
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={fadeInUp}
          className="text-center space-y-4"
        >
          <h1 className="text-2xl font-bold md:text-4xl">Habit Central</h1>
          <p className="text-sm text-muted-foreground md:text-lg">Please sign in to access Habit Central</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Aurora background effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-cyan-500/5 blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-2/3 right-1/4 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-1/3 left-1/3 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      {/* Tabs wrapper for the entire component */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Header with centered title and tabs */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="mx-auto w-full max-w-screen-lg px-4 sm:px-6 md:px-8">
            <div className="py-6 space-y-4">
              {/* Header with back button and centered title */}
              <div className="relative flex items-center justify-center">
                {/* Back button - positioned absolutely to not affect center alignment */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackNavigation}
                  className="absolute left-0 h-10 w-10 p-0 hover:bg-muted/80"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="sr-only">Back</span>
                </Button>
                
                {/* Centered Title */}
                <div className="text-center">
                  <motion.h1 
                    className="text-3xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    Habit Central
                  </motion.h1>
                  <motion.p 
                    className="text-muted-foreground mt-2"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    Science-backed habits for better health
                  </motion.p>
                </div>
              </div>
              
              {/* Tabs in sticky header */}
              <div className="w-full">
                <TabsList className="grid w-full h-12 bg-muted/30 backdrop-blur-sm grid-cols-4">
                  <TabsTrigger value="browse" className="text-xs sm:text-sm">
                    <Search className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Browse</span>
                  </TabsTrigger>
                  <TabsTrigger value="my-habits" className="text-xs sm:text-sm">
                    <CheckSquare className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">My Habits</span>
                  </TabsTrigger>
                  <TabsTrigger value="create" className="text-xs sm:text-sm">
                    <Sparkles className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Create</span>
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="text-xs sm:text-sm">
                    <BarChart3 className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Progress</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
          </div>
        </div>

        {/* Emoji Rain Animation */}
        <EmojiRain
          emoji={emojiRainEmoji}
          trigger={emojiRainTrigger}
          onComplete={() => setEmojiRainTrigger(false)}
        />

        {/* Main container */}
        <div className="relative z-10 mx-auto w-full max-w-screen-lg px-4 sm:px-6 md:px-8 pb-[calc(84px+env(safe-area-inset-bottom))]">
          <motion.div
            initial="hidden" 
            animate="visible" 
            variants={staggerContainer}
            className="space-y-8 pt-8"
          >
            {/* Browse Tab Content */}
            <TabsContent value="browse" className="space-y-12">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="space-y-12"
              >
                {/* Nutrition Section */}
                <motion.div variants={fadeInUp} className="space-y-6">
                  {/* Section Title Outside Window */}
                  <div className="flex items-center space-x-4">
                    <div className="text-5xl">🍎</div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Nutrition Habits</h2>
                      <p className="text-muted-foreground">Fuel your body with smart nutrition choices</p>
                    </div>
                  </div>
                  <div className="h-px bg-gradient-to-r from-emerald-500/50 via-emerald-300/30 to-transparent" />
                  
                  <ThemedDomainSection
                    domain="nutrition"
                    title="Nutrition Habits"
                    subtitle="Fuel your body with smart nutrition choices"
                    emoji="🍎"
                    addedHabits={addedHabits}
                    onInfo={setSelectedHabitForInfo}
                    onAdd={setSelectedHabitForAdd}
                    hideHeader={true}
                  />
                </motion.div>

                {/* Exercise Section */}
                <motion.div variants={fadeInUp} className="space-y-6">
                  {/* Section Title Outside Window */}
                  <div className="flex items-center space-x-4">
                    <div className="text-5xl">💪</div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Exercise Habits</h2>
                      <p className="text-muted-foreground">Build strength and endurance with movement</p>
                    </div>
                  </div>
                  <div className="h-px bg-gradient-to-r from-orange-500/50 via-orange-300/30 to-transparent" />
                  
                  <ThemedDomainSection
                    domain="exercise"
                    title="Exercise Habits"
                    subtitle="Build strength and endurance with movement"
                    emoji="💪"
                    addedHabits={addedHabits}
                    onInfo={setSelectedHabitForInfo}
                    onAdd={setSelectedHabitForAdd}
                    hideHeader={true}
                  />
                </motion.div>

                {/* Recovery Section */}
                <motion.div variants={fadeInUp} className="space-y-6">
                  {/* Section Title Outside Window */}
                  <div className="flex items-center space-x-4">
                    <div className="text-5xl">🧘</div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Recovery Habits</h2>
                      <p className="text-muted-foreground">Rest, restore, and recharge your mind and body</p>
                    </div>
                  </div>
                  <div className="h-px bg-gradient-to-r from-purple-500/50 via-purple-300/30 to-transparent" />
                  
                  <ThemedDomainSection
                    domain="recovery"
                    title="Recovery Habits"
                    subtitle="Rest, restore, and recharge your mind and body"
                    emoji="🧘"
                    addedHabits={addedHabits}
                    onInfo={setSelectedHabitForInfo}
                    onAdd={setSelectedHabitForAdd}
                    hideHeader={true}
                  />
                </motion.div>
                
                <ProTip tab="browse" />
              </motion.div>
            </TabsContent>
            
            {/* My Habits Tab */}
            <TabsContent value="my-habits" className="space-y-4">
              <motion.div variants={fadeInUp} className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <h3 className="text-lg font-semibold md:text-xl">Your Active Habits</h3>
                <Button 
                  onClick={loadMyHabits} 
                  disabled={loading} 
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto h-10 text-sm md:h-11 md:text-base"
                >
                  <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="ml-2 sm:sr-only">Refresh</span>
                </Button>
              </motion.div>

              {loading ? (
                <motion.div variants={fadeInUp} className="text-center py-8">
                  <div className="animate-pulse text-sm md:text-base">Loading your habits...</div>
                </motion.div>
              ) : !ready ? (
                <motion.div variants={fadeInUp} className="text-center py-8">
                  <div className="animate-pulse text-sm md:text-base">Loading auth...</div>
                </motion.div>
              ) : !user ? (
                <motion.div 
                  variants={fadeInUp}
                  className="text-center py-12"
                >
                  <Card className="max-w-md mx-auto">
                    <CardContent className="p-6">
                      <CheckSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">You're not signed in</h3>
                      <p className="text-muted-foreground">Sign in to save & view your habits.</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : myHabits.length === 0 ? (
                <MyHabitsEmptyState />
              ) : (
                <>
                  {/* Bulk delete banner for paused habits */}
                  {myHabits.filter(h => h.is_paused).length > 0 && (
                    <motion.div variants={fadeInUp}>
                      <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              <span className="text-sm text-orange-800 dark:text-orange-200">
                                You have {myHabits.filter(h => h.is_paused).length} paused habits
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveTab('browse')}
                                className="text-xs"
                              >
                                Manage
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setShowBulkDeleteDialog(true)}
                                className="text-xs"
                              >
                                Delete all paused
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  <motion.div 
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3 sm:space-y-4"
                  >
                    {myHabits.map((habit) => (
                    <motion.div
                      key={habit.habit_slug}
                      variants={fadeInUp}
                      whileHover={{ scale: 1.01 }}
                    >
                      <Card className="w-full rounded-2xl">
                        <CardContent className="p-4 sm:p-6">
                           <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                             {/* Top row on mobile - Emoji + Name + Menu */}
                             <div className="flex items-center gap-3 min-w-0 flex-1">
                               <span className="text-xl sm:text-2xl">{getDomainEmoji(habit.domain)}</span>
                               <div className="min-w-0 flex-1">
                                 <div className="flex items-center justify-between">
                                   <h4 className="font-medium text-sm sm:text-base line-clamp-1">{habit.title}</h4>
                                   <DropdownMenu>
                                     <DropdownMenuTrigger asChild>
                                       <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                         <MoreHorizontal className="h-4 w-4" />
                                       </Button>
                                     </DropdownMenuTrigger>
                                     <DropdownMenuContent align="end">
                                       <DropdownMenuItem
                                         onClick={() => {
                                           setHabitToDelete(habit.habit_slug);
                                           setShowDeleteDialog(true);
                                         }}
                                         className="text-destructive"
                                       >
                                         <Trash2 className="h-4 w-4 mr-2" />
                                         Delete
                                       </DropdownMenuItem>
                                     </DropdownMenuContent>
                                   </DropdownMenu>
                                 </div>
                                  <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs">{habit.domain}</Badge>
                                    <Badge variant={getDifficultyVariant(habit.difficulty)} className="text-xs">
                                      {habit.difficulty}
                                    </Badge>
                                    {habit.habit_slug.startsWith('custom:') && (
                                      <Badge variant="outline" className="text-xs border-primary text-primary">
                                        Manual
                                      </Badge>
                                    )}
                                    {habit.is_paused && <Badge variant="destructive" className="text-xs">Paused</Badge>}
                                    <Badge variant="outline" className="text-xs">
                                      Started: {formatStartedTime(habit.created_at)}
                                    </Badge>
                                  </div>
                               </div>
                             </div>

                            {/* Bottom row on mobile - Controls */}
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                              {/* Target stepper + Count */}
                              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-4">
                                <div className="text-center">
                                  <div className="text-xs text-muted-foreground sm:text-sm">Target/week</div>
                                  <div className="flex items-center gap-1 justify-center">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleUpdateTarget(habit.habit_slug, Math.max(1, habit.target_per_week - 1))}
                                      disabled={habit.target_per_week <= 1}
                                    >
                                      -
                                    </Button>
                                    <span className="w-8 text-center text-sm">{habit.target_per_week}</span>
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
                                
                                <div className="text-center">
                                  <div className="text-xs text-muted-foreground sm:text-sm">30d logs</div>
                                  <Badge variant="outline" className="text-xs">
                                    {habit.last_30d_count}
                                  </Badge>
                                </div>
                              </div>

                              {/* Action buttons */}
                               <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
                                 <motion.div whileTap={{ scale: 0.95 }} className="min-w-0">
                                   {loggedToday.has(habit.habit_slug) ? (
                                     <Button 
                                       size="sm" 
                                       disabled
                                       aria-label={`${habit.title} logged today`}
                                       className="w-full h-10 text-sm md:h-11 md:text-base bg-muted text-muted-foreground cursor-not-allowed"
                                     >
                                       <CheckCircle className="h-3 w-3 mr-1 md:h-4 md:w-4" />
                                       Logged ✓
                                     </Button>
                                   ) : (
                                     <Button 
                                       size="sm" 
                                       onClick={() => handleLogHabit(habit.habit_slug)}
                                       disabled={habit.is_paused || isLogging.has(habit.habit_slug)}
                                       aria-label={`Log ${habit.title} now`}
                                       className="w-full h-10 text-sm md:h-11 md:text-base"
                                     >
                                       <Play className="h-3 w-3 mr-1 md:h-4 md:w-4" />
                                       {isLogging.has(habit.habit_slug) ? 'Logging...' : 'Log now'}
                                     </Button>
                                   )}
                                 </motion.div>
                                
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleTogglePause(habit.habit_slug, habit.is_paused)}
                                  aria-label={habit.is_paused ? `Resume ${habit.title}` : `Pause ${habit.title}`}
                                  className="w-full h-10 text-sm md:h-11 md:text-base"
                                >
                                  {habit.is_paused ? 'Resume' : <Pause className="h-3 w-3 md:h-4 md:w-4" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                  </motion.div>
                </>
              )}
              
              {/* Pro Tip for My Habits */}
              <ProTip tab="habits" />
            </TabsContent>

            {/* Create Tab */}
            <TabsContent value="create" className="space-y-4">
              <React.Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
                <CreateDiscoverContent />
              </React.Suspense>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <motion.div variants={fadeInUp} className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <h3 className="text-lg font-semibold md:text-xl">Habit Progress</h3>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                  <Button
                    variant={progressWindow === 'last_7d' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setProgressWindow('last_7d');
                      loadProgress('last_7d');
                    }}
                    className="h-10 text-sm md:h-11 md:text-base"
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
                    className="h-10 text-sm md:h-11 md:text-base"
                  >
                    Last 30 days
                  </Button>
                </div>
              </motion.div>

              {loading ? (
                <motion.div variants={fadeInUp} className="text-center py-8">
                  <div className="animate-pulse text-sm md:text-base">Loading analytics...</div>
                </motion.div>
              ) : progressData.length === 0 ? (
                <AnalyticsEmptyState />
              ) : (
                <motion.div 
                  variants={fadeInUp}
                  initial="hidden"
                  animate="visible"
                >
                  <Card className="w-full rounded-2xl">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base md:text-lg">Daily Habit Logs</CardTitle>
                      <CardDescription className="text-xs md:text-sm">Your habit completion over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[220px] sm:h-[260px] md:h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={progressData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis 
                              dataKey="day" 
                              tickFormatter={(date) => new Date(date).getDate().toString()}
                              fontSize={12}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis fontSize={12} tick={{ fontSize: 12 }} />
                            <Tooltip 
                              labelFormatter={(date) => new Date(date).toLocaleDateString()}
                              formatter={(value) => [`${value} logs`, 'Completions']}
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px'
                              }}
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
                    <React.Suspense fallback={null}>
                      <CronStatusWidget />
                    </React.Suspense>
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
                    <React.Suspense fallback={null}>
                      <CronStatusWidget />
                    </React.Suspense>
                  </motion.div>
                )}
              </TabsContent>
            )}
            
            {/* Modals */}
            <HabitInfoModal
              habit={selectedHabitForInfo}
              open={!!selectedHabitForInfo}
              onClose={() => setSelectedHabitForInfo(null)}
              onAdd={() => {
                if (selectedHabitForInfo) {
                  setSelectedHabitForAdd(selectedHabitForInfo);
                  setSelectedHabitForInfo(null);
                }
              }}
              isAdded={selectedHabitForInfo ? addedHabits.has(selectedHabitForInfo.slug) : false}
            />
            
            <HabitAddModal
              habit={selectedHabitForAdd}
              open={!!selectedHabitForAdd}
              onClose={() => setSelectedHabitForAdd(null)}
              onConfirm={async (config: HabitConfig) => {
                if (!selectedHabitForAdd) return;
                setIsAddingHabit(true);
                try {
                  console.log('[Add] onConfirm received config:', config);
                  await handleAddHabit(selectedHabitForAdd.slug, config.targetPerWeek);
                  setSelectedHabitForAdd(null);
                  triggerHaptics('light');
                  if (config.isAuto) {
                    confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } });
                  }
                } catch (error) {
                  console.error('Error adding habit:', error);
                } finally {
                  setIsAddingHabit(false);
                }
              }}
              isAdding={isAddingHabit}
            />

            {/* Single habit delete confirmation dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this habit?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes reminders and the habit from your list. You can add it again later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex items-center space-x-2 py-4">
                  <Checkbox 
                    id="purge-logs" 
                    checked={purgeLogsOnDelete}
                    onCheckedChange={(checked) => setPurgeLogsOnDelete(checked === true)}
                  />
                  <Label htmlFor="purge-logs" className="text-sm">
                    Also delete past logs
                  </Label>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (habitToDelete) {
                        handleDeleteHabit(habitToDelete, purgeLogsOnDelete);
                      }
                    }}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Bulk delete paused habits confirmation dialog */}
            <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all paused habits?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove {myHabits.filter(h => h.is_paused).length} paused habits and their reminders. You can add them again later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex items-center space-x-2 py-4">
                  <Checkbox 
                    id="bulk-purge-logs" 
                    checked={purgeLogsOnDelete}
                    onCheckedChange={(checked) => setPurgeLogsOnDelete(checked === true)}
                  />
                  <Label htmlFor="bulk-purge-logs" className="text-sm">
                    Also delete past logs
                  </Label>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteAllPaused(purgeLogsOnDelete)}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete All Paused'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>
        </div>
      </Tabs>
    </div>
  );
}