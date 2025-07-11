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
        // Get URL parameters
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const type = searchParams.get('type');

        console.log('Email confirmation params:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken, 
          type 
        });

        // Check if we have the required parameters
        if (!accessToken || !refreshToken || type !== 'signup') {
          console.error('Missing or invalid confirmation parameters');
          setState('invalid');
          return;
        }

        // Exchange the tokens for a session
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Error confirming email:', error);
          setState('error');
          return;
        }

        if (data.user?.email) {
          setUserEmail(data.user.email);
        }

        console.log('Email confirmation successful:', { 
          userId: data.user?.id, 
          email: data.user?.email,
          emailConfirmed: data.user?.email_confirmed_at 
        });

        setState('success');

        // Redirect after a short delay to let the user see the success message
        setTimeout(async () => {
          try {
            // Check if user has completed onboarding
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('onboarding_completed')
              .eq('user_id', data.user?.id)
              .single();

            if (profileError) {
              console.error('Error checking onboarding status:', profileError);
              // Default to showing onboarding if we can't check
              navigate('/', { replace: true });
              return;
            }

            // Redirect based on onboarding status
            if (profile?.onboarding_completed) {
              // User already completed onboarding, go to main app
              navigate('/', { replace: true });
            } else {
              // New user needs onboarding
              navigate('/', { replace: true });
            }
          } catch (redirectError) {
            console.error('Error during redirect:', redirectError);
            navigate('/', { replace: true });
          }
        }, 2000);

      } catch (error) {
        console.error('Unexpected error during email confirmation:', error);
        setState('error');
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

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
                Your email has been successfully confirmed. You'll be redirected to the app shortly.
              </p>
              {userEmail && (
                <p className="text-sm text-muted-foreground">
                  Welcome, {userEmail}!
                </p>
              )}
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