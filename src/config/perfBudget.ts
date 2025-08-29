// Performance budgets for monitoring
export const PERF_BUDGET = {
  analyzeTotalMs: 2500,      // warn if analysis takes longer
  longTaskWindowMs: 10000,   // time window for long task monitoring
  longTaskWarnMs: 300,       // total longtask time that triggers warning
  minFpsWarn: 45,           // minimum FPS before warning
  scannerThrottleMs: 700,   // minimum time between decode attempts
  idleCallbackTimeout: 2000, // timeout for idle callback work
} as const;