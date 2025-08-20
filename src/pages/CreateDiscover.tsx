import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Sparkles, Info, Clock, Calendar, CheckCircle } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAiSuggestions } from '@/hooks/useAiSuggestions';
import { CarouselHabitCard } from '@/components/habit-central/CarouselHabitCard';
import { HabitInfoModal } from '@/components/habit-central/HabitInfoModal';
import { HabitAddModal, HabitConfig } from '@/components/habit-central/HabitAddModal';
import { SuggestionReasonDrawer } from '@/components/habit-central/SuggestionReasonDrawer';
import { EmojiPicker } from '@/components/ui/emoji-picker';

// Domain emojis
const getDomainEmoji = (domain: string) => {
  switch (domain) {
    case 'nutrition': return '🍎';
    case 'exercise': return '🏃';
    case 'recovery': return '🌙';
    case 'lifestyle': return '⚡';
    default: return '⚡';
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

interface CustomHabitForm {
  title: string;
  domain: 'nutrition' | 'exercise' | 'recovery' | 'lifestyle';
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  icon: string;
  targetPerWeek: number;
  frequency: 'none' | 'daily' | 'weekly';
  timeLocal: string;
  daysOfWeek: number[];
}

const initialForm = {
  title: '',
  description: '',
  domain: '',
  difficulty: '',
  icon: '',
  targetPerWeek: 3,
  frequency: 'none', // none, daily, weekly
  timeLocal: '09:00',
  daysOfWeek: [] as number[] // 1-7 (Mon-Sun)
};

const DEFAULT_FORM: Omit<CustomHabitForm, 'domain' | 'difficulty'> & { domain: string; difficulty: string } = {
  title: '',
  domain: '',
  difficulty: '',
  description: '',
  icon: '',
  targetPerWeek: 3,
  frequency: 'none',
  timeLocal: '09:00',
  daysOfWeek: []
};

export default function CreateDiscover() {
  const { user, ready } = useSupabaseAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form state
  const [form, setForm] = useState<any>(initialForm);
  const [isCreating, setIsCreating] = useState(false);

  // Modal state for AI suggestions
  const [selectedHabitForInfo, setSelectedHabitForInfo] = useState<any>(null);
  const [selectedHabitForAdd, setSelectedHabitForAdd] = useState<any>(null);
  const [selectedHabitForReason, setSelectedHabitForReason] = useState<any>(null);
  const [isAddingHabit, setIsAddingHabit] = useState(false);

  // Load AI suggestions with new hook
  const { 
    data: suggestions,
    loading: loadingSuggestions,
    error: suggestionsError,
    removeFromSuggestions
  } = useAiSuggestions(8);

  // Update icon when domain changes
  useEffect(() => {
    if (form.domain) {
      setForm(prev => ({
        ...prev,
        icon: getDomainEmoji(form.domain)
      }));
    }
  }, [form.domain]);

  // Handle form field updates
  const updateForm = useCallback((field: keyof CustomHabitForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle day selection for custom frequency
  const toggleDay = useCallback((day: number) => {
    setForm(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort()
    }));
  }, []);

  // Validate form
  const isFormValid = form.title.trim() && form.domain && form.difficulty;

  // Create custom habit
  const handleCreateHabit = useCallback(async () => {
    if (!ready || !user || !isFormValid) return;

    setIsCreating(true);
    try {
      const { data: slug, error } = await supabase.rpc('rpc_create_custom_habit', {
        p_title: form.title.trim(),
        p_domain: form.domain,
        p_difficulty: form.difficulty,
        p_description: form.description.trim() || null,
        p_icon: form.icon || null,
        p_target_per_week: form.targetPerWeek,
        p_use_auto: false,
        p_frequency: form.frequency === 'none' ? null : form.frequency,
        p_time_local: form.frequency === 'none' ? null : form.timeLocal,
        p_days_of_week: form.frequency === 'weekly' ? form.daysOfWeek : null
      });

      if (error) throw error;

      toast({
        title: "Habit created ✓",
        description: "Your custom habit is now active!",
        action: (
          <Button variant="outline" size="sm" onClick={() => navigate('/habit')}>
            Go to My Habits
          </Button>
        )
      });

      // Reset form
      setForm(initialForm);

    } catch (error) {
      console.error('Error creating custom habit:', error);
      toast({
        title: "Failed to create habit",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  }, [ready, user, isFormValid, form, toast, navigate]);

  // Handle adding suggested habit
  const handleAddSuggestedHabit = useCallback(async (habit: any, config: HabitConfig) => {
    if (!ready || !user?.id) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to add habits",
        variant: "destructive"
      });
      return;
    }

    setIsAddingHabit(true);
    try {
      const { data, error } = await supabase.rpc('rpc_upsert_user_habit_by_slug', {
        p_habit_slug: habit.slug,
        p_target_per_week: config.targetPerWeek
      });

      if (error) throw error;

      toast({ 
        title: "Habit added ✓",
        description: `${habit.title} added to your active habits`
      });
      
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
      
      // Remove from suggestions list optimistically
      removeFromSuggestions(habit.slug);
      setSelectedHabitForAdd(null);
      
      // Do not navigate - keep user in discovery mode
    } catch (error) {
      console.error('Error adding habit:', error);
      toast({
        title: "Failed to add habit",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsAddingHabit(false);
    }
  }, [ready, user?.id, toast, navigate, removeFromSuggestions]);

  // Handle suggestion feedback
  const handleNotHelpful = (habit: any) => {
    removeFromSuggestions(habit.slug);
    // Store feedback in localStorage for session
    const feedback = JSON.parse(localStorage.getItem('suggestion_feedback') || '{}');
    feedback[habit.slug] = 'not_helpful';
    localStorage.setItem('suggestion_feedback', JSON.stringify(feedback));
  };

  const handleMoreLikeThis = (habit: any) => {
    // Store positive feedback for future improvements
    const feedback = JSON.parse(localStorage.getItem('suggestion_feedback') || '{}');
    feedback[habit.slug] = 'helpful';
    localStorage.setItem('suggestion_feedback', JSON.stringify(feedback));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Create & Discover
        </h1>
        <p className="text-muted-foreground">
          Build your own habits or discover AI-powered suggestions
        </p>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Manual Habit Builder */}
        <motion.div variants={fadeInUp}>
          <Card className="relative overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
            {/* Aurora effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 animate-pulse" />
            
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Create your own habit</CardTitle>
                  <CardDescription>Name it, schedule it, track it.</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="habit-name">Habit name *</Label>
                  <Input
                    id="habit-name"
                    placeholder="e.g. Morning stretches"
                    value={form.title}
                    onChange={(e) => updateForm('title', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Emoji (optional)</Label>
                  <EmojiPicker
                    value={form.icon}
                    onChange={(emoji) => updateForm('icon', emoji)}
                    placeholder="Pick an emoji"
                  />
                </div>
              </div>

              {/* Domain & Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Domain *</Label>
                  <Select value={form.domain} onValueChange={(value) => updateForm('domain', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose domain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nutrition">🍎 Nutrition</SelectItem>
                      <SelectItem value="exercise">🏃 Exercise</SelectItem>
                      <SelectItem value="recovery">🌙 Recovery</SelectItem>
                      <SelectItem value="lifestyle">⚡ Lifestyle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Difficulty *</Label>
                  <Select value={form.difficulty} onValueChange={(value) => updateForm('difficulty', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of your habit..."
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  rows={2}
                />
              </div>

              {/* Target per week */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Target per week</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateForm('targetPerWeek', Math.max(1, form.targetPerWeek - 1))}
                      disabled={form.targetPerWeek <= 1}
                    >
                      -
                    </Button>
                    <div className="min-w-[3rem] text-center font-medium">
                      {form.targetPerWeek}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateForm('targetPerWeek', Math.min(7, form.targetPerWeek + 1))}
                      disabled={form.targetPerWeek >= 7}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Manual reminders */}
                <div className="space-y-3">
                  <Label>Reminders</Label>
                  <div className="space-y-3">
                    {/* Frequency */}
                    <div className="space-y-2">
                      <Label className="text-sm">Frequency</Label>
                      <Select value={form.frequency} onValueChange={(value) => updateForm('frequency', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No reminders</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Time picker (visible for daily/weekly) */}
                    {form.frequency !== 'none' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-3"
                      >
                        <div className="space-y-2">
                          <Label className="text-sm">Time</Label>
                          <Input
                            type="time"
                            value={form.timeLocal}
                            onChange={(e) => updateForm('timeLocal', e.target.value)}
                          />
                        </div>

                        {/* Days of week for weekly */}
                        {form.frequency === 'weekly' && (
                          <div className="space-y-2">
                            <Label className="text-sm">Days of week</Label>
                            <div className="flex flex-wrap gap-2">
                              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                                <Button
                                  key={day}
                                  type="button"
                                  variant={form.daysOfWeek.includes(index + 1) ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => toggleDay(index + 1)}
                                >
                                  {day}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              {/* Create Button */}
              <Button
                onClick={handleCreateHabit}
                disabled={!isFormValid || isCreating}
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    Create habit
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Suggestions */}
        <motion.div variants={fadeInUp}>
          <Card className="relative overflow-hidden border border-secondary/20 bg-gradient-to-br from-secondary/5 via-background to-accent/5">
            {/* Aurora effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 via-transparent to-accent/10 animate-pulse" />
            
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="relative p-2 bg-secondary/10 rounded-xl">
                  {/* Pulsating glow effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400/30 via-blue-400/30 to-cyan-400/30 animate-pulse" />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400/20 via-blue-400/20 to-cyan-400/20 animate-ping" />
                  
                  {/* Icon with pulsating and glow effects */}
                  <div className="relative flex items-center justify-center">
                    <span className="text-2xl animate-pulse drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]">🧠</span>
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl">AI Suggestions</CardTitle>
                  <CardDescription>Tailored habits based on your goals & profile</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative">
              {/* Loading state - show skeletons while loading */}
              {loadingSuggestions && !suggestions && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="rounded-2xl h-48 bg-muted/30 animate-pulse flex flex-col p-4">
                      <div className="h-6 bg-muted/50 rounded mb-2" />
                      <div className="h-4 bg-muted/40 rounded mb-4 w-2/3" />
                      <div className="flex-1" />
                      <div className="flex gap-2">
                        <div className="h-8 bg-muted/40 rounded flex-1" />
                        <div className="h-8 bg-muted/40 rounded flex-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error state */}
              {suggestionsError && (!suggestions || suggestions.length === 0) && (
                <div className="text-center py-12 space-y-4">
                  <p className="text-sm text-red-400">
                    Couldn't load suggestions
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.location.reload()}
                    className="mx-auto"
                  >
                    Try again
                  </Button>
                </div>
              )}

              {/* Empty state */}
              {!loadingSuggestions && !suggestionsError && suggestions && suggestions.length === 0 && (
                <div className="text-center py-12 space-y-2">
                  <p className="text-muted-foreground">No suggestions right now</p>
                  <p className="text-sm text-muted-foreground">Try adding a goal or logging a habit for personalized recommendations.</p>
                </div>
              )}

              {/* Results - only show when we have data and not loading initial state */}
              {!loadingSuggestions && suggestions && suggestions.length > 0 && (
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suggestions.slice(0, 6).map((habit, index) => (
                  <CarouselHabitCard
                    key={habit.slug}
                    habit={{
                      id: habit.slug,
                      slug: habit.slug,
                      title: habit.title,
                      description: habit.description || '',
                      domain: habit.domain,
                      difficulty: habit.difficulty,
                      category: habit.domain,
                      score: habit.score,
                      reasons: habit.reasons
                    }}
                    index={index}
                    onInfo={() => setSelectedHabitForInfo({
                      id: habit.slug,
                      slug: habit.slug,
                      title: habit.title,
                      description: habit.description || '',
                      domain: habit.domain,
                      difficulty: habit.difficulty,
                      category: habit.domain
                    })}
                    onAdd={() => {
                      setSelectedHabitForAdd(habit);
                    }}
                    onWhyThis={() => setSelectedHabitForReason(habit)}
                    isAdded={false}
                  />
                  ))}
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Info Modal */}
      <HabitInfoModal
        habit={selectedHabitForInfo}
        open={!!selectedHabitForInfo}
        onClose={() => setSelectedHabitForInfo(null)}
        onAdd={() => setSelectedHabitForAdd(selectedHabitForInfo)}
      />

      {/* Add Modal */}
      <HabitAddModal
        habit={selectedHabitForAdd}
        open={!!selectedHabitForAdd}
        onClose={() => setSelectedHabitForAdd(null)}
        onConfirm={(config) => selectedHabitForAdd && handleAddSuggestedHabit(selectedHabitForAdd, config)}
        isAdding={isAddingHabit}
      />

      {/* Suggestion Reason Drawer */}
      <SuggestionReasonDrawer
        habit={selectedHabitForReason}
        open={!!selectedHabitForReason}
        onClose={() => setSelectedHabitForReason(null)}
        onNotHelpful={() => handleNotHelpful(selectedHabitForReason)}
        onMoreLikeThis={() => handleMoreLikeThis(selectedHabitForReason)}
      />
    </div>
  );
}