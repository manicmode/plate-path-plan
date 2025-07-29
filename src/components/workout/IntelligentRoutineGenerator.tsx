import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, Unlock, RefreshCw, Zap, Calendar, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { WeeklyRoutineDay } from './WeeklyRoutineDay';
import { RoutineGenerationSettings } from './RoutineGenerationSettings';

interface RoutineData {
  id: string;
  routine_name: string;
  days_per_week: number;
  weekly_routine_data: any;
  muscle_group_schedule: any;
  locked_days: number[];
  primary_goals: string[];
  fitness_level: string;
  created_at: string;
}

export function IntelligentRoutineGenerator() {
  const [currentRoutine, setCurrentRoutine] = useState<RoutineData | null>(null);
  const [lockedDays, setLockedDays] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingDay, setGeneratingDay] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  useEffect(() => {
    loadCurrentRoutine();
  }, []);

  const loadCurrentRoutine = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_generated_routines')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setCurrentRoutine(data);
        setLockedDays(data.locked_days || []);
      }
    } catch (error) {
      console.log('No current routine found');
    }
  };

  const generateFullRoutine = async (preferences?: any) => {
    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Deactivate current routine
      if (currentRoutine) {
        await supabase
          .from('ai_generated_routines')
          .update({ is_active: false })
          .eq('id', currentRoutine.id);
      }

      const { data, error } = await supabase.functions.invoke('generate-intelligent-routine', {
        body: {
          user_id: user.id,
          regenerate_type: 'full_week',
          locked_days: lockedDays,
          current_routine_data: currentRoutine,
          preferences
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setCurrentRoutine(data.routine);
      
      toast({
        title: "🎯 New Routine Generated!",
        description: "Your intelligent workout plan is ready",
      });

    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate routine. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateDay = async (day: string) => {
    const dayIndex = daysOfWeek.indexOf(day);
    if (lockedDays.includes(dayIndex)) {
      toast({
        title: "Day is Locked",
        description: "Unlock the day first to regenerate it",
        variant: "destructive",
      });
      return;
    }

    setGeneratingDay(day);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-intelligent-routine', {
        body: {
          user_id: user.id,
          regenerate_type: 'single_day',
          target_day: day,
          locked_days: lockedDays,
          current_routine_data: currentRoutine
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setCurrentRoutine(data.routine);
      
      toast({
        title: `✨ ${day.charAt(0).toUpperCase() + day.slice(1)} Regenerated!`,
        description: "New exercises added with intelligent variation",
      });

    } catch (error) {
      console.error('Day regeneration error:', error);
      toast({
        title: "Regeneration Failed",
        description: error.message || "Failed to regenerate day. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingDay(null);
    }
  };

  const toggleDayLock = async (day: string) => {
    const dayIndex = daysOfWeek.indexOf(day);
    const newLockedDays = lockedDays.includes(dayIndex)
      ? lockedDays.filter(d => d !== dayIndex)
      : [...lockedDays, dayIndex];
    
    setLockedDays(newLockedDays);

    // Update in database
    if (currentRoutine) {
      await supabase
        .from('ai_generated_routines')
        .update({ locked_days: newLockedDays })
        .eq('id', currentRoutine.id);
    }

    toast({
      title: `${day.charAt(0).toUpperCase() + day.slice(1)} ${newLockedDays.includes(dayIndex) ? 'Locked' : 'Unlocked'}`,
      description: newLockedDays.includes(dayIndex) ? "Day is protected from changes" : "Day can now be regenerated",
    });
  };

  if (!currentRoutine && !isGenerating) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center mb-4">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Intelligent Workout Routine Generator</CardTitle>
          <CardDescription>
            Get a personalized AI-powered workout routine that adapts to your goals, equipment, and progress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-muted/50">
              <Target className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-medium">Personalized</h3>
              <p className="text-sm text-muted-foreground">Based on your goals and equipment</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <RefreshCw className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-medium">Adaptive</h3>
              <p className="text-sm text-muted-foreground">Regenerates with intelligent variation</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <Lock className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-medium">Flexible</h3>
              <p className="text-sm text-muted-foreground">Lock days you love, change the rest</p>
            </div>
          </div>
          
          <div className="text-center">
            <Button 
              onClick={() => setShowSettings(true)}
              size="lg"
              className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary"
            >
              <Zap className="mr-2 h-5 w-5" />
              Generate My Routine
            </Button>
          </div>
        </CardContent>

        {showSettings && (
          <RoutineGenerationSettings
            onGenerate={generateFullRoutine}
            onClose={() => setShowSettings(false)}
          />
        )}
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {currentRoutine?.routine_name || 'Your Routine'}
              </CardTitle>
              <CardDescription>
                {currentRoutine?.days_per_week} days per week • {currentRoutine?.fitness_level}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => generateFullRoutine()}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Regenerate All
              </Button>
              <Button onClick={() => setShowSettings(true)}>
                Settings
              </Button>
            </div>
          </div>

          {/* Goals & Stats */}
          <div className="flex flex-wrap gap-2 mt-4">
            {currentRoutine?.primary_goals?.map((goal) => (
              <Badge key={goal} variant="secondary">
                {goal}
              </Badge>
            ))}
            {lockedDays.length > 0 && (
              <Badge variant="outline" className="text-amber-600">
                <Lock className="mr-1 h-3 w-3" />
                {lockedDays.length} locked day{lockedDays.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Loading State */}
      {isGenerating && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <h3 className="font-medium">Generating your intelligent routine...</h3>
              <p className="text-sm text-muted-foreground">
                Analyzing your goals, equipment, and recent activity
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Schedule */}
      {currentRoutine && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {daysOfWeek.map((day, index) => (
            <WeeklyRoutineDay
              key={day}
              day={day}
              dayData={currentRoutine.weekly_routine_data?.[day]}
              isLocked={lockedDays.includes(index)}
              isRegenerating={generatingDay === day}
              onToggleLock={() => toggleDayLock(day)}
              onRegenerate={() => regenerateDay(day)}
              muscleGroups={currentRoutine.muscle_group_schedule?.[day] || []}
            />
          ))}
        </div>
      )}

      {showSettings && (
        <RoutineGenerationSettings
          currentRoutine={currentRoutine}
          onGenerate={generateFullRoutine}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}