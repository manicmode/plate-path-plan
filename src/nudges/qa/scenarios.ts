// Deterministic QA scenarios with fixed timestamps and expected results
export interface QAScenario {
  id: string;
  at: string; // ISO timestamp with timezone
  expect: string[]; // Expected nudge IDs
  signals: QASignals; // Mock context inputs
  description: string;
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
  },
  {
    id: "afternoon_sedentary",
    at: "2025-08-26T15:00:00-07:00",
    expect: ["movement_break"],
    description: "Afternoon after being sedentary (15:00 PST)",
    signals: {
      stepsToday: 900,
      minutesSedentaryBlock: 90,
      lastMovementNudgeHours: 48,
      activityLast48h: false, // No recent activity
      timezone: "America/Los_Angeles",
    },
  },
  {
    id: "evening_no_reflection",
    at: "2025-08-26T21:15:00-07:00",
    expect: ["sleep_prep"],
    description: "Evening with no reflection done (21:15 PST)",
    signals: {
      lastReflectionDays: 7,
      bedtimeHourLocal: 23,
      upcomingBedtime: true,
      sleepScoreBelowTarget: true, // Needs sleep prep
      timezone: "America/Los_Angeles",
    },
  },
  {
    id: "breathe_recent_cooldown",
    at: "2025-08-26T14:00:00-07:00",
    expect: [], // should NOT appear due to cooldown
    description: "Recent breathing session - should be on cooldown (14:00 PST)",
    signals: {
      stressScore: 8,
      lastBreathHours: 6, // inside cooldown window
      stressTagsLast48h: true,
      breathingSessionsLast7d: 1,
      timezone: "America/Los_Angeles",
    },
  },
  {
    id: "breathe_old_stress",
    at: "2025-08-26T14:00:00-07:00",
    expect: ["time_to_breathe"],
    description: "Old breathing session with stress (14:00 PST)",
    signals: {
      stressScore: 8,
      lastBreathDays: 7, // outside cooldown
      stressTagsLast48h: true,
      breathingSessionsLast7d: 0,
      lastBreathingSession: null, // Force old session
      timezone: "America/Los_Angeles",
    },
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