import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Plus, 
  ChevronDown, 
  ChevronRight,
  Pill,
  Droplets,
  Utensils,
  Settings
} from 'lucide-react';
import { useReminders, Reminder } from '@/hooks/useReminders';
import { ReminderCard } from './ReminderCard';
import { ReminderForm } from './ReminderForm';
import { useIsMobile } from '@/hooks/use-mobile';

const typeIcons = {
  supplement: Pill,
  hydration: Droplets,
  meal: Utensils,
  custom: Settings
};

const typeLabels = {
  supplement: 'Supplements',
  hydration: 'Hydration',
  meal: 'Meals',
  custom: 'Custom'
};

const typeColors = {
  supplement: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  hydration: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  meal: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  custom: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
};

export const ReminderManagement: React.FC = () => {
  const { groupedReminders, loading, createReminder, updateReminder, deleteReminder, toggleReminderActive } = useReminders();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    supplement: true,
    hydration: true,
    meal: true,
    custom: true
  });
  const isMobile = useIsMobile();

  const toggleSection = (type: string) => {
    setOpenSections(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handleCreateReminder = async (reminderData: any) => {
    await createReminder(reminderData);
    setShowCreateForm(false);
  };

  const handleEditReminder = async (reminderData: any) => {
    if (editingReminder) {
      await updateReminder(editingReminder.id, reminderData);
      setEditingReminder(null);
    }
  };

  const totalReminders = Object.values(groupedReminders).flat().length;
  const activeReminders = Object.values(groupedReminders).flat().filter(r => r.is_active).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            <span className="ml-2">Loading reminders...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 rounded-3xl shadow-lg">
        <CardHeader className={`${isMobile ? 'p-4 pb-2' : 'p-6 pb-4'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Bell className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-blue-600 dark:text-blue-400`} />
              </div>
              <div>
                <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>
                  My Reminders
                </CardTitle>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
                  {totalReminders} total • {activeReminders} active
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl"
              size={isMobile ? "sm" : "default"}
            >
              <Plus className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} mr-2`} />
              {isMobile ? 'Add' : 'Add Reminder'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className={`${isMobile ? 'p-4 pt-0' : 'p-6 pt-0'}`}>
          {totalReminders === 0 ? (
            <div className="text-center py-8">
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Bell className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No reminders yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Create your first reminder to get notified about supplements, meals, or custom routines.
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Reminder
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedReminders).map(([type, reminders]) => {
                if (reminders.length === 0) return null;
                
                const Icon = typeIcons[type as keyof typeof typeIcons];
                const isOpen = openSections[type];
                
                return (
                  <Collapsible key={type} open={isOpen} onOpenChange={() => toggleSection(type)}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-center space-x-3">
                          <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {typeLabels[type as keyof typeof typeLabels]}
                          </span>
                          <Badge variant="outline" className={typeColors[type as keyof typeof typeColors]}>
                            {reminders.length}
                          </Badge>
                        </div>
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="grid gap-3">
                        {reminders.map((reminder) => (
                          <ReminderCard
                            key={reminder.id}
                            reminder={reminder}
                            onEdit={setEditingReminder}
                            onDelete={deleteReminder}
                            onToggleActive={toggleReminderActive}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Reminder Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-md">
          <ReminderForm
            onSubmit={handleCreateReminder}
            onCancel={() => setShowCreateForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Reminder Dialog */}
      <Dialog open={!!editingReminder} onOpenChange={() => setEditingReminder(null)}>
        <DialogContent className="sm:max-w-md">
          {editingReminder && (
            <ReminderForm
              reminder={editingReminder}
              onSubmit={handleEditReminder}
              onCancel={() => setEditingReminder(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};