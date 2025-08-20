import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Target, Minus, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { HabitTemplate } from './CarouselHabitCard';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

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
  const { user, ready } = useSupabaseAuth();
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
    console.log('[Add] starting', { 
      slug: habit?.slug, 
      target_per_week: config.targetPerWeek, 
      mode: config.isAuto ? 'auto' : 'manual', 
      frequency: config.frequency, 
      time_local: config.timeLocal 
    });
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
      <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-xl border-border/60 shadow-2xl">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center gap-4 text-2xl">
            <span className="text-4xl">{DOMAIN_EMOJIS[habit.domain]}</span>
            <div>
              <div className="text-2xl font-bold">Add "{habit.title}"</div>
              <div className="text-sm text-muted-foreground font-normal mt-1">Set up your reminder preferences</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/30 p-1 rounded-xl">
            <TabsTrigger 
              value="auto" 
              className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
            >
              Auto reminder
            </TabsTrigger>
            <TabsTrigger 
              value="manual" 
              className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
            >
              Manual setup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auto" className="space-y-6 py-4">
            <div className="text-center space-y-3">
              <h3 className="text-xl font-bold">Recommended Plan</h3>
              <p className="text-muted-foreground">
                We'll set smart reminders based on your habit type
              </p>
            </div>
            
            <div className="bg-muted/40 rounded-xl p-6 space-y-4 border border-border/40 shadow-sm">
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
            
            <p className="text-sm text-muted-foreground text-center bg-muted/20 rounded-lg p-3">
              💡 You can always adjust these settings later in Reminders
            </p>
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

        <div className="flex gap-4 pt-8 border-t border-border/40">
          <Button variant="outline" onClick={onClose} className="flex-1 h-12 text-base font-medium rounded-xl">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            className="flex-1 h-12 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
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