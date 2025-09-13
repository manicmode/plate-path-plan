import { useEffect, useState } from "react";

// Shared epoch so multiple instances stay in phase without plumbing
const START_EPOCH = Date.now();

export function useTextRotator(items: string[], intervalMs = 3000) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(Math.floor((Date.now() - START_EPOCH) / intervalMs)), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return items.length ? items[tick % items.length] : "";
}