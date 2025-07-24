import { z } from 'zod';
import { logSecurityEvent, SECURITY_EVENTS } from './securityLogger';

// Enhanced input validation schemas
export const secureInputSchemas = {
  // Text input with XSS protection
  safeText: z.string()
    .min(1, 'Text is required')
    .max(1000, 'Text too long')
    .refine((val) => {
      // Check for XSS patterns
      const xssPatterns = [
        /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe[\s\S]*?>/gi,
        /data:text\/html/gi,
        /vbscript:/gi
      ];
      
      return !xssPatterns.some(pattern => pattern.test(val));
    }, 'Invalid characters detected'),

  // URL validation with protocol restrictions
  safeUrl: z.string()
    .url('Invalid URL format')
    .refine((val) => {
      const allowedProtocols = ['http:', 'https:'];
      try {
        const url = new URL(val);
        return allowedProtocols.includes(url.protocol);
      } catch {
        return false;
      }
    }, 'Only HTTP and HTTPS protocols are allowed'),

  // File path validation
  safePath: z.string()
    .refine((val) => {
      // Prevent path traversal
      const dangerousPatterns = [
        /\.\./,
        /\/\.\./,
        /\.\.\\/,
        /%2e%2e/i,
        /%252e%252e/i
      ];
      
      return !dangerousPatterns.some(pattern => pattern.test(val));
    }, 'Invalid path detected'),

  // SQL injection protection
  sqlSafeText: z.string()
    .refine((val) => {
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
        /('|(\\')|('')|(\\")|((\\"))|(%27)|(%2527)|(%25%27)|(%22)|(%2522)|(%25%22))/gi,
        /(;|--|\/\*|\*\/|@@|@)/gi
      ];
      
      const hasSqlInjection = sqlPatterns.some(pattern => pattern.test(val));
      
      if (hasSqlInjection) {
        logSecurityEvent({
          eventType: SECURITY_EVENTS.SQL_INJECTION_ATTEMPT,
          eventDetails: { 
            input: val.slice(0, 100),
            detectedPattern: 'sql_injection'
          },
          severity: 'high'
        });
      }
      
      return !hasSqlInjection;
    }, 'Potentially dangerous input detected')
};

// Comprehensive input sanitization
export const sanitizeInput = {
  // Remove HTML tags and encode special characters
  html: (input: string): string => {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/&/g, '&amp;');
  },

  // SQL injection prevention
  sql: (input: string): string => {
    return input
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  },

  // File path sanitization
  filePath: (input: string): string => {
    return input
      .replace(/\.\./g, '')
      .replace(/[<>:"|?*]/g, '')
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/');
  },

  // General text sanitization
  general: (input: string): string => {
    return input
      .trim()
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .slice(0, 10000); // Limit length
  }
};

// Rate limiting for sensitive operations
class SecurityRateLimit {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(
    private maxAttempts: number,
    private windowMs: number
  ) {}

  checkLimit(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (now > record.resetTime) {
      // Reset window
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (record.count >= this.maxAttempts) {
      logSecurityEvent({
        eventType: SECURITY_EVENTS.RATE_LIMIT_EXCEEDED,
        eventDetails: { 
          identifier,
          attempts: record.count,
          maxAttempts: this.maxAttempts
        },
        severity: 'medium'
      });
      return false;
    }

    record.count++;
    return true;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      if (now > record.resetTime) {
        this.attempts.delete(key);
      }
    }
  }
}

// Pre-configured rate limiters
export const securityRateLimiters = {
  auth: new SecurityRateLimit(5, 300000), // 5 attempts per 5 minutes
  api: new SecurityRateLimit(100, 60000), // 100 requests per minute
  sensitive: new SecurityRateLimit(3, 600000) // 3 attempts per 10 minutes
};

// Cleanup rate limiters periodically
setInterval(() => {
  Object.values(securityRateLimiters).forEach(limiter => limiter.cleanup());
}, 60000); // Every minute

// Content Security Policy validation
export const validateCSP = (content: string): boolean => {
  const dangerousPatterns = [
    /javascript:/gi,
    /data:(?!image\/)/gi, // Allow data: for images only
    /vbscript:/gi,
    /file:/gi,
    /about:/gi
  ];

  return !dangerousPatterns.some(pattern => pattern.test(content));
};

// Input validation wrapper for forms
export const validateSecureForm = <T extends Record<string, any>>(
  data: T,
  schema: z.ZodSchema<T>,
  userId?: string
): { success: boolean; data?: T; errors?: string[] } => {
  try {
    const validated = schema.parse(data);
    
    // Log successful validation for audit
    logSecurityEvent({
      eventType: 'form_validation_success',
      eventDetails: { 
        formFields: Object.keys(data),
        timestamp: new Date().toISOString()
      },
      severity: 'low',
      userId
    });
    
    return { success: true, data: validated };
  } catch (error) {
    const errors = error instanceof z.ZodError 
      ? error.errors.map(e => e.message)
      : ['Validation failed'];
    
    // Log validation failures for security monitoring
    logSecurityEvent({
      eventType: SECURITY_EVENTS.INVALID_INPUT,
      eventDetails: { 
        formFields: Object.keys(data),
        errors,
        timestamp: new Date().toISOString()
      },
      severity: 'medium',
      userId
    });
    
    return { success: false, errors };
  }
};