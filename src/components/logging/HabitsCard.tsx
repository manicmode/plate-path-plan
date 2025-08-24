import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Plus, Settings, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { HabitLog, HabitPin } from '@/types/logging';
import { createLogService } from '@/services/logService';
import { useAuth } from '@/contexts/auth';

export const HabitsCard = () => {
  const { user } = useAuth();
  const [logService] = useState(() => createLogService(user?.id));
  
  // Form state
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    name: '',
    value: '',
    unit: '',
    notes: ''
  });
  
  const [pinToHabits, setPinToHabits] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitUnit, setNewHabitUnit] = useState('');
  
  // Data state
  const [pinnedHabits, setPinnedHabits] = useState<HabitPin[]>([]);
  const [todaysLogs, setTodaysLogs] = useState<HabitLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadPinnedHabits();
    loadTodaysLogs();
  }, []);

  // Reload today's logs when date changes
  useEffect(() => {
    loadTodaysLogs();
  }, [formData.date]);

  const loadPinnedHabits = async () => {
    try {
      const habits = await logService.listPinnedHabits();
      setPinnedHabits(habits);
    } catch (error) {
      console.error('Error loading pinned habits:', error);
    }
  };

  const loadTodaysLogs = async () => {
    try {
      const logs = await logService.listHabitLogs(formData.date);
      setTodaysLogs(logs);
    } catch (error) {
      console.error('Error loading habit logs:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      name: '',
      value: '',
      unit: '',
      notes: ''
    });
    setPinToHabits(false);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Please enter a habit name');
      return;
    }

    setIsLoading(true);
    try {
      const habitLog: HabitLog = {
        id: crypto.randomUUID(),
        userId: user?.id,
        date: formData.date,
        name: formData.name.trim(),
        value: formData.value ? parseFloat(formData.value) : undefined,
        unit: formData.unit.trim() || undefined,
        notes: formData.notes.trim() || undefined
      };

      await logService.logHabit(habitLog);
      
      // Pin to habits if requested
      if (pinToHabits) {
        const existingPin = pinnedHabits.find(h => 
          h.name.toLowerCase() === formData.name.toLowerCase()
        );
        
        if (!existingPin) {
          const newPin: HabitPin = {
            id: crypto.randomUUID(),
            name: formData.name.trim(),
            unit: formData.unit.trim() || undefined
          };
          
          await logService.savePinnedHabit(newPin);
          await loadPinnedHabits();
        }
      }

      await loadTodaysLogs();
      resetForm();
      toast.success('Habit logged successfully!');
      
      // Fire analytics event
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('habit_logged', {
          name: habitLog.name,
          hasValue: !!habitLog.value,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error logging habit:', error);
      toast.error('Failed to log habit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleHabitToday = async (habit: HabitPin) => {
    const existingLog = todaysLogs.find(log => log.name === habit.name);
    
    if (existingLog) {
      // Remove the log by logging it again (our service replaces same habit/date)
      return;
    }

    try {
      const habitLog: HabitLog = {
        id: crypto.randomUUID(),
        userId: user?.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        name: habit.name,
        value: 1, // Default completion value
        unit: habit.unit
      };

      await logService.logHabit(habitLog);
      await loadTodaysLogs();
      toast.success(`${habit.name} logged!`);
      
      // Fire analytics event
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('habit_quick_logged', {
          name: habit.name,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error toggling habit:', error);
      toast.error('Failed to log habit');
    }
  };

  const addNewPinnedHabit = async () => {
    if (!newHabitName.trim()) {
      toast.error('Please enter a habit name');
      return;
    }

    try {
      const newHabit: HabitPin = {
        id: crypto.randomUUID(),
        name: newHabitName.trim(),
        unit: newHabitUnit.trim() || undefined
      };

      await logService.savePinnedHabit(newHabit);
      await loadPinnedHabits();
      setNewHabitName('');
      setNewHabitUnit('');
      toast.success('Habit added!');
    } catch (error) {
      console.error('Error adding habit:', error);
      toast.error('Failed to add habit');
    }
  };

  const deletePinnedHabit = async (id: string) => {
    try {
      await logService.deletePinnedHabit(id);
      await loadPinnedHabits();
      toast.success('Habit removed');
    } catch (error) {
      toast.error('Failed to remove habit');
    }
  };

  const isHabitLoggedToday = (habitName: string) => {
    return todaysLogs.some(log => log.name === habitName);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Habits
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="my-habits" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-habits">My Habits</TabsTrigger>
            <TabsTrigger value="log-custom">Log Custom</TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-habits" className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Today's Habits</h4>
              <Dialog open={showManageModal} onOpenChange={setShowManageModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Manage Pinned Habits</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-habit">Add New Habit</Label>
                      <div className="flex gap-2">
                        <Input
                          id="new-habit"
                          placeholder="Habit name"
                          value={newHabitName}
                          onChange={(e) => setNewHabitName(e.target.value)}
                        />
                        <Input
                          placeholder="Unit (optional)"
                          value={newHabitUnit}
                          onChange={(e) => setNewHabitUnit(e.target.value)}
                        />
                        <Button onClick={addNewPinnedHabit}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Current Habits</Label>
                      {pinnedHabits.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No pinned habits yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {pinnedHabits.map((habit) => (
                            <div
                              key={habit.id}
                              className="flex items-center justify-between p-2 border rounded"
                            >
                              <div className="flex items-center gap-2">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                <span>{habit.name}</span>
                                {habit.unit && (
                                  <Badge variant="outline" className="text-xs">
                                    {habit.unit}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deletePinnedHabit(habit.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {pinnedHabits.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No pinned habits. Add one from Manage or Log Custom.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {pinnedHabits.map((habit) => {
                  const isLogged = isHabitLoggedToday(habit.name);
                  return (
                    <Button
                      key={habit.id}
                      variant={isLogged ? "default" : "outline"}
                      className="flex items-center justify-between p-4 h-auto"
                      onClick={() => toggleHabitToday(habit)}
                    >
                      <div className="flex items-center gap-2">
                        {isLogged ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                        <span className="text-sm">{habit.name}</span>
                      </div>
                      {habit.unit && (
                        <Badge variant="secondary" className="text-xs">
                          {habit.unit}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="log-custom" className="space-y-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="habit-name">Habit Name</Label>
              <Input
                id="habit-name"
                placeholder="e.g., Meditate, Read, Exercise..."
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="value">Value (optional)</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 30"
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit (optional)</Label>
                <Input
                  id="unit"
                  placeholder="e.g., minutes, pages, km"
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="habit-notes">Notes</Label>
              <Textarea
                id="habit-notes"
                placeholder="Any observations or details..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="pin-habit"
                checked={pinToHabits}
                onCheckedChange={(checked) => setPinToHabits(!!checked)}
              />
              <Label htmlFor="pin-habit">Pin to My Habits</Label>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Logging...' : 'Log Habit'}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};