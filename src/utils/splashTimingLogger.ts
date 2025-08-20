/**
 * Splash Screen Timing Logger
 * Helps debug splash screen performance and identify bottlenecks
 */

interface TimingEvent {
  label: string;
  timestamp: number;
  relativeTime: number;
}

class SplashTimingLogger {
  private events: TimingEvent[] = [];
  private startTime: number = Date.now();

  log(label: string) {
    const timestamp = Date.now();
    const relativeTime = timestamp - this.startTime;
    
    this.events.push({
      label,
      timestamp,
      relativeTime
    });

    console.log(`[splash-timing] ${label}: ${relativeTime}ms`);
  }

  getSummary() {
    return {
      totalTime: Date.now() - this.startTime,
      events: this.events,
      waterfall: this.generateWaterfall()
    };
  }

  private generateWaterfall() {
    return this.events.map((event, index) => {
      const prevTime = index > 0 ? this.events[index - 1].relativeTime : 0;
      const duration = event.relativeTime - prevTime;
      
      return {
        ...event,
        duration,
        gap: index > 0 ? event.relativeTime - this.events[index - 1].relativeTime : 0
      };
    });
  }

  printSummary() {
    const summary = this.getSummary();
    console.group('[splash-timing] Performance Summary');
    console.log(`Total splash time: ${summary.totalTime}ms`);
    console.table(summary.waterfall);
    console.groupEnd();
  }
}

// Global instance
export const splashTiming = new SplashTimingLogger();

// Quick logging function
export const logSplashTiming = (label: string) => {
  splashTiming.log(label);
};