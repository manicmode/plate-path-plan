import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  Clock, 
  Edit, 
  Trash2, 
  Calendar,
  Pill,
  Droplets,
  Utensils,
  Settings
} from 'lucide-react';
import { Reminder } from '@/hooks/useReminders';

interface ReminderCardProps {
  reminder: Reminder;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'supplement':
      return <Pill className="h-4 w-4" />;
    case 'hydration':
      return <Droplets className="h-4 w-4" />;
    case 'meal':
      return <Utensils className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'supplement':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
    case 'hydration':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    case 'meal':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  }
};

const formatFrequency = (reminder: Reminder) => {
  const { frequency_type, frequency_value, custom_days } = reminder;
  
  switch (frequency_type) {
    case 'daily':
      return 'Daily';
    case 'every_x_days':
      return `Every ${frequency_value} day${frequency_value! > 1 ? 's' : ''}`;
    case 'weekly':
    case 'custom_days':
      if (!custom_days || custom_days.length === 0) return 'No days selected';
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return custom_days.map(day => dayNames[day]).join(', ');
    default:
      return 'Unknown';
  }
};

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export const ReminderCard: React.FC<ReminderCardProps> = ({
  reminder,
  onEdit,
  onDelete,
  onToggleActive
}) => {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleActive = async () => {
    setIsToggling(true);
    try {
      await onToggleActive(reminder.id, !reminder.is_active);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      reminder.is_active ? 'border-primary/20' : 'border-gray-200 dark:border-gray-700 opacity-75'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getTypeColor(reminder.type)}`}>
              {getTypeIcon(reminder.type)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {reminder.label}
              </h3>
              <Badge variant="outline" className="mt-1 text-xs">
                {reminder.type.charAt(0).toUpperCase() + reminder.type.slice(1)}
              </Badge>
            </div>
          </div>
          <Switch
            checked={reminder.is_active}
            onCheckedChange={handleToggleActive}
            disabled={isToggling}
          />
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            <span>{formatTime(reminder.reminder_time)}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4" />
            <span>{formatFrequency(reminder)}</span>
          </div>
        </div>

        {reminder.food_item_data && (
          <div className="mb-4 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
              🍽️ {reminder.food_item_data.food_name}
            </p>
            {reminder.food_item_data.calories && (
              <p className="text-xs text-orange-600 dark:text-orange-300">
                {reminder.food_item_data.calories} calories
              </p>
            )}
          </div>
        )}

        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(reminder)}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(reminder.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};