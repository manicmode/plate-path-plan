import { useState, useCallback } from 'react';

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

export const useExerciseChallenges = () => {
  const [miniChallenges] = useState<MiniChallenge[]>([
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
      gradient: 'from-green-400 to-emerald-600'
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
      gradient: 'from-orange-400 to-amber-600'
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
      gradient: 'from-red-400 to-rose-600'
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
      gradient: 'from-blue-400 to-cyan-600'
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
      gradient: 'from-purple-400 to-violet-600'
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
      gradient: 'from-pink-400 to-rose-500'
    }
  ]);

  const [accountabilityGroups] = useState<AccountabilityGroup[]>([
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
          completedWorkouts: 3,
          streak: 5,
          lastWorkout: '2024-01-23',
          status: 'active'
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
          completedWorkouts: 2,
          streak: 3,
          lastWorkout: '2024-01-23',
          status: 'active'
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

  const [leaderboard] = useState<LeaderboardEntry[]>([
    {
      id: '1',
      name: 'FitGuru23',
      avatar: '👑',
      workouts: 12,
      minutes: 540,
      rank: 1
    },
    {
      id: '2',
      name: 'IronWill',
      avatar: '💪',
      workouts: 10,
      minutes: 485,
      rank: 2
    },
    {
      id: '3',
      name: 'ZenMaster',
      avatar: '🧘‍♀️',
      workouts: 8,
      minutes: 420,
      rank: 3
    }
  ]);

  const joinChallenge = useCallback((challengeId: string) => {
    console.log(`Joining challenge: ${challengeId}`);
    // In real implementation, this would update the backend
  }, []);

  const sendGroupNudge = useCallback((groupId: string, memberId: string, message: string) => {
    console.log(`Sending nudge to ${memberId} in group ${groupId}: ${message}`);
    // In real implementation, this would send a notification
  }, []);

  const generateCoachMessage = useCallback(() => {
    const messages = [
      "🔥 Team CardioBlasters is killing it! Keep the momentum going!",
      "👟 Looks like Mike hasn't logged a workout in 3 days—wanna send a nudge?",
      "🌟 Sunrise Squad is crushing their weekly goals! You're all amazing!",
      "💪 Who's gonna be the spark today? Some teammates could use your energy!",
      "🎯 Great consistency this week! Your dedication is inspiring others!"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }, []);

  return {
    miniChallenges,
    accountabilityGroups,
    leaderboard,
    joinChallenge,
    sendGroupNudge,
    generateCoachMessage
  };
};