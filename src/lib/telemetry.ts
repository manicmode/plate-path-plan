/**
 * Legacy telemetry exports for Arena features
 * Health Scan telemetry is in healthScanTelemetry.ts
 */

// Placeholder ArenaEvents for existing code compatibility
export const ArenaEvents = {
  activeResolve: (success: boolean, groupId: string | null, error?: string) => {
    console.log(`📊 [ARENA] activeResolve: ${success}`, { groupId, error });
  },
  enroll: (success: boolean, groupId?: string, error?: string) => {
    console.log(`📊 [ARENA] enroll: ${success}`, { groupId, error });
  },
  chatSubscribe: (success: boolean, groupId: string) => {
    console.log(`📊 [ARENA] chatSubscribe: ${success}`, { groupId });
  },
  chatUnsubscribe: (groupId: string) => {
    console.log(`📊 [ARENA] chatUnsubscribe`, { groupId });
  },
  chatSend: (success: boolean, textLength: number, error?: string) => {
    console.log(`📊 [ARENA] chatSend: ${success}`, { textLength, error });
  }
};