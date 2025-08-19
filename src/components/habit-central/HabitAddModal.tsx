import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Target, Minus, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { HabitTemplate } from './CarouselHabitCard';

interface HabitAddModalProps {
  habit: HabitTemplate | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (config: HabitConfig) => void;
  isAdding?: boolean;
}

export interface HabitConfig {
  targetPerWeek: number;
  frequency: 'daily' | 'weekly' | 'custom';
  timeLocal?: string;
  dayOfWeek?: number[];
  isEnabled: boolean;
  isAuto: boolean;
}

const DOMAIN_EMOJIS = {
  nutrition: '🥗',
  exercise: '💪', 
  recovery: '🧘'
};

const WEEKDAYS = [
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'T', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 },
  { label: 'S', value: 0 }
];

function getSuggestedTime(habit: HabitTemplate): string {
  const title = habit.title.toLowerCase();
  const domain = habit.domain;
  
  if (domain === 'nutrition') {
    if (title.includes('water') || title.includes('hydration')) return '08:00';
    if (title.includes('protein') || title.includes('meal')) return '12:30';
    return '09:00';
  } else if (domain === 'exercise') {
    if (title.includes('walk') || title.includes('step')) return '18:00';
    return '17:00';
  } else { // recovery
    if (title.includes('sleep') || title.includes('wind')) return '21:30';
    if (title.includes('meditation') || title.includes('mindful')) return '20:00';
    return '21:00';
  }
}

export function HabitAddModal({ habit, open, onClose, onConfirm, isAdding }: HabitAddModalProps) {
  const [activeTab, setActiveTab] = useState('auto');
  const [targetPerWeek, setTargetPerWeek] = useState(5);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom'>('daily');
  const [timeLocal, setTimeLocal] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri

  if (!habit) return null;

  const suggestedTime = getSuggestedTime(habit);

  const handleConfirm = () => {
    const config: HabitConfig = {
      targetPerWeek,
      frequency: activeTab === 'auto' ? 'daily' : frequency,
      timeLocal: activeTab === 'auto' ? suggestedTime : timeLocal || suggestedTime,
      dayOfWeek: frequency === 'weekly' ? selectedDays : undefined,
      isEnabled: true,
      isAuto: activeTab === 'auto'
    };
    onConfirm(config);
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{DOMAIN_EMOJIS[habit.domain]}</span>
            <div className="flex-1">
              <DialogTitle className="text-left">Add {habit.title}</DialogTitle>
              <Badge variant="secondary" className="mt-1 text-xs">
                Set up your reminder
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="auto">Auto reminder</TabsTrigger>
            <TabsTrigger value="manual">Manual setup</TabsTrigger>
          </TabsList>

          <TabsContent value="auto" className="space-y-4 mt-6">
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Recommended plan
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frequency:</span>
                  <span>Daily</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span>{suggestedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target:</span>
                  <span>5 times per week</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 You can edit this later in Reminders
              </p>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-6 mt-6">
            {/* Frequency */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Frequency
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {['daily', 'weekly', 'custom'].map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setFrequency(freq as any)}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                      frequency === freq
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            {/* Days (for weekly/custom) */}
            {(frequency === 'weekly' || frequency === 'custom') && (
              <div>
                <h4 className="font-medium mb-3">Days of the week</h4>
                <div className="flex gap-2">
                  {WEEKDAYS.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                        selectedDays.includes(day.value)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Reminder time
              </h3>
              <input
                type="time"
                value={timeLocal || suggestedTime}
                onChange={(e) => setTimeLocal(e.target.value)}
                className="w-full p-2 rounded-lg border bg-background"
              />
            </div>

            {/* Target per week */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Target per week
              </h3>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTargetPerWeek(Math.max(1, targetPerWeek - 1))}
                  disabled={targetPerWeek <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="font-semibold text-lg w-8 text-center">
                  {targetPerWeek}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTargetPerWeek(Math.min(7, targetPerWeek + 1))}
                  disabled={targetPerWeek >= 7}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="pt-4 border-t">
          <Button 
            onClick={handleConfirm} 
            className="w-full" 
            disabled={isAdding}
          >
            {isAdding 
              ? 'Adding...' 
              : activeTab === 'auto' 
                ? 'Add with Auto reminder' 
                : 'Add with Manual reminder'
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}