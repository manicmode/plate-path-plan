import React, { ReactNode } from 'react';

export type NudgeDefinition = {
  id: string;
  priority: number;            // higher wins
  cooldownDays: number;        // min days between 'shown'
  dailyCap: number;            // max 'shown' per day per user (usually 1)
  maxPer7d: number;            // weekly cap (e.g. 2)
  enabledFlag?: string;        // optional feature flag
  window?: { startHour: number; endHour: number }; // time-of-day window
  isEligible: (ctx: UserNudgeContext) => Promise<boolean>; // business logic
  render: (props: NudgeRenderProps) => React.ReactElement;        // existing component
};

export type UserNudgeContext = {
  userId: string;
  currentTime: Date;
  timezone: string;
  lastBreathingSession?: Date | null;
  lastMoodLog?: Date | null;
  waterLogsToday: number;
  activityLast48h: boolean;
  upcomingBedtime: boolean;
  sleepScoreBelowTarget: boolean;
  stressTagsLast48h: boolean;
  breathingSessionsLast7d: number;
};

export type NudgeRenderProps = {
  runId: string;
  onDismiss: () => void;
  onCta: () => void;
};

// Import components (will create these wrappers)
import { DailyCheckInNudgeWrapper } from '@/components/nudges/DailyCheckInNudgeWrapper';
import { TimeToBreatheNudgeWrapper } from '@/components/nudges/TimeToBreatheNudgeWrapper';
import { HydrationNudgeWrapper } from '@/components/nudges/HydrationNudgeWrapper';
import { MovementNudgeWrapper } from '@/components/nudges/MovementNudgeWrapper';
import { SleepPrepNudgeWrapper } from '@/components/nudges/SleepPrepNudgeWrapper';

export const NUDGE_REGISTRY: NudgeDefinition[] = [
  {
    id: 'daily_checkin',
    priority: 90,
    cooldownDays: 1,
    dailyCap: 1,
    maxPer7d: 7,
    window: { startHour: 7, endHour: 22 },
    isEligible: async (ctx: UserNudgeContext) => {
      // Check if user hasn't done mood log today
      const today = new Date().toISOString().split('T')[0];
      const lastLogDate = ctx.lastMoodLog?.toISOString().split('T')[0];
      return lastLogDate !== today;
    },
    render: (props: NudgeRenderProps) => React.createElement(DailyCheckInNudgeWrapper, props)
  },
  {
    id: 'time_to_breathe',
    priority: 70,
    cooldownDays: 4,
    dailyCap: 1,
    maxPer7d: 2,
    window: { startHour: 10, endHour: 20 },
    enabledFlag: 'breathing_nudges_enabled',
    isEligible: async (ctx: UserNudgeContext) => {
      // Check if user hasn't done breathing in last 24h
      const twentyFourHoursAgo = new Date(ctx.currentTime.getTime() - 24 * 60 * 60 * 1000);
      const noRecentBreathing = !ctx.lastBreathingSession || ctx.lastBreathingSession < twentyFourHoursAgo;
      
      // Check stress condition: either high stress in last 48h OR no breathing in last 7 days
      const hasStressOrNoRecent = ctx.stressTagsLast48h || ctx.breathingSessionsLast7d === 0;
      
      return noRecentBreathing && hasStressOrNoRecent;
    },
    render: (props: NudgeRenderProps) => React.createElement(TimeToBreatheNudgeWrapper, props)
  },
  {
    id: 'hydration_reminder',
    priority: 60,
    cooldownDays: 2,
    dailyCap: 1,
    maxPer7d: 3,
    window: { startHour: 9, endHour: 21 },
    isEligible: async (ctx: UserNudgeContext) => {
      // Eligible if less than 4 water logs today
      return ctx.waterLogsToday < 4;
    },
    render: (props: NudgeRenderProps) => React.createElement(HydrationNudgeWrapper, props)
  },
  {
    id: 'movement_break',
    priority: 55,
    cooldownDays: 2,
    dailyCap: 1,
    maxPer7d: 3,
    window: { startHour: 10, endHour: 19 },
    isEligible: async (ctx: UserNudgeContext) => {
      // Eligible if no activity ≥20 min in last 48h
      return !ctx.activityLast48h;
    },
    render: (props: NudgeRenderProps) => React.createElement(MovementNudgeWrapper, props)
  },
  {
    id: 'sleep_prep',
    priority: 50,
    cooldownDays: 3,
    dailyCap: 1,
    maxPer7d: 2,
    window: { startHour: 20, endHour: 23 },
    isEligible: async (ctx: UserNudgeContext) => {
      // Eligible if bedtime approaching and sleep score below target
      return ctx.upcomingBedtime && ctx.sleepScoreBelowTarget;
    },
    render: (props: NudgeRenderProps) => React.createElement(SleepPrepNudgeWrapper, props)
  }
];

// Export alias for backwards compatibility
export const REGISTRY = NUDGE_REGISTRY;