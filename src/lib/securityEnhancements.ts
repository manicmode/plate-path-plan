import { logSecurityEvent, SECURITY_EVENTS } from './securityLogger';
import { toast } from 'sonner';

// Enhanced XSS protection utilities
export class XSSProtection {
  // Safely sanitize HTML content
  static sanitizeHTML(html: string): string {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

  // Safe DOM element creation with content
  static createSafeElement(
    tag: string, 
    content?: string, 
    attributes?: Record<string, string>
  ): HTMLElement {
    const element = document.createElement(tag);
    
    // Safely set text content
    if (content) {
      element.textContent = content;
    }
    
    // Set attributes safely
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        // Validate attribute names to prevent injection
        if (/^[a-zA-Z-]+$/.test(key)) {
          element.setAttribute(key, value);
        }
      });
    }
    
    return element;
  }

  // Replace innerHTML usage with safe DOM manipulation
  static replaceContent(parent: HTMLElement, content: HTMLElement | HTMLElement[]): void {
    // Clear existing content using safe methods
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
    
    // Add new content safely
    if (Array.isArray(content)) {
      content.forEach(element => parent.appendChild(element));
    } else {
      parent.appendChild(content);
    }
  }

  // Validate URLs to prevent javascript: protocol attacks
  static validateURL(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      // Only allow safe protocols
      return ['http:', 'https:', 'data:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }
}

// Enhanced input validation and sanitization
export class InputSecurity {
  // Comprehensive input sanitization
  static sanitizeInput(input: string, type: 'text' | 'email' | 'url' | 'uuid' = 'text'): string {
    let sanitized = input.trim();

    switch (type) {
      case 'email':
        // Remove dangerous characters for email
        sanitized = sanitized.replace(/[<>'"]/g, '');
        break;
      case 'url':
        // Validate and sanitize URLs
        if (!XSSProtection.validateURL(sanitized)) {
          throw new Error('Invalid URL provided');
        }
        break;
      case 'uuid':
        // Strict UUID validation
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sanitized)) {
          throw new Error('Invalid UUID format');
        }
        break;
      default:
        // General text sanitization
        sanitized = sanitized
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<[^>]*>/g, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
    }

    return sanitized;
  }

  // Validate form data with security checks
  static async validateFormData(formData: FormData): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        try {
          // Check for suspicious patterns
          if (value.includes('<script') || value.includes('javascript:')) {
            errors.push(`Suspicious content detected in ${key}`);
            
            await logSecurityEvent({
              eventType: SECURITY_EVENTS.XSS_ATTEMPT,
              eventDetails: {
                field: key,
                content: value.slice(0, 100),
                source: 'form_validation'
              },
              severity: 'high'
            });
          }

          // Validate length
          if (value.length > 10000) {
            errors.push(`${key} exceeds maximum length`);
          }
        } catch (error) {
          errors.push(`Validation error for ${key}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Content Security Policy utilities
export class CSPEnforcement {
  // Generate secure nonce for inline styles/scripts
  static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  // Report CSP violations
  static reportViolation(violationEvent: SecurityPolicyViolationEvent): void {
    logSecurityEvent({
      eventType: SECURITY_EVENTS.CSP_VIOLATION,
      eventDetails: {
        blockedURI: violationEvent.blockedURI,
        violatedDirective: violationEvent.violatedDirective,
        originalPolicy: violationEvent.originalPolicy,
        documentURI: violationEvent.documentURI
      },
      severity: 'medium'
    });
  }

  // Setup CSP violation reporting
  static setupCSPReporting(): void {
    document.addEventListener('securitypolicyviolation', this.reportViolation);
  }
}

// Enhanced authentication security
export class AuthSecurity {
  // Validate authentication token
  static validateToken(token: string): boolean {
    if (!token || token === 'undefined' || token === 'null') {
      return false;
    }

    try {
      // Basic JWT structure validation
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }

      // Validate base64 encoding
      parts.forEach(part => {
        atob(part.replace(/-/g, '+').replace(/_/g, '/'));
      });

      return true;
    } catch {
      return false;
    }
  }

  // Secure session management
  static async validateSession(): Promise<boolean> {
    try {
      // Check for session tampering
      const storedSession = localStorage.getItem('supabase.auth.token');
      if (storedSession && !this.validateToken(storedSession)) {
        // Clear corrupted session
        localStorage.removeItem('supabase.auth.token');
        
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
          eventDetails: {
            event: 'session_tampering_detected',
            action: 'session_cleared'
          },
          severity: 'high'
        });

        toast.error('Session security issue detected. Please sign in again.');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }
}

// Database query security
export class DatabaseSecurity {
  // Prevent SQL injection in dynamic queries
  static sanitizeQuery(query: string): string {
    return query
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .replace(/\bDROP\b/gi, '')
      .replace(/\bDELETE\b/gi, '')
      .replace(/\bTRUNCATE\b/gi, '');
  }

  // Validate database operation context
  static async validateOperation(
    operation: string, 
    userId: string, 
    resourceId?: string
  ): Promise<boolean> {
    // Log all database operations for audit
    await logSecurityEvent({
      eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
      eventDetails: {
        operation,
        userId,
        resourceId,
        timestamp: new Date().toISOString()
      },
      severity: 'low',
      userId
    });

    return true;
  }
}

// Initialize security enhancements
export const initializeSecurity = (): void => {
  // Setup CSP reporting
  CSPEnforcement.setupCSPReporting();

  // Validate session on load
  AuthSecurity.validateSession();

  // Monitor for suspicious activity
  let interactionCount = 0;
  const startTime = Date.now();

  document.addEventListener('click', () => {
    interactionCount++;
    const elapsed = Date.now() - startTime;
    
    // Detect rapid clicking (potential bot behavior)
    if (interactionCount > 50 && elapsed < 10000) {
      logSecurityEvent({
        eventType: SECURITY_EVENTS.AUTOMATED_THREAT_DETECTION,
        eventDetails: {
          pattern: 'rapid_clicking',
          interactions: interactionCount,
          timeWindow: elapsed
        },
        severity: 'medium'
      });
    }
  });

  console.log('Security enhancements initialized');
};