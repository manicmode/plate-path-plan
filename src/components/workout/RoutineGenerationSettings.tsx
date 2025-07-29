import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Target, Clock, Dumbbell, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RoutineGenerationSettingsProps {
  currentRoutine?: any;
  onGenerate: (preferences: any) => void;
  onClose: () => void;
}

const fitnessLevels = [
  { value: 'beginner', label: 'Beginner', description: 'New to working out' },
  { value: 'intermediate', label: 'Intermediate', description: '6+ months experience' },
  { value: 'advanced', label: 'Advanced', description: '2+ years experience' },
  { value: 'expert', label: 'Expert', description: 'Competitive level' }
];

const primaryGoals = [
  { value: 'strength', label: 'Build Strength', icon: '💪' },
  { value: 'muscle_gain', label: 'Muscle Gain', icon: '🏗️' },
  { value: 'fat_loss', label: 'Fat Loss', icon: '🔥' },
  { value: 'endurance', label: 'Endurance', icon: '🏃' },
  { value: 'general_fitness', label: 'General Fitness', icon: '⚡' },
  { value: 'flexibility', label: 'Flexibility', icon: '🤸' }
];

const splitTypes = [
  { value: 'full_body', label: 'Full Body', description: 'Work all muscles each session' },
  { value: 'push_pull_legs', label: 'Push/Pull/Legs', description: 'Split by movement patterns' },
  { value: 'upper_lower', label: 'Upper/Lower', description: 'Alternate upper and lower body' },
  { value: 'body_part', label: 'Body Part Split', description: 'Focus on specific muscles' },
  { value: 'functional', label: 'Functional', description: 'Movement-based training' }
];

const availableEquipment = [
  'bodyweight', 'dumbbells', 'barbell', 'resistance_bands', 'kettlebells', 
  'pull_up_bar', 'bench', 'cable_machine', 'cardio_equipment', 'full_gym'
];

export function RoutineGenerationSettings({
  currentRoutine,
  onGenerate,
  onClose
}: RoutineGenerationSettingsProps) {
  const [preferences, setPreferences] = useState({
    fitness_level: 'intermediate',
    primary_goals: ['general_fitness'],
    preferred_split: 'push_pull_legs',
    days_per_week: 4,
    session_duration_minutes: 45,
    available_equipment: ['bodyweight', 'dumbbells']
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_fitness_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setPreferences({
          fitness_level: data.fitness_level || 'intermediate',
          primary_goals: data.primary_goals || ['general_fitness'],
          preferred_split: data.preferred_split || 'push_pull_legs',
          days_per_week: data.days_per_week || 4,
          session_duration_minutes: data.session_duration_minutes || 45,
          available_equipment: data.available_equipment || ['bodyweight', 'dumbbells']
        });
      }
    } catch (error) {
      console.log('No existing preferences found');
    }
  };

  const saveAndGenerate = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Save preferences
      await supabase
        .from('user_fitness_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      onGenerate(preferences);
      onClose();
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGoal = (goal: string) => {
    const newGoals = preferences.primary_goals.includes(goal)
      ? preferences.primary_goals.filter(g => g !== goal)
      : [...preferences.primary_goals, goal];
    
    if (newGoals.length > 0) {
      setPreferences(prev => ({ ...prev, primary_goals: newGoals }));
    }
  };

  const toggleEquipment = (equipment: string) => {
    const newEquipment = preferences.available_equipment.includes(equipment)
      ? preferences.available_equipment.filter(e => e !== equipment)
      : [...preferences.available_equipment, equipment];
    
    if (newEquipment.length > 0) {
      setPreferences(prev => ({ ...prev, available_equipment: newEquipment }));
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Routine Generation Settings</DialogTitle>
          <DialogDescription>
            Customize your workout routine preferences for intelligent generation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Fitness Level */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Fitness Level
            </Label>
            <Select
              value={preferences.fitness_level}
              onValueChange={(value) => setPreferences(prev => ({ ...prev, fitness_level: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fitnessLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div>
                      <div className="font-medium">{level.label}</div>
                      <div className="text-xs text-muted-foreground">{level.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Primary Goals */}
          <div className="space-y-3">
            <Label>Primary Goals (select multiple)</Label>
            <div className="grid grid-cols-2 gap-2">
              {primaryGoals.map((goal) => (
                <Card
                  key={goal.value}
                  className={`cursor-pointer transition-all ${
                    preferences.primary_goals.includes(goal.value)
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => toggleGoal(goal.value)}
                >
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl mb-1">{goal.icon}</div>
                    <div className="text-sm font-medium">{goal.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Split Type */}
          <div className="space-y-3">
            <Label>Preferred Training Split</Label>
            <Select
              value={preferences.preferred_split}
              onValueChange={(value) => setPreferences(prev => ({ ...prev, preferred_split: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {splitTypes.map((split) => (
                  <SelectItem key={split.value} value={split.value}>
                    <div>
                      <div className="font-medium">{split.label}</div>
                      <div className="text-xs text-muted-foreground">{split.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Days per Week & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Days per Week
              </Label>
              <Select
                value={preferences.days_per_week.toString()}
                onValueChange={(value) => setPreferences(prev => ({ ...prev, days_per_week: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 7].map((days) => (
                    <SelectItem key={days} value={days.toString()}>
                      {days} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Session Duration
              </Label>
              <Select
                value={preferences.session_duration_minutes.toString()}
                onValueChange={(value) => setPreferences(prev => ({ ...prev, session_duration_minutes: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[20, 30, 45, 60, 75, 90].map((duration) => (
                    <SelectItem key={duration} value={duration.toString()}>
                      {duration} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Available Equipment */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Available Equipment
            </Label>
            <div className="flex flex-wrap gap-2">
              {availableEquipment.map((equipment) => (
                <Badge
                  key={equipment}
                  variant={preferences.available_equipment.includes(equipment) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleEquipment(equipment)}
                >
                  {equipment.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveAndGenerate} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Target className="mr-2 h-4 w-4" />
            )}
            Generate Routine
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}