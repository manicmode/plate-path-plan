// Small, dependency-free helpers for "local day" correctness.

export const getLocalDateKey = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Return UTC ISO bounds that correspond to the user's local day.
export const getLocalDayBounds = (d: Date = new Date()) => {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return {
    startIsoUtc: new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString(),
    endIsoUtc: new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString(),
  };
};