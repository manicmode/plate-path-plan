import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Star, Zap } from 'lucide-react';
import { useXP } from '@/hooks/useXP';

interface XPLog {
  id: string;
  total_xp: number;
  reason: string;
  created_at: string;
  performance_score?: number;
}

export function XPLeaderboard() {
  const { userLevel, loading, getRecentXPLogs } = useXP();
  const [recentLogs, setRecentLogs] = useState<XPLog[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const logs = await getRecentXPLogs(5);
      setRecentLogs(logs);
    };
    fetchLogs();
  }, [getRecentXPLogs]);

  const getLevelIcon = (level: number) => {
    if (level >= 10) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (level >= 5) return <Medal className="h-5 w-5 text-gray-400" />;
    if (level >= 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <Star className="h-5 w-5 text-blue-500" />;
  };

  const getLevelTitle = (level: number) => {
    if (level >= 10) return "Fitness Legend";
    if (level >= 7) return "Workout Warrior";
    if (level >= 5) return "Fitness Enthusiast";
    if (level >= 3) return "Rising Star";
    return "Beginner";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userLevel) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Fitness XP System
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Start Your Fitness Journey!
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Sign in to start earning XP for your workouts and track your progress
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalXP = (userLevel.level - 1) * 100 + userLevel.current_xp;

  return (
    <Card className="w-full bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border-yellow-200 dark:border-yellow-800">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
          <Zap className="h-5 w-5 text-yellow-500" />
          Your Fitness Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Level Display */}
        <div className="flex items-center justify-between p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            {getLevelIcon(userLevel.level)}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Level {userLevel.level}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getLevelTitle(userLevel.level)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {totalXP}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total XP</div>
          </div>
        </div>

        {/* Progress to Next Level */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {userLevel.current_xp} / {userLevel.current_xp + userLevel.xp_to_next_level} XP
            </span>
            <Badge variant="outline" className="text-xs">
              {userLevel.xp_to_next_level} to go
            </Badge>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(userLevel.current_xp / (userLevel.current_xp + userLevel.xp_to_next_level)) * 100}%`
              }}
            />
          </div>
        </div>

        {/* Recent Activities */}
        {recentLogs.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Recent Activities
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2 bg-white/40 dark:bg-gray-800/40 rounded border border-yellow-100 dark:border-yellow-900"
                >
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                      {log.reason}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs"
                  >
                    +{log.total_xp} XP
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Level Preview */}
        <div className="text-center p-3 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Next: <span className="font-semibold">{getLevelTitle(userLevel.level + 1)}</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Complete {Math.ceil(userLevel.xp_to_next_level / 50)} more workouts to level up!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}