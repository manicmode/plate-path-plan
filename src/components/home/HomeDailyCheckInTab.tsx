import React, { useMemo, useState } from 'react';
import { Moon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatHomeCheckInDate } from '@/lib/dateUtils';
import { DailyMoodModal } from '@/components/mood/DailyMoodModal';

interface HomeDailyCheckInTabProps {
  className?: string;
}

export const HomeDailyCheckInTab: React.FC<HomeDailyCheckInTabProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const locale = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en-US';

  const dateLabel = useMemo(() => formatHomeCheckInDate(new Date(), locale), [locale]);

  const handleOpen = () => {
    try {
      window.dispatchEvent(new CustomEvent('daily_checkin_open', { detail: { source: 'home_tab', timestamp: Date.now() } }));
    } catch {}
    setIsOpen(true);
  };

  return (
    <>
      <button
        type="button"
        role="button"
        onClick={handleOpen}
        aria-label={`Daily Check-In, ${dateLabel}`}
        className={cn(
          'w-full flex items-center justify-between rounded-2xl px-4 py-3',
          'bg-white/60 dark:bg-black/20 border border-white/30 dark:border-white/10 backdrop-blur',
          'hover:bg-white/70 dark:hover:bg-black/30 transition-colors',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
            <Moon className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Daily Check-In</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
          <span>{dateLabel}</span>
          <Sparkles className="h-4 w-4 text-purple-500" />
        </div>
      </button>

      <DailyMoodModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default HomeDailyCheckInTab;
