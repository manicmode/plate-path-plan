export interface StreakRow {
  habit_slug: string;
  current_streak: number;
  longest_streak: number;
  last_done_on: string | null;
  done_today: boolean;
}

export type StreakMap = Record<string, StreakRow>;