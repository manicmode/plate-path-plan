import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { Heart, Sparkles, Trophy, Flame, Moon, Star, Zap } from 'lucide-react';
import { CoachType } from '@/hooks/useCoachInteractions';
import { useEffect, useState } from 'react';

// 🎮 Coach Gamification System - Enhanced
// Component to display coach praise messages with personality-aligned styling and animations

interface CoachPraiseMessageProps {
  message: string;
  coachType: CoachType;
  onDismiss?: () => void;
}

export const CoachPraiseMessage = ({ message, coachType, onDismiss }: CoachPraiseMessageProps) => {
  const isMobile = useIsMobile();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const getCoachStyling = () => {
    switch (coachType) {
      case 'exercise':
        // 💪 Exercise = bold colors, emojis, animated flair (flame emoji, motion)
        return {
          gradient: 'from-orange-500/20 via-red-500/20 to-pink-500/20',
          border: 'border-orange-400 dark:border-orange-500',
          shadow: 'shadow-orange-500/25',
          icon: <Flame className="h-5 w-5 text-orange-600" />,
          textColor: 'text-orange-800 dark:text-orange-200',
          titleColor: 'text-orange-900 dark:text-orange-100',
          bgOverlay: 'bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30',
          extraIcons: [
            <Trophy key="trophy" className="h-4 w-4 text-yellow-500" />,
            <Zap key="zap" className="h-4 w-4 text-orange-500" />
          ],
          animations: {
            pulse: true,
            bounce: true,
            glow: true
          }
        };
      case 'nutrition':
        // 🥦 Nutrition = elegant styling, light sparkle, calm fade-in
        return {
          gradient: 'from-emerald-500/15 via-teal-500/15 to-green-500/15',
          border: 'border-emerald-300 dark:border-emerald-400',
          shadow: 'shadow-emerald-500/20',
          icon: <Sparkles className="h-5 w-5 text-emerald-600" />,
          textColor: 'text-emerald-800 dark:text-emerald-200',
          titleColor: 'text-emerald-900 dark:text-emerald-100',
          bgOverlay: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/25 dark:to-teal-900/25',
          extraIcons: [
            <Heart key="heart" className="h-4 w-4 text-emerald-500" />
          ],
          animations: {
            fadeIn: true,
            sparkle: true,
            gentle: true
          }
        };
      case 'recovery':
        // 🌙 Recovery = floating, glowy card with gentle animation and moon/star icons
        return {
          gradient: 'from-indigo-500/15 via-purple-500/15 to-blue-500/15',
          border: 'border-indigo-300 dark:border-indigo-400',
          shadow: 'shadow-indigo-500/20',
          icon: <Moon className="h-5 w-5 text-indigo-600" />,
          textColor: 'text-indigo-800 dark:text-indigo-200',
          titleColor: 'text-indigo-900 dark:text-indigo-100',
          bgOverlay: 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/25 dark:to-purple-900/25',
          extraIcons: [
            <Star key="star" className="h-4 w-4 text-indigo-500" />,
            <Sparkles key="sparkles" className="h-3 w-3 text-purple-500" />
          ],
          animations: {
            float: true,
            glow: true,
            ethereal: true
          }
        };
      default:
        return {
          gradient: 'from-gray-500/10 to-blue-500/10',
          border: 'border-gray-300 dark:border-gray-600',
          shadow: 'shadow-gray-500/10',
          icon: <Heart className="h-5 w-5 text-blue-600" />,
          textColor: 'text-blue-800 dark:text-blue-200',
          titleColor: 'text-blue-900 dark:text-blue-100',
          bgOverlay: 'bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900/25 dark:to-blue-900/25',
          extraIcons: [],
          animations: {}
        };
    }
  };

  const styling = getCoachStyling();

  const getAnimationProps = () => {
    if (styling.animations.float) {
      return {
        initial: { opacity: 0, y: 30, scale: 0.9 },
        animate: { 
          opacity: 1, 
          y: [0, -5, 0], 
          scale: 1
        },
        transition: { 
          duration: 0.6,
          y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
        }
      };
    }
    
    if (styling.animations.bounce) {
      return {
        initial: { opacity: 0, scale: 0.8, y: 20 },
        animate: { 
          opacity: 1, 
          scale: [0.8, 1.05, 1], 
          y: 0,
          rotate: [0, 1, -1, 0]
        },
        transition: { 
          duration: 0.5,
          rotate: { duration: 0.8, repeat: 2 }
        }
      };
    }
    
    return {
      initial: { opacity: 0, y: 20, scale: 0.95 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -20, scale: 0.95 },
      transition: { duration: 0.4 }
    };
  };

  const CoachTitle = () => {
    const titles = {
      exercise: '💪 FITNESS COACH',
      nutrition: '✨ NUTRITION GUIDE', 
      recovery: '🌙 RECOVERY MENTOR'
    };
    return titles[coachType] || 'COACH';
  };

  return (
    <motion.div
      {...getAnimationProps()}
      className={`relative w-full p-4 rounded-2xl border-2 ${styling.border} ${styling.bgOverlay} ${styling.shadow} backdrop-blur-sm overflow-hidden`}
    >
      {/* Background gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${styling.gradient} opacity-60`} />
      
      {/* Confetti particles for exercise coach */}
      {showConfetti && coachType === 'exercise' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full"
              initial={{ 
                x: Math.random() * 100 + '%', 
                y: -10,
                scale: 0,
                rotate: 0
              }}
              animate={{ 
                y: 100,
                scale: [0, 1, 0],
                rotate: 360
              }}
              transition={{ 
                duration: 2,
                delay: i * 0.1
              }}
            />
          ))}
        </div>
      )}

      {/* Floating sparkles for nutrition coach */}
      {coachType === 'nutrition' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-emerald-400"
              style={{
                left: `${20 + i * 30}%`,
                top: `${20 + i * 20}%`
              }}
              animate={{ 
                scale: [0.8, 1.2, 0.8],
                opacity: [0.5, 1, 0.5],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: 3,
                delay: i * 0.5,
                repeat: Infinity
              }}
            >
              ✨
            </motion.div>
          ))}
        </div>
      )}

      {/* Glowing aura for recovery coach */}
      {coachType === 'recovery' && (
        <motion.div
          className="absolute inset-0 bg-gradient-radial from-indigo-400/20 via-purple-400/10 to-transparent"
          animate={{ 
            opacity: [0.3, 0.6, 0.3],
            scale: [0.9, 1.1, 0.9]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity
          }}
        />
      )}

      <div className="relative z-10 flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          <motion.div
            animate={styling.animations.pulse ? { 
              scale: [1, 1.1, 1],
              rotate: styling.animations.bounce ? [0, 5, -5, 0] : 0
            } : {}}
            transition={{ 
              duration: 2, 
              repeat: Infinity
            }}
          >
            {styling.icon}
          </motion.div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <span className={`text-sm font-bold ${styling.titleColor} tracking-wide`}>
              <CoachTitle />
            </span>
            <div className="flex items-center space-x-1">
              {styling.extraIcons.map((icon, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: coachType === 'exercise' ? [0, 10, -10, 0] : 0
                  }}
                  transition={{ 
                    duration: 1.5,
                    delay: i * 0.2,
                    repeat: Infinity
                  }}
                >
                  {icon}
                </motion.div>
              ))}
            </div>
          </div>
          
          <motion.p 
            className={`${isMobile ? 'text-sm' : 'text-base'} ${styling.textColor} leading-relaxed font-medium`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {message}
          </motion.p>
        </div>
        
        {onDismiss && (
          <motion.button
            onClick={onDismiss}
            className={`text-xs ${styling.textColor} hover:opacity-70 transition-opacity p-1 rounded-full hover:bg-white/20`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            ✕
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};