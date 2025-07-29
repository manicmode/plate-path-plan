import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface WorkoutPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoutineCreated?: (routine: any) => void;
}

export const WorkoutPreferencesModal: React.FC<WorkoutPreferencesModalProps> = ({
  isOpen,
  onClose,
  onRoutineCreated
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fitnessGoal: '',
    trainingSplit: '',
    workoutTime: '',
    equipment: '',
    weeklyFrequency: ''
  });

  const fitnessGoals = [
    { value: 'build_muscle', label: 'Build Muscle & Strength' },
    { value: 'lose_weight', label: 'Weight Loss & Fat Burn' },
    { value: 'improve_endurance', label: 'Improve Endurance' },
    { value: 'general_fitness', label: 'General Fitness' },
    { value: 'flexibility', label: 'Flexibility & Mobility' },
    { value: 'sports_performance', label: 'Sports Performance' }
  ];

  const trainingSplits = [
    { value: 'full_body', label: 'Full Body (3x/week)' },
    { value: 'upper_lower', label: 'Upper/Lower Split' },
    { value: 'push_pull_legs', label: 'Push/Pull/Legs' },
    { value: 'body_part_split', label: 'Body Part Split' },
    { value: 'hiit_cardio', label: 'HIIT & Cardio Focus' }
  ];

  const workoutDurations = [
    { value: '30', label: '30 minutes' },
    { value: '45', label: '45 minutes' },
    { value: '60', label: '60 minutes' },
    { value: '75', label: '75 minutes' },
    { value: '90', label: '90+ minutes' }
  ];

  const equipmentOptions = [
    { value: 'bodyweight', label: 'Bodyweight Only' },
    { value: 'home_basic', label: 'Home (Dumbbells, Bands)' },
    { value: 'home_advanced', label: 'Home Gym Setup' },
    { value: 'gym_access', label: 'Full Gym Access' },
    { value: 'minimal', label: 'Minimal Equipment' }
  ];

  const weeklyFrequencies = [
    { value: '2', label: '2 days per week' },
    { value: '3', label: '3 days per week' },
    { value: '4', label: '4 days per week' },
    { value: '5', label: '5 days per week' },
    { value: '6', label: '6+ days per week' }
  ];

  const handleGenerate = async () => {
    if (!user) {
      toast.error('Please log in to generate a routine');
      return;
    }

    if (!formData.fitnessGoal || !formData.trainingSplit || !formData.workoutTime || 
        !formData.equipment || !formData.weeklyFrequency) {
      toast.error('Please fill in all preferences');
      return;
    }

    try {
      setLoading(true);
      console.log('Starting routine generation with preferences:', formData);
      
      // Generate routine plan using AI
      const { data: planData, error: planError } = await supabase.functions.invoke('generate-routine-plan', {
        body: {
          user_id: user.id,
          routine_goal: formData.fitnessGoal,
          split_type: formData.trainingSplit,
          days_per_week: parseInt(formData.weeklyFrequency),
          available_time_per_day: parseInt(formData.workoutTime),
          fitness_level: 'intermediate', // Default level
          equipment_available: formData.equipment,
          preferred_routine_name: `AI 8-Week Routine`
        }
      });

      if (planError) {
        console.error('Edge function error:', planError);
        throw planError;
      }
      
      if (!planData?.success || !planData?.plan) {
        console.error('Invalid plan data:', planData);
        throw new Error('Routine generation failed. Please try again.');
      }

      console.log('Generated plan received, saving to database...');

      // Save the generated routine to database
      const { data: routine, error: saveError } = await supabase
        .from('ai_routines')
        .insert({
          user_id: user.id,
          routine_name: planData.plan.routine_name || 'AI 8-Week Routine',
          routine_goal: formData.fitnessGoal,
          split_type: formData.trainingSplit,
          days_per_week: parseInt(formData.weeklyFrequency),
          estimated_duration_minutes: parseInt(formData.workoutTime),
          fitness_level: 'intermediate',
          equipment_needed: [formData.equipment],
          routine_data: planData.plan,
          is_active: true
        })
        .select()
        .single();

      if (saveError) {
        console.error('Database save error:', saveError);
        throw saveError;
      }

      console.log('Routine saved successfully:', routine);

      toast.success('🎉 Your 8-Week Routine is Ready!', {
        description: 'Your personalized workout plan has been generated successfully.'
      });

      onRoutineCreated?.(routine);
      onClose();
      
      // Reset form
      setFormData({
        fitnessGoal: '',
        trainingSplit: '',
        workoutTime: '',
        equipment: '',
        weeklyFrequency: ''
      });

    } catch (error) {
      console.error('Error generating routine:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate routine. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-md max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-700 text-white" 
        showCloseButton={false}
      >
        <DialogHeader className="pr-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
              <DialogTitle className="text-white font-medium">
                Workout Preferences
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white z-10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Fitness Goal */}
          <div className="space-y-3">
            <Label className="text-white font-medium">Fitness Goal</Label>
            <Select 
              value={formData.fitnessGoal} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, fitnessGoal: value }))}
              disabled={loading}
            >
              <SelectTrigger className={`h-12 bg-gray-800 border-gray-600 text-white focus:border-green-500 focus:ring-green-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <SelectValue placeholder="Select your goal" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600 text-white z-50">
                {fitnessGoals.map((goal) => (
                  <SelectItem key={goal.value} value={goal.value} className="text-white hover:bg-gray-700">
                    {goal.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Training Split Style */}
          <div className="space-y-3">
            <Label className="text-white font-medium">Training Split Style</Label>
            <Select 
              value={formData.trainingSplit} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, trainingSplit: value }))}
              disabled={loading}
            >
              <SelectTrigger className={`h-12 bg-gray-800 border-gray-600 text-white focus:border-green-500 focus:ring-green-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <SelectValue placeholder="Select training style" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600 text-white z-50">
                {trainingSplits.map((split) => (
                  <SelectItem key={split.value} value={split.value} className="text-white hover:bg-gray-700">
                    {split.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Workout Time per Day */}
          <div className="space-y-3">
            <Label className="text-white font-medium">Workout Time per Day</Label>
            <Select 
              value={formData.workoutTime} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, workoutTime: value }))}
              disabled={loading}
            >
              <SelectTrigger className={`h-12 bg-gray-800 border-gray-600 text-white focus:border-green-500 focus:ring-green-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600 text-white z-50">
                {workoutDurations.map((duration) => (
                  <SelectItem key={duration.value} value={duration.value} className="text-white hover:bg-gray-700">
                    {duration.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Equipment Available */}
          <div className="space-y-3">
            <Label className="text-white font-medium">Equipment Available</Label>
            <Select 
              value={formData.equipment} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, equipment: value }))}
              disabled={loading}
            >
              <SelectTrigger className={`h-12 bg-gray-800 border-gray-600 text-white focus:border-green-500 focus:ring-green-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <SelectValue placeholder="Select equipment" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600 text-white z-50">
                {equipmentOptions.map((equipment) => (
                  <SelectItem key={equipment.value} value={equipment.value} className="text-white hover:bg-gray-700">
                    {equipment.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Weekly Frequency */}
          <div className="space-y-3">
            <Label className="text-white font-medium">Weekly Frequency</Label>
            <Select 
              value={formData.weeklyFrequency} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, weeklyFrequency: value }))}
              disabled={loading}
            >
              <SelectTrigger className={`h-12 bg-gray-800 border-gray-600 text-white focus:border-green-500 focus:ring-green-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600 text-white z-50">
                {weeklyFrequencies.map((frequency) => (
                  <SelectItem key={frequency.value} value={frequency.value} className="text-white hover:bg-gray-700">
                    {frequency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={loading || !formData.fitnessGoal || !formData.trainingSplit || !formData.workoutTime || !formData.equipment || !formData.weeklyFrequency}
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Generate My 8-Week Routine
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};