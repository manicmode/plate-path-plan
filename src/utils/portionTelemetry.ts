export const logPortionEvent = (name: string, payload: any) => {
  try {
    // Hook into existing analytics - implement later if needed
    console.log(`[PORTION][${name.toUpperCase()}]`, payload);
  } catch (error) {
    // Silent fail for telemetry
  }
};