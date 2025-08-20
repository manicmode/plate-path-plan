export type IdleDeadline = { didTimeout: boolean; timeRemaining: () => number };

export function requestIdle(cb: (d: IdleDeadline) => void): number {
  const ric: any = (window as any).requestIdleCallback;
  if (typeof ric === 'function') return ric(cb);
  // Safari fallback
  return window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 1);
}

export function cancelIdle(id: number) {
  const cic: any = (window as any).cancelIdleCallback;
  if (typeof cic === 'function') return cic(id);
  clearTimeout(id);
}