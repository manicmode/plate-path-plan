import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, Dumbbell, Star, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ExerciseLog, ExerciseTemplate, EXERCISE_ACTIVITIES } from '@/types/logging';
import { createLogService } from '@/services/logService';
import { useAuth } from '@/contexts/auth';

export const ExerciseCard = () => {
  const { user } = useAuth();
  const [logService] = useState(() => createLogService(user?.id));
  
  // Form state
  const [formData, setFormData] = useState({
    datetime: new Date().toISOString().slice(0, 16),
    activity: '',
    durationMin: '',
    distance: '',
    rpe: '',
    notes: '',
    sets: [{ reps: '', weight: '' }]
  });
  
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  
  // Data state
  const [recentLogs, setRecentLogs] = useState<ExerciseLog[]>([]);
  const [templates, setTemplates] = useState<ExerciseTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadRecentLogs();
    loadTemplates();
  }, []);

  const loadRecentLogs = async () => {
    try {
      const logs = await logService.listRecentExercise(10);
      setRecentLogs(logs);
    } catch (error) {
      console.error('Error loading recent exercise logs:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const templates = await logService.listExerciseTemplates();
      setTemplates(templates);
    } catch (error) {
      console.error('Error loading exercise templates:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      datetime: new Date().toISOString().slice(0, 16),
      activity: '',
      durationMin: '',
      distance: '',
      rpe: '',
      notes: '',
      sets: [{ reps: '', weight: '' }]
    });
    setSaveAsTemplate(false);
    setTemplateName('');
  };

  const addSet = () => {
    setFormData(prev => ({
      ...prev,
      sets: [...prev.sets, { reps: '', weight: '' }]
    }));
  };

  const removeSet = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sets: prev.sets.filter((_, i) => i !== index)
    }));
  };

  const updateSet = (index: number, field: 'reps' | 'weight', value: string) => {
    setFormData(prev => ({
      ...prev,
      sets: prev.sets.map((set, i) => 
        i === index ? { ...set, [field]: value } : set
      )
    }));
  };

  const handleSubmit = async () => {
    if (!formData.activity || !formData.durationMin) {
      toast.error('Please fill in activity and duration');
      return;
    }

    setIsLoading(true);
    try {
      const exerciseLog: ExerciseLog = {
        id: crypto.randomUUID(),
        userId: user?.id,
        createdAt: new Date(formData.datetime).toISOString(),
        activity: formData.activity,
        durationMin: parseInt(formData.durationMin),
        distance: formData.distance ? parseFloat(formData.distance) : undefined,
        rpe: formData.rpe ? parseInt(formData.rpe) : undefined,
        sets: formData.sets.some(set => set.reps || set.weight) 
          ? formData.sets
            .filter(set => set.reps || set.weight)
            .map(set => ({
              reps: parseInt(set.reps) || 0,
              weight: set.weight ? parseFloat(set.weight) : undefined
            }))
          : undefined,
        notes: formData.notes || undefined
      };

      await logService.logExercise(exerciseLog);
      
      // Save as template if requested
      if (saveAsTemplate && templateName.trim()) {
        const template: ExerciseTemplate = {
          id: crypto.randomUUID(),
          name: templateName.trim(),
          activity: exerciseLog.activity,
          durationMin: exerciseLog.durationMin,
          distance: exerciseLog.distance,
          rpe: exerciseLog.rpe,
          sets: exerciseLog.sets,
          notes: exerciseLog.notes
        };
        
        await logService.saveExerciseTemplate(template);
        await loadTemplates();
      }

      await loadRecentLogs();
      resetForm();
      toast.success('Exercise logged successfully!');
      
      // Fire analytics event
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('log_exercise_submitted', {
          activity: exerciseLog.activity,
          duration: exerciseLog.durationMin,
          timestamp: exerciseLog.createdAt
        });
      }
    } catch (error) {
      console.error('Error logging exercise:', error);
      toast.error('Failed to log exercise. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const useRecentLog = (log: ExerciseLog) => {
    setFormData({
      datetime: new Date().toISOString().slice(0, 16),
      activity: log.activity,
      durationMin: log.durationMin.toString(),
      distance: log.distance?.toString() || '',
      rpe: log.rpe?.toString() || '',
      notes: log.notes || '',
      sets: log.sets?.map(set => ({
        reps: set.reps.toString(),
        weight: set.weight?.toString() || ''
      })) || [{ reps: '', weight: '' }]
    });
  };

  const useTemplate = (template: ExerciseTemplate) => {
    setFormData({
      datetime: new Date().toISOString().slice(0, 16),
      activity: template.activity,
      durationMin: template.durationMin.toString(),
      distance: template.distance?.toString() || '',
      rpe: template.rpe?.toString() || '',
      notes: template.notes || '',
      sets: template.sets?.map(set => ({
        reps: set.reps.toString(),
        weight: set.weight?.toString() || ''
      })) || [{ reps: '', weight: '' }]
    });
  };

  const deleteTemplate = async (id: string) => {
    try {
      await logService.deleteExerciseTemplate(id);
      await loadTemplates();
      toast.success('Template deleted');
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5" />
          Exercise
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="log" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="log">Log</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="log" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="datetime">Date/Time</Label>
                <Input
                  id="datetime"
                  type="datetime-local"
                  value={formData.datetime}
                  onChange={(e) => setFormData(prev => ({ ...prev, datetime: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="activity">Activity</Label>
                <Input
                  id="activity"
                  placeholder="e.g., Run, Strength..."
                  value={formData.activity}
                  onChange={(e) => setFormData(prev => ({ ...prev, activity: e.target.value }))}
                  list="activities"
                />
                <datalist id="activities">
                  {EXERCISE_ACTIVITIES.map(activity => (
                    <option key={activity} value={activity} />
                  ))}
                </datalist>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.durationMin}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationMin: e.target.value }))}
                  placeholder="30"
                />
              </div>
              <div>
                <Label htmlFor="distance">Distance (optional)</Label>
                <Input
                  id="distance"
                  type="number"
                  step="0.1"
                  value={formData.distance}
                  onChange={(e) => setFormData(prev => ({ ...prev, distance: e.target.value }))}
                  placeholder="5.0"
                />
              </div>
              <div>
                <Label htmlFor="rpe">RPE (1-10)</Label>
                <Input
                  id="rpe"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.rpe}
                  onChange={(e) => setFormData(prev => ({ ...prev, rpe: e.target.value }))}
                  placeholder="7"
                />
              </div>
            </div>

            {/* Strength tracking */}
            <div>
              <Label>Sets (optional)</Label>
              <div className="space-y-2 mt-2">
                {formData.sets.map((set, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Reps"
                      type="number"
                      value={set.reps}
                      onChange={(e) => updateSet(index, 'reps', e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">×</span>
                    <Input
                      placeholder="Weight"
                      type="number"
                      step="0.5"
                      value={set.weight}
                      onChange={(e) => updateSet(index, 'weight', e.target.value)}
                      className="flex-1"
                    />
                    {formData.sets.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSet(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addSet}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Set
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="How did it feel? Any observations..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="save-template"
                checked={saveAsTemplate}
                onCheckedChange={(checked) => setSaveAsTemplate(!!checked)}
              />
              <Label htmlFor="save-template">Save as Template</Label>
            </div>

            {saveAsTemplate && (
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="My Workout Template"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Logging...' : 'Log Exercise'}
            </Button>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            {recentLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No recent logs yet.
              </p>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{log.activity}</div>
                      <div className="text-sm text-muted-foreground">
                        {log.durationMin}m
                        {log.rpe && ` · RPE ${log.rpe}`}
                        {log.distance && ` · ${log.distance} units`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => useRecentLog(log)}
                    >
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSaveAsTemplate(true);
                setTemplateName('');
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>

            {templates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nothing saved yet. Create one from the Log tab.
              </p>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="secondary">{template.activity}</Badge>
                        <Badge variant="outline">{template.durationMin}m</Badge>
                        {template.rpe && (
                          <Badge variant="outline">RPE {template.rpe}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => useTemplate(template)}
                      >
                        Use
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};