// Lightweight performance monitoring with optional HUD
// Only activates when ?perf=1 or VITE_PERF_HUD=true

import { PERF_BUDGET } from '@/config/perfBudget';

let perfEnabled = false;
let hudContainer: HTMLDivElement | null = null;
let fpsHistory: number[] = [];
let longTaskTotalMs = 0;
let longTaskWindow: number[] = [];
let lastFrameTime = 0;
let rafId = 0;

const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG_PERF === 'true';

// Performance marks and measures
export const mark = (name: string) => {
  if (perfEnabled && performance.mark) {
    performance.mark(name);
  }
};

export const measure = (name: string, startMark: string) => {
  if (perfEnabled && performance.measure) {
    try {
      performance.measure(name, startMark);
      const entries = performance.getEntriesByName(name, 'measure');
      const latest = entries[entries.length - 1];
      if (latest) {
        console.log(`[PERF] ${name}: ${latest.duration.toFixed(2)}ms`);
        
        // Check budgets
        if (name.includes('analyze_total')) {
          checkBudget('Analysis Total', latest.duration, PERF_BUDGET.analyzeTotalMs);
        }
      }
    } catch (e) {
      // Ignore if start mark doesn't exist
    }
  }
};

// Long task observer
let longTaskObserver: PerformanceObserver | null = null;

const initLongTaskObserver = () => {
  if (!perfEnabled || !('PerformanceObserver' in window)) return;
  
  try {
    longTaskObserver = new PerformanceObserver((list) => {
      const now = Date.now();
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'longtask') {
          longTaskTotalMs += entry.duration;
          longTaskWindow.push(now);
          
          // Keep only last window of timestamps
          const cutoff = now - PERF_BUDGET.longTaskWindowMs;
          longTaskWindow = longTaskWindow.filter(t => t > cutoff);
        }
      }
    });
    longTaskObserver.observe({ entryTypes: ['longtask'] });
  } catch (e) {
    console.warn('[PERF] Long task observer not supported');
  }
};

// FPS monitoring
const updateFPS = (currentTime: number) => {
  if (lastFrameTime) {
    const delta = currentTime - lastFrameTime;
    const fps = 1000 / delta;
    fpsHistory.push(fps);
    
    // Keep only last 60 frames (1 second at 60fps)
    if (fpsHistory.length > 60) {
      fpsHistory.shift();
    }
  }
  lastFrameTime = currentTime;
  
  if (perfEnabled) {
    rafId = requestAnimationFrame(updateFPS);
  }
};

// HUD creation and updates
const createHUD = () => {
  hudContainer = document.createElement('div');
  hudContainer.id = 'perf-hud';
  hudContainer.style.cssText = `
    position: fixed;
    bottom: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: #00ff00;
    font-family: monospace;
    font-size: 11px;
    padding: 8px;
    border-radius: 4px;
    z-index: 10000;
    line-height: 1.2;
    pointer-events: none;
    white-space: pre;
  `;
  document.body.appendChild(hudContainer);
  
  // Update HUD every second
  setInterval(updateHUD, 1000);
};

const updateHUD = () => {
  if (!hudContainer || !perfEnabled) return;
  
  const avgFPS = fpsHistory.length > 0 
    ? Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length)
    : 0;
  
  const now = Date.now();
  const recentLongTasks = longTaskWindow.filter(t => t > now - PERF_BUDGET.longTaskWindowMs).length;
  const longTaskMs = Math.round(longTaskTotalMs);
  
  let memoryInfo = '';
  if ('memory' in performance) {
    const mem = (performance as any).memory;
    const heapMB = Math.round(mem.usedJSHeapSize / 1048576);
    memoryInfo = `Heap: ${heapMB}MB`;
  }
  
  hudContainer.textContent = [
    `FPS: ${avgFPS}`,
    `LongTask: ${recentLongTasks} (${longTaskMs}ms)`,
    memoryInfo
  ].filter(Boolean).join('\n');
  
  // Check budgets and warn
  if (DEBUG && avgFPS < PERF_BUDGET.minFpsWarn) {
    console.warn(`[PERF][WARN] FPS below threshold: ${avgFPS} < ${PERF_BUDGET.minFpsWarn}`);
  }
  
  const recentLongTaskMs = longTaskWindow.filter(t => t > now - PERF_BUDGET.longTaskWindowMs).length * 50; // Rough estimate
  if (DEBUG && recentLongTaskMs > PERF_BUDGET.longTaskWarnMs) {
    console.warn(`[PERF][WARN] Long tasks exceeded: ${recentLongTaskMs}ms > ${PERF_BUDGET.longTaskWarnMs}ms`);
  }
};

// Main enable function
export const enablePerfHUD = () => {
  if (perfEnabled) return; // Already enabled
  
  perfEnabled = true;
  console.log('[PERF] Performance monitoring enabled');
  
  // Start FPS monitoring
  rafId = requestAnimationFrame(updateFPS);
  
  // Start long task observer
  initLongTaskObserver();
  
  // Create HUD
  createHUD();
  
  // Reset counters
  longTaskTotalMs = 0;
  longTaskWindow = [];
  fpsHistory = [];
};

export const disablePerfHUD = () => {
  if (!perfEnabled) return;
  
  perfEnabled = false;
  
  // Stop RAF loop
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  
  // Stop long task observer
  if (longTaskObserver) {
    longTaskObserver.disconnect();
    longTaskObserver = null;
  }
  
  // Remove HUD
  if (hudContainer) {
    document.body.removeChild(hudContainer);
    hudContainer = null;
  }
  
  console.log('[PERF] Performance monitoring disabled');
};

// Budget checking
export const checkBudget = (metric: string, value: number, budget: number) => {
  if (perfEnabled && value > budget) {
    console.warn(`[PERF][WARN] ${metric} exceeded budget: ${value}ms > ${budget}ms`);
  }
};

// Resource monitoring
export const enableResourceMonitoring = () => {
  if (!perfEnabled || !('PerformanceObserver' in window)) return;
  
  try {
    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
        .filter(entry => entry.duration > 100) // Only slow resources
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5); // Top 5 slowest
      
      if (entries.length > 0) {
        console.log('[PERF] Slow resources:', entries.map(e => ({
          name: e.name.split('/').pop(),
          duration: Math.round(e.duration),
          type: (e as any).initiatorType || 'unknown'
        })));
      }
    });
    
    resourceObserver.observe({ entryTypes: ['resource'] });
  } catch (e) {
    console.warn('[PERF] Resource observer not supported');
  }
};
