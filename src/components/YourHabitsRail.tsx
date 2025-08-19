import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle, Plus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { HabitTemplate } from '@/hooks/useHabitTemplatesV2';
import { QuickLogSheet } from './QuickLogSheet';
import { motion, AnimatePresence } from 'framer-motion';

interface UserHabit {
  id: string;
  user_id: string;
  slug: string;
  status: string;
  start_date: string;
  schedule: any;
  reminder_at: string | null;
  target: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface WeeklyProgress {
  user_id: string;
  slug: string;
  period_start: string;
  completions: number;
  minutes: number;
}

interface Recommendation {
  slug: string;
  name: string;
  domain: string;
  reason: string;
}

interface YourHabitsRailProps {
  onHabitStarted: () => void;
  onStartHabit: (template: HabitTemplate) => void;
  onEditHabit?: (template: HabitTemplate, userHabit: UserHabit) => void;
}

const getDomainColor = (domain: string) => {
  switch (domain) {
    case 'nutrition': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'exercise': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'recovery': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

export function YourHabitsRail({ onHabitStarted, onStartHabit, onEditHabit }: YourHabitsRailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [userHabits, setUserHabits] = useState<UserHabit[]>([]);
  const [habitTemplates, setHabitTemplates] = useState<Record<string, HabitTemplate>>({});
  const [weeklyProgress, setWeeklyProgress] = useState<Record<string, WeeklyProgress>>({});
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<{ template: HabitTemplate; userHabit: UserHabit } | null>(null);
  const [animatingHabits, setAnimatingHabits] = useState<Set<string>>(new Set());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const fetchUserHabits = async () => {
    if (!user) return;

    try {
      // Fetch active user habits
      const { data: habits, error: habitsError } = await supabase
        .from('user_habit')
        .select('*')
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(30);

      if (habitsError) throw habitsError;

      setUserHabits(habits || []);

      if (habits && habits.length > 0) {
        // Fetch habit templates for these habits
        const slugs = habits.map(h => h.slug);
        const { data: templates, error: templatesError } = await supabase
          .from('habit_templates')
          .select('*')
          .in('slug', slugs);

        if (templatesError) throw templatesError;

        const templatesMap = (templates || []).reduce((acc, template) => {
          acc[template.slug] = template as HabitTemplate;
          return acc;
        }, {} as Record<string, HabitTemplate>);

        setHabitTemplates(templatesMap);

        // Fetch weekly progress
        const { data: progress, error: progressError } = await supabase
          .from('vw_habit_progress_week')
          .select('*')
          .eq('user_id', user.id)
          .in('slug', slugs);

        if (progressError) throw progressError;

        const progressMap = (progress || []).reduce((acc, prog) => {
          acc[prog.slug] = prog;
          return acc;
        }, {} as Record<string, WeeklyProgress>);

        setWeeklyProgress(progressMap);
      } else {
        // No habits, fetch recommendations
        const { data: recs, error: recsError } = await supabase.rpc('rpc_recommend_habits');
        
        if (recsError) throw recsError;
        
        setRecommendations(recs || []);
      }
    } catch (error) {
      console.error('Error fetching user habits:', error);
      toast({
        title: "Couldn't load habits",
        description: "Please retry.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserHabits();
  }, [user, onHabitStarted]);

  const handleQuickLog = async (userHabit: UserHabit, template: HabitTemplate) => {
    if (template.goal_type === 'bool') {
      // Direct log for boolean habits
      try {
        const { error } = await supabase.rpc('rpc_log_habit', {
          p_slug: template.slug,
          p_amount: null,
          p_duration_min: null,
          p_completed: true,
          p_meta: {}
        });

        if (error) throw error;

        // Animate count bump
        setAnimatingHabits(prev => new Set(prev).add(userHabit.id));
        setTimeout(() => {
          setAnimatingHabits(prev => {
            const newSet = new Set(prev);
            newSet.delete(userHabit.id);
            return newSet;
          });
        }, 500);

        toast({
          title: "Logged • Nice work!",
        });

        // Refresh progress
        fetchUserHabits();
      } catch (error) {
        console.error('Error logging habit:', error);
        toast({
          title: "Failed to log habit",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    } else {
      // Open sheet for duration/count habits
      setSelectedHabit({ template, userHabit });
      setQuickLogOpen(true);
    }
  };

  const handleRecommendationStart = async (recommendation: Recommendation) => {
    try {
      // Fetch the full template
      const { data: template, error } = await supabase
        .from('habit_templates')
        .select('*')
        .eq('slug', recommendation.slug)
        .single();

      if (error) throw error;

      onStartHabit(template as HabitTemplate);
    } catch (error) {
      console.error('Error fetching template:', error);
      toast({
        title: "Failed to load habit",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-64 flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  const scrollToSuggestions = () => {
    const suggestionsElement = document.querySelector('[aria-label="Suggested habits for you"]');
    if (suggestionsElement) {
      suggestionsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (userHabits.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">You haven't started any habits yet</h3>
          <p className="text-sm text-muted-foreground mb-6">Pick one from 'For you' to get rolling.</p>
          <Button onClick={scrollToSuggestions} variant="outline">
            See suggestions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Habits</h2>
          <span className="text-sm text-muted-foreground">
            {userHabits.length} active
          </span>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-2">
          {userHabits.map((userHabit) => {
            const template = habitTemplates[userHabit.slug];
            const progress = weeklyProgress[userHabit.slug];
            
            if (!template) return null;

            return (
              <Card key={userHabit.id} className="flex-shrink-0 w-64">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm line-clamp-2">{template.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getDomainColor(template.domain)}>
                            {template.domain}
                          </Badge>
                          {userHabit.reminder_at && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {userHabit.reminder_at}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Weekly progress chip */}
                    <motion.div 
                      className="text-xs bg-muted rounded-md px-2 py-1"
                      animate={animatingHabits.has(userHabit.id) && !prefersReducedMotion ? {
                        scale: [1, 1.1, 1],
                        backgroundColor: ['hsl(var(--muted))', 'hsl(var(--primary) / 0.1)', 'hsl(var(--muted))']
                      } : {}}
                      transition={{ duration: 0.5, type: 'spring' }}
                    >
                      This week: {progress?.completions || 0}
                      {progress?.minutes && ` (${Math.round(progress.minutes)}m)`}
                    </motion.div>

                    {/* Quick log button */}
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleQuickLog(userHabit, template)}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Log now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick log sheet */}
      <QuickLogSheet
        open={quickLogOpen}
        onOpenChange={setQuickLogOpen}
        template={selectedHabit?.template || null}
        userHabit={selectedHabit?.userHabit || null}
        onSuccess={() => {
          toast({ title: "Logged • Nice work!" });
          fetchUserHabits();
          setSelectedHabit(null);
        }}
      />
    </>
  );
}