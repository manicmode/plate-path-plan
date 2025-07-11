// Email validation utilities for preventing fake or malformed emails

export interface EmailValidationResult {
  isValid: boolean;
  warning?: string;
  error?: string;
}

// Common fake email patterns to detect
const FAKE_EMAIL_PATTERNS = [
  /^(test|fake|dummy|example|temp|temporary)@/i,
  /^.+@(test|fake|dummy|example|temp|temporary)\./i,
  /^.+@.+\.(test|fake|dummy|example|temp|temporary)$/i,
  /^\d+@\d+\.\d+$/, // Numbers only like 123@123.123
  /^[a-z]{1,3}@[a-z]{1,3}\.[a-z]{1,3}$/i, // Very short patterns like a@b.c
  /^.+@localhost$/i,
  /^.+@\d+\.\d+\.\d+\.\d+$/i, // IP addresses
];

// Legitimate email domains that should never be flagged
const LEGITIMATE_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
  'aol.com', 'protonmail.com', 'mail.com', 'zoho.com', 'yandex.com',
  'live.com', 'msn.com', 'att.net', 'verizon.net', 'comcast.net'
];

// Suspicious patterns that should get warnings
const SUSPICIOUS_PATTERNS = [
  /^[a-z]+[0-9]+@/i, // Simple name + numbers
  /^.+@.+\.local$/i,
  /^.+@.+\.invalid$/i,
  /^.+@.+\.example$/i,
];

// Common disposable email domains
const DISPOSABLE_DOMAINS = [
  '10minutemail.com',
  'tempmail.org',
  'guerrillamail.com',
  'mailinator.com',
  'temp-mail.org',
  'throwaway.email',
  'yopmail.com',
  'maildrop.cc',
];

export function validateEmail(email: string): EmailValidationResult {
  if (!email) {
    return { isValid: false, error: 'Email is required.' };
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address.' };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const domain = normalizedEmail.split('@')[1];

  // Skip most validation for legitimate major email providers
  if (LEGITIMATE_DOMAINS.includes(domain)) {
    // Only check for repeated characters for legitimate domains
    if (/^(.)\1{4,}@/.test(normalizedEmail)) {
      return { 
        isValid: false, 
        error: 'This email appears to be fake. Please use a real email address.' 
      };
    }
    return { isValid: true };
  }

  // Check for obviously fake patterns (only for non-legitimate domains)
  for (const pattern of FAKE_EMAIL_PATTERNS) {
    if (pattern.test(normalizedEmail)) {
      return { 
        isValid: false, 
        error: 'This email appears to be fake or invalid. Please use a real email address.' 
      };
    }
  }

  // Check for disposable email services
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { 
      isValid: false, 
      error: 'Temporary or disposable email addresses are not allowed. Please use a permanent email address.' 
    };
  }

  // Check for suspicious patterns (warnings, not errors)
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(normalizedEmail)) {
      return { 
        isValid: true, 
        warning: 'Please double-check your email address to ensure it\'s correct.' 
      };
    }
  }

  // Additional checks for very short or repetitive patterns
  const [localPart, domainPart] = normalizedEmail.split('@');
  
  if (localPart.length < 3) {
    return { 
      isValid: true, 
      warning: 'Very short email address. Please verify it\'s correct.' 
    };
  }

  if (domainPart.length < 5) {
    return { 
      isValid: true, 
      warning: 'Short domain name. Please verify your email is correct.' 
    };
  }

  // Check for repeated characters (like aaaa@bbbb.cccc)
  if (/^(.)\1{3,}@/.test(normalizedEmail) || /@(.)\1{3,}\./.test(normalizedEmail)) {
    return { 
      isValid: false, 
      error: 'This email appears to be fake. Please use a real email address.' 
    };
  }

  return { isValid: true };
}

export function isEmailLikelyFake(email: string): boolean {
  const result = validateEmail(email);
  return !result.isValid && !!result.error;
}