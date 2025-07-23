import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface MiniChallenge {
  id: string;
  name: string;
  emoji: string;
  duration: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  type: 'Cardio' | 'Strength' | 'Flexibility' | 'Mixed';
  participantCount: number;
  isJoined: boolean;
  gradient: string;
  targetWorkouts: number;
  completedWorkouts: number;
  startDate?: string;
  endDate?: string;
}

export interface AccountabilityGroup {
  id: string;
  name: string;
  emoji: string;
  members: {
    id: string;
    name: string;
    avatar: string;
    weeklyGoal: number;
    completedWorkouts: number;
    streak: number;
    lastWorkout: string;
    status: 'active' | 'needs_nudge' | 'inactive';
  }[];
  weeklyGoal: number;
  groupProgress: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  workouts: number;
  minutes: number;
  rank: number;
}

export interface MotivationalNotification {
  id: string;
  type: 'challenge_reminder' | 'team_nudge' | 'streak_celebration' | 'progress_update';
  title: string;
  message: string;
  emoji: string;
  timestamp: Date;
  isRead: boolean;
  actionable?: boolean;
  challengeId?: string;
  groupId?: string;
  targetUserId?: string;
}

export const useExerciseChallenges = (workouts: any[] = []) => {
  const { toast } = useToast();
  
  // Calculate user's recent workout activity
  const calculateWorkoutStats = useCallback(() => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentWorkouts = workouts.filter(workout => {
      const workoutDate = new Date(workout.date);
      return workoutDate >= weekAgo && workoutDate <= today;
    });

    return {
      weeklyCount: recentWorkouts.length,
      lastWorkoutDate: recentWorkouts.length > 0 ? recentWorkouts[0].date : null,
      totalMinutes: recentWorkouts.reduce((total, w) => {
        const minutes = parseInt(w.duration.split(' ')[0]) || 0;
        return total + minutes;
      }, 0)
    };
  }, [workouts]);

  const workoutStats = calculateWorkoutStats();

  // Enhanced challenges with progress tracking
  const [miniChallenges, setMiniChallenges] = useState<MiniChallenge[]>([
    {
      id: '1',
      name: '5-Day Step Master',
      emoji: '🚶‍♂️',
      duration: '5 days',
      description: 'Walk 8,000+ steps daily for 5 days straight',
      difficulty: 'Beginner',
      type: 'Cardio',
      participantCount: 247,
      isJoined: false,
      gradient: 'from-green-400 to-emerald-600',
      targetWorkouts: 5,
      completedWorkouts: 0
    },
    {
      id: '2',
      name: '7-Day Morning Yoga',
      emoji: '☀️',
      duration: '7 days',
      description: 'Start each day with 15-min yoga flow',
      difficulty: 'Beginner',
      type: 'Flexibility',
      participantCount: 189,
      isJoined: true,
      gradient: 'from-orange-400 to-amber-600',
      targetWorkouts: 7,
      completedWorkouts: 3,
      startDate: '2024-01-21'
    },
    {
      id: '3',
      name: 'Upper Body Bootcamp',
      emoji: '💪',
      duration: '10 days',
      description: 'Push-ups, pull-ups, and strength training',
      difficulty: 'Intermediate',
      type: 'Strength',
      participantCount: 156,
      isJoined: false,
      gradient: 'from-red-400 to-rose-600',
      targetWorkouts: 10,
      completedWorkouts: 0
    },
    {
      id: '4',
      name: 'HIIT Hurricane',
      emoji: '⚡',
      duration: '7 days',
      description: '20-min high-intensity interval training',
      difficulty: 'Advanced',
      type: 'Mixed',
      participantCount: 203,
      isJoined: false,
      gradient: 'from-blue-400 to-cyan-600',
      targetWorkouts: 7,
      completedWorkouts: 0
    },
    {
      id: '5',
      name: 'Core Crusher',
      emoji: '🔥',
      duration: '3 days',
      description: 'Daily core workouts to strengthen your center',
      difficulty: 'Intermediate',
      type: 'Strength',
      participantCount: 134,
      isJoined: false,
      gradient: 'from-purple-400 to-violet-600',
      targetWorkouts: 3,
      completedWorkouts: 0
    },
    {
      id: '6',
      name: 'Mindful Movement',
      emoji: '🧘‍♀️',
      duration: '10 days',
      description: 'Gentle yoga and meditation practice',
      difficulty: 'Beginner',
      type: 'Flexibility',
      participantCount: 98,
      isJoined: false,
      gradient: 'from-pink-400 to-rose-500',
      targetWorkouts: 10,
      completedWorkouts: 0
    }
  ]);

  // Enhanced accountability groups with real-time sync
  const [accountabilityGroups, setAccountabilityGroups] = useState<AccountabilityGroup[]>([
    {
      id: '1',
      name: 'Sunrise Squad',
      emoji: '🌅',
      members: [
        {
          id: '1',
          name: 'You',
          avatar: '🏃‍♂️',
          weeklyGoal: 4,
          completedWorkouts: workoutStats.weeklyCount,
          streak: 5,
          lastWorkout: workoutStats.lastWorkoutDate || '2024-01-23',
          status: workoutStats.weeklyCount >= 3 ? 'active' : workoutStats.weeklyCount >= 1 ? 'needs_nudge' : 'inactive'
        },
        {
          id: '2',
          name: 'Sarah',
          avatar: '💪',
          weeklyGoal: 4,
          completedWorkouts: 4,
          streak: 12,
          lastWorkout: '2024-01-23',
          status: 'active'
        },
        {
          id: '3',
          name: 'Mike',
          avatar: '🏋️‍♂️',
          weeklyGoal: 5,
          completedWorkouts: 2,
          streak: 0,
          lastWorkout: '2024-01-21',
          status: 'needs_nudge'
        }
      ],
      weeklyGoal: 4,
      groupProgress: 75
    },
    {
      id: '2',
      name: 'CardioBlasters',
      emoji: '🏃‍♀️',
      members: [
        {
          id: '1',
          name: 'You',
          avatar: '🏃‍♂️',
          weeklyGoal: 3,
          completedWorkouts: workoutStats.weeklyCount,
          streak: 3,
          lastWorkout: workoutStats.lastWorkoutDate || '2024-01-23',
          status: workoutStats.weeklyCount >= 2 ? 'active' : 'needs_nudge'
        },
        {
          id: '4',
          name: 'Alex',
          avatar: '🚴‍♀️',
          weeklyGoal: 3,
          completedWorkouts: 3,
          streak: 8,
          lastWorkout: '2024-01-23',
          status: 'active'
        },
        {
          id: '5',
          name: 'Jordan',
          avatar: '🏊‍♂️',
          weeklyGoal: 3,
          completedWorkouts: 1,
          streak: 0,
          lastWorkout: '2024-01-20',
          status: 'needs_nudge'
        }
      ],
      weeklyGoal: 3,
      groupProgress: 67
    }
  ]);

  // Dynamic leaderboard based on actual performance
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([
    {
      id: '1',
      name: 'You',
      avatar: '🏃‍♂️',
      workouts: workoutStats.weeklyCount,
      minutes: workoutStats.totalMinutes,
      rank: workoutStats.weeklyCount >= 5 ? 1 : workoutStats.weeklyCount >= 3 ? 2 : 3
    },
    {
      id: '2',
      name: 'FitGuru23',
      avatar: '👑',
      workouts: 12,
      minutes: 540,
      rank: 1
    },
    {
      id: '3',
      name: 'IronWill',
      avatar: '💪',
      workouts: 10,
      minutes: 485,
      rank: 2
    }
  ]);

  // Motivational notifications system
  const [notifications, setNotifications] = useState<MotivationalNotification[]>([]);

  // Use ref to track previous notifications and prevent duplicates
  const previousNotificationsRef = useRef<MotivationalNotification[]>([]);
  const lastCheckTimeRef = useRef<number>(Date.now());

  // Generate smart notifications based on activity patterns
  const generateSmartNotifications = useCallback(() => {
    const newNotifications: MotivationalNotification[] = [];
    const now = Date.now();
    const today = new Date(now);

    // Challenge reminder notifications
    miniChallenges.forEach(challenge => {
      if (challenge.isJoined) {
        const daysSinceStart = challenge.startDate ? 
          Math.floor((today.getTime() - new Date(challenge.startDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        if (daysSinceStart >= 2 && challenge.completedWorkouts === 0) {
          const id = `challenge-${challenge.id}-reminder`;
          newNotifications.push({
            id,
            type: 'challenge_reminder',
            title: 'Challenge Check-in',
            message: `You've joined "${challenge.name}" but haven't logged anything in 2 days! Want to get moving? 💪`,
            emoji: '⏰',
            timestamp: new Date(now),
            isRead: false,
            actionable: true,
            challengeId: challenge.id
          });
        }

        if (challenge.completedWorkouts > 0 && challenge.completedWorkouts < challenge.targetWorkouts) {
          const remaining = challenge.targetWorkouts - challenge.completedWorkouts;
          const id = `challenge-${challenge.id}-progress`;
          newNotifications.push({
            id,
            type: 'progress_update',
            title: 'You\'re Making Progress!',
            message: `${challenge.completedWorkouts}/${challenge.targetWorkouts} workouts completed for ${challenge.name}! Just ${remaining} more to go! 🎯`,
            emoji: '📈',
            timestamp: new Date(now),
            isRead: false,
            challengeId: challenge.id
          });
        }
      }
    });

    // Team nudge notifications
    accountabilityGroups.forEach(group => {
      group.members.forEach(member => {
        if (member.id !== '1' && member.status === 'needs_nudge') {
          const daysSinceWorkout = member.lastWorkout ? 
            Math.floor((today.getTime() - new Date(member.lastWorkout).getTime()) / (1000 * 60 * 60 * 24)) : 999;
          
          if (daysSinceWorkout >= 3) {
            const id = `nudge-${group.id}-${member.id}`;
            newNotifications.push({
              id,
              type: 'team_nudge',
              title: 'Teammate Needs Support',
              message: `Wanna nudge ${member.name}? They've been quiet for ${daysSinceWorkout} days 😴`,
              emoji: '🤝',
              timestamp: new Date(now),
              isRead: false,
              actionable: true,
              groupId: group.id,
              targetUserId: member.id
            });
          }
        }
      });

      // Group achievement notifications
      if (group.groupProgress >= 80) {
        const id = `group-${group.id}-achievement`;
        newNotifications.push({
          id,
          type: 'streak_celebration',
          title: 'Team Achievement!',
          message: `Team "${group.name}" is crushing it! You're all amazing! 🔥`,
          emoji: '🏆',
          timestamp: new Date(now),
          isRead: false,
          groupId: group.id
        });
      }
    });

    return newNotifications;
  }, [miniChallenges, accountabilityGroups]);

  // Check for new notifications periodically - REMOVED notifications from dependencies to prevent infinite loop
  useEffect(() => {
    const checkNotifications = () => {
      const now = Date.now();
      
      // Only check if enough time has passed to prevent rapid updates
      if (now - lastCheckTimeRef.current < 60000) { // 60 seconds instead of 30
        return;
      }
      
      lastCheckTimeRef.current = now;
      const newNotifications = generateSmartNotifications();
      
      // Compare with previous notifications to avoid duplicates
      const unseenNotifications = newNotifications.filter(n => 
        !previousNotificationsRef.current.some(existing => existing.id === n.id)
      );

      if (unseenNotifications.length > 0) {
        setNotifications(prev => {
          const updated = [...unseenNotifications, ...prev];
          previousNotificationsRef.current = updated;
          return updated;
        });
        
        // Show toast for most important notifications
        unseenNotifications.slice(0, 1).forEach(notification => {
          toast({
            title: notification.title,
            description: notification.message,
            duration: 5000,
          });
        });
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 60000); // Check every 60 seconds

    return () => clearInterval(interval);
  }, [miniChallenges, accountabilityGroups, generateSmartNotifications, toast]); // REMOVED notifications from dependencies

  // Sync workout progress with challenges
  useEffect(() => {
    setMiniChallenges(prev => prev.map(challenge => {
      if (challenge.isJoined) {
        // Count relevant workouts based on challenge type
        const relevantWorkouts = workouts.filter(workout => {
          const workoutDate = new Date(workout.date);
          const challengeStart = challenge.startDate ? new Date(challenge.startDate) : new Date();
          
          return workoutDate >= challengeStart && 
                 (challenge.type === 'Mixed' || workout.type === challenge.type);
        });

        return {
          ...challenge,
          completedWorkouts: Math.min(relevantWorkouts.length, challenge.targetWorkouts)
        };
      }
      return challenge;
    }));

    // Update leaderboard with current user stats
    setLeaderboard(prev => prev.map(entry => 
      entry.id === '1' ? {
        ...entry,
        workouts: workoutStats.weeklyCount,
        minutes: workoutStats.totalMinutes,
        rank: workoutStats.weeklyCount >= 8 ? 1 : workoutStats.weeklyCount >= 5 ? 2 : 3
      } : entry
    ).sort((a, b) => b.workouts - a.workouts).map((entry, index) => ({ ...entry, rank: index + 1 })));
  }, [workouts, workoutStats]);

  const joinChallenge = useCallback((challengeId: string) => {
    setMiniChallenges(prev => prev.map(challenge => 
      challenge.id === challengeId ? {
        ...challenge,
        isJoined: true,
        startDate: new Date().toISOString().split('T')[0],
        participantCount: challenge.participantCount + 1
      } : challenge
    ));

    toast({
      title: "Challenge Joined! 🚀",
      description: "Good luck! We're rooting for you!",
      duration: 3000,
    });
  }, [toast]);

  const sendGroupNudge = useCallback((groupId: string, memberId: string, message: string) => {
    // Simulate sending nudge
    toast({
      title: "Nudge Sent! 💌",
      description: "Your teammate will appreciate the motivation!",
      duration: 3000,
    });

    // Remove related notification and update ref
    setNotifications(prev => {
      const updated = prev.filter(n => 
        !(n.groupId === groupId && n.targetUserId === memberId)
      );
      previousNotificationsRef.current = updated;
      return updated;
    });
  }, [toast]);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      );
      previousNotificationsRef.current = updated;
      return updated;
    });
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    previousNotificationsRef.current = [];
  }, []);

  const generateCoachMessage = useCallback(() => {
    const messages = [
      "🔥 Your consistency is paying off! Keep the momentum going!",
      `💪 You've completed ${workoutStats.weeklyCount} workouts this week - amazing progress!`,
      "🌟 Your dedication is inspiring your teammates!",
      "🎯 Ready to tackle today's fitness goals? Let's do this!",
      "🚀 Every workout counts - you're building something incredible!"
    ];

    // Personalize based on recent activity
    if (workoutStats.weeklyCount >= 5) {
      return "🏆 WOW! You're absolutely crushing it with " + workoutStats.weeklyCount + " workouts this week! Your consistency is next level!";
    } else if (workoutStats.weeklyCount >= 3) {
      return "💪 Great momentum with " + workoutStats.weeklyCount + " workouts this week! You're building healthy habits!";
    } else if (workoutStats.weeklyCount >= 1) {
      return "🌱 Good start this week! Ready to add another workout to build your streak?";
    }

    return messages[Math.floor(Math.random() * messages.length)];
  }, [workoutStats]);

  return {
    miniChallenges,
    accountabilityGroups,
    leaderboard,
    notifications,
    workoutStats,
    joinChallenge,
    sendGroupNudge,
    generateCoachMessage,
    markNotificationAsRead,
    clearAllNotifications
  };
};