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
        console.log('🔧 Starting email confirmation process...');
        console.log('📧 Full URL:', window.location.href);
        console.log('🔍 Search params:', window.location.search);
        console.log('📍 Hash params:', window.location.hash);
        
        // Enhanced parameter extraction with better logging
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Log all available parameters for debugging
        console.log('🔧 URL search params:', Object.fromEntries(urlParams.entries()));
        console.log('🔧 Hash params:', Object.fromEntries(hashParams.entries()));
        console.log('🔧 React Router params:', Object.fromEntries(searchParams.entries()));
        
        // Enhanced parameter getter with priority order
        const getParam = (key: string) => {
          const value = urlParams.get(key) || hashParams.get(key) || searchParams.get(key);
          if (value) {
            console.log(`✅ Found ${key}:`, value.substring(0, 20) + '...');
          }
          return value;
        };
        
        // Extract all possible parameters
        const accessToken = getParam('access_token');
        const refreshToken = getParam('refresh_token');
        const type = getParam('type');
        const tokenHash = getParam('token_hash');
        const code = getParam('code');
        const token = getParam('token');
        const error = getParam('error');
        const errorDescription = getParam('error_description');
        
        // Check for errors in URL first
        if (error) {
          console.error('❌ Error in confirmation URL:', { error, errorDescription });
          console.error('🚨 Full error details:', { 
            error, 
            errorDescription, 
            url: window.location.href 
          });
          setState('error');
          return;
        }

        console.log('📊 Parameter availability check:', { 
          hasAccessToken: !!accessToken, 
          hasToken: !!token,
          hasRefreshToken: !!refreshToken, 
          hasTokenHash: !!tokenHash,
          hasCode: !!code,
          type: type || 'none',
          totalParams: urlParams.size + hashParams.size + searchParams.size
        });

        // Method 1: PKCE flow with authorization code (most modern)
        if (code) {
          console.log('🔑 Attempting PKCE flow with authorization code...');
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            
            if (error) {
              console.error('❌ PKCE flow failed:', error);
              console.error('🔧 Error details:', { 
                message: error.message, 
                status: error.status,
                code: error.code || 'unknown'
              });
              setState('error');
              return;
            }
            
            if (!data.user) {
              console.error('❌ PKCE flow succeeded but no user returned');
              setState('error');
              return;
            }
            
            setUserEmail(data.user.email || '');
            console.log('✅ PKCE confirmation successful:', { 
              userId: data.user.id, 
              email: data.user.email,
              emailConfirmed: data.user.email_confirmed_at,
              sessionExists: !!data.session
            });
            
            setState('success');
            await handleSuccessfulConfirmation(data.user);
            return;
          } catch (pkceError) {
            console.error('💥 PKCE flow threw exception:', pkceError);
            setState('error');
            return;
          }
        }

        // Method 2: Token hash OTP verification (newer format)
        if (tokenHash && type) {
          console.log('🔐 Attempting token hash OTP verification...');
          try {
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: type as any,
            });
            
            if (error) {
              console.error('❌ Token hash verification failed:', error);
              console.error('🔧 Error details:', { 
                message: error.message, 
                status: error.status,
                tokenHashLength: tokenHash.length,
                type
              });
              setState('error');
              return;
            }
            
            if (!data.user) {
              console.error('❌ Token hash verification succeeded but no user returned');
              setState('error');
              return;
            }
            
            setUserEmail(data.user.email || '');
            console.log('✅ Token hash confirmation successful:', { 
              userId: data.user.id, 
              email: data.user.email,
              emailConfirmed: data.user.email_confirmed_at,
              sessionExists: !!data.session
            });
            
            setState('success');
            await handleSuccessfulConfirmation(data.user);
            return;
          } catch (otpError) {
            console.error('💥 Token hash verification threw exception:', otpError);
            setState('error');
            return;
          }
        }

        // Method 3: Legacy access/refresh token flow (deprecated)
        if ((accessToken || token) && refreshToken) {
          console.log('🔄 Attempting legacy token session (deprecated method)...');
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken || token,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('❌ Legacy token session failed:', error);
              console.error('🔧 Error details:', { 
                message: error.message, 
                status: error.status,
                accessTokenLength: (accessToken || token)?.length,
                refreshTokenLength: refreshToken.length
              });
              setState('error');
              return;
            }

            if (!data.user) {
              console.error('❌ Legacy token session succeeded but no user returned');
              setState('error');
              return;
            }

            setUserEmail(data.user.email || '');
            console.log('✅ Legacy token confirmation successful:', { 
              userId: data.user.id, 
              email: data.user.email,
              emailConfirmed: data.user.email_confirmed_at,
              sessionExists: !!data.session
            });

            setState('success');
            await handleSuccessfulConfirmation(data.user);
            return;
          } catch (legacyError) {
            console.error('💥 Legacy token session threw exception:', legacyError);
            setState('error');
            return;
          }
        }

        // No valid confirmation method found
        console.error('❌ No valid confirmation parameters found');
        console.error('🔧 Available URL params:', Object.fromEntries(urlParams.entries()));
        console.error('🔧 Available hash params:', Object.fromEntries(hashParams.entries()));
        console.error('🔧 Available router params:', Object.fromEntries(searchParams.entries()));
        console.error('🚨 This suggests the confirmation link is malformed or using an unsupported format');
        
        setState('invalid');

      } catch (error) {
        console.error('💥 Unexpected error during email confirmation:', error);
        console.error('🔧 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        setState('error');
      }
    };

    // Add a small delay to ensure URL parsing is complete
    const timer = setTimeout(confirmEmail, 100);
    return () => clearTimeout(timer);
  }, [searchParams]);

  // Handle successful confirmation with delayed redirect to prevent flash
  const handleSuccessfulConfirmation = async (user: any) => {
    try {
      console.log('Email confirmation successful, refreshing session...');
      
      // Refresh the session to ensure it's properly established
      const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError) {
        console.warn('Session refresh warning (non-critical):', sessionError);
      } else {
        console.log('Session refreshed successfully');
      }

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

      // Add a longer delay to allow auth state to fully sync and prevent cleanup race condition
      console.log('Email confirmed successfully, redirecting in 1000ms to ensure auth state sync...');
      setTimeout(() => {
        console.log('Redirecting to home after email confirmation');
        navigate('/', { replace: true });
      }, 1000);
      
    } catch (redirectError) {
      console.error('Error during redirect:', redirectError);
      // Fallback redirect with delay
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1000);
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