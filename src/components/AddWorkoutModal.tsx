import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';

interface AddWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workout: any) => void;
}

const workoutTypes = [
  { value: 'strength', label: 'Strength', emoji: '🏋️' },
  { value: 'cardio', label: 'Cardio', emoji: '🏃' },
  { value: 'flexibility', label: 'Flexibility', emoji: '🧘' },
  { value: 'hiit', label: 'HIIT', emoji: '⚡' },
  { value: 'custom', label: 'Custom', emoji: '✏️' }
];

const workoutGradients = {
  strength: 'from-orange-300 to-red-500',
  cardio: 'from-blue-300 to-cyan-500',
  flexibility: 'from-purple-300 to-pink-500',
  hiit: 'from-yellow-300 to-orange-500',
  custom: 'from-gray-300 to-slate-500'
};

export function AddWorkoutModal({ isOpen, onClose, onSave }: AddWorkoutModalProps) {
  const { playProgressUpdate } = useSound();
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const [formData, setFormData] = useState({
    title: '',
    duration: '',
    workoutType: '',
    summary: '',
    calories: '',
    notes: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.title || !formData.workoutType || !formData.duration) {
      return; // Basic validation
    }

    const selectedType = workoutTypes.find(type => type.value === formData.workoutType);
    const workout = {
      id: Date.now(), // Simple ID generation
      name: formData.title,
      emoji: selectedType?.emoji || '💪',
      type: selectedType?.label || 'Custom',
      duration: `${formData.duration} minutes`,
      calories: formData.calories ? `${formData.calories} kcal` : '0 kcal',
      date: format(date, 'yyyy-MM-dd'),
      time: time,
      summary: formData.summary || 'No summary provided',
      gradient: workoutGradients[formData.workoutType as keyof typeof workoutGradients] || workoutGradients.custom,
      notes: formData.notes
    };

    onSave(workout);
    
    // Play success sound
    playProgressUpdate();
    
    // Reset form
    setFormData({
      title: '',
      duration: '',
      workoutType: '',
      summary: '',
      calories: '',
      notes: ''
    });
    setDate(new Date());
    setTime(() => {
      const now = new Date();
      return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-background border-border animate-in slide-in-from-bottom-4 fade-in-0 duration-300">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Add New Workout
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Workout Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Workout Title *
            </Label>
            <Input
              id="title"
              placeholder="e.g., Upper Body Strength"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="h-12"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-12 justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="text-sm font-medium">
                Time *
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-12 pl-10"
                />
              </div>
            </div>
          </div>

          {/* Duration & Workout Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-sm font-medium">
                Duration (minutes) *
              </Label>
              <Input
                id="duration"
                type="number"
                placeholder="45"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                className="h-12"
                min="1"
                max="999"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Workout Type *</Label>
              <Select value={formData.workoutType} onValueChange={(value) => handleInputChange('workoutType', value)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select workout type" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {workoutTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="cursor-pointer hover:bg-accent">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{type.emoji}</span>
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Exercise Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary" className="text-sm font-medium">
              Exercise Summary *
            </Label>
            <Textarea
              id="summary"
              placeholder="Describe the exercises you performed (e.g., Bench press, shoulder press, rows, pull-ups)"
              value={formData.summary}
              onChange={(e) => handleInputChange('summary', e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calories" className="text-sm font-medium">
                Calories Burned <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="calories"
                type="number"
                placeholder="320"
                value={formData.calories}
                onChange={(e) => handleInputChange('calories', e.target.value)}
                className="h-12"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Notes <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="notes"
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="h-12"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.title || !formData.workoutType || !formData.duration}
            className="px-8 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            Save Workout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}