
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { User, Lock, Mail, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { validateEmail } from '@/utils/emailValidation';
import { validateEmail as validateEmailSecure, validatePassword, sanitizeText } from '@/lib/validation';
import { validateFormUuids } from '@/lib/uuidValidationMiddleware';
import { validateNotificationData } from '@/lib/notificationValidation';
import { supabase } from '@/integrations/supabase/client';

const AuthForm = () => {
  const { login, register, resendEmailConfirmation, user } = useAuth();
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [debugMode, setDebugMode] = useState(false);
  const [emailConfirmationState, setEmailConfirmationState] = useState<{
    show: boolean;
    email: string;
    message: string;
    isExisting?: boolean;
  }>({ show: false, email: '', message: '' });
  const [emailValidation, setEmailValidation] = useState<{
    isValid: boolean;
    warning?: string;
    error?: string;
  } | null>(null);
  const [currentTab, setCurrentTab] = useState<'login' | 'register'>('login');
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);

  // Clear form when user signs out
  useEffect(() => {
    if (!user) {
      setFormData({ email: '', password: '', name: '' });
      console.log('Form cleared after sign out');
    }
  }, [user]);

  // Handle rate limit countdown
  useEffect(() => {
    if (rateLimitUntil) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((rateLimitUntil - now) / 1000));
        setCountdown(remaining);
        
        if (remaining <= 0) {
          setRateLimitUntil(null);
          setCountdown(0);
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [rateLimitUntil]);

  const getLoginErrorMessage = (error: any): string => {
    const errorCode = error.message;
    
    switch (errorCode) {
      case 'UNVERIFIED_EMAIL':
        return 'Your account has not been verified yet. Please check your email for the confirmation link.';
      case 'INVALID_CREDENTIALS':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'EMAIL_NOT_FOUND':
        return 'No account found with this email address. Would you like to sign up instead?';
      case 'RATE_LIMITED':
        return 'Too many login attempts. Please wait a moment before trying again.';
      case 'LOGIN_FAILED':
      default:
        return 'Login failed. Please check your credentials and try again.';
    }
  };

  const getRegistrationErrorMessage = (error: any): string => {
    const errorCode = error.message;
    
    switch (errorCode) {
      case 'EMAIL_ALREADY_REGISTERED':
        return 'This email is already registered. Please log in instead or reset your password if needed.';
      case 'EMAIL_RATE_LIMITED':
        return 'Too many email requests. Please wait a few minutes before trying again.';
      case 'RATE_LIMITED':
        return 'Too many requests. Please wait a moment before trying again.';
      case 'PASSWORD_TOO_SHORT':
        return 'Password must be at least 6 characters long.';
      case 'INVALID_EMAIL':
        return 'Please enter a valid email address.';
      case 'REGISTRATION_FAILED':
      default:
        return 'Registration failed. Please try again.';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent multiple submissions
    if (isLoading) {
      console.log('Login already in progress, ignoring duplicate submission');
      return;
    }
    
    // Enhanced input validation
    const sanitizedEmail = sanitizeText(formData.email);
    if (!validateEmailSecure(sanitizedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (!validatePassword(formData.password)) {
      toast.error('Password must be at least 8 characters with uppercase, lowercase, and number');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await login(sanitizedEmail, formData.password);
      toast.success('Welcome back!');
    } catch (error: any) {
      console.error('Login failed:', error);
      const errorMessage = getLoginErrorMessage(error);
      
      // Handle specific cases that need special UI treatment
      if (error.message === 'UNVERIFIED_EMAIL') {
        setEmailConfirmationState({
          show: true,
          email: formData.email,
          message: 'Your account has not been verified yet. Please check your email for the confirmation link.',
          isExisting: true
        });
      } else if (error.message === 'EMAIL_NOT_FOUND') {
        toast.error(errorMessage);
        // Offer to switch to sign up
        setTimeout(() => {
          setCurrentTab('register');
        }, 2000);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (email: string, isRegister: boolean = false) => {
    setFormData(prev => ({...prev, email}));
    
    // Only clear previous validation errors, don't validate on input
    setEmailValidation(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent multiple submissions
    if (isLoading) {
      console.log('Registration already in progress, ignoring duplicate submission');
      return;
    }
    
    // Enhanced input validation
    const sanitizedEmail = sanitizeText(formData.email);
    const sanitizedName = sanitizeText(formData.name);
    
    if (!sanitizedEmail || !formData.password || !sanitizedName) {
      toast.error('Please fill in all fields.');
      return;
    }

    if (!validateEmailSecure(sanitizedEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    
    if (!validatePassword(formData.password)) {
      toast.error('Password must be at least 8 characters with uppercase, lowercase, and number.');
      return;
    }

    console.log('Registration attempt started with:', { 
      email: formData.email, 
      hasPassword: !!formData.password, 
      hasName: !!formData.name 
    });
    
    // Prevent submission if rate limited
    if (rateLimitUntil && Date.now() < rateLimitUntil) {
      console.log('Registration blocked - rate limited until:', new Date(rateLimitUntil));
      toast.error(`Please wait ${countdown} seconds before trying again.`);
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🎯 Calling register function...');
      const result = await register(sanitizedEmail, formData.password, sanitizedName);
      console.log('🎉 Registration result:', result);
      
      if (result.requiresEmailConfirmation) {
        // Show email confirmation state
        setEmailConfirmationState({
          show: true,
          email: formData.email,
          message: result.message,
          isExisting: result.isExistingUnverified
        });
        toast.success(result.message);
      } else {
        // Immediate login success
        toast.success(result.message);
      }
      
      // Don't clear form - keep it for user reference
      setRateLimitUntil(null);
      setCountdown(0);
    } catch (error: any) {
      console.error('Registration failed with error:', error);
      
      const errorMessage = getRegistrationErrorMessage(error);
      
      // Handle specific cases that need special UI treatment
      if (error.message === 'EMAIL_ALREADY_REGISTERED') {
        toast.error(errorMessage);
        // Offer to switch to login
        setTimeout(() => {
          setCurrentTab('login');
        }, 2000);
      } else {
        // Handle rate limiting with improved detection
        if (error.message === 'EMAIL_RATE_LIMITED') {
          const waitTime = 180; // 3 minutes for email rate limit
          const rateLimitEnd = Date.now() + (waitTime * 1000);
          setRateLimitUntil(rateLimitEnd);
        } else if (error.message === 'RATE_LIMITED') {
          const waitTime = 60; // Default to 60 seconds
          const rateLimitEnd = Date.now() + (waitTime * 1000);
          setRateLimitUntil(rateLimitEnd);
        }
        
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (isResendingEmail) return;
    
    setIsResendingEmail(true);
    try {
      await resendEmailConfirmation(emailConfirmationState.email);
      toast.success('Confirmation email sent! Please check your inbox.');
    } catch (error: any) {
      console.error('Resend email failed:', error);
      
      if (error.message === 'EMAIL_RATE_LIMITED') {
        toast.error('Too many email requests. Please wait a few minutes before trying again.');
      } else if (error.message === 'RATE_LIMITED') {
        toast.error('Too many requests. Please wait a moment before trying again.');
      } else {
        toast.error('Failed to resend email. Please try again later.');
      }
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast.error('Please enter your email address');
      return;
    }

    const sanitizedEmail = sanitizeText(forgotPasswordEmail);
    if (!validateEmailSecure(sanitizedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw error;
      }

      toast.success('✅ Reset link sent! Check your email');
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      console.error('Password reset failed:', error);
      toast.error(error.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsResetLoading(false);
    }
  };

  // Show email confirmation screen if needed
  if (emailConfirmationState.show) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Card className={`w-full max-w-md glass-card border-0 rounded-3xl ${isMobile ? 'mx-4' : ''}`}>
          <CardHeader className="text-center space-y-4 pb-4">
            <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} gradient-primary rounded-3xl flex items-center justify-center mx-auto neon-glow`}>
              <Mail className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white`} />
            </div>
            <div>
              <CardTitle className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent`}>
                Check Your Email
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-300 font-medium">We've sent you a confirmation link</p>
            </div>
          </CardHeader>
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0 space-y-4`}>
            <div className="text-center space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                {emailConfirmationState.message}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We sent a confirmation link to:
              </p>
              <p className="font-medium text-emerald-600 dark:text-emerald-400">
                {emailConfirmationState.email}
              </p>
              
              {emailConfirmationState.isExisting && (
                <div className="pt-2">
                  <Button 
                    onClick={handleResendEmail}
                    disabled={isResendingEmail}
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    {isResendingEmail ? 'Sending...' : 'Resend confirmation email'}
                  </Button>
                </div>
              )}
              
              <div className="pt-4 space-y-2">
                <Button 
                  onClick={() => setEmailConfirmationState({ show: false, email: '', message: '' })}
                  variant="outline"
                  className="w-full"
                >
                  Back to Sign In
                </Button>
                
                {emailConfirmationState.isExisting && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Can't find the email? Check your spam folder or try resending.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Card className={`w-full max-w-md glass-card border-0 rounded-3xl ${isMobile ? 'mx-4' : ''}`}>
        <CardHeader className="text-center space-y-4 pb-4">
          <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} gradient-primary rounded-3xl flex items-center justify-center mx-auto neon-glow`}>
            <User className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white`} />
          </div>
          <div>
            <CardTitle className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent`}>
              Welcome to VOYAGE
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-300 font-medium">Your AI-powered nutrition companion</p>
          </div>
        </CardHeader>

        <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
          <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as 'login' | 'register')} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 glass-button border-0">
              <TabsTrigger value="login" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span>Email</span>
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleEmailChange(e.target.value, false)}
                    className={`glass-button border-0 ${isMobile ? 'h-12' : 'h-12'}`}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="flex items-center space-x-2">
                    <Lock className="h-4 w-4 text-purple-600" />
                    <span>Password</span>
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
                    className={`glass-button border-0 ${isMobile ? 'h-12' : 'h-12'}`}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  type="submit" 
                  className={`w-full gradient-primary ${isMobile ? 'h-12' : 'h-12'}`}
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
                
                {/* Forgot Password Section */}
                <div className="text-center space-y-3 mt-4">
                  <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="text-base font-medium text-primary hover:text-primary/80 underline underline-offset-4 p-2 h-auto border border-border/20 hover:border-border/40 transition-all"
                      >
                        🔑 Forgot your password?
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="reset-email">Email</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="Enter your email"
                            value={forgotPasswordEmail}
                            onChange={(e) => setForgotPasswordEmail(e.target.value)}
                            className="glass-button border-0"
                            disabled={isResetLoading}
                          />
                        </div>
                        <Button 
                          onClick={handleForgotPassword}
                          className="w-full gradient-primary"
                          disabled={isResetLoading}
                        >
                          {isResetLoading ? 'Sending...' : 'Send Reset Link'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    💬 We've recently upgraded our password rules. If your old password no longer works, reset it.
                  </p>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name" className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-emerald-600" />
                    <span>Full Name</span>
                  </Label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                    className={`glass-button border-0 ${isMobile ? 'h-12' : 'h-12'}`}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span>Email</span>
                  </Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleEmailChange(e.target.value, true)}
                    className={`glass-button border-0 ${isMobile ? 'h-12' : 'h-12'} ${
                      emailValidation?.error ? 'border-red-500 border-2' : 
                      emailValidation?.warning ? 'border-amber-500 border-2' : ''
                    }`}
                    required
                    disabled={isLoading}
                  />
                  {emailValidation?.error && (
                    <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-700 dark:text-red-300">
                        {emailValidation.error}
                      </AlertDescription>
                    </Alert>
                  )}
                  {emailValidation?.warning && !emailValidation?.error && (
                    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-700 dark:text-amber-300">
                        {emailValidation.warning}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="flex items-center space-x-2">
                    <Lock className="h-4 w-4 text-purple-600" />
                    <span>Password</span>
                  </Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Create a password (min 6 characters)"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
                    className={`glass-button border-0 ${isMobile ? 'h-12' : 'h-12'}`}
                    required
                    minLength={6}
                    disabled={isLoading}
                  />
                </div>
                {rateLimitUntil && countdown > 0 && (
                  <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-amber-700 dark:text-amber-300 font-medium">
                      Rate limited. Try again in {countdown} seconds.
                    </p>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className={`w-full gradient-primary ${isMobile ? 'h-12' : 'h-12'}`}
                  disabled={isLoading || (rateLimitUntil !== null && countdown > 0) || !!emailValidation?.error}
                >
                  {isLoading ? 'Creating Account...' : 
                   rateLimitUntil && countdown > 0 ? `Wait ${countdown}s` : 
                   'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;
