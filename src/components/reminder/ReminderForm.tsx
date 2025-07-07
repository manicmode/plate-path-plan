import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Clock, Calendar, Repeat } from 'lucide-react';
import { Reminder } from '@/hooks/useReminders';

interface ReminderFormProps {
  reminder?: Reminder;
  onSubmit: (reminderData: any) => Promise<void>;
  onCancel: () => void;
  prefilledData?: {
    label?: string;
    type?: string;
    food_item_data?: any;
  };
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

export const ReminderForm: React.FC<ReminderFormProps> = ({
  reminder,
  onSubmit,
  onCancel,
  prefilledData
}) => {
  const [formData, setFormData] = useState({
    label: reminder?.label || prefilledData?.label || '',
    type: reminder?.type || prefilledData?.type || 'custom',
    frequency_type: reminder?.frequency_type || 'daily',
    frequency_value: reminder?.frequency_value || 1,
    custom_days: reminder?.custom_days || [],
    reminder_time: reminder?.reminder_time || '09:00',
    is_active: reminder?.is_active ?? true,
    food_item_data: reminder?.food_item_data || prefilledData?.food_item_data || null,
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit(formData);
      onCancel();
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      custom_days: prev.custom_days.includes(day)
        ? prev.custom_days.filter(d => d !== day)
        : [...prev.custom_days, day].sort()
    }));
  };

  const getFrequencyDescription = () => {
    switch (formData.frequency_type) {
      case 'daily':
        return 'Every day';
      case 'every_x_days':
        return `Every ${formData.frequency_value} day${formData.frequency_value > 1 ? 's' : ''}`;
      case 'weekly':
        return 'Weekly on selected days';
      case 'custom_days':
        return 'On selected days';
      default:
        return '';
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold">
          {reminder ? 'Edit Reminder' : 'Create Reminder'}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="label">Reminder Label</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Take Vitamin D"
                required
              />
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplement">Supplement</SelectItem>
                  <SelectItem value="hydration">Hydration</SelectItem>
                  <SelectItem value="meal">Meal</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="time">Time</Label>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <Input
                  id="time"
                  type="time"
                  value={formData.reminder_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, reminder_time: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>

          {/* Frequency Settings */}
          <div className="space-y-4">
            <div>
              <Label className="flex items-center space-x-2">
                <Repeat className="h-4 w-4" />
                <span>Frequency</span>
              </Label>
              <Select 
                value={formData.frequency_type} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  frequency_type: value as any,
                  custom_days: value === 'weekly' ? [1, 2, 3, 4, 5] : [] // Default to weekdays for weekly
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="every_x_days">Every X Days</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="custom_days">Custom Days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">{getFrequencyDescription()}</p>
            </div>

            {formData.frequency_type === 'every_x_days' && (
              <div>
                <Label htmlFor="frequency_value">Repeat every (days)</Label>
                <Input
                  id="frequency_value"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.frequency_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, frequency_value: parseInt(e.target.value) || 1 }))}
                />
              </div>
            )}

            {(formData.frequency_type === 'weekly' || formData.frequency_type === 'custom_days') && (
              <div>
                <Label className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Select Days</span>
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <Badge
                      key={day.value}
                      variant={formData.custom_days.includes(day.value) ? "default" : "outline"}
                      className="cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => toggleDay(day.value)}
                    >
                      {day.short}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Active</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
          </div>

          {/* Food Item Info */}
          {formData.food_item_data && (
            <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                🍽️ Linked to: {formData.food_item_data.food_name}
              </p>
              {formData.food_item_data.calories && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {formData.food_item_data.calories} calories
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.label.trim()} className="flex-1">
              {loading ? 'Saving...' : reminder ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};