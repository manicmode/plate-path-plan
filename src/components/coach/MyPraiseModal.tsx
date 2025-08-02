import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCoachInteractions, CoachType } from '@/hooks/useCoachInteractions';
import { CoachPraiseMessage } from './CoachPraiseMessage';
import { Trophy, Star, Heart, Flame, Sparkles, Moon, TrendingUp, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// 🎮 Coach Gamification System - Praise History Modal
// Component to display praise history and coach bond statistics

interface MyPraiseModalProps {
  coachType: CoachType;
  triggerButton?: React.ReactNode;
}

export const MyPraiseModal = ({ coachType, triggerButton }: MyPraiseModalProps) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'history' | 'badges' | 'stats'>('history');
  
  const { 
    getPraiseHistory, 
    getTotalPraiseCount, 
    getAvailableBadges,
    getUnlockedBadges,
    getCoachStats 
  } = useCoachInteractions();

  const praiseHistory = getPraiseHistory(coachType);
  const totalPraise = getTotalPraiseCount(coachType);
  const availableBadges = getAvailableBadges(coachType);
  const unlockedBadges = getUnlockedBadges(coachType);

  const getCoachStyling = () => {
    switch (coachType) {
      case 'exercise':
        return {
          primary: 'text-orange-600 dark:text-orange-400',
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-700',
          gradient: 'from-orange-500 to-red-500',
          icon: <Flame className="h-5 w-5" />,
          title: '💪 FITNESS BOND'
        };
      case 'nutrition':
        return {
          primary: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
          border: 'border-emerald-200 dark:border-emerald-700',
          gradient: 'from-emerald-500 to-teal-500',
          icon: <Sparkles className="h-5 w-5" />,
          title: '✨ NUTRITION BOND'
        };
      case 'recovery':
        return {
          primary: 'text-indigo-600 dark:text-indigo-400',
          bg: 'bg-indigo-50 dark:bg-indigo-900/20',
          border: 'border-indigo-200 dark:border-indigo-700',
          gradient: 'from-indigo-500 to-purple-500',
          icon: <Moon className="h-5 w-5" />,
          title: '🌙 RECOVERY BOND'
        };
      default:
        return {
          primary: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-700',
          gradient: 'from-blue-500 to-purple-500',
          icon: <Heart className="h-5 w-5" />,
          title: '💙 COACH BOND'
        };
    }
  };

  const styling = getCoachStyling();

  const renderHistory = () => (
    <ScrollArea className={`${isMobile ? 'h-[300px]' : 'h-[400px]'} w-full pr-4`}>
      <div className="space-y-4">
        {praiseHistory.length === 0 ? (
          <div className="text-center py-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mx-auto w-16 h-16 rounded-full ${styling.bg} flex items-center justify-center mb-4`}
            >
              {styling.icon}
            </motion.div>
            <h3 className={`text-lg font-semibold ${styling.primary} mb-2`}>
              No Praise Yet
            </h3>
            <p className="text-muted-foreground text-sm">
              Keep chatting with your {coachType} coach to earn praise and build your bond!
            </p>
          </div>
        ) : (
          praiseHistory.map((praise, index) => (
            <motion.div
              key={praise.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Level {praise.praise_level} • {praise.interaction_count} interactions</span>
                <span>{formatDistanceToNow(praise.timestamp, { addSuffix: true })}</span>
              </div>
              <CoachPraiseMessage
                message={praise.message}
                coachType={coachType}
              />
            </motion.div>
          ))
        )}
      </div>
    </ScrollArea>
  );

  const renderBadges = () => (
    <div className="space-y-6">
      {/* Unlocked Badges */}
      <div>
        <h3 className={`text-lg font-semibold ${styling.primary} mb-4 flex items-center space-x-2`}>
          <Trophy className="h-5 w-5" />
          <span>Unlocked Badges ({unlockedBadges.length})</span>
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {unlockedBadges.length === 0 ? (
            <div className={`p-4 rounded-lg ${styling.bg} text-center`}>
              <p className="text-muted-foreground text-sm">No badges unlocked yet</p>
            </div>
          ) : (
            unlockedBadges.map((badge) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 rounded-lg ${styling.bg} border ${styling.border}`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{badge.icon}</span>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${styling.primary}`}>{badge.title}</h4>
                    <p className="text-sm text-muted-foreground">{badge.description}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    ✓ Unlocked
                  </Badge>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Available Badges */}
      <div>
        <h3 className={`text-lg font-semibold text-muted-foreground mb-4 flex items-center space-x-2`}>
          <Star className="h-5 w-5" />
          <span>Available Badges</span>
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {availableBadges.filter(badge => !badge.unlocked).map((badge) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 0.6, x: 0 }}
              className="p-4 rounded-lg bg-muted/50 border border-muted"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl opacity-50">{badge.icon}</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-muted-foreground">{badge.title}</h4>
                  <p className="text-sm text-muted-foreground">{badge.description}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {badge.requirement} needed
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStats = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-4 rounded-lg ${styling.bg} border ${styling.border} text-center`}
        >
          <div className={`text-2xl font-bold ${styling.primary}`}>{totalPraise}</div>
          <div className="text-sm text-muted-foreground">Total Praise</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`p-4 rounded-lg ${styling.bg} border ${styling.border} text-center`}
        >
          <div className={`text-2xl font-bold ${styling.primary}`}>{unlockedBadges.length}</div>
          <div className="text-sm text-muted-foreground">Badges Earned</div>
        </motion.div>
      </div>

      <div className={`p-4 rounded-lg ${styling.bg} border ${styling.border}`}>
        <h3 className={`font-semibold ${styling.primary} mb-3 flex items-center space-x-2`}>
          <TrendingUp className="h-4 w-4" />
          <span>Bond Progress</span>
        </h3>
        <div className="space-y-3">
          {availableBadges.map((badge, index) => (
            <div key={badge.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={badge.unlocked ? 'opacity-100' : 'opacity-50'}>
                  {badge.icon}
                </span>
                <span className={`text-sm ${badge.unlocked ? styling.primary : 'text-muted-foreground'}`}>
                  {badge.title}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (totalPraise / badge.requirement) * 100)}%` }}
                    transition={{ delay: index * 0.1, duration: 0.8 }}
                    className={`h-full bg-gradient-to-r ${styling.gradient}`}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.min(totalPraise, badge.requirement)}/{badge.requirement}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {praiseHistory.length > 0 && (
        <div className={`p-4 rounded-lg ${styling.bg} border ${styling.border}`}>
          <h3 className={`font-semibold ${styling.primary} mb-3 flex items-center space-x-2`}>
            <Calendar className="h-4 w-4" />
            <span>Recent Activity</span>
          </h3>
          <div className="space-y-2">
            {praiseHistory.slice(0, 3).map((praise) => (
              <div key={praise.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Level {praise.praise_level} praise received
                </span>
                <span className="text-muted-foreground">
                  {formatDistanceToNow(praise.timestamp, { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" size="sm" className={`${styling.primary} hover:${styling.bg}`}>
            <Trophy className="h-4 w-4 mr-2" />
            My Praise ({totalPraise})
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] h-[80vh]' : 'max-w-2xl h-[600px]'}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center space-x-2 ${styling.primary}`}>
            {styling.icon}
            <span>{styling.title}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-muted/50 p-1 rounded-lg">
          {[
            { id: 'history', label: 'Praise History', icon: <Heart className="h-4 w-4" /> },
            { id: 'badges', label: 'Badges', icon: <Trophy className="h-4 w-4" /> },
            { id: 'stats', label: 'Statistics', icon: <TrendingUp className="h-4 w-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                selectedTab === tab.id
                  ? `${styling.bg} ${styling.primary} shadow-sm`
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {selectedTab === 'history' && renderHistory()}
              {selectedTab === 'badges' && renderBadges()}
              {selectedTab === 'stats' && renderStats()}
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};