import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles, Bell, Plus, Clock, Edit, Trash2, Moon } from "lucide-react";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RemindersList } from "@/components/recovery/RemindersList";
import { AddReminderModal } from "@/components/recovery/AddReminderModal";
import { SessionPickerModal } from "@/components/meditation/SessionPickerModal";
import { BreathingReminderModal } from "@/components/breathing/BreathingReminderModal";
import { BreathingTestButton } from "@/components/breathing/BreathingTestButton";
import { BreathingStreakDisplay } from "@/components/breathing/BreathingStreakDisplay";
import { YogaReminderModal } from "@/components/yoga/YogaReminderModal";
import { YogaTestButton } from "@/components/yoga/YogaTestButton";
import { YogaStreakDisplay } from "@/components/yoga/YogaStreakDisplay";
import { SleepReminderModal } from "@/components/sleep/SleepReminderModal";
import { SleepTestButton } from "@/components/sleep/SleepTestButton";
import { SleepStreakDisplay } from "@/components/sleep/SleepStreakDisplay";
import { ThermotherapyReminderModal } from "@/components/thermotherapy/ThermotherapyReminderModal";
import { ThermotherapyTestButton } from "@/components/thermotherapy/ThermotherapyTestButton";
import { ThermotherapyStreakDisplay } from "@/components/thermotherapy/ThermotherapyStreakDisplay";

interface RecoveryContentPageProps {
  category: string;
  title: string;
  emoji: string;
  colorClass: string;
}

