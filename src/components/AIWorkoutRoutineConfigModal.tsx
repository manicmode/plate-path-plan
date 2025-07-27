import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Target, Clock, Dumbbell, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface AIWorkoutRoutineConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoutineCreated?: (routine: any) => void;
}

export const AIWorkoutRoutineConfigModal: React.FC<AIWorkoutRoutineConfigModalProps> = ({
  isOpen,
  onClose,
  onRoutineCreated
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    preferred_routine_name: '',
    routine_goal: '',
    split_type: '',
    days_per_week: 3,
    available_time_per_day: 45,
    fitness_level: '',
    equipment_available: [] as string[]
  });

  const goals = [
    { value: 'build_muscle', label: 'Build Muscle', emoji: '💪' },
    { value: 'lose_weight', label: 'Lose Weight', emoji: '🔥' },
    { value: 'improve_endurance', label: 'Improve Endurance', emoji: '🏃' },
    { value: 'increase_strength', label: 'Increase Strength', emoji: '🏋️' },
    { value: 'flexibility', label: 'Flexibility & Mobility', emoji: '🧘' },
    { value: 'general_fitness', label: 'General Fitness', emoji: '⚡' }
  ];

  const splitTypes = [
    { value: 'full_body', label: 'Full Body', description: 'Work all muscle groups each session' },
    { value: 'upper_lower', label: 'Upper/Lower', description: 'Alternate between upper and lower body' },
    { value: 'push_pull_legs', label: 'Push/Pull/Legs', description: 'Chest/shoulders/triceps, back/biceps, legs' },
    { value: 'body_part_split', label: 'Body Part Split', description: 'Focus on specific muscle groups each day' }
  ];

  const fitnessLevels = [
    { value: 'beginner', label: 'Beginner', description: 'New to fitness or returning after a break' },
    { value: 'intermediate', label: 'Intermediate', description: 'Regular exercise for 6+ months' },
    { value: 'advanced', label: 'Advanced', description: 'Experienced with complex movements' }
  ];

  const equipmentOptions = [
    'bodyweight_only',
    'dumbbells',
    'barbell',
    'resistance_bands',
    'kettlebells',
    'pull_up_bar',
    'yoga_mat',
    'gym_access'
  ];

  const handleEquipmentToggle = (equipment: string) => {
    setFormData(prev => ({
      ...prev,
      equipment_available: prev.equipment_available.includes(equipment)
        ? prev.equipment_available.filter(e => e !== equipment)
        : [...prev.equipment_available, equipment]
    }));
  };

  const handleGenerate = async () => {
    if (!user) {
      toast.error('Please log in to generate a routine');
      return;
    }

    if (!formData.routine_goal || !formData.split_type || !formData.fitness_level) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.equipment_available.length === 0) {
      toast.error('Please select at least one equipment option');
      return;
    }

    try {
      setLoading(true);
      
      // Generate routine plan using AI
      const { data: planData, error: planError } = await supabase.functions.invoke('generate-routine-plan', {
        body: {
          user_id: user.id,
          routine_goal: formData.routine_goal,
          split_type: formData.split_type,
          days_per_week: formData.days_per_week,
          available_time_per_day: formData.available_time_per_day,
          fitness_level: formData.fitness_level,
          equipment_available: formData.equipment_available.join(', '),
          preferred_routine_name: formData.preferred_routine_name || `AI ${formData.routine_goal} Routine`
        }
      });

      if (planError) throw planError;
      
      if (!planData?.success || !planData?.plan) {
        throw new Error('Failed to generate routine plan');
      }

      // Save the generated routine to database
      const { data: routine, error: saveError } = await supabase
        .from('ai_routines')
        .insert({
          user_id: user.id,
          routine_name: planData.plan.routine_name,
          routine_goal: formData.routine_goal,
          split_type: formData.split_type,
          days_per_week: formData.days_per_week,
          estimated_duration_minutes: formData.available_time_per_day,
          fitness_level: formData.fitness_level,
          equipment_needed: formData.equipment_available,
          routine_data: planData.plan,
          is_active: false
        })
        .select()
        .single();

      if (saveError) throw saveError;

      toast.success('🎉 AI Routine Generated Successfully!', {
        description: `Your personalized ${formData.routine_goal} routine is ready to start!`
      });

      onRoutineCreated?.(routine);
      onClose();
      
      // Reset form
      setFormData({
        preferred_routine_name: '',
        routine_goal: '',
        split_type: '',
        days_per_week: 3,
        available_time_per_day: 45,
        fitness_level: '',
        equipment_available: []
      });

    } catch (error) {
      console.error('Error generating routine:', error);
      toast.error('Failed to generate routine. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Routine Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Routine Name */}
          <div className="space-y-2">
            <Label htmlFor="routine-name">Routine Name (Optional)</Label>
            <Input
              id="routine-name"
              placeholder="e.g., My Summer Shred Plan"
              value={formData.preferred_routine_name}
              onChange={(e) => setFormData(prev => ({ ...prev, preferred_routine_name: e.target.value }))}
            />
          </div>

          {/* Goal Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Fitness Goal *
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {goals.map((goal) => (
                <Card
                  key={goal.value}
                  className={`cursor-pointer transition-colors ${
                    formData.routine_goal === goal.value
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, routine_goal: goal.value }))}
                >
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl mb-1">{goal.emoji}</div>
                    <div className="text-sm font-medium">{goal.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Split Type */}
          <div className="space-y-3">
            <Label>Workout Split Type *</Label>
            <div className="space-y-2">
              {splitTypes.map((split) => (
                <Card
                  key={split.value}
                  className={`cursor-pointer transition-colors ${
                    formData.split_type === split.value
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, split_type: split.value }))}
                >
                  <CardContent className="p-3">
                    <div className="font-medium">{split.label}</div>
                    <div className="text-sm text-muted-foreground">{split.description}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Days Per Week & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Days Per Week
              </Label>
              <Select
                value={formData.days_per_week.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, days_per_week: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="4">4 days</SelectItem>
                  <SelectItem value="5">5 days</SelectItem>
                  <SelectItem value="6">6 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Per Session
              </Label>
              <Select
                value={formData.available_time_per_day.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, available_time_per_day: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="75">75 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fitness Level */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Fitness Level *
            </Label>
            <div className="space-y-2">
              {fitnessLevels.map((level) => (
                <Card
                  key={level.value}
                  className={`cursor-pointer transition-colors ${
                    formData.fitness_level === level.value
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, fitness_level: level.value }))}
                >
                  <CardContent className="p-3">
                    <div className="font-medium">{level.label}</div>
                    <div className="text-sm text-muted-foreground">{level.description}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Available Equipment *
            </Label>
            <div className="flex flex-wrap gap-2">
              {equipmentOptions.map((equipment) => (
                <Badge
                  key={equipment}
                  variant={formData.equipment_available.includes(equipment) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleEquipmentToggle(equipment)}
                >
                  {equipment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Routine
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};