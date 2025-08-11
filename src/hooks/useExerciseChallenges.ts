import { useState, useEffect } from 'react';
import { usePublicChallenges } from './usePublicChallenges';
import { usePrivateChallenges } from './usePrivateChallenges';

export interface MiniChallenge {
  id: string;
  name: string;
  description: string;
  duration: string;
  difficulty: string;
  type: string;
  emoji: string;
  gradient: string;
  participantCount: number;
  isJoined: boolean;
}

export interface AccountabilityGroup {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  members: Array<{
    id: string;
    name: string;
    avatar: string;
    progress: number;
    lastActive: string;
    status: string;
    completedWorkouts: number;
    weeklyGoal: number;
    streak: number;
  }>;
  totalMembers: number;
  weeklyGoal: string;
  progress: number;
  groupProgress: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  score: number;
  rank: number;
  change: number;
  badge?: string;
  workouts: number;
  minutes: number;
}

export const useExerciseChallenges = () => {
  const {
    challenges,
    quickChallenges,
    loading: publicLoading,
    joinChallenge: joinPublicChallenge,
    getUserParticipation,
  } = usePublicChallenges();

  const {
    userActiveChallenges,
    loading: privateLoading,
  } = usePrivateChallenges();

  // Convert public challenges to mini challenge format
  const miniChallenges: MiniChallenge[] = quickChallenges.map(challenge => ({
    id: challenge.id,
    name: challenge.title,
    description: challenge.description || 'Join this challenge to build healthy habits',
    duration: `${challenge.duration_days} day${challenge.duration_days > 1 ? 's' : ''}`,
    difficulty: challenge.duration_days <= 1 ? 'Beginner' : challenge.duration_days <= 3 ? 'Intermediate' : 'Advanced',
    type: challenge.category || 'General',
    emoji: challenge.cover_emoji || '🏆',
    gradient: 'from-primary/10 to-secondary/10',
    participantCount: challenge.participant_count,
    isJoined: !!getUserParticipation(challenge.id),
  }));

  // Convert private challenges to accountability groups (simplified)
  const accountabilityGroups: AccountabilityGroup[] = userActiveChallenges.map(challenge => ({
    id: challenge.id,
    name: challenge.title,
    description: challenge.description || 'Private challenge group',
    emoji: '💪',
    members: [], // Simplified for now - no members to show build errors
    totalMembers: 1, // Just the creator for now
    weeklyGoal: `Complete ${challenge.duration_days} day challenge`,
    progress: 0, // Simplified for now
    groupProgress: 0,
  }));

  // Mock leaderboard for now (can be enhanced later)
  const leaderboard: LeaderboardEntry[] = [];

  const joinChallenge = async (challengeId: string) => {
    await joinPublicChallenge(challengeId);
  };

  const sendGroupNudge = async (groupId: string, memberId: string, message: string) => {
    // TODO: Implement group nudging functionality
    console.log('Sending nudge:', { groupId, memberId, message });
  };

  const generateCoachMessage = () => {
    const messages = [
      "💪 Ready to crush your fitness goals today? Let's make it happen!",
      "🔥 I see you eyeing those challenges! Time to turn that motivation into ACTION!",
      "⚡ Your body is capable of amazing things. Show it what you're made of!",
      "🚀 Champions don't wait for motivation - they CREATE it. Let's GO!",
      "🎯 Every rep, every step, every challenge brings you closer to your best self!",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const loading = publicLoading || privateLoading;

  return {
    miniChallenges,
    accountabilityGroups,
    leaderboard,
    loading,
    joinChallenge,
    sendGroupNudge,
    generateCoachMessage,
  };
};