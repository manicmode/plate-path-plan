import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';

export interface GroupMember {
  user_id: string;
  username: string;
  display_name: string;
  last_workout_date: string | null;
  weekly_workout_count: number;
  current_streak: number;
  status: 'active' | 'falling_behind' | 'needs_nudge' | 'inactive';
}

export interface NudgeOpportunity {
  target_user: GroupMember;
  days_since_workout: number;
  suggested_message: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface GroupStats {
  total_members: number;
  active_members: number;
  average_weekly_workouts: number;
  group_consistency_score: number;
  needs_encouragement: boolean;
}

export const useSocialAccountability = (challengeId?: string) => {
  const { user } = useAuth();
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [nudgeOpportunities, setNudgeOpportunities] = useState<NudgeOpportunity[]>([]);
  const [groupStats, setGroupStats] = useState<GroupStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for now - in real implementation, this would fetch from Supabase
  const mockGroupMembers: GroupMember[] = [
    {
      user_id: '1',
      username: 'Alex',
      display_name: 'Alex Johnson',
      last_workout_date: '2024-01-20', // 3 days ago
      weekly_workout_count: 1,
      current_streak: 0,
      status: 'needs_nudge'
    },
    {
      user_id: '2',
      username: 'Sam',
      display_name: 'Sam Wilson',
      last_workout_date: '2024-01-22', // 1 day ago
      weekly_workout_count: 4,
      current_streak: 12,
      status: 'active'
    },
    {
      user_id: '3',
      username: 'Jordan',
      display_name: 'Jordan Smith',
      last_workout_date: '2024-01-18', // 5 days ago
      weekly_workout_count: 0,
      current_streak: 0,
      status: 'inactive'
    },
    {
      user_id: '4',
      username: 'Casey',
      display_name: 'Casey Brown',
      last_workout_date: '2024-01-21', // 2 days ago
      weekly_workout_count: 3,
      current_streak: 8,
      status: 'falling_behind'
    }
  ];

  const generateNudgeMessage = useCallback((member: GroupMember, urgency: 'low' | 'medium' | 'high'): string => {
    const lowUrgencyMessages = [
      `Hey ${member.display_name}! Missing your energy in our workouts 💪`,
      `${member.display_name}, ready to jump back in? We've got your back! 🤝`,
      `Thinking of you ${member.display_name}! Let's crush this week together 🔥`
    ];

    const mediumUrgencyMessages = [
      `${member.display_name}, we miss our workout buddy! Ready to get back in there? 💪`,
      `Hey ${member.display_name}! Your squad is here when you're ready to dominate 🚀`,
      `${member.display_name}, let's finish this week strong together! You got this! 💥`
    ];

    const highUrgencyMessages = [
      `${member.display_name}, we believe in you! One workout at a time 🌟`,
      `Missing our teammate ${member.display_name}! Ready to show this week who's boss? 💪`,
      `${member.display_name}, your comeback story starts now! We're all rooting for you 🎯`
    ];

    let messages;
    switch (urgency) {
      case 'low':
        messages = lowUrgencyMessages;
        break;
      case 'medium':
        messages = mediumUrgencyMessages;
        break;
      case 'high':
        messages = highUrgencyMessages;
        break;
    }

    return messages[Math.floor(Math.random() * messages.length)];
  }, []);

  const detectNudgeOpportunities = useCallback(() => {
    const today = new Date();
    const opportunities: NudgeOpportunity[] = [];

    mockGroupMembers.forEach(member => {
      if (member.user_id === user?.id) return; // Don't nudge yourself

      let daysSinceWorkout = 0;
      if (member.last_workout_date) {
        const lastWorkout = new Date(member.last_workout_date);
        daysSinceWorkout = Math.floor((today.getTime() - lastWorkout.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        daysSinceWorkout = 999; // Never worked out
      }

      let urgency: 'low' | 'medium' | 'high' = 'low';
      if (daysSinceWorkout >= 5) urgency = 'high';
      else if (daysSinceWorkout >= 3) urgency = 'medium';

      if (member.status === 'needs_nudge' || member.status === 'inactive' || member.status === 'falling_behind') {
        opportunities.push({
          target_user: member,
          days_since_workout: daysSinceWorkout,
          suggested_message: generateNudgeMessage(member, urgency),
          urgency
        });
      }
    });

    setNudgeOpportunities(opportunities);
  }, [user?.id, generateNudgeMessage]);

  const calculateGroupStats = useCallback(() => {
    const stats: GroupStats = {
      total_members: mockGroupMembers.length,
      active_members: mockGroupMembers.filter(m => m.status === 'active').length,
      average_weekly_workouts: mockGroupMembers.reduce((sum, m) => sum + m.weekly_workout_count, 0) / mockGroupMembers.length,
      group_consistency_score: 0,
      needs_encouragement: false
    };

    // Calculate consistency score (0-100)
    const activePercentage = (stats.active_members / stats.total_members) * 100;
    const workoutFrequencyScore = Math.min((stats.average_weekly_workouts / 4) * 100, 100);
    stats.group_consistency_score = (activePercentage + workoutFrequencyScore) / 2;

    // Determine if group needs encouragement
    stats.needs_encouragement = stats.group_consistency_score < 70 || stats.active_members < stats.total_members * 0.6;

    setGroupStats(stats);
  }, []);

  const sendNudge = useCallback(async (opportunity: NudgeOpportunity, customMessage?: string) => {
    const message = customMessage || opportunity.suggested_message;
    
    try {
      // In real implementation, this would save to database and send notification
      console.log(`Sending nudge to ${opportunity.target_user.display_name}: ${message}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Remove the opportunity after sending
      setNudgeOpportunities(prev => 
        prev.filter(n => n.target_user.user_id !== opportunity.target_user.user_id)
      );

      return { success: true, message: 'Nudge sent successfully!' };
    } catch (error) {
      console.error('Failed to send nudge:', error);
      return { success: false, message: 'Failed to send nudge. Try again.' };
    }
  }, []);

  const generateCoachGroupMessage = useCallback((): string | null => {
    if (!groupStats) return null;

    // High performing group
    if (groupStats.group_consistency_score >= 80) {
      const messages = [
        "🔥 This group is UNSTOPPABLE! Your collective energy is infectious!",
        "🏆 Elite squad alert! You're all crushing it together - keep this momentum!",
        "⚡ Power team activate! Your consistency is setting the bar high!",
        "🚀 Squad goals achieved! You're all pushing each other to greatness!"
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }

    // Group needs encouragement
    if (groupStats.needs_encouragement && nudgeOpportunities.length > 0) {
      const sparkMessages = [
        "👟 Looks like some teammates need a push — who's gonna be the spark today? 🔥",
        "💪 Team spirit time! Someone could use your positive energy right now!",
        "🤝 Great teams lift each other up. Ready to be someone's motivation today?",
        "⭐ Your squad needs you! Who's ready to spread some workout motivation?"
      ];
      return sparkMessages[Math.floor(Math.random() * sparkMessages.length)];
    }

    // Moderate performance
    if (groupStats.group_consistency_score >= 60) {
      const encouragementMessages = [
        "📈 Good momentum building! Let's keep supporting each other!",
        "💫 Steady progress squad! Every workout counts - keep it up!",
        "🎯 You're finding your rhythm! Consistency is key - stay together!",
        "🌟 Building something special here! Support your teammates!"
      ];
      return encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
    }

    return null;
  }, [groupStats, nudgeOpportunities]);

  useEffect(() => {
    setIsLoading(true);
    
    // Simulate loading and data processing
    setTimeout(() => {
      setGroupMembers(mockGroupMembers);
      detectNudgeOpportunities();
      calculateGroupStats();
      setIsLoading(false);
    }, 1000);
  }, [detectNudgeOpportunities, calculateGroupStats]);

  return {
    groupMembers,
    nudgeOpportunities,
    groupStats,
    isLoading,
    sendNudge,
    generateCoachGroupMessage,
    refreshData: () => {
      detectNudgeOpportunities();
      calculateGroupStats();
    }
  };
};