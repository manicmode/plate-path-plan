import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { Heart, Sparkles, Trophy } from 'lucide-react';
import { CoachType } from '@/hooks/useCoachInteractions';

// 🎮 Coach Gamification System
// Component to display coach praise messages with coach-specific styling

interface CoachPraiseMessageProps {
  message: string;
  coachType: CoachType;
  onDismiss?: () => void;
}

export const CoachPraiseMessage = ({ message, coachType, onDismiss }: CoachPraiseMessageProps) => {
  const isMobile = useIsMobile();

  const getCoachStyling = () => {
    switch (coachType) {
      case 'nutrition':
        return {
          gradient: 'from-purple-50 to-emerald-50 dark:from-purple-900/20 dark:to-emerald-900/20',
          border: 'border-purple-200 dark:border-purple-700',
          icon: <Sparkles className="h-5 w-5 text-purple-600" />,
          textColor: 'text-purple-700 dark:text-purple-400'
        };
      case 'exercise':
        return {
          gradient: 'from-indigo-50 to-orange-50 dark:from-indigo-900/20 dark:to-orange-900/20',
          border: 'border-indigo-200 dark:border-indigo-700',
          icon: <Trophy className="h-5 w-5 text-indigo-600" />,
          textColor: 'text-indigo-700 dark:text-indigo-400'
        };
      case 'recovery':
        return {
          gradient: 'from-orange-50 to-pink-50 dark:from-orange-900/20 dark:to-pink-900/20',
          border: 'border-orange-200 dark:border-orange-700',
          icon: <Heart className="h-5 w-5 text-orange-600" />,
          textColor: 'text-orange-700 dark:text-orange-400'
        };
      default:
        return {
          gradient: 'from-gray-50 to-blue-50 dark:from-gray-900/20 dark:to-blue-900/20',
          border: 'border-gray-200 dark:border-gray-700',
          icon: <Heart className="h-5 w-5 text-blue-600" />,
          textColor: 'text-blue-700 dark:text-blue-400'
        };
    }
  };

  const styling = getCoachStyling();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`w-full p-4 rounded-2xl border ${styling.border} bg-gradient-to-r ${styling.gradient} shadow-sm`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          {styling.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className={`text-sm font-semibold ${styling.textColor}`}>
              Coach Praise
            </span>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <Trophy className="h-3 w-3 text-yellow-500" />
            </motion.div>
          </div>
          <p className={`${isMobile ? 'text-sm' : 'text-base'} ${styling.textColor} leading-relaxed`}>
            {message}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`text-xs ${styling.textColor} hover:opacity-70 transition-opacity`}
          >
            ✕
          </button>
        )}
      </div>
    </motion.div>
  );
};