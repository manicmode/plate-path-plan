import { UserNudgeContext } from './registry';
import { QAHistory } from './qa/scenarios';

export type QAMock = Partial<UserNudgeContext> & { 
  frozenNow?: string;
  bypassQuietHours?: boolean;
  qaHistory?: QAHistory; // Synthetic nudge history for QA
  qaFlags?: Record<string, boolean>; // Feature flags for QA scenarios
};

export function withQAMocks(ctx: UserNudgeContext, mock?: QAMock): UserNudgeContext {
  if (!mock) return ctx;

  const result = { ...ctx };

  // Override time if frozen
  if (mock.frozenNow) {
    result.currentTime = new Date(mock.frozenNow);
  }

  // Override context fields
  if (mock.userId !== undefined) result.userId = mock.userId;
  if (mock.timezone !== undefined) result.timezone = mock.timezone;
  if (mock.lastBreathingSession !== undefined) result.lastBreathingSession = mock.lastBreathingSession;
  if (mock.lastMoodLog !== undefined) result.lastMoodLog = mock.lastMoodLog;
  if (mock.waterLogsToday !== undefined) result.waterLogsToday = mock.waterLogsToday;
  if (mock.activityLast48h !== undefined) result.activityLast48h = mock.activityLast48h;
  if (mock.upcomingBedtime !== undefined) result.upcomingBedtime = mock.upcomingBedtime;
  if (mock.sleepScoreBelowTarget !== undefined) result.sleepScoreBelowTarget = mock.sleepScoreBelowTarget;
  if (mock.stressTagsLast48h !== undefined) result.stressTagsLast48h = mock.stressTagsLast48h;
  if (mock.breathingSessionsLast7d !== undefined) result.breathingSessionsLast7d = mock.breathingSessionsLast7d;

  return result;
}

export function buildTestContext(scenarioId: string, userId: string, currentTime: Date): UserNudgeContext {
  const baseContext: UserNudgeContext = {
    userId,
    currentTime,
    timezone: 'America/Los_Angeles',
    lastBreathingSession: null,
    lastMoodLog: null,
    waterLogsToday: 4,
    activityLast48h: true,
    upcomingBedtime: false,
    sleepScoreBelowTarget: false,
    stressTagsLast48h: false,
    breathingSessionsLast7d: 1
  };

  switch (scenarioId) {
    case 'morning_checkin':
      return {
        ...baseContext,
        lastMoodLog: null // No mood log today
      };
    
    case 'midday_low_hydration':
      return {
        ...baseContext,
        waterLogsToday: 1 // Low hydration
      };
    
    case 'afternoon_sedentary':
      return {
        ...baseContext,
        activityLast48h: false // No recent activity
      };
    
    case 'evening_no_reflection':
      return {
        ...baseContext,
        upcomingBedtime: true,
        sleepScoreBelowTarget: true // Needs sleep prep
      };
    
    case 'breathe_recent_cooldown':
      return {
        ...baseContext,
        lastBreathingSession: new Date(currentTime.getTime() - 12 * 60 * 60 * 1000), // 12h ago
        stressTagsLast48h: true,
        breathingSessionsLast7d: 1
      };
    
    case 'breathe_old_stress':
      return {
        ...baseContext,
        lastBreathingSession: new Date(currentTime.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        stressTagsLast48h: true,
        breathingSessionsLast7d: 0
      };
    
    default:
      return baseContext;
  }
}

export const QA_TEST_USERS = [
  {
    id: 'qa_user_fresh',
    email: 'qa_user_fresh@test.dev',
    description: 'Fresh user with no recent nudges'
  },
  {
    id: 'qa_user_breathe_heavy', 
    email: 'qa_user_breathe_heavy@test.dev',
    description: 'User who recently received breathing nudges (should be on cooldown)'
  },
  {
    id: 'qa_user_low_hydration',
    email: 'qa_user_low_hydration@test.dev', 
    description: 'User with low hydration levels'
  }
];