import React, { useState } from 'react';
import { X, Plus, Calendar, Clock, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

interface CreateRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (routine: any) => void;
  editingRoutine?: any;
}

const routineTypes = [
  { value: 'strength', label: 'Strength', emoji: '🏋️' },
  { value: 'cardio', label: 'Cardio', emoji: '🏃' },
  { value: 'hiit', label: 'HIIT', emoji: '⚡' },
  { value: 'fullbody', label: 'Full Body', emoji: '🔁' },
  { value: 'flexibility', label: 'Flexibility', emoji: '🧘' },
  { value: 'custom', label: 'Custom', emoji: '✏️' }
];

const routineGradients = {
  strength: 'from-red-400 to-orange-600',
  cardio: 'from-blue-400 to-cyan-600',
  hiit: 'from-yellow-400 to-orange-600',
  fullbody: 'from-purple-400 to-pink-600',
  flexibility: 'from-green-400 to-teal-600',
  custom: 'from-gray-400 to-slate-600'
};

const daysOfWeek = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export function CreateRoutineModal({ isOpen, onClose, onSave, editingRoutine }: CreateRoutineModalProps) {
  const [formData, setFormData] = useState({
    title: editingRoutine?.title || '',
    routineType: editingRoutine?.routineType || '',
    duration: editingRoutine?.duration || '',
    notes: editingRoutine?.notes || '',
    weeklyPlan: editingRoutine?.weeklyPlan || daysOfWeek.reduce((acc, day) => {
      acc[day] = '';
      return acc;
    }, {} as Record<string, string>)
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleWeeklyPlanChange = (day: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      weeklyPlan: { ...prev.weeklyPlan, [day]: value }
    }));
  };

  const handleSave = () => {
    if (!formData.title || !formData.routineType) {
      return; // Basic validation
    }

    const selectedType = routineTypes.find(type => type.value === formData.routineType);
    const routine = {
      id: editingRoutine?.id || Date.now(),
      title: formData.title,
      emoji: selectedType?.emoji || '💪',
      type: selectedType?.label || 'Custom',
      routineType: formData.routineType,
      duration: formData.duration || 'Not specified',
      gradient: routineGradients[formData.routineType as keyof typeof routineGradients] || routineGradients.custom,
      weeklyPlan: formData.weeklyPlan,
      notes: formData.notes,
      createdAt: editingRoutine?.createdAt || new Date().toISOString()
    };

    onSave(routine);
    
    // Reset form
    setFormData({
      title: '',
      routineType: '',
      duration: '',
      notes: '',
      weeklyPlan: daysOfWeek.reduce((acc, day) => {
        acc[day] = '';
        return acc;
      }, {} as Record<string, string>)
    });
    
    onClose();
  };

  const getActiveDays = () => {
    return Object.entries(formData.weeklyPlan).filter(([_, exercises]) => (exercises as string).trim().length > 0).length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-background border-border animate-in slide-in-from-bottom-4 fade-in-0 duration-300" showCloseButton={false}>
        <DialogHeader className="space-y-3 pr-12">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {editingRoutine ? 'Edit Routine' : 'Create New Routine'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 rounded-full hover:bg-muted z-10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Routine Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Routine Title *
              </Label>
              <Input
                id="title"
                placeholder="e.g., Summer Shred, Push/Pull/Legs"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Routine Type *</Label>
              <Select value={formData.routineType} onValueChange={(value) => handleInputChange('routineType', value)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select routine type" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {routineTypes.map((type) => (
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-sm font-medium">
                Estimated Duration per Session
              </Label>
              <Input
                id="duration"
                placeholder="e.g., 45-60 minutes"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Quick Stats</Label>
              <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 h-12">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{getActiveDays()}/7 days active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Planner */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <Label className="text-lg font-semibold">Weekly Plan</Label>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {daysOfWeek.map((day) => (
                <Card key={day} className="border border-border/50 hover:border-border transition-colors">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <Label htmlFor={`day-${day}`} className="text-sm font-medium text-purple-700 dark:text-purple-400">
                        {day}
                      </Label>
                      <Textarea
                        id={`day-${day}`}
                        placeholder="e.g., Bench Press - 3x8, Squats - 3x10, or 'Rest Day'"
                        value={formData.weeklyPlan[day]}
                        onChange={(e) => handleWeeklyPlanChange(day, e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this routine, progression tips, etc."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="min-h-[100px] resize-none"
            />
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
            disabled={!formData.title || !formData.routineType}
            className="px-8 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            {editingRoutine ? 'Update Routine' : 'Save Routine'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}