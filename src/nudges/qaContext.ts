import { UserNudgeContext } from './registry';

export type QAMock = Partial<UserNudgeContext & { 
  frozenNow?: string;
  bypassQuietHours?: boolean;
}>;

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

export type QAScenario = {
  name: string;
  description: string;
  mock: QAMock;
  expectedNudges: string[];
  expectedCount: number;
};

export const QA_SCENARIOS: QAScenario[] = [
  {
    name: 'morning_checkin',
    description: 'Morning time - should show Daily Check-In only',
    mock: {
      frozenNow: '2024-01-15T09:30:00Z',
      lastMoodLog: null,
      waterLogsToday: 2,
      activityLast48h: true,
      stressTagsLast48h: false
    },
    expectedNudges: ['daily_checkin'],
    expectedCount: 1
  },
  {
    name: 'midday_low_hydration',
    description: 'Midday with low hydration - should show Hydration',
    mock: {
      frozenNow: '2024-01-15T13:00:00Z',
      waterLogsToday: 1, // Below threshold of 4
      lastMoodLog: new Date('2024-01-15T08:00:00Z'),
      activityLast48h: true,
      stressTagsLast48h: false
    },
    expectedNudges: ['hydration_reminder'],
    expectedCount: 1
  },
  {
    name: 'afternoon_sedentary',
    description: 'Afternoon after 2h sedentary - should show Movement',
    mock: {
      frozenNow: '2024-01-15T15:00:00Z',
      activityLast48h: false, // No recent activity
      waterLogsToday: 6,
      lastMoodLog: new Date('2024-01-15T08:00:00Z'),
      stressTagsLast48h: false
    },
    expectedNudges: ['movement_break'],
    expectedCount: 1
  },
  {
    name: 'evening_no_reflection',
    description: 'Evening with no reflection - should show Sleep Prep',
    mock: {
      frozenNow: '2024-01-15T21:00:00Z',
      upcomingBedtime: true,
      sleepScoreBelowTarget: true,
      waterLogsToday: 6,
      activityLast48h: true,
      lastMoodLog: new Date('2024-01-15T08:00:00Z'),
      stressTagsLast48h: false
    },
    expectedNudges: ['sleep_prep'],
    expectedCount: 1
  },
  {
    name: 'breathe_recent_cooldown',
    description: 'Recent breathing (24h) - should NOT show Time to Breathe',
    mock: {
      frozenNow: '2024-01-15T14:00:00Z',
      lastBreathingSession: new Date('2024-01-14T16:00:00Z'), // 22 hours ago
      stressTagsLast48h: true,
      waterLogsToday: 6,
      activityLast48h: true,
      lastMoodLog: new Date('2024-01-15T08:00:00Z')
    },
    expectedNudges: [],
    expectedCount: 0
  },
  {
    name: 'breathe_old_stress',
    description: 'Old breathing (4+ days) with stress - should show Time to Breathe',
    mock: {
      frozenNow: '2024-01-15T14:00:00Z',
      lastBreathingSession: new Date('2024-01-10T14:00:00Z'), // 5 days ago
      stressTagsLast48h: true,
      breathingSessionsLast7d: 0,
      waterLogsToday: 6,
      activityLast48h: true,
      lastMoodLog: new Date('2024-01-15T08:00:00Z')
    },
    expectedNudges: ['time_to_breathe'],
    expectedCount: 1
  }
];