import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

type ConfirmationState = 'processing' | 'success' | 'error' | 'invalid';

export const ConfirmEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resendEmailConfirmation } = useAuth();
  const [state, setState] = useState<ConfirmationState>('processing');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        console.log('Email confirmation URL:', window.location.href);
        const isPWA = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
        console.log('PWA mode detected:', isPWA);
        console.log('User-Agent:', navigator.userAgent);
        console.log('Referrer:', document.referrer);
        
        // Get URL parameters - handle multiple Supabase formats
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Check both query and hash for parameters (Supabase uses different methods)
        const getParam = (key: string) => urlParams.get(key) || hashParams.get(key) || searchParams.get(key);
        
        const accessToken = getParam('access_token');
        const refreshToken = getParam('refresh_token');
        const type = getParam('type');
        const tokenHash = getParam('token_hash');
        const code = getParam('code');
        const token = getParam('token'); // Some flows use 'token' instead of 'access_token'

        console.log('Email confirmation params:', { 
          hasAccessToken: !!(accessToken || token), 
          hasRefreshToken: !!refreshToken, 
          hasTokenHash: !!tokenHash,
          hasCode: !!code,
          type,
          url: window.location.href,
          search: window.location.search,
          hash: window.location.hash
        });

        // Priority 1: Modern PKCE flow with code
        if (code) {
          console.log('Using PKCE flow with code');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Error exchanging code for session:', error);
            setState('error');
            return;
          }
          
          if (data.user?.email) {
            setUserEmail(data.user.email);
          }
          
          console.log('PKCE email confirmation successful:', { 
            userId: data.user?.id, 
            email: data.user?.email,
            emailConfirmed: data.user?.email_confirmed_at 
          });
          
          setState('success');
          handleSuccessfulConfirmation(data.user);
          return;
        }

        // Priority 2: Token hash flow (newer Supabase format)
        if (tokenHash && type) {
          console.log('Using token hash flow');
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });
          
          if (error) {
            console.error('Error verifying token hash:', error);
            setState('error');
            return;
          }
          
          if (data.user?.email) {
            setUserEmail(data.user.email);
          }
          
          console.log('Token hash confirmation successful:', { 
            userId: data.user?.id, 
            email: data.user?.email,
            emailConfirmed: data.user?.email_confirmed_at 
          });
          
          setState('success');
          handleSuccessfulConfirmation(data.user);
          return;
        }

        // Priority 3: Legacy token-based flow fallback (deprecated but needed for compatibility)
        if ((accessToken || token) && refreshToken) {
          console.log('Using legacy token flow - this method is deprecated');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken || token,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Error confirming email with tokens:', error);
            setState('error');
            return;
          }

          if (data.user?.email) {
            setUserEmail(data.user.email);
          }

          console.log('Legacy token confirmation successful:', { 
            userId: data.user?.id, 
            email: data.user?.email,
            emailConfirmed: data.user?.email_confirmed_at 
          });

          setState('success');
          handleSuccessfulConfirmation(data.user);
          return;
        }

        // No valid confirmation method found
        console.error('No valid confirmation parameters found');
        console.error('Available params:', Object.fromEntries(searchParams.entries()));
        setState('invalid');

      } catch (error) {
        console.error('Unexpected error during email confirmation:', error);
        setState('error');
      }
    };

    confirmEmail();
  }, [searchParams]);

  // Handle successful confirmation with delayed redirect to prevent flash
  const handleSuccessfulConfirmation = async (user: any) => {
    try {
      // Check if user has completed onboarding
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('user_id', user?.id)
        .maybeSingle();

      console.log('Onboarding status check:', { profile, profileError });

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error checking onboarding status:', profileError);
      }

      // Add a delay to allow auth state to fully sync before navigation
      console.log('Email confirmed successfully, redirecting in 500ms...');
      setTimeout(() => {
        console.log('Redirecting to home after email confirmation');
        navigate('/', { replace: true });
      }, 500);
      
    } catch (redirectError) {
      console.error('Error during redirect:', redirectError);
      // Fallback redirect with delay
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 500);
    }
  };

  const handleResendConfirmation = async () => {
    if (!userEmail) {
      toast.error('No email address found. Please try signing up again.');
      return;
    }

    setIsResending(true);
    try {
      await resendEmailConfirmation(userEmail);
      toast.success('Confirmation email sent! Please check your inbox.');
    } catch (error: any) {
      console.error('Error resending confirmation:', error);
      
      if (error.message === 'EMAIL_RATE_LIMITED') {
        toast.error('Too many emails sent. Please wait a few minutes before trying again.');
      } else if (error.message === 'RATE_LIMITED') {
        toast.error('Too many requests. Please wait a moment and try again.');
      } else {
        toast.error('Failed to resend confirmation email. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const renderContent = () => {
    switch (state) {
      case 'processing':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <CardTitle>Confirming Your Email</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Please wait while we confirm your email address...
              </p>
            </CardContent>
          </>
        );

      case 'success':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-green-700 dark:text-green-400">Email Confirmed!</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Your email has been successfully confirmed. Redirecting you to the app...
              </p>
              {userEmail && (
                <p className="text-sm text-muted-foreground mb-4">
                  Welcome, {userEmail}!
                </p>
              )}
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                <span className="text-sm text-muted-foreground">Setting up your account...</span>
              </div>
            </CardContent>
          </>
        );

      case 'error':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-red-700 dark:text-red-400">Confirmation Failed</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                We couldn't confirm your email. This might be because the link has expired or has already been used.
              </p>
              {userEmail && (
                <Button 
                  onClick={handleResendConfirmation} 
                  disabled={isResending}
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend Confirmation Email
                    </>
                  )}
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => navigate('/', { replace: true })}
                className="w-full"
              >
                Return to Sign In
              </Button>
            </CardContent>
          </>
        );

      case 'invalid':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                <XCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <CardTitle className="text-yellow-700 dark:text-yellow-400">Invalid Link</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                This confirmation link is invalid or malformed. Please try signing up again or request a new confirmation email.
              </p>
              <Button 
                variant="outline" 
                onClick={() => navigate('/', { replace: true })}
                className="w-full"
              >
                Return to Sign In
              </Button>
            </CardContent>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        {renderContent()}
      </Card>
    </div>
  );
};