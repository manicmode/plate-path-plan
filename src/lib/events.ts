/**
 * Custom events for habit management
 */

export const HabitEvents = {
  started: 'habit:started',
} as const;

export interface HabitStartedPayload {
  slug: string;
  userHabitId?: string;
}

export function emitHabitStarted(payload: HabitStartedPayload): void {
  window.dispatchEvent(new CustomEvent(HabitEvents.started, { detail: payload }));
}