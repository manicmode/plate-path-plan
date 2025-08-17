/**
 * Lightweight telemetry for Arena V2 operations
 * Console-based logging with structured events
 */

interface TelemetryEvent {
  name: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Log an Arena telemetry event
 * Always logs to console for debugging and monitoring
 */
export function logEvent(name: string, data?: Record<string, unknown>): void {
  const event: TelemetryEvent = {
    name,
    data,
    timestamp: new Date().toISOString(),
  };

  // Always log to console for debugging
  if (process.env.NODE_ENV === 'production') {
    console.info('[telemetry]', event.name, event.data);
  } else {
    console.debug('[telemetry]', event);
  }
}


/**
 * Log Arena-specific events with structured data
 */
export const ArenaEvents = {
  activeResolve: (ok: boolean, groupId?: string | null) =>
    logEvent('arena.active.resolve', { ok, groupId }),
    
  enroll: (ok: boolean, groupId?: string, error?: string) =>
    logEvent('arena.enroll', { ok, groupId, error }),
    
  chatSubscribe: (ok: boolean, groupId?: string | null) =>
    logEvent('arena.chat.subscribe', { ok, groupId }),
    
  chatUnsubscribe: (groupId?: string | null) =>
    logEvent('arena.chat.unsubscribe', { groupId }),
    
  chatSend: (ok: boolean, messageLength?: number, error?: string) =>
    logEvent('arena.chat.send', { ok, messageLength, error }),
    
  chatReceive: (messageCount: number, groupId?: string | null) =>
    logEvent('arena.chat.receive', { messageCount, groupId }),
};