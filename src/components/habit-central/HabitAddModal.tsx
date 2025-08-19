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
      <DialogContent className="fixed inset-0 z-[100] grid place-items-center p-4">
        <div className="w-[min(92vw,540px)] rounded-3xl bg-slate-950/75 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex flex-col items-center gap-2 pt-6 pb-2">
            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/15 grid place-items-center text-2xl">
              {DOMAIN_EMOJIS[habit.domain]}
            </div>
            <div className="text-xs uppercase tracking-wide text-white/60">Set up your reminder</div>
            <h2 className="text-xl sm:text-2xl font-bold text-center">Add "{habit.title}"</h2>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full px-4">
            <div className="grid grid-cols-2 gap-2 w-full">
              <button
                onClick={() => setActiveTab('auto')}
                className={`h-10 rounded-full text-sm font-semibold transition-colors ${
                  activeTab === 'auto' 
                    ? 'bg-white text-slate-900' 
                    : 'bg-white/10 text-white'
                }`}
              >
                Auto reminder
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`h-10 rounded-full text-sm font-semibold transition-colors ${
                  activeTab === 'manual' 
                    ? 'bg-white text-slate-900' 
                    : 'bg-white/10 text-white'
                }`}
              >
                Manual setup
              </button>
            </div>

            {activeTab === 'auto' && (
              <div className="w-full px-4 py-6 space-y-6">
                <div className="text-center space-y-3">
                  <h3 className="text-xl font-bold">Recommended Plan</h3>
                  <p className="text-white/60">
                    We'll set smart reminders based on your habit type
                  </p>
                </div>
                
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-base">Frequency:</span>
                    <span className="text-base">Daily</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-base">Time:</span>
                    <span className="text-base font-medium text-primary">{suggestedTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-base">Target per week:</span>
                    <span className="text-base">5 times</span>
                  </div>
                </div>
                
                <p className="text-sm text-white/60 text-center bg-white/5 rounded-lg p-3">
                  💡 You can always adjust these settings later in Reminders
                </p>
              </div>
            )}

            {activeTab === 'manual' && (
              <div className="w-full overflow-hidden px-4 py-6 space-y-6">
                {/* Frequency */}
                <div className="w-full">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Frequency
                  </h3>
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {['daily', 'weekly', 'custom'].map((freq) => (
                      <button
                        key={freq}
                        onClick={() => setFrequency(freq as any)}
                        className={`p-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                          frequency === freq
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-white/10 hover:bg-white/15'
                        }`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Days (for weekly/custom) */}
                {(frequency === 'weekly' || frequency === 'custom') && (
                  <div className="w-full">
                    <h4 className="font-medium mb-3">Days of the week</h4>
                    <div className="flex gap-2 w-full justify-center">
                      {WEEKDAYS.map((day) => (
                        <button
                          key={day.value}
                          onClick={() => toggleDay(day.value)}
                          className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                            selectedDays.includes(day.value)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-white/10 hover:bg-white/15'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time */}
                <div className="w-full">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Reminder time
                  </h3>
                  <input
                    type="time"
                    value={timeLocal || suggestedTime}
                    onChange={(e) => setTimeLocal(e.target.value)}
                    className="w-full p-2 rounded-lg border bg-white/5 border-white/10 text-white"
                  />
                </div>

                {/* Target per week */}
                <div className="w-full">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Target per week
                  </h3>
                  <div className="flex items-center justify-center gap-3 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTargetPerWeek(Math.max(1, targetPerWeek - 1))}
                      disabled={targetPerWeek <= 1}
                      className="bg-white/10 border-white/15 hover:bg-white/15"
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
                      className="bg-white/10 border-white/15 hover:bg-white/15"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Tabs>

          {/* Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full px-4 pb-5">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="h-11 text-base font-medium rounded-xl bg-white/10 border-white/15 hover:bg-white/15"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              className="h-11 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}