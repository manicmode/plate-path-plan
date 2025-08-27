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
      lastCheckinDays: 999, // never checked in
      timezone: "America/Los_Angeles",
      lastMoodLog: null, // no mood log today
    },
    history: makeQAHistory({}), // Clean slate
    flags: {}, // No special flags needed
    respectCooldowns: false,
    respectDailyCaps: false,
    respectWeeklyCaps: false,
  },
  {
    id: "midday_low_hydration",
    at: "2025-08-26T12:30:00-07:00",
    expect: ["hydration_reminder"],
    description: "Midday with low hydration (12:30 PST)",
    signals: {
      hydrationMlToday: 250,
      hydrationTargetMl: 2200,
      lastHydrationReminderHours: 48,
      waterLogsToday: 1, // Low hydration
      timezone: "America/Los_Angeles",
    },
    history: makeQAHistory({}), // Clean slate
    flags: { hydration_nudges_enabled: true },
    respectCooldowns: false,
    respectDailyCaps: false,
    respectWeeklyCaps: false,
  },
  {
    id: "afternoon_sedentary",
    at: "2025-08-26T15:30:00-07:00",
    expect: ["movement_break"],
    description: "Afternoon after being sedentary (15:30 PST)",
    signals: {
      stepsToday: 900,
      minutesSedentaryBlock: 90,
      lastMovementNudgeHours: 48,
      activityLast48h: false, // No recent activity
      timezone: "America/Los_Angeles",
    },
    history: makeQAHistory({}), // Clean slate
    flags: { movement_nudges_enabled: true },
    respectCooldowns: false,
    respectDailyCaps: false,
    respectWeeklyCaps: false,
  },
  {
    id: "evening_no_reflection",
    at: "2025-08-26T21:30:00-07:00",
    expect: ["sleep_prep"],
    description: "Evening with no reflection done (21:30 PST)",
    signals: {
      lastReflectionDays: 7,
      bedtimeHourLocal: 23,
      upcomingBedtime: true,
      sleepScoreBelowTarget: true, // Needs sleep prep
      timezone: "America/Los_Angeles",
    },
    history: makeQAHistory({}), // Clean slate
    flags: { sleep_nudges_enabled: true },
    respectCooldowns: false,
    respectDailyCaps: false,
    respectWeeklyCaps: false,
  },
  {
    id: "breathe_recent_cooldown",
    at: "2025-08-26T14:00:00-07:00",
    expect: [], // should NOT appear due to cooldown
    description: "Recent breathing session - should be on cooldown (14:00 PST)",
    signals: {
      stressScore: 8,
      stressTagsLast48h: true,
      breathingSessionsLast7d: 1,
      timezone: "America/Los_Angeles",
    },
    history: makeQAHistory({
      // Simulate breathing nudge shown 2h ago (should block due to cooldown)
      lastShownByNudge: { time_to_breathe: "2025-08-26T12:00:00-07:00" },
      shownToday: { time_to_breathe: 1 },
      shownThisWeek: { time_to_breathe: 1 },
    }),
    flags: { breathing_nudges_enabled: true },
    respectCooldowns: true, // We want to test cooldown blocking
    respectDailyCaps: false,
    respectWeeklyCaps: false,
  },
  {
    id: "breathe_old_stress",
    at: "2025-08-26T14:00:00-07:00",
    expect: ["time_to_breathe"],
    description: "Old breathing session with stress (14:00 PST)",
    signals: {
      stressScore: 8,
      stressTagsLast48h: true,
      breathingSessionsLast7d: 0,
      lastBreathingSession: null, // Force old session
      timezone: "America/Los_Angeles",
    },
    history: makeQAHistory({
      // Simulate breathing nudge shown > 48h ago (outside cooldown)
      lastShownByNudge: { time_to_breathe: "2025-08-24T10:00:00-07:00" },
      shownToday: {},
      shownThisWeek: { time_to_breathe: 1 },
    }),
    flags: { breathing_nudges_enabled: true },
    respectCooldowns: true, // Test that it allows after cooldown
    respectDailyCaps: false,
    respectWeeklyCaps: false,
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