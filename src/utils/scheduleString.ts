/**
 * Helper function to generate RRULE schedule strings from frequency data
 */

export interface ScheduleParams {
  type: 'daily' | 'weekly' | 'every_x_days' | 'custom_days';
  interval?: number;
  byDays?: string[];
}

export const generateScheduleString = (params: ScheduleParams): string => {
  const { type, interval = 1, byDays } = params;
  
  switch (type) {
    case 'daily':
      return `FREQ=DAILY;INTERVAL=${interval}`;
      
    case 'every_x_days':
      return `FREQ=DAILY;INTERVAL=${interval}`;
      
    case 'weekly':
      if (byDays && byDays.length > 0) {
        return `FREQ=WEEKLY;INTERVAL=${interval};BYDAY=${byDays.join(',')}`;
      }
      return `FREQ=WEEKLY;INTERVAL=${interval}`;
      
    case 'custom_days':
      if (byDays && byDays.length > 0) {
        return `FREQ=WEEKLY;BYDAY=${byDays.join(',')}`;
      }
      return 'FREQ=WEEKLY;INTERVAL=1';
      
    default:
      return 'FREQ=DAILY;INTERVAL=1';
  }
};

/**
 * Legacy function for backward compatibility with existing reminder code
 */
export const generateScheduleStringLegacy = (
  frequencyType: 'daily' | 'every_x_days' | 'weekly' | 'custom_days',
  frequencyValue?: number,
  customDays?: number[]
): string => {
  // Convert day numbers to RRULE format (SU=0, MO=1, etc.)
  const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const byDays = customDays?.map(day => dayNames[day]) || [];

  return generateScheduleString({
    type: frequencyType,
    interval: frequencyValue,
    byDays
  });
};