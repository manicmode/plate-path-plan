import React, { useState } from 'react';
import { CloseButton } from '@/components/ui/close-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ExerciseConfirmationCard } from './ExerciseConfirmationCard';

interface ExerciseLogFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExerciseData) => void;
}

export interface ExerciseData {
  type: string;
  duration: number;
  intensity: 'low' | 'moderate' | 'high';
  caloriesBurned: number;
}

const EXERCISE_TYPES = [
  { value: 'running', label: 'Running', caloriesPerMinute: 10 },
  { value: 'cycling', label: 'Cycling', caloriesPerMinute: 8 },
  { value: 'swimming', label: 'Swimming', caloriesPerMinute: 11 },
  { value: 'walking', label: 'Walking', caloriesPerMinute: 4 },
  { value: 'weightlifting', label: 'Weight Lifting', caloriesPerMinute: 6 },
  { value: 'yoga', label: 'Yoga', caloriesPerMinute: 3 },
  { value: 'pilates', label: 'Pilates', caloriesPerMinute: 4 },
  { value: 'hiit', label: 'HIIT', caloriesPerMinute: 12 },
  { value: 'dancing', label: 'Dancing', caloriesPerMinute: 5 },
  { value: 'basketball', label: 'Basketball', caloriesPerMinute: 8 },
  { value: 'tennis', label: 'Tennis', caloriesPerMinute: 7 },
  { value: 'other', label: 'Other', caloriesPerMinute: 6 },
];

const INTENSITY_MULTIPLIERS = {
  low: 0.7,
  moderate: 1.0,
  high: 1.3,
};

export const ExerciseLogForm = ({ isOpen, onClose, onSubmit }: ExerciseLogFormProps) => {
  const [exerciseType, setExerciseType] = useState('');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState<'low' | 'moderate' | 'high'>('moderate');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseData | null>(null);
  const { toast } = useToast();

  const calculateCalories = () => {
    const selectedExercise = EXERCISE_TYPES.find(ex => ex.value === exerciseType);
    if (!selectedExercise || !duration) return 0;
    
    const baseCalories = selectedExercise.caloriesPerMinute * parseInt(duration);
    return Math.round(baseCalories * INTENSITY_MULTIPLIERS[intensity]);
  };

  const handleSubmit = () => {
    if (!exerciseType || !duration) {
      toast({
        title: "Please fill in all fields",
        description: "Select exercise type and enter duration.",
        variant: "destructive",
      });
      return;
    }

    const exerciseData: ExerciseData = {
      type: exerciseType,
      duration: parseInt(duration),
      intensity,
      caloriesBurned: calculateCalories(),
    };

    setSelectedExercise(exerciseData);
    setShowConfirmation(true);
  };

  const handleConfirmationClose = () => {
    setShowConfirmation(false);
    setSelectedExercise(null);
  };

  const handleConfirmationConfirm = () => {
    // Reset form after successful confirmation
    setExerciseType('');
    setDuration('');
    setIntensity('moderate');
    setShowConfirmation(false);
    setSelectedExercise(null);
    onSubmit?.(selectedExercise!);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader className="pr-12">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">Log Exercise</DialogTitle>
            <CloseButton onClick={onClose} />
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="exercise-type" className="text-sm font-medium mb-2 block">
              Exercise Type
            </Label>
            <Select value={exerciseType} onValueChange={setExerciseType}>
              <SelectTrigger>
                <SelectValue placeholder="Select exercise type" />
              </SelectTrigger>
              <SelectContent>
                {EXERCISE_TYPES.map((exercise) => (
                  <SelectItem key={exercise.value} value={exercise.value}>
                    {exercise.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="duration" className="text-sm font-medium mb-2 block">
              Duration (minutes)
            </Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="30"
              min="1"
              max="300"
            />
          </div>

          <div>
            <Label htmlFor="intensity" className="text-sm font-medium mb-2 block">
              Intensity
            </Label>
            <Select value={intensity} onValueChange={(value: 'low' | 'moderate' | 'high') => setIntensity(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {exerciseType && duration && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Estimated calories burned: <span className="font-semibold text-foreground">{calculateCalories()}</span>
              </p>
            </div>
          )}

          <div className="flex space-x-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              Preview Exercise
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Exercise Confirmation Card */}
      {selectedExercise && (
        <ExerciseConfirmationCard
          exercise={selectedExercise}
          isOpen={showConfirmation}
          onClose={handleConfirmationClose}
          onConfirm={handleConfirmationConfirm}
        />
      )}
    </Dialog>
  );
};