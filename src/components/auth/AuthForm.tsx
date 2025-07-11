
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { User, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';

const AuthForm = () => {
  const { login, register, user } = useAuth();
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent multiple submissions
    if (isLoading) {
      console.log('Login already in progress, ignoring duplicate submission');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await login(formData.email, formData.password);
      toast.success('Welcome back!');
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Handle specific error messages
      if (error.message?.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please try again.');
      } else if (error.message?.includes('Email not confirmed')) {
        toast.error('Please check your email and click the confirmation link before signing in.');
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent multiple submissions
    if (isLoading) {
      console.log('Registration already in progress, ignoring duplicate submission');
      return;
    }
    
    // Basic form validation
    if (!formData.email || !formData.password || !formData.name) {
      toast.error('Please fill in all fields.');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
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
      await register(formData.email, formData.password, formData.name);
      console.log('🎉 Registration successful - showing success message');
      toast.success('Account created! Please check your email for confirmation.');
      
      // Clear form and rate limit state on successful registration
      setFormData({ email: '', password: '', name: '' });
      setRateLimitUntil(null);
      setCountdown(0);
    } catch (error: any) {
      console.error('Registration failed with error:', error);
      console.error('Error details:', {
        status: error.status,
        message: error.message,
        name: error.name,
        code: error.code
      });
      
      // Always show some error message to the user
      let errorMessage = 'Registration failed. Please try again.';
      
      // Handle rate limiting with improved detection
      if (error.message?.includes('For security purposes') || 
          error.message?.includes('rate') || 
          error.message?.includes('Too many requests') ||
          error.status === 429) {
        const waitTime = 60; // Default to 60 seconds
        const rateLimitEnd = Date.now() + (waitTime * 1000);
        setRateLimitUntil(rateLimitEnd);
        errorMessage = `Too many requests. Please wait ${waitTime} seconds before trying again.`;
      }
      // Handle email rate limiting specifically
      else if (error.message?.includes('over_email_send_rate_limit') || 
               error.message?.includes('Too many emails')) {
        const waitTime = 180; // 3 minutes for email rate limit
        const rateLimitEnd = Date.now() + (waitTime * 1000);
        setRateLimitUntil(rateLimitEnd);
        errorMessage = `Email rate limit reached. Please wait ${Math.ceil(waitTime / 60)} minutes before trying again.`;
      }
      // Handle specific error messages
      else if (error.message?.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = 'Password should be at least 6 characters long.';
      } else if (error.message?.includes('Unable to validate email') || 
                 error.message?.includes('invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message?.includes('invalid_credentials')) {
        errorMessage = 'Invalid credentials. Please check your information.';
      } else if (error.message) {
        // Use the actual error message if available
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Card className={`w-full max-w-md glass-card border-0 rounded-3xl ${isMobile ? 'mx-4' : ''}`}>
        <CardHeader className="text-center space-y-4 pb-4">
          <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} gradient-primary rounded-3xl flex items-center justify-center mx-auto neon-glow`}>
            <User className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white`} />
          </div>
          <div>
            <CardTitle className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent`}>
              Welcome to NutriCoach
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-300 font-medium">Your AI-powered nutrition companion</p>
          </div>
        </CardHeader>

        <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
          <Tabs defaultValue="login" className="space-y-4">
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
                    onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
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
                    onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                    className={`glass-button border-0 ${isMobile ? 'h-12' : 'h-12'}`}
                    required
                    disabled={isLoading}
                  />
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
                
                {debugMode && (
                  <div className="text-center">
                    <button 
                      type="button"
                      onClick={() => setDebugMode(false)}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Hide Debug Info
                    </button>
                  </div>
                )}
                
                {!debugMode && (
                  <div className="text-center">
                    <button 
                      type="button"
                      onClick={() => setDebugMode(true)}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Show Debug Info
                    </button>
                  </div>
                )}
                <Button 
                  type="submit" 
                  className={`w-full gradient-primary ${isMobile ? 'h-12' : 'h-12'}`}
                  disabled={isLoading || (rateLimitUntil !== null && countdown > 0)}
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
