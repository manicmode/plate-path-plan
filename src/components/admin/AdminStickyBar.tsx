import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface AdminStickyBarProps {
  actions: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary';
    disabled?: boolean;
  }[];
  className?: string;
}

export const AdminStickyBar = ({ actions, className }: AdminStickyBarProps) => {
  if (actions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-white/10 p-4 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-lg z-50 ${className}`}
    >
      <div className="flex gap-2 justify-center max-w-sm mx-auto">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={index}
              variant={action.variant || 'default'}
              size="sm"
              onClick={() => {
                action.onClick();
                // Haptic feedback on mobile
                if ('vibrate' in navigator) {
                  navigator.vibrate(16);
                }
              }}
              disabled={action.disabled}
              className="min-w-[44px] min-h-[44px] gap-2 flex-1"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </motion.div>
  );
};