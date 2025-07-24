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

// Enhanced input sanitization with pattern detection
export const enhancedSanitization = {
  detectAndSanitize: (input: string, context?: string): {
    sanitized: string;
    threatsDetected: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  } => {
    const threats: string[] = [];
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let sanitized = input;

    // SQL injection patterns
    const sqlPatterns = [
      /(\bunion\b.*\bselect\b)/i,
      /(\bdrop\b.*\btable\b)/i,
      /(\binsert\b.*\binto\b)/i,
      /(\bupdate\b.*\bset\b)/i,
      /(\bdelete\b.*\bfrom\b)/i,
      /(--|\/\*|\*\/)/,
      /(\bor\b.*=.*\bor\b)/i,
      /('.*=.*')/
    ];

    // XSS patterns
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /<iframe\b[^>]*>/i,
      /<object\b[^>]*>/i,
      /<embed\b[^>]*>/i,
      /<applet\b[^>]*>/i
    ];

    // Path traversal patterns
    const pathTraversalPatterns = [
      /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\/i,
      /\/etc\/passwd|\/etc\/shadow/i,
      /\\windows\\system32/i
    ];

    // Check for SQL injection
    sqlPatterns.forEach(pattern => {
      if (pattern.test(input)) {
        threats.push('SQL injection attempt');
        severity = 'critical';
        sanitized = sanitized.replace(pattern, '[BLOCKED]');
      }
    });

    // Check for XSS
    xssPatterns.forEach(pattern => {
      if (pattern.test(input)) {
        threats.push('Cross-site scripting attempt');
        severity = severity === 'critical' ? 'critical' : 'critical';
        sanitized = sanitized.replace(pattern, '[BLOCKED]');
      }
    });

    // Check for path traversal
    pathTraversalPatterns.forEach(pattern => {
      if (pattern.test(input)) {
        threats.push('Path traversal attempt');
        severity = severity === 'critical' ? 'critical' : 'high';
        sanitized = sanitized.replace(pattern, '[BLOCKED]');
      }
    });

    // Additional sanitization
    sanitized = sanitizeInput.general(sanitized);

    return { sanitized, threatsDetected: threats, severity };
  },

  contextAware: (input: string, context: 'email' | 'url' | 'filename' | 'json' | 'sql' | 'html'): string => {
    switch (context) {
      case 'email':
        return input.replace(/[^a-zA-Z0-9@._-]/g, '').toLowerCase();
      case 'url':
        try {
          const url = new URL(input);
          return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
        } catch {
          return '';
        }
      case 'filename':
        return input.replace(/[^a-zA-Z0-9._-]/g, '').substring(0, 255);
      case 'json':
        try {
          return JSON.stringify(JSON.parse(input));
        } catch {
          return '{}';
        }
      case 'sql':
        return sanitizeInput.sql(input);
      case 'html':
        return sanitizeInput.html(input);
      default:
        return sanitizeInput.general(input);
    }
  }
};

// Behavioral analysis for anomaly detection
export const behavioralAnalysis = {
  analyzeUserActivity: (events: Array<{ type: string; timestamp: string; metadata?: any }>): {
    anomalyScore: number;
    anomalies: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } => {
    const anomalies: string[] = [];
    let anomalyScore = 0;

    // Check for rapid-fire events
    const timeWindows = [1000, 5000, 10000]; // 1s, 5s, 10s
    timeWindows.forEach(window => {
      const recentEvents = events.filter(e => 
        Date.now() - new Date(e.timestamp).getTime() < window
      );
      
      if (recentEvents.length > window / 100) { // More than 1 event per 100ms
        anomalies.push(`Rapid activity: ${recentEvents.length} events in ${window}ms`);
        anomalyScore += recentEvents.length / 10;
      }
    });

    // Check for unusual event patterns
    const eventTypes = events.map(e => e.type);
    const uniqueTypes = new Set(eventTypes);
    
    if (uniqueTypes.size > 10 && events.length > 50) {
      anomalies.push('Diverse activity pattern detected');
      anomalyScore += 5;
    }

    // Check for error patterns
    const errorEvents = events.filter(e => e.type.includes('error') || e.type.includes('failure'));
    if (errorEvents.length > events.length * 0.3) {
      anomalies.push('High error rate detected');
      anomalyScore += 10;
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (anomalyScore > 20) riskLevel = 'critical';
    else if (anomalyScore > 10) riskLevel = 'high';
    else if (anomalyScore > 5) riskLevel = 'medium';

    return { anomalyScore, anomalies, riskLevel };
  }
};

// Input validation wrapper for forms with enhanced security
export const validateSecureForm = <T extends Record<string, any>>(
  data: T,
  schema: z.ZodSchema<T>,
  userId?: string
): {
  success: boolean;
  data?: T;
  errors?: string[];
  securityWarnings?: string[];
} => {
  const securityWarnings: string[] = [];

  try {
    // Pre-validation security checks
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const analysis = enhancedSanitization.detectAndSanitize(value, key);
        if (analysis.threatsDetected.length > 0) {
          securityWarnings.push(`${key}: ${analysis.threatsDetected.join(', ')}`);
          // Replace with sanitized value
          data[key as keyof T] = analysis.sanitized as T[keyof T];
        }
      }
    });

    const validatedData = schema.parse(data);
    
    // Log successful validation
    logSecurityEvent({
      eventType: 'form_validation_success',
      eventDetails: {
        formFields: Object.keys(data),
        securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined,
        timestamp: new Date().toISOString()
      },
      severity: securityWarnings.length > 0 ? 'medium' : 'low',
      userId
    });

    return {
      success: true,
      data: validatedData,
      securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Log validation failure
      logSecurityEvent({
        eventType: 'form_validation_failure',
        eventDetails: {
          formFields: Object.keys(data),
          errors: error.errors,
          securityWarnings,
          timestamp: new Date().toISOString()
        },
        severity: 'medium',
        userId
      });

      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined
      };
    }

    // Log unexpected validation error
    logSecurityEvent({
      eventType: 'form_validation_error',
      eventDetails: {
        formFields: Object.keys(data),
        error: error instanceof Error ? error.message : 'Unknown error',
        securityWarnings,
        timestamp: new Date().toISOString()
      },
      severity: 'high',
      userId
    });

    return {
      success: false,
      errors: ['Validation failed due to unexpected error'],
      securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined
    };
  }
};