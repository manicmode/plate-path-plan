import { supabase } from '@/integrations/supabase/client';

export interface SecurityEvent {
  eventType: string;
  eventDetails?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
}

export const logSecurityEvent = async (event: SecurityEvent) => {
  try {
    // Call the updated log_security_event function
    const { error } = await supabase.rpc('log_security_event', {
      event_type_param: event.eventType,
      event_details_param: event.eventDetails || {},
      user_id_param: event.userId || null,
      severity_param: event.severity || 'low'
    });

    if (error) {
      console.warn('Failed to log security event:', error);
      // Fallback: try direct insert if RPC fails
      const { error: insertError } = await supabase
        .from('security_events')
        .insert({
          event_type: event.eventType,
          event_details: event.eventDetails || {},
          severity: event.severity || 'low',
          user_id: event.userId
        });
      
      if (insertError) {
        console.warn('Failed to insert security event directly:', insertError);
      }
    }
  } catch (error) {
    console.warn('Security logging error:', error);
  }
};

// Common security event types
export const SECURITY_EVENTS = {
  // Authentication events
  LOGIN_ATTEMPT: 'login_attempt',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  
  // Input validation events
  INVALID_UUID: 'invalid_uuid',
  INVALID_INPUT: 'invalid_input',
  XSS_ATTEMPT: 'xss_attempt',
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  
  // API security events
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  
  // Data access events
  SENSITIVE_DATA_ACCESS: 'sensitive_data_access',
  BULK_DATA_EXPORT: 'bulk_data_export',
  PERMISSION_ESCALATION: 'permission_escalation',
  
  // System events
  CRITICAL_ERROR: 'critical_error',
  SYSTEM_RECOVERY: 'system_recovery',
  INVALID_REQUEST: 'invalid_request',
  CSP_VIOLATION: 'csp_violation',
  
  // Database security events
  CONSTRAINT_VIOLATION: 'constraint_violation',
  DATABASE_ERROR: 'database_error',
  DATA_INTEGRITY_VIOLATION: 'data_integrity_violation',
  
  // Advanced security events
  CSS_INJECTION_ATTEMPT: 'css_injection_attempt',
  CHART_SECURITY_VIOLATION: 'chart_security_violation',
  AUTOMATED_THREAT_DETECTION: 'automated_threat_detection',
  SUSPICIOUS_PASTE: 'suspicious_paste'
} as const;

export type SecurityEventType = typeof SECURITY_EVENTS[keyof typeof SECURITY_EVENTS];