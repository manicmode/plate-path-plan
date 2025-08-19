import React, { useState } from 'react';
import { MoreHorizontal, Play, Pause, CheckCircle, Edit, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useHabitManagement, UserHabit } from '@/hooks/useHabitManagement';
import { HabitTemplate } from '@/hooks/useHabitTemplatesV2';
import { QuickLogSheet } from '@/components/QuickLogSheet';

interface HabitManagementMenuProps {
  userHabit: UserHabit;
  template: HabitTemplate;
  onEdit?: (template: HabitTemplate, userHabit: UserHabit) => void;
  onStatusChanged?: () => void;
}

export function HabitManagementMenu({ userHabit, template, onEdit, onStatusChanged }: HabitManagementMenuProps) {
  const { setHabitStatus, logHabit, loading } = useHabitManagement();
  const [showQuickLog, setShowQuickLog] = useState(false);

  const handleStatusChange = async (status: 'active' | 'paused' | 'completed') => {
    const success = await setHabitStatus(userHabit.id, status);
    if (success && onStatusChanged) {
      onStatusChanged();
    }
  };

  const handleQuickLog = async () => {
    if (template.goal_type === 'bool') {
      // For boolean habits, log directly
      const success = await logHabit(template.slug, true);
      if (success && onStatusChanged) {
        onStatusChanged();
      }
    } else {
      // For duration/count habits, open QuickLogSheet
      setShowQuickLog(true);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(template, userHabit);
    }
  };

  const handleLogSuccess = () => {
    setShowQuickLog(false);
    if (onStatusChanged) {
      onStatusChanged();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            disabled={loading}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleQuickLog}>
            <Timer className="h-4 w-4 mr-2" />
            Log now
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>

          {userHabit.status === 'active' && (
            <>
              <DropdownMenuItem onClick={() => handleStatusChange('paused')}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark complete
              </DropdownMenuItem>
            </>
          )}

          {userHabit.status === 'paused' && (
            <DropdownMenuItem onClick={() => handleStatusChange('active')}>
              <Play className="h-4 w-4 mr-2" />
              Resume
            </DropdownMenuItem>
          )}

          {userHabit.status === 'completed' && (
            <DropdownMenuItem onClick={() => handleStatusChange('active')}>
              <Play className="h-4 w-4 mr-2" />
              Start again
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <QuickLogSheet
        open={showQuickLog}
        onOpenChange={setShowQuickLog}
        template={template}
        userHabit={userHabit}
        onSuccess={handleLogSuccess}
      />
    </>
  );
}