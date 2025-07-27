import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles, Play, Pause, Volume2, VolumeX, Star, Heart, Flame, Plus, Bell, BarChart3 } from "lucide-react";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RemindersList } from "@/components/recovery/RemindersList";
import { AddReminderModal } from "@/components/recovery/AddReminderModal";
import { SessionPickerModal } from "@/components/meditation/SessionPickerModal";

const GuidedMeditation = () => {
  useScrollToTop();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [isInPlayback, setIsInPlayback] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ambientVolume, setAmbientVolume] = useState(true);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [meditationStreak, setMeditationStreak] = useState<{
    currentStreak: number;
    totalSessions: number;
  }>({ currentStreak: 0, totalSessions: 0 });
  const [activeTab, setActiveTab] = useState('explore');
  const [reminders, setReminders] = useState<any[]>([]);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<any>(null);
  const [isSessionPickerOpen, setIsSessionPickerOpen] = useState(false);
  const [selectedThemeForPicker, setSelectedThemeForPicker] = useState<any>(null);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const progressInterval = useRef<NodeJS.Timeout>();

  const meditationThemes = [
    {
      id: 'morning-boost',
      title: 'Morning Boost',
      emoji: '🌅',
      gradient: 'from-orange-300/30 to-yellow-300/30',
      iconColor: 'text-orange-500',
      duration: '10 min',
      description: 'Start your day with energy and clarity'
    },
    {
      id: 'sleep-wind-down',
      title: 'Sleep Wind-Down',
      emoji: '🌙',
      gradient: 'from-indigo-300/30 to-purple-300/30',
      iconColor: 'text-indigo-500',
      duration: '15 min',
      description: 'Gentle relaxation for peaceful sleep'
    },
    {
      id: 'focus-clarity',
      title: 'Focus & Clarity',
      emoji: '🧠',
      gradient: 'from-blue-300/30 to-cyan-300/30',
      iconColor: 'text-blue-500',
      duration: '12 min',
      description: 'Sharpen your mind and enhance concentration'
    },
    {
      id: 'self-love',
      title: 'Self-Love',
      emoji: '💞',
      gradient: 'from-pink-300/30 to-rose-300/30',
      iconColor: 'text-pink-500',
      duration: '8 min',
      description: 'Cultivate compassion and self-acceptance'
    },
    {
      id: 'anxiety-relief',
      title: 'Anxiety Relief',
      emoji: '🌿',
      gradient: 'from-green-300/30 to-emerald-300/30',
      iconColor: 'text-green-500',
      duration: '14 min',
      description: 'Find calm and release tension'
    },
    {
      id: 'gratitude',
      title: 'Gratitude',
      emoji: '🙏',
      gradient: 'from-amber-300/30 to-orange-300/30',
      iconColor: 'text-amber-500',
      duration: '6 min',
      description: 'Appreciate life\'s blessings and beauty'
    },
    {
      id: 'deep-healing',
      title: 'Deep Healing',
      emoji: '🔮',
      gradient: 'from-purple-300/30 to-violet-300/30',
      iconColor: 'text-purple-500',
      duration: '20 min',
      description: 'Restore and rejuvenate your inner self'
    },
    {
      id: 'manifestation',
      title: 'Manifestation',
      emoji: '🔥',
      gradient: 'from-red-300/30 to-pink-300/30',
      iconColor: 'text-red-500',
      duration: '11 min',
      description: 'Align with your dreams and intentions'
    }
  ];

  const currentTheme = meditationThemes.find(theme => theme.id === selectedTheme);

  // Fetch meditation streak on component mount
  useEffect(() => {
    const fetchMeditationStreak = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('meditation_streaks')
          .select('current_streak, total_sessions')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching meditation streak:', error);
          return;
        }

        if (data) {
          setMeditationStreak({
            currentStreak: data.current_streak,
            totalSessions: data.total_sessions
          });
        }
      } catch (error) {
        console.error('Error fetching meditation streak:', error);
      }
    };

    fetchMeditationStreak();
    fetchReminders();
  }, []);

  // Fetch reminders for meditation
  const fetchReminders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('recovery_reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('content_type', 'meditation')
        .order('reminder_time');

      if (error) {
        console.error('Error fetching reminders:', error);
        return;
      }

      setReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  // Save reminder (create or update)
  const handleSaveReminder = async (reminderData: {
    title: string;
    reminder_time: string;
    repeat_pattern: string;
    content_id?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingReminder) {
        // Update existing reminder
        const { error } = await supabase
          .from('recovery_reminders')
          .update({
            title: reminderData.title,
            reminder_time: reminderData.reminder_time,
            repeat_pattern: reminderData.repeat_pattern,
            content_id: reminderData.content_id
          })
          .eq('id', editingReminder.id)
          .eq('user_id', user.id);

        if (!error) {
          toast({
            title: "✅ Reminder Updated",
            description: "Your meditation reminder has been updated successfully.",
            duration: 3000,
          });
          fetchReminders();
        } else {
          console.error('Error updating reminder:', error);
          toast({
            title: "❌ Update Failed",
            description: "Failed to update reminder. Please try again.",
            duration: 3000,
          });
        }
      } else {
        // Create new reminder
        const { error } = await supabase
          .from('recovery_reminders')
          .insert({
            user_id: user.id,
            content_type: 'meditation',
            title: reminderData.title,
            reminder_time: reminderData.reminder_time,
            repeat_pattern: reminderData.repeat_pattern,
            content_id: reminderData.content_id
          });

        if (!error) {
          toast({
            title: "✅ Reminder Created",
            description: "Your meditation reminder has been set successfully.",
            duration: 3000,
          });
          fetchReminders();
        } else {
          console.error('Error creating reminder:', error);
          toast({
            title: "❌ Creation Failed",
            description: "Failed to create reminder. Please try again.",
            duration: 3000,
          });
        }
      }

      setEditingReminder(null);
    } catch (error) {
      console.error('Error saving reminder:', error);
      toast({
        title: "❌ Error",
        description: "An unexpected error occurred. Please try again.",
        duration: 3000,
      });
    }
  };

  // Delete reminder
  const handleDeleteReminder = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('recovery_reminders')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (!error) {
        toast({
          title: "🗑️ Reminder Deleted",
          description: "Your meditation reminder has been deleted.",
          duration: 3000,
        });
        fetchReminders();
      } else {
        console.error('Error deleting reminder:', error);
        toast({
          title: "❌ Delete Failed",
          description: "Failed to delete reminder. Please try again.",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast({
        title: "❌ Error",
        description: "An unexpected error occurred. Please try again.",
        duration: 3000,
      });
    }
  };

  // Edit reminder
  const handleEditReminder = (reminder: any) => {
    setEditingReminder(reminder);
    setIsReminderModalOpen(true);
  };

  // Create available sessions for reminder modal
  const availableSessions = meditationThemes.map(theme => ({
    id: theme.id,
    title: theme.title
  }));

  // Update streak when session completes
  const updateMeditationStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      
      const { data: existingStreak, error: fetchError } = await supabase
        .from('meditation_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching meditation streak:', fetchError);
        return;
      }

      if (existingStreak) {
        // Check if already completed today
        if (existingStreak.last_completed_date === today) {
          return; // Already completed today, don't update streak
        }

        const lastDate = new Date(existingStreak.last_completed_date || '1970-01-01');
        const todayDate = new Date(today);
        const dayDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        let newStreak = existingStreak.current_streak;
        if (dayDiff === 1) {
          // Yesterday - increment streak
          newStreak += 1;
        } else if (dayDiff > 1) {
          // Older than yesterday - reset to 1
          newStreak = 1;
        }
        // If dayDiff === 0, somehow same day but condition above should catch this

        const { error } = await supabase
          .from('meditation_streaks')
          .update({
            current_streak: newStreak,
            total_sessions: existingStreak.total_sessions + 1,
            last_completed_date: today
          })
          .eq('user_id', user.id);

        if (!error) {
          setMeditationStreak({
            currentStreak: newStreak,
            totalSessions: existingStreak.total_sessions + 1
          });
          
          // Show appropriate toast message
          if (newStreak === 1 && existingStreak.current_streak > 1) {
            toast({
              title: "🌱 Started Today!",
              description: "Fresh start on your meditation journey",
              duration: 3000,
            });
          } else if (newStreak > existingStreak.current_streak) {
            toast({
              title: `🔥 ${newStreak}-Day Streak!`,
              description: "Keep up the great work!",
              duration: 3000,
            });
          }
        }
      } else {
        // First meditation session - no existing row
        const { error } = await supabase
          .from('meditation_streaks')
          .insert({
            user_id: user.id,
            current_streak: 1,
            total_sessions: 1,
            last_completed_date: today
          });

        if (!error) {
          setMeditationStreak({
            currentStreak: 1,
            totalSessions: 1
          });
          
          toast({
            title: "🌱 Started Today!",
            description: "Beginning your mindfulness journey",
            duration: 3000,
          });
        }
      }
    } catch (error) {
      console.error('Error updating meditation streak:', error);
    }
  };

  // Simulate audio progress
  useEffect(() => {
    if (isPlaying && !isSessionComplete) {
      progressInterval.current = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 0.5;
          if (newProgress >= 100) {
            setIsPlaying(false);
            setIsSessionComplete(true);
            // Update meditation streak when session completes
            updateMeditationStreak();
            return 100;
          }
          return newProgress;
        });
      }, 100);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying, isSessionComplete]);

  // Handle theme selection - now opens session picker modal
  const handleThemeSelect = (themeId: string) => {
    const theme = meditationThemes.find(t => t.id === themeId);
    if (theme) {
      setSelectedThemeForPicker(theme);
      setIsSessionPickerOpen(true);
    }
  };

  // Handle session start from modal
  const handleStartSession = (session: any) => {
    navigate('/recovery-player', { state: { session } });
  };

  const handleBackFromPlayback = () => {
    setIsInPlayback(false);
    setSelectedTheme(null);
    setIsPlaying(false);
    setProgress(0);
    setIsSessionComplete(false);
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const restartSession = () => {
    setProgress(0);
    setIsSessionComplete(false);
    setIsPlaying(true);
  };

  // MeditationPlayback Component
  const MeditationPlayback = () => (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackFromPlayback}
              className="hover:bg-accent/50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
                {currentSession?.title || currentTheme?.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {currentSession?.description || currentTheme?.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-4xl mx-auto">
        {/* Visual Layer with Breathing Animation */}
        <div className="relative flex justify-center mb-8">
          <div className="relative">
            {/* Breathing Orb */}
            <div className="w-64 h-64 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 animate-pulse flex items-center justify-center">
              <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 animate-ping flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center">
                  <div className="text-6xl animate-pulse">
                    {currentTheme?.emoji}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden rounded-full">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-primary/30 rounded-full animate-bounce"
                  style={{
                    left: `${20 + (i * 15)}%`,
                    top: `${30 + (i * 8)}%`,
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: `${2 + (i * 0.3)}s`
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Audio Player */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 to-background/50 p-8 border border-border/50 mb-6">
          <div className="relative z-10">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>{Math.floor((progress / 100) * (currentSession?.duration || parseInt(currentTheme?.duration || '0')))} min</span>
                <span>{currentSession ? `${currentSession.duration} min` : currentTheme?.duration}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Player Controls */}
            <div className="flex items-center justify-center gap-6">
              {/* Ambient Volume Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAmbientVolume(!ambientVolume)}
                className="hover:bg-accent/50 transition-colors"
              >
                {ambientVolume ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>

              {/* Play/Pause Button */}
              <Button
                onClick={togglePlayPause}
                size="lg"
                className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-foreground hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-primary/25"
                disabled={isSessionComplete}
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8 text-white" />
                ) : (
                  <Play className="h-8 w-8 text-white ml-1" />
                )}
              </Button>

              {/* Placeholder for future controls */}
              <div className="w-10 h-10" />
            </div>

            {/* Status Text */}
            <div className="text-center mt-4">
              <p className="text-sm text-muted-foreground">
                {isSessionComplete 
                  ? "Session complete" 
                  : isPlaying 
                    ? "Playing gentle meditation with ambient sounds..." 
                    : "Ready to begin your journey"
                }
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl" />
        </div>

        {/* Session Completion & Feedback */}
        {isSessionComplete && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-8 border border-green-500/20 animate-fade-in">
            <div className="relative z-10 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-green-500/20 rounded-full">
                  <Sparkles className="h-8 w-8 text-green-500" />
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-foreground mb-3">
                Session Complete! 🎉
              </h3>
              
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Well done! Take a moment to notice how you feel after this peaceful journey.
              </p>

              {/* Feedback Buttons */}
              <div className="flex justify-center gap-4 mb-4">
                <Button variant="outline" className="gap-2">
                  <Star className="h-4 w-4" />
                  Rate Session
                </Button>
                <Button variant="outline" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Log Feeling
                </Button>
              </div>

              <Button onClick={restartSession} className="mt-2">
                Meditate Again
              </Button>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-2xl" />
          </div>
        )}

        {/* Bottom Spacing */}
        <div className="h-20" />
      </div>
    </div>
  );

  // Main render - show either tile selector or playback view
  if (isInPlayback && currentTheme) {
    return <MeditationPlayback />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
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
                Guided Meditation
              </h1>
              <p className="text-sm text-muted-foreground">
                Find your breath. Reclaim your calm.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-7xl mx-auto">
        {/* Streak Display */}
        {meditationStreak.currentStreak > 0 && (
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full border border-orange-500/30 backdrop-blur-sm">
              {meditationStreak.currentStreak === 1 ? (
                <>
                  <span className="text-lg">🌱</span>
                  <span className="text-lg font-bold text-foreground">
                    Started Today!
                  </span>
                </>
              ) : (
                <>
                  <Flame className="h-5 w-5 text-orange-500" />
                  <span className="text-lg font-bold text-foreground">
                    {meditationStreak.currentStreak}-Day Streak
                  </span>
                </>
              )}
              {meditationStreak.totalSessions > 0 && (
                <span className="text-sm text-muted-foreground ml-2">
                  ({meditationStreak.totalSessions} total sessions)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="explore" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Explore
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="reminders" className="gap-2">
              <Bell className="h-4 w-4" />
              Reminders
            </TabsTrigger>
          </TabsList>

          {/* Explore Tab */}
          <TabsContent value="explore" className="space-y-6">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-8 border border-border/50">
              <div className="relative z-10 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-background/50 backdrop-blur-sm rounded-full border border-border/30">
                    <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-3">
                  Choose Your Journey
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Select a meditation theme that resonates with your current needs. 
                  Each session is designed to guide you toward inner peace and clarity.
                </p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl" />
            </div>

            {/* Theme Selector Grid */}
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-4'}`}>
              {meditationThemes.map((theme, index) => (
                <div
                  key={theme.id}
                  onClick={() => handleThemeSelect(theme.id)}
                  className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${theme.gradient} p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 animate-fade-in cursor-pointer hover:scale-105`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative z-10 text-center">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                      {theme.emoji}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                      {theme.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {theme.description}
                    </p>
                    <span className="inline-block px-2 py-1 bg-background/70 text-xs rounded-full text-muted-foreground">
                      {theme.duration}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-background/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-8 border border-border/50">
              <div className="relative z-10 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-background/50 backdrop-blur-sm rounded-full border border-border/30">
                    <BarChart3 className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-3">
                  Your Progress
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Track your meditation journey and celebrate your achievements.
                </p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl" />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Current Streak Card */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 p-6 border border-orange-500/20">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-500/20 rounded-full">
                      <Flame className="h-5 w-5 text-orange-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Current Streak</h3>
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">
                    {meditationStreak.currentStreak} days
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Keep up the great work!
                  </p>
                </div>
              </div>

              {/* Total Sessions Card */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-6 border border-blue-500/20">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-500/20 rounded-full">
                      <Sparkles className="h-5 w-5 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Total Sessions</h3>
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">
                    {meditationStreak.totalSessions}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Meditation sessions completed
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Reminders Tab */}
          <TabsContent value="reminders" className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-8 border border-border/50">
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-background/50 backdrop-blur-sm rounded-full border border-border/30">
                      <Bell className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-foreground mb-1">
                        Meditation Reminders
                      </h2>
                      <p className="text-lg text-muted-foreground">
                        Stay consistent with your practice.
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setIsReminderModalOpen(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Reminder
                  </Button>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl" />
            </div>

            {/* Reminders List */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-muted/30 to-background/50 p-6 border border-border/50">
              <RemindersList
                reminders={reminders}
                onEdit={handleEditReminder}
                onDelete={handleDeleteReminder}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Session Picker Modal */}
        <SessionPickerModal
          isOpen={isSessionPickerOpen}
          onClose={() => {
            setIsSessionPickerOpen(false);
            setSelectedThemeForPicker(null);
          }}
          theme={selectedThemeForPicker}
          onStartSession={handleStartSession}
        />

        {/* Add Reminder Modal */}
        <AddReminderModal
          isOpen={isReminderModalOpen}
          onClose={() => {
            setIsReminderModalOpen(false);
            setEditingReminder(null);
          }}
          onSave={handleSaveReminder}
          editingReminder={editingReminder}
          availableSessions={availableSessions}
        />

        {/* Bottom Spacing */}
        <div className="h-20" />
      </div>
    </div>
  );
};

export default GuidedMeditation;
