import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Zap, MessageCircle } from 'lucide-react';
import { AccountabilityGroup } from '@/hooks/useExerciseChallenges';

interface AccountabilityGroupCardProps {
  group: AccountabilityGroup;
  onSendNudge: (groupId: string, memberId: string) => void;
}

export const AccountabilityGroupCard: React.FC<AccountabilityGroupCardProps> = ({ group, onSendNudge }) => {
  const getMemberStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 dark:text-green-400';
      case 'needs_nudge': return 'text-yellow-600 dark:text-yellow-400';
      case 'inactive': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getMemberStatusEmoji = (status: string) => {
    switch (status) {
      case 'active': return '🔥';
      case 'needs_nudge': return '😴';
      case 'inactive': return '😢';
      default: return '😐';
    }
  };

  const membersNeedingNudge = group.members.filter(m => m.status === 'needs_nudge' && m.id !== '1');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border border-border/50 bg-gradient-to-br from-background/80 to-muted/20 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="text-2xl">{group.emoji}</span>
            {group.name}
            <Badge variant="outline" className="ml-auto">
              <Users className="h-3 w-3 mr-1" />
              {group.members.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Group Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Weekly Progress</span>
              <span className="font-medium">{group.groupProgress}%</span>
            </div>
            <Progress value={group.groupProgress} className="h-2" />
          </div>

          {/* Members Grid */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Squad Members</h4>
            <div className="grid gap-2">
              {group.members.map((member) => (
                <motion.div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{member.avatar}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{member.name}</span>
                        <span className="text-xs">{getMemberStatusEmoji(member.status)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{member.completedWorkouts}/{member.weeklyGoal} workouts</span>
                        {member.streak > 0 && (
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3 text-yellow-500" />
                            {member.streak} streak
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {member.status === 'needs_nudge' && member.id !== '1' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSendNudge(group.id, member.id)}
                      className="text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      Nudge
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          {membersNeedingNudge.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="text-yellow-600 dark:text-yellow-400">💛</span>
                <span className="text-yellow-800 dark:text-yellow-200">
                  {membersNeedingNudge.length} teammate{membersNeedingNudge.length > 1 ? 's' : ''} could use some encouragement!
                </span>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};