import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Target, Zap } from 'lucide-react';
import { GroupStats } from '@/hooks/useSocialAccountability';

interface GroupStatsDisplayProps {
  stats: GroupStats;
}

export const GroupStatsDisplay: React.FC<GroupStatsDisplayProps> = ({ stats }) => {
  const getConsistencyColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConsistencyEmoji = (score: number) => {
    if (score >= 80) return '🔥';
    if (score >= 60) return '📈';
    return '🌱';
  };

  return (
    <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Squad Stats
          <span className="text-2xl">{getConsistencyEmoji(stats.group_consistency_score)}</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            className="text-center p-3 rounded-lg bg-muted/30"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats.active_members}/{stats.total_members}
            </div>
          </motion.div>

          <motion.div
            className="text-center p-3 rounded-lg bg-muted/30"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Weekly Avg</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats.average_weekly_workouts.toFixed(1)}
            </div>
          </motion.div>
        </div>

        {/* Consistency Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Group Consistency</span>
            <Badge 
              variant="outline" 
              className={`${getConsistencyColor(stats.group_consistency_score)} border-current`}
            >
              {Math.round(stats.group_consistency_score)}%
            </Badge>
          </div>
          
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${stats.group_consistency_score}%` }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Status Message */}
        <motion.div
          className="text-center p-3 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {stats.group_consistency_score >= 80 && (
            <div className="flex items-center justify-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Squad is CRUSHING it! 🏆</span>
            </div>
          )}
          
          {stats.group_consistency_score >= 60 && stats.group_consistency_score < 80 && (
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Building momentum! 📈</span>
            </div>
          )}
          
          {stats.group_consistency_score < 60 && (
            <div className="flex items-center justify-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Let's support each other! 🤝</span>
            </div>
          )}
        </motion.div>

        {/* Encouragement Message */}
        {stats.needs_encouragement && (
          <motion.div
            className="text-center text-xs text-muted-foreground italic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            "Great teams lift each other up! 💪"
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};