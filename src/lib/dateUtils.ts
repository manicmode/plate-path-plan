
// Date utility functions for local time zone support in nutrition tracking

/**
 * Gets the current local date as YYYY-MM-DD string
 * Uses local time zone, not UTC
 */
export const getLocalDateString = (date?: Date): string => {
  const targetDate = date || new Date();
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  
  const localDateString = `${year}-${month}-${day}`;
  
  return localDateString;
};

/**
 * Gets the start and end bounds of a local day as ISO strings
 * This handles timezone correctly by using local midnight, not UTC midnight
 */
export const getLocalDayBounds = (dateString: string): { start: string; end: string } => {
  // Parse the date string and create local midnight
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create local midnight (start of day)
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  
  // Create local end of day (23:59:59.999)
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
  
  const bounds = {
    start: startOfDay.toISOString(),
    end: endOfDay.toISOString()
  };
  
  console.log(`📅 Local day bounds for ${dateString}:`);
  console.log(`  Start: ${bounds.start} (${startOfDay.toLocaleString()})`);
  console.log(`  End: ${bounds.end} (${endOfDay.toLocaleString()})`);
  
  return bounds;
};

/**
 * Converts a local date string to ISO bounds for database queries
 * This ensures we query the correct time range for the user's local day
 */
export const convertLocalDateToISOBounds = (localDateString: string): { start: string; end: string } => {
  const bounds = getLocalDayBounds(localDateString);
  console.log(`🔍 Converting local date ${localDateString} to query bounds:`);
  console.log(`  Query start: ${bounds.start}`);
  console.log(`  Query end: ${bounds.end}`);
  return bounds;
};

/**
 * Gets the local date string for today
 */
export const getTodayLocalDateString = (): string => {
  return getLocalDateString();
};

/**
 * Gets local day bounds for today
 */
export const getTodayLocalBounds = (): { start: string; end: string } => {
  const today = getTodayLocalDateString();
  return getLocalDayBounds(today);
};

/**
 * Formats a date for the Home Daily Check-In tab as: EEE, MMM dd
 * Uses the provided locale or falls back to the browser locale, then en-US
 */
export const formatHomeCheckInDate = (date: Date, locale?: string): string => {
  const loc = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US') || 'en-US';
  const formatter = new Intl.DateTimeFormat(loc, {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const weekday = parts.find(p => p.type === 'weekday')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  return `${weekday}, ${month} ${day}`;
};
