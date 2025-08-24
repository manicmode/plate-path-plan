import * as React from "react";

type HabitPin = { id: string; name: string; unit?: string };
type HabitLog = { id: string; userId?: string; date: string; name: string; value?: number; unit?: string; notes?: string };

const STORAGE = {
  pinned: (userId?: string) => `habits.pinned:${userId ?? "anon"}`,
  logs:   (userId?: string) => `habits.logs:${userId ?? "anon"}`,
};

function getLocal<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function todayLocalISO(): string {
  // local YYYY-MM-DD (not UTC) to match how most UI logs store dates
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useDueHabitsCount(userId?: string) {
  const [count, setCount] = React.useState(0);

  const compute = React.useCallback(() => {
    const pins = getLocal<HabitPin>(STORAGE.pinned(userId));
    const logs = getLocal<HabitLog>(STORAGE.logs(userId));
    const today = todayLocalISO();

    const doneToday = new Set(
      logs
        .filter(l => (l.date ?? "").startsWith(today))
        .map(l => (l.name ?? "").trim().toLowerCase())
    );

    const due = pins.filter(p => !doneToday.has((p.name ?? "").trim().toLowerCase()));
    setCount(due.length);
  }, [userId]);

  React.useEffect(() => {
    compute();
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.startsWith("habits.pinned:") || e.key.startsWith("habits.logs:")) compute();
    };
    const onHabitEvent = () => compute();
    window.addEventListener("storage", onStorage);
    window.addEventListener("habit:changed", onHabitEvent);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("habit:changed", onHabitEvent);
    };
  }, [compute]);

  return count;
}