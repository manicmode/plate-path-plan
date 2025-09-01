/**
 * Debug logging utilities
 */

export const debugLog = (category: string, data: any) => {
  const debugKey = `VITE_DEBUG_${category.toUpperCase()}`;
  if (import.meta.env[debugKey] === '1') {
    console.log(`[${category.toUpperCase()}]`, data);
  }
};

export const debugMeal = (data: any) => debugLog('MEAL', data);