const RecoveryContentPage: React.FC<RecoveryContentPageProps> = ({
  category,
  title,
  emoji,
  colorClass
}) => {
  useScrollToTop();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('explore');
  const [reminders, setReminders] = useState<any[]>([]);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<any>(null);
  const [isSessionPickerOpen, setIsSessionPickerOpen] = useState(false);
  const [selectedThemeForPicker, setSelectedThemeForPicker] = useState<any>(null);
  const [breathingReminder, setBreathingReminder] = useState<any>(null);
  const [isBreathingReminderModalOpen, setIsBreathingReminderModalOpen] = useState(false);
  const [yogaReminder, setYogaReminder] = useState<any>(null);
  const [isYogaReminderModalOpen, setIsYogaReminderModalOpen] = useState(false);
  const [sleepReminder, setSleepReminder] = useState<any>(null);
  const [isSleepReminderModalOpen, setIsSleepReminderModalOpen] = useState(false);
  const [isThermotherapyReminderModalOpen, setIsThermotherapyReminderModalOpen] = useState(false);

  // Fetch reminders
  const fetchReminders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('recovery_reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('content_type', category)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  // Fetch breathing reminder for breathing category
  const fetchBreathingReminder = async () => {
    if (category !== 'breathing') return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('breathing_reminders')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setBreathingReminder(data);
    } catch (error) {
      console.error('Error fetching breathing reminder:', error);
    }
  };

  // Fetch yoga reminder for yoga category
  const fetchYogaReminder = async () => {
    if (category !== 'yoga') return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('yoga_reminders')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setYogaReminder(data);
    } catch (error) {
      console.error('Error fetching yoga reminder:', error);
    }
  };

  // Fetch sleep reminder for sleep-preparation category
  const fetchSleepReminder = async () => {
    if (category !== 'sleep-preparation') return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sleep_reminders')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setSleepReminder(data);
    } catch (error) {
      console.error('Error fetching sleep reminder:', error);
    }
  };

  // Fetch thermotherapy reminder for cold-heat-therapy category
  const fetchThermotherapyReminder = async () => {
    if (category !== 'cold-heat-therapy') return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('thermotherapy_reminders')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
    } catch (error) {
      console.error('Error fetching thermotherapy reminder:', error);
    }
  };

  const handleRemoveBreathingReminder = async () => {
    try {
      const { error } = await supabase
        .from('breathing_reminders')
        .delete()
        .eq('id', breathingReminder.id);

      if (error) throw error;
      setBreathingReminder(null);
      toast({ title: "Breathing reminder removed" });
    } catch (error) {
      console.error('Error removing breathing reminder:', error);
      toast({ title: "Error removing reminder", variant: "destructive" });
    }
  };

  const handleRemoveYogaReminder = async () => {
    try {
      const { error } = await supabase
        .from('yoga_reminders')
        .delete()
        .eq('id', yogaReminder.id);

      if (error) throw error;
      setYogaReminder(null);
      toast({ title: "Yoga reminder removed" });
    } catch (error) {
      console.error('Error removing yoga reminder:', error);
      toast({ title: "Error removing reminder", variant: "destructive" });
    }
  };

  const handleRemoveSleepReminder = async () => {
    try {
      const { error } = await supabase
        .from('sleep_reminders')
        .delete()
        .eq('id', sleepReminder.id);

      if (error) throw error;
      setSleepReminder(null);
      toast({ title: "Sleep reminder removed" });
    } catch (error) {
      console.error('Error removing sleep reminder:', error);
      toast({ title: "Error removing reminder", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchReminders();
    fetchBreathingReminder();
    fetchYogaReminder();
    fetchSleepReminder();
    fetchThermotherapyReminder();
  }, [category]);

  // Handle reminder save
  const handleReminderSave = async (reminderData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingReminder) {
        const { error } = await supabase
          .from('recovery_reminders')
          .update({
            title: reminderData.title,
            reminder_time: reminderData.reminder_time,
            repeat_pattern: reminderData.repeat_pattern,
            content_id: reminderData.content_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingReminder.id);

        if (error) throw error;
        toast({ title: "Reminder updated successfully" });
      } else {
        const { error } = await supabase
          .from('recovery_reminders')
          .insert({
            user_id: user.id,
            content_type: category,
            title: reminderData.title,
            reminder_time: reminderData.reminder_time,
            repeat_pattern: reminderData.repeat_pattern,
            content_id: reminderData.content_id
          });

        if (error) throw error;
        toast({ title: "Reminder created successfully" });
      }

      fetchReminders();
      setIsReminderModalOpen(false);
      setEditingReminder(null);
    } catch (error) {
      console.error('Error saving reminder:', error);
      toast({ 
        title: "Error saving reminder", 
        description: "Please try again.",
        variant: "destructive" 
      });
    }
  };

  // Handle reminder delete
  const handleReminderDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recovery_reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Reminder deleted successfully" });
      fetchReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast({ 
        title: "Error deleting reminder", 
        description: "Please try again.",
        variant: "destructive" 
      });
    }
  };

  // Handle theme click to open session picker
  const handleThemeClick = (theme: any) => {
    setSelectedThemeForPicker({
      ...theme,
      category: category
    });
    setIsSessionPickerOpen(true);
  };

  // Recovery themes based on category
  const getRecoveryThemes = () => {
    const baseThemes = [
      {
        id: `${category}-beginner`,
        title: 'Beginner Sessions',
        emoji: '🌱',
        gradient: `${colorClass}/30`,
        iconColor: colorClass.replace('/20', ''),
        duration: '5-10 min',
        description: 'Perfect for starting your journey'
      },
      {
        id: `${category}-intermediate`,
        title: 'Intermediate Sessions',
        emoji: '⭐',
        gradient: `${colorClass}/30`,
        iconColor: colorClass.replace('/20', ''),
        duration: '10-15 min',
        description: 'Build on your foundation'
      },
      {
        id: `${category}-advanced`,
        title: 'Advanced Sessions',
        emoji: '🔥',
        gradient: `${colorClass}/30`,
        iconColor: colorClass.replace('/20', ''),
        duration: '15-30 min',
        description: 'Challenge yourself further'
      },
      {
        id: `${category}-targeted`,
        title: 'Targeted Relief',
        emoji: '🎯',
        gradient: `${colorClass}/30`,
        iconColor: colorClass.replace('/20', ''),
        duration: '8-20 min',
        description: 'Focus on specific areas'
      }
    ];
    return baseThemes;
  };

  const recoveryThemes = getRecoveryThemes();

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
                {emoji} {title}
              </h1>
              <p className="text-sm text-muted-foreground">
                Discover sessions and manage reminders
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="explore" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Explore
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Reminders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explore" className="space-y-6">
            {/* Hero Section */}
            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorClass} p-8 mb-8 border border-border/50`}>
              <div className="relative z-10">
                <h2 className="text-3xl font-bold text-foreground mb-3">
                  {emoji} {title} Sessions
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl">
                  Choose from our collection of {title.toLowerCase()} sessions designed to help you restore and recharge.
                </p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl" />
            </div>

            {/* Session Categories Grid */}
            <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {recoveryThemes.map((theme, index) => (
                <div
                  key={theme.id}
                  onClick={() => handleThemeClick(theme)}
                  className={`group relative overflow-hidden rounded-xl bg-gradient-to-br from-${theme.gradient} to-background/50 p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 animate-fade-in cursor-pointer`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-4xl mb-2">{theme.emoji}</div>
                      <span className="text-xs px-2 py-1 rounded-full bg-background/70 text-muted-foreground border border-border/30">
                        {theme.duration}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {theme.title}
                    </h3>
                    
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {theme.description}
                    </p>
                  </div>
                  
                  <div className="absolute inset-0 bg-gradient-to-br from-background/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              ))}
            </div>

            {/* Breathing Reminder Display - only for breathing category */}
            {category === 'breathing' && (
              <div className="mt-8 space-y-4">
                <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-cyan-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Breathing Practice Reminder</h3>
                        {breathingReminder ? (
                          <p className="text-sm text-muted-foreground">
                            Daily at {breathingReminder.time_of_day} ({breathingReminder.recurrence})
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Set a daily reminder to maintain your breathing practice
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsBreathingReminderModalOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        {breathingReminder ? 'Edit' : 'Set Reminder'}
                      </Button>
                      {breathingReminder && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveBreathingReminder}
                          className="flex items-center gap-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Breathing Streak Display */}
                <BreathingStreakDisplay />
                
                {/* Test Session Button */}
                <BreathingTestButton />
              </div>
            )}

            {/* Yoga Reminder Display - only for yoga category */}
            {category === 'yoga' && (
              <div className="mt-8 space-y-4">
                <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-purple-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Yoga Practice Reminder</h3>
                        {yogaReminder ? (
                          <p className="text-sm text-muted-foreground">
                            Daily at {yogaReminder.time_of_day} ({yogaReminder.recurrence})
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Set a daily reminder to maintain your yoga practice
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsYogaReminderModalOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        {yogaReminder ? 'Edit' : 'Set Reminder'}
                      </Button>
                      {yogaReminder && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveYogaReminder}
                          className="flex items-center gap-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Yoga Streak Display */}
                <YogaStreakDisplay />
                
                {/* Test Session Button */}
                <YogaTestButton />
              </div>
            )}

            {/* Sleep Reminder Display - only for sleep-preparation category */}
            {category === 'sleep-preparation' && (
              <div className="mt-8 space-y-4">
                <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-indigo-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Sleep Preparation Reminder</h3>
                        {sleepReminder ? (
                          <p className="text-sm text-muted-foreground">
                            Daily at {sleepReminder.time_of_day} ({sleepReminder.recurrence})
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Set a daily reminder to maintain your sleep preparation routine
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSleepReminderModalOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        {sleepReminder ? 'Edit' : 'Set Reminder'}
                      </Button>
                      {sleepReminder && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveSleepReminder}
                          className="flex items-center gap-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Sleep Streak Display */}
                <SleepStreakDisplay />
                
                {/* Test Session Button */}
                <SleepTestButton />
              </div>
            )}

            {/* Thermotherapy Reminder Display - only for cold-heat-therapy category */}
            {category === 'cold-heat-therapy' && (
              <div className="mt-8 space-y-4">
                <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 via-white to-red-50 dark:from-blue-900/20 dark:via-gray-900/20 dark:to-red-900/20 border border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent" />
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Cold & Heat Therapy Reminder</h3>
                        <p className="text-sm text-muted-foreground">
                          Set a daily reminder for contrast therapy sessions
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsThermotherapyReminderModalOpen(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-red-50 hover:from-blue-100 hover:to-red-100 dark:from-blue-900/20 dark:to-red-900/20"
                      >
                        <Edit className="h-4 w-4" />
                        Set Reminder
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Thermotherapy Streak Display */}
                <ThermotherapyStreakDisplay />
                
                {/* Test Session Button */}
                <ThermotherapyTestButton />
              </div>
            )}
          </TabsContent>

          <TabsContent value="sleep" className="space-y-6">
            <div className="space-y-6">
              <Card className="glass-card border-0 rounded-3xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Sleep Preparation Reminder</h3>
                      <p className="text-white/70 text-sm">Set your wind-down time for better sleep</p>
                    </div>
                    <Button 
                      onClick={() => setIsSleepReminderModalOpen(true)}
                      className="bg-gradient-to-r from-slate-700 via-blue-800 to-indigo-800 hover:from-slate-600 hover:via-blue-700 hover:to-indigo-700 text-white"
                    >
                      <Moon className="mr-2 h-4 w-4" />
                      Set Reminder
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <SleepStreakDisplay />

              <SleepTestButton />
            </div>
          </TabsContent>

          <TabsContent value="reminders" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Your Reminders</h2>
                <p className="text-muted-foreground">Stay consistent with your {title.toLowerCase()} practice</p>
              </div>
              <Button
                onClick={() => setIsReminderModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Reminder
              </Button>
            </div>

            <RemindersList
              reminders={reminders}
              onEdit={(reminder) => {
                setEditingReminder(reminder);
                setIsReminderModalOpen(true);
              }}
              onDelete={handleReminderDelete}
            />
          </TabsContent>
        </Tabs>

        {/* Bottom Spacing */}
        <div className="h-20" />
      </div>

      {/* Modals */}
      <AddReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => {
          setIsReminderModalOpen(false);
          setEditingReminder(null);
        }}
        onSave={handleReminderSave}
        editingReminder={editingReminder}
      />

      <SessionPickerModal
        isOpen={isSessionPickerOpen}
        onClose={() => setIsSessionPickerOpen(false)}
        theme={selectedThemeForPicker}
        onStartSession={(session) => {
          navigate('/recovery-player', { 
            state: { 
              session: {
                ...session,
                category: category
              }
            } 
          });
        }}
      />

      <BreathingReminderModal
        isOpen={isBreathingReminderModalOpen}
        onClose={() => {
          setIsBreathingReminderModalOpen(false);
          fetchBreathingReminder();
        }}
        reminder={breathingReminder}
      />

      <YogaReminderModal
        isOpen={isYogaReminderModalOpen}
        onClose={() => {
          setIsYogaReminderModalOpen(false);
          fetchYogaReminder();
        }}
        reminder={yogaReminder}
      />

      <SleepReminderModal
        isOpen={isSleepReminderModalOpen}
        onClose={() => {
          setIsSleepReminderModalOpen(false);
        }}
      />

      <ThermotherapyReminderModal
        isOpen={isThermotherapyReminderModalOpen}
        onClose={() => {
          setIsThermotherapyReminderModalOpen(false);
        }}
      />
    </div>
  );
};

export default RecoveryContentPage;