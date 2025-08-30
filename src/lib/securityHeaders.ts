// Security headers and configuration for Edge Functions
export const getSecurityHeaders = () => ({
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), cross-origin-isolated=(), display-capture=(), document-domain=(), encrypted-media=(), execution-while-not-rendered=(), execution-while-out-of-viewport=(), fullscreen=(), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), navigation-override=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-XSS-Protection': '1; mode=block',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
});

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

export const enhancedCorsHeaders = {
  ...corsHeaders,
  ...getSecurityHeaders()
};

// Rate limiting configuration
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const rateLimitConfigs = {
  default: { maxRequests: 100, windowMs: 60000 }, // 100 requests per minute
  auth: { maxRequests: 10, windowMs: 60000 }, // 10 auth attempts per minute
  upload: { maxRequests: 20, windowMs: 60000 }, // 20 uploads per minute
  ai: { maxRequests: 30, windowMs: 60000 } // 30 AI requests per minute
};

// Simple in-memory rate limiter for Edge Functions
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Enhanced security utilities for client-side
export const detectSecurityThreats = () => {
  const threats: string[] = [];
  
  // Check for potential XSS in URL
  const url = window.location.href;
  if (/<script|javascript:|data:/i.test(url)) {
    threats.push('potential_xss_in_url');
  }
  
  // Check for suspicious localStorage manipulation
  try {
    const keys = Object.keys(localStorage);
    if (keys.some(key => /<script|javascript:/i.test(key))) {
      threats.push('suspicious_localstorage_keys');
    }
  } catch (e) {
    // Ignore if localStorage is not available
  }
  
  // Check for iframe attempts
  if (window.top !== window.self) {
    threats.push('iframe_embedding_detected');
  }
  
  return threats;
};

// Client-side rate limiting
interface ClientRateLimitEntry {
  count: number;
  resetTime: number;
}

const clientRateLimitMap = new Map<string, ClientRateLimitEntry>();

export const checkClientRateLimit = (
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean => {
  const now = Date.now();
  const entry = clientRateLimitMap.get(identifier);
  
  if (!entry || now > entry.resetTime) {
    clientRateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (entry.count >= maxRequests) {
    return false;
  }
  
  entry.count++;
  return true;
};

export const checkRateLimit = (
  identifier: string, 
  config: RateLimitConfig = rateLimitConfigs.default
): { allowed: boolean; remaining: number; resetTime: number } => {
  const now = Date.now();
  const key = identifier;
  const limit = rateLimitStore.get(key);
  
  if (!limit || now > limit.resetTime) {
    // Initialize or reset limit
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime };
  }
  
  if (limit.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: limit.resetTime };
  }
  
  // Increment count
  limit.count++;
  rateLimitStore.set(key, limit);
  
  return { 
    allowed: true, 
    remaining: config.maxRequests - limit.count, 
    resetTime: limit.resetTime 
  };
};

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, limit] of rateLimitStore.entries()) {
    if (now > limit.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 300000); // Clean up every 5 minutes

// Clean up client rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of clientRateLimitMap.entries()) {
    if (now > entry.resetTime) {
      clientRateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute

// Enhanced security headers application
export const applySecurityHeaders = () => {
  const headers = getSecurityHeaders();

  // Apply other headers via meta tags where applicable
  const metaHeaders = [
    { name: 'X-Content-Type-Options', content: headers['X-Content-Type-Options'] },
    { name: 'X-Frame-Options', content: headers['X-Frame-Options'] },
    { name: 'Referrer-Policy', content: headers['Referrer-Policy'] }
  ];

  metaHeaders.forEach(({ name, content }) => {
    if (!document.querySelector(`meta[http-equiv="${name}"]`)) {
      const meta = document.createElement('meta');
      meta.httpEquiv = name;
      meta.content = content;
      document.head.appendChild(meta);
    }
  });
};

// Initialize security headers on page load
if (typeof window !== 'undefined') {
  applySecurityHeaders();
}