// Enhanced Edge Function security utilities
import { enhancedCorsHeaders, checkRateLimit, rateLimitConfigs, type RateLimitConfig } from './securityHeaders';

export interface SecurityContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint: string;
}

export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  headers?: Record<string, string>;
}

// Enhanced security middleware for Edge Functions
export const securityMiddleware = (
  req: Request,
  config: {
    requireAuth?: boolean;
    rateLimit?: RateLimitConfig;
    allowedMethods?: string[];
    validateOrigin?: boolean;
  } = {}
): SecurityCheckResult => {
  const {
    requireAuth = true,
    rateLimit = rateLimitConfigs.default,
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    validateOrigin = true
  } = config;

  // Check HTTP method
  if (!allowedMethods.includes(req.method)) {
    return {
      allowed: false,
      reason: 'Method not allowed',
      headers: { 'Allow': allowedMethods.join(', ') }
    };
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return {
      allowed: true,
      headers: enhancedCorsHeaders
    };
  }

  // Validate origin for CORS
  if (validateOrigin) {
    const origin = req.headers.get('origin');
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://your-domain.com' // Replace with actual domain
    ];
    
    if (origin && !allowedOrigins.includes(origin)) {
      return {
        allowed: false,
        reason: 'Origin not allowed'
      };
    }
  }

  // Rate limiting
  const clientId = req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
  
  const rateLimitResult = checkRateLimit(clientId, rateLimit);
  if (!rateLimitResult.allowed) {
    return {
      allowed: false,
      reason: 'Rate limit exceeded',
      headers: {
        'X-RateLimit-Limit': rateLimit.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
      }
    };
  }

  // Auth validation
  if (requireAuth) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        allowed: false,
        reason: 'Authentication required'
      };
    }
  }

  return {
    allowed: true,
    headers: {
      ...enhancedCorsHeaders,
      'X-RateLimit-Limit': rateLimit.maxRequests.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
    }
  };
};

// Input validation for Edge Functions
export const validateEdgeFunctionInput = (
  data: any,
  schema: Record<string, {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
    maxLength?: number;
    pattern?: RegExp;
  }>
): { isValid: boolean; errors: string[]; sanitizedData?: any } => {
  const errors: string[] = [];
  const sanitizedData: any = {};

  for (const [key, rules] of Object.entries(schema)) {
    const value = data[key];

    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${key} is required`);
      continue;
    }

    // Skip validation if field is not required and empty
    if (!rules.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Type validation
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors.push(`${key} must be of type ${rules.type}`);
        continue;
      }
    }

    // String-specific validations
    if (typeof value === 'string') {
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${key} must not exceed ${rules.maxLength} characters`);
        continue;
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${key} format is invalid`);
        continue;
      }

      // Basic XSS protection
      const sanitized = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
      
      sanitizedData[key] = sanitized;
    } else {
      sanitizedData[key] = value;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined
  };
};

// Secure response helper
export const createSecureResponse = (
  data: any,
  status = 200,
  additionalHeaders: Record<string, string> = {},
  rateLimitInfo?: {
    limit: number;
    remaining: number;
    resetTime: number;
  }
): Response => {
  const headers = {
    'Content-Type': 'application/json',
    ...enhancedCorsHeaders,
    ...additionalHeaders,
    ...(rateLimitInfo && {
      'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
      'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
      'X-RateLimit-Reset': rateLimitInfo.resetTime.toString()
    })
  };

  return new Response(JSON.stringify(data), {
    status,
    headers
  });
};

// Error response helper
export const createErrorResponse = (
  message: string,
  status = 400,
  code?: string
): Response => {
  return createSecureResponse(
    {
      error: {
        message,
        code,
        timestamp: new Date().toISOString()
      }
    },
    status
  );
};

// Security audit logger
export const logSecurityEvent = (
  event: string,
  context: SecurityContext,
  severity: 'low' | 'medium' | 'high' = 'medium',
  details?: any
) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    context,
    details
  };

  // In production, this should be sent to a security monitoring service
  console.warn('[SECURITY EVENT]', logEntry);
};

// SQL injection detection patterns
const sqlInjectionPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
  /('|(\\u0027)|(\\u2019)|(\%27)|(\%2527))/i,
  /(--|#|\/\*|\*\/|;|\||`)/i,
  /(\b(OR|AND)\b.*=.*)/i
];

// Detect potential SQL injection attempts
export const detectSQLInjection = (input: string): boolean => {
  return sqlInjectionPatterns.some(pattern => pattern.test(input));
};

// Comprehensive input sanitization for Edge Functions
export const sanitizeEdgeFunctionInput = (input: any): any => {
  if (typeof input === 'string') {
    // Check for SQL injection
    if (detectSQLInjection(input)) {
      throw new Error('Potentially malicious input detected');
    }

    // Remove potentially dangerous characters
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential XSS characters
      .slice(0, 10000); // Limit length
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeEdgeFunctionInput);
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeEdgeFunctionInput(value);
    }
    return sanitized;
  }

  return input;
};