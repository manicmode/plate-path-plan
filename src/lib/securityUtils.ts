import { toast } from 'sonner';
import { logSecurityEvent, SECURITY_EVENTS } from './securityLogger';

// Enhanced error handling with security logging
export interface SecurityError extends Error {
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'validation' | 'authentication' | 'authorization' | 'input' | 'system';
  userFriendly?: boolean;
}

export const createSecurityError = (
  message: string,
  severity: SecurityError['severity'] = 'medium',
  category: SecurityError['category'] = 'system',
  userFriendly = false
): SecurityError => {
  const error = new Error(message) as SecurityError;
  error.severity = severity;
  error.category = category;
  error.userFriendly = userFriendly;
  return error;
};

export const handleSecurityError = async (error: SecurityError | Error, context?: string) => {
  const secError = error as SecurityError;
  
  // Log security event
  await logSecurityEvent({
    eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
    eventDetails: {
      error_message: error.message,
      category: secError.category || 'unknown',
      context: context || 'unspecified',
      stack: error.stack
    },
    severity: secError.severity || 'medium'
  });

  // Show user-friendly message
  if (secError.userFriendly) {
    toast.error(error.message);
  } else {
    // Generic message for security-sensitive errors
    toast.error('An error occurred. Please try again.');
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Security Error:', error);
  }
};

// UUID validation with security logging
export const validateUUIDSecure = async (uuid: string, context?: string): Promise<boolean> => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(uuid)) {
    await logSecurityEvent({
      eventType: SECURITY_EVENTS.INVALID_UUID,
      eventDetails: { uuid, context: context || 'unknown' },
      severity: 'medium'
    });
    return false;
  }
  
  return true;
};

// Secure number parsing with range validation
export const parseNumberSecure = async (
  value: any, 
  options: { min?: number; max?: number; context?: string } = {}
): Promise<number | null> => {
  const { min, max, context } = options;
  
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  
  if (isNaN(parsed) || !isFinite(parsed)) {
    await logSecurityEvent({
      eventType: SECURITY_EVENTS.INVALID_INPUT,
      eventDetails: { value, type: 'invalid_number', context: context || 'unknown' },
      severity: 'low'
    });
    return null;
  }

  // Range validation
  if (min !== undefined && parsed < min) {
    await logSecurityEvent({
      eventType: SECURITY_EVENTS.INVALID_INPUT,
      eventDetails: { value: parsed, min, type: 'below_minimum', context: context || 'unknown' },
      severity: 'medium'
    });
    return null;
  }

  if (max !== undefined && parsed > max) {
    await logSecurityEvent({
      eventType: SECURITY_EVENTS.INVALID_INPUT,
      eventDetails: { value: parsed, max, type: 'above_maximum', context: context || 'unknown' },
      severity: 'medium'
    });
    return null;
  }

  return parsed;
};

// Rate limiting utility
export class RateLimiter {
  private requests = new Map<string, number[]>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async checkLimit(identifier: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this identifier
    const requests = this.requests.get(identifier) || [];
    
    // Filter out old requests
    const recentRequests = requests.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (recentRequests.length >= this.maxRequests) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.RATE_LIMIT_EXCEEDED,
        eventDetails: { 
          identifier, 
          requests_count: recentRequests.length,
          max_requests: this.maxRequests,
          window_ms: this.windowMs
        },
        severity: 'high'
      });
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return true;
  }

  // Clean up old entries periodically
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs * 2; // Keep data for 2x the window
    
    for (const [identifier, requests] of this.requests.entries()) {
      const filtered = requests.filter(time => time > cutoff);
      if (filtered.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, filtered);
      }
    }
  }
}

// Global rate limiter instances
export const apiRateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
export const authRateLimiter = new RateLimiter(10, 60000); // 10 auth requests per minute

// Start cleanup interval
setInterval(() => {
  apiRateLimiter.cleanup();
  authRateLimiter.cleanup();
}, 300000); // Clean up every 5 minutes

// Content Security Policy helpers
export const sanitizeForHTML = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const sanitizeForSQL = (input: string): string => {
  // Basic SQL injection protection
  return input
    .replace(/'/g, "''")
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');
};

// Secure headers for API responses
export const getSecurityHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
});