export type IdeaStarter = {
  section: 'Nutrition' | 'Exercise' | 'Recovery';
  categories: Array<{
    title: string;
    subtitle?: string;
    questions: string[];
  }>;
};

export const IDEA_STARTERS: IdeaStarter[] = [
  {
    section: 'Nutrition',
    categories: [
      {
        title: 'Hydration',
        subtitle: 'Water, electrolytes, timing',
        questions: [
          'How much water should I drink today based on my activity?',
          'Am I hitting my hydration goal this week?',
          'When should I add electrolytes and how much?',
          'What is my 30-day hydration trend?',
          'How do I avoid night-time wake-ups from drinking late?',
          'Give me a hydration checklist for a workout day.'
        ]
      },
      {
        title: 'Macros & Calories',
        subtitle: 'Protein, carbs, fats, targets',
        questions: [
          'What were my averages for protein, carbs, and fats last week?',
          'How far off am I from my calorie target this week?',
          'Suggest a high-protein day with 180g protein.',
          'What is my moving average for calories over 14 days?',
          'Which meals pushed me over my calories recently?',
          'How should I adjust macros for fat loss?'
        ]
      },
      {
        title: 'Meal Planning',
        subtitle: 'Simple, budget, prep',
        questions: [
          'Plan a simple 1-day menu around 2400 kcal and 180g protein.',
          'Give me 3 fast breakfast options under 400 kcal.',
          'Make a grocery list for high-protein lunches this week.',
          'How can I batch-prep dinners for 3 days?',
          'Help me reduce afternoon snacking with better lunch choices.',
          'What are my most calorie-dense foods lately?'
        ]
      },
      {
        title: 'Supplements',
        subtitle: 'Basics only',
        questions: [
          'Which basic supplements fit my goals?',
          'When should I take creatine and how much?',
          'Do I need electrolytes on rest days?',
          'What does my caffeine intake look like?',
          'Any interactions with my evening sleep routine?',
          'What is a minimal supplement stack?'
        ]
      }
    ]
  },
  {
    section: 'Exercise',
    categories: [
      {
        title: 'Programming',
        subtitle: 'Split, progression, deloads',
        questions: [
          'Design a 3-day full-body split for this week.',
          'How should I progress sets and reps next week?',
          'When should I schedule a deload?',
          'Estimate calories burned from my last three workouts.',
          'What is my weekly workout consistency trend?',
          'Help me balance push/pull/legs this month.'
        ]
      },
      {
        title: 'Strength',
        subtitle: 'Compound focus',
        questions: [
          'Give me two strength sessions under 45 minutes.',
          'What accessory lifts should I add to improve my squat?',
          'How do I warm up efficiently for heavy bench?',
          'What is my average workout duration this month?',
          'Suggest a progressive overload plan for deadlifts.',
          'How do I avoid elbow pain pressing?'
        ]
      },
      {
        title: 'Cardio',
        subtitle: 'Zones, intervals',
        questions: [
          'Create a 20-minute interval run at Zone 3-4.',
          'What should my HR zones be?',
          'How do I combine lifting with Zone 2?',
          'Should I do cardio before or after lifting?',
          'What is my weekly cardio volume trend?',
          'Give me a low-impact cardio day.'
        ]
      },
      {
        title: 'Mobility & Recovery',
        subtitle: 'Feel better, move better',
        questions: [
          'Build a 10-minute mobility circuit for hips and shoulders.',
          'How should I recover after heavy legs?',
          'Quick stretch routine for desk days?',
          'What is my rest-day pattern lately?',
          'Recommend a pre-sleep wind-down routine.',
          'How can I reduce DOMS after squats?'
        ]
      }
    ]
  },
  {
    section: 'Recovery',
    categories: [
      {
        title: 'Sleep',
        subtitle: 'Schedule, latency, routines',
        questions: [
          'What does my sleep consistency look like this week?',
          'Why might my daytime energy be low?',
          'Give me a 15-minute pre-sleep routine.',
          'How do I optimize naps?',
          'How much earlier should I stop caffeine?',
          'How do I fix weekend jet-lag?'
        ]
      },
      {
        title: 'Stress & Mindset',
        subtitle: 'Reset & focus',
        questions: [
          'Guide me through a 2-minute breathing reset.',
          'How can I prevent stress snacking?',
          'Give me a tiny habit to unwind after work.',
          'A quick mindfulness script before bed, please.',
          'What is a good morning ritual to prime my day?',
          'How do I stay consistent during busy weeks?'
        ]
      },
      {
        title: 'Readiness',
        subtitle: 'When to push/rest',
        questions: [
          'Should today be a push or recovery day?',
          'How many rest days did I take this week?',
          'How do I spot overreaching early?',
          'What recovery metric should I watch most?',
          'What is a smart active recovery session?',
          'Balance training when sleep was poor last night.'
        ]
      },
      {
        title: 'Routines',
        subtitle: 'AM/PM anchors',
        questions: [
          'Design a 5-minute morning routine for me.',
          'Give me a PM shut-down routine template.',
          'How do I stack habits around dinner?',
          'Create a Sunday reset checklist.',
          'Simple wind-down after evening workouts?',
          'How can I reduce screen time at night?'
        ]
      }
    ]
  }
];