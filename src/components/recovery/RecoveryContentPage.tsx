import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles, Bell, Plus } from "lucide-react";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RemindersList } from "@/components/recovery/RemindersList";
import { AddReminderModal } from "@/components/recovery/AddReminderModal";
import { SessionPickerModal } from "@/components/meditation/SessionPickerModal";

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

  useEffect(() => {
    fetchReminders();
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
          navigate('/meditation-player', { 
            state: { 
              session: {
                ...session,
                category: category
              }
            } 
          });
        }}
      />
    </div>
  );
};

export default RecoveryContentPage;