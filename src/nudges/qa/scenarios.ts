// Deterministic QA scenarios with fixed timestamps and expected results
export interface QAScenario {
  id: string;
  at: string; // ISO timestamp with timezone
  expect: string[]; // Expected nudge IDs
  signals: QASignals; // Mock context inputs
  description: string;
  history?: QAHistory; // Synthetic nudge history
  flags?: Record<string, boolean>; // Feature flags for this scenario
  respectCooldowns?: boolean; // Default: false
  respectDailyCaps?: boolean; // Default: false
  respectWeeklyCaps?: boolean; // Default: false
}

export interface QASignals {
  // Time-based overrides
  timezone?: string;
  
  // Check-in related
  lastCheckinDays?: number;
  
  // Hydration related
  hydrationMlToday?: number;
  hydrationTargetMl?: number;
  lastHydrationReminderHours?: number;
  
  // Movement related
  stepsToday?: number;
  minutesSedentaryBlock?: number;
  lastMovementNudgeHours?: number;
  
  // Sleep/reflection related
  lastReflectionDays?: number;
  bedtimeHourLocal?: number;
  
  // Breathing/stress related
  stressScore?: number;
  lastBreathHours?: number;
  lastBreathDays?: number;
  
  // Activity tracking
  activityLast48h?: boolean;
  waterLogsToday?: number;
  upcomingBedtime?: boolean;
  sleepScoreBelowTarget?: boolean;
  stressTagsLast48h?: boolean;
  breathingSessionsLast7d?: number;
  lastBreathingSession?: Date | null;
  lastMoodLog?: Date | null;
}

export interface QAHistory {
  lastShownByNudge?: Record<string, string>; // nudgeId -> ISO timestamp
  shownToday?: Record<string, number>; // nudgeId -> count today
  shownThisWeek?: Record<string, number>; // nudgeId -> count this week
  totalShownToday?: number; // Total nudges shown today
  totalShownThisWeek?: number; // Total nudges shown this week
}

export function makeQAHistory(opts: {
  lastShownByNudge?: Record<string, string>;
  shownToday?: Record<string, number>;
  shownThisWeek?: Record<string, number>;
  totalShownToday?: number;
  totalShownThisWeek?: number;
}): QAHistory {
  return {
    lastShownByNudge: opts.lastShownByNudge || {},
    shownToday: opts.shownToday || {},
    shownThisWeek: opts.shownThisWeek || {},
    totalShownToday: opts.totalShownToday || 0,
    totalShownThisWeek: opts.totalShownThisWeek || 0,
  };
}

export const QA_SCENARIOS: QAScenario[] = [
  {
    id: "morning_checkin",
    at: "2025-08-26T09:00:00-07:00",
    expect: ["daily_checkin"],
    description: "Morning check-in scenario (09:00 PST)",
    signals: {
      timezone: "America/Los_Angeles",
      lastMoodLog: null, // no mood log today
      waterLogsToday: 4, // adequate hydration
      activityLast48h: true, // has activity
      stressTagsLast48h: false, // not stressed
      upcomingBedtime: false, // not evening
    },
    history: makeQAHistory({}),
    flags: {},
  },
  {
    id: "midday_low_hydration",
    at: "2025-08-26T12:00:00-07:00",
    expect: ["hydration_reminder"],
    description: "Midday with low hydration (12:00 PST)",
    signals: {
      timezone: "America/Los_Angeles",
      waterLogsToday: 2, // Low hydration
      lastMoodLog: new Date("2025-08-26T08:00:00-07:00"), // already checked in
      activityLast48h: true, // has activity
      stressTagsLast48h: false, // not stressed
      upcomingBedtime: false, // not evening
    },
    history: makeQAHistory({}),
    flags: {},
  },
  {
    id: "afternoon_sedentary",
    at: "2025-08-26T15:00:00-07:00",
    expect: ["movement_break"],
    description: "Afternoon sedentary (15:00 PST)",
    signals: {
      timezone: "America/Los_Angeles",
      activityLast48h: false, // No recent activity
      lastMoodLog: new Date("2025-08-26T08:00:00-07:00"), // already checked in
      waterLogsToday: 4, // adequate hydration
      stressTagsLast48h: false, // not stressed
      upcomingBedtime: false, // not evening
    },
    history: makeQAHistory({}),
    flags: {},
  },
  {
    id: "evening_no_reflection",
    at: "2025-08-26T21:00:00-07:00",
    expect: ["sleep_prep"],
    description: "Evening no reflection (21:00 PST)",
    signals: {
      timezone: "America/Los_Angeles",
      lastMoodLog: null, // no reflection today
      upcomingBedtime: true,
      waterLogsToday: 4, // adequate hydration
      activityLast48h: true, // has activity
      stressTagsLast48h: false, // not stressed
    },
    history: makeQAHistory({}),
    flags: {},
  },
  {
    id: "breathe_recent_cooldown",
    at: "2025-08-26T14:00:00-07:00",
    expect: [],
    description: "Stress with recent breathing - should be on cooldown (14:00 PST)",
    signals: {
      timezone: "America/Los_Angeles",
      stressTagsLast48h: true, // stressed
      lastBreathingSession: new Date("2025-08-26T05:00:00-07:00"), // 9h ago (within 4d cooldown)
      lastMoodLog: new Date("2025-08-26T08:00:00-07:00"), // already checked in
      waterLogsToday: 4, // adequate hydration
      activityLast48h: true, // has activity
      upcomingBedtime: false, // not evening
    },
    history: makeQAHistory({
      lastShownByNudge: { time_to_breathe: "2025-08-24T14:00:00-07:00" }, // 2 days ago (within cooldown)
      shownToday: {},
      shownThisWeek: { time_to_breathe: 1 },
    }),
    flags: { breathing_nudges_enabled: true },
  },
  {
    id: "breathe_old_stress",
    at: "2025-08-26T14:00:00-07:00",
    expect: ["time_to_breathe"],
    description: "Stress with old breathing - should allow (14:00 PST)",
    signals: {
      timezone: "America/Los_Angeles",
      stressTagsLast48h: true, // stressed
      lastBreathingSession: new Date("2025-08-21T14:00:00-07:00"), // 5 days ago (outside cooldown)
      lastMoodLog: new Date("2025-08-26T08:00:00-07:00"), // already checked in
      waterLogsToday: 4, // adequate hydration
      activityLast48h: true, // has activity
      upcomingBedtime: false, // not evening
    },
    history: makeQAHistory({
      lastShownByNudge: { time_to_breathe: "2025-08-21T14:00:00-07:00" }, // 5 days ago (outside cooldown)
      shownToday: {},
      shownThisWeek: {},
    }),
    flags: { breathing_nudges_enabled: true },
  },
];

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