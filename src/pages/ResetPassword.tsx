import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const getAuthParams = () => {
  const params = new URLSearchParams(window.location.search);

  // Check query params first
  if (params.has("access_token") && params.has("refresh_token")) {
    return {
      access_token: params.get("access_token"),
      refresh_token: params.get("refresh_token"),
      type: params.get("type"),
    };
  }

  // Fallback: parse from hash (supports both #access_token=... and #/reset-password?access_token=...)
  const hash = window.location.hash;
  let queryString = "";
  
  if (hash.includes("?")) {
    // Format: #/reset-password?access_token=...
    queryString = hash.split("?")[1];
  } else if (hash.startsWith("#") && hash.includes("=")) {
    // Format: #access_token=...
    queryString = hash.substring(1);
  }
  
  if (queryString) {
    const hashParams = new URLSearchParams(queryString);
    return {
      access_token: hashParams.get("access_token"),
      refresh_token: hashParams.get("refresh_token"),
      type: hashParams.get("type"),
    };
  }

  // No tokens found
  return {
    access_token: null,
    refresh_token: null,
    type: null,
  };
};

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tokens, setTokens] = useState<{ access_token: string; refresh_token: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const validateTokens = async () => {
      try {
        console.log('🔄 ResetPassword page mounted');
        console.log('🔗 Current URL:', window.location.href);
        console.log('🔗 Search params:', searchParams.toString());
        console.log('🔗 Hash:', window.location.hash);
        
        // Set timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          console.log('⏰ Validation timeout reached (10s)');
          setHasTimedOut(true);
          setValidationError('Validation took too long. Please try clicking the reset link again.');
        }, 10000);
        
        // Check if we have the recovery type and auth tokens in the URL (query or hash)
        const { type: recoveryType, access_token, refresh_token } = getAuthParams();
        
        console.log("🧪 Tokens extracted:", { type: recoveryType, access_token: access_token ? `present (${access_token.length} chars)` : 'missing', refresh_token: refresh_token ? `present (${refresh_token.length} chars)` : 'missing' });
        
        // Validate this is actually a password recovery link
        if (recoveryType !== 'recovery') {
          console.log('❌ Not a recovery type, redirecting to home');
          setValidationError('This link is not a valid password reset link.');
          toast({
            title: "Invalid reset link",
            description: "This link is not a valid password reset link.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }
        
        if (!access_token || !refresh_token) {
          console.log('❌ Missing tokens, redirecting to home');
          setValidationError('This password reset link is invalid or has expired.');
          toast({
            title: "Invalid reset link",
            description: "This password reset link is invalid or has expired.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }

        // Test the session to make sure tokens are valid
        console.log('🧪 Testing session with extracted tokens...');
        console.log('🧪 Calling supabase.auth.setSession()...');
        
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        console.log('🧪 setSession result:', { data: sessionData, error: sessionError });

        if (sessionError) {
          console.log('❌ Session validation failed:', sessionError);
          setValidationError(`Session validation failed: ${sessionError.message}`);
          toast({
            title: "Invalid session",
            description: sessionError.message,
            variant: "destructive",
          });
          navigate('/');
          return;
        }

        // Get user to verify session is working
        console.log('🧪 Calling getUser() to verify session...');
        const { data: userData, error: userError } = await supabase.auth.getUser();
        console.log('🧪 getUser result:', { data: userData, error: userError });

        if (userError) {
          console.log('❌ User fetch failed:', userError);
          setValidationError(`User verification failed: ${userError.message}`);
          // Don't redirect, allow password reset to proceed with tokens only
        }

        console.log('✅ Session validation successful, storing tokens');
        clearTimeout(timeoutId);
        setTokens({ access_token, refresh_token });
        
      } catch (error) {
        console.log('❌ Unexpected validation error:', error);
        setValidationError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        clearTimeout(timeoutId);
      }
    };

    validateTokens();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [searchParams, navigate, toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (!tokens) {
      toast({
        title: "Invalid session",
        description: "Password reset session is invalid.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔄 Starting password reset process');
      
      console.log("🧪 Detected tokens:", { access_token: tokens.access_token, refresh_token: tokens.refresh_token, type: 'recovery' });
      
      // Set the session with the stored tokens before updating password
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });

      console.log("🧪 Supabase setSession result:", { data, error: sessionError });

      if (sessionError) {
        console.log('❌ Session error:', sessionError);
        toast({
          title: "Session failed",
          description: sessionError.message,
          variant: "destructive",
        });
        navigate("/", { replace: true });
        return;
      }

      console.log('✅ Session set, updating password');
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.log('❌ Password update error:', error);
        toast({
          title: "Password reset failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Password updated successfully');
      toast({
        title: "Password updated successfully!",
        description: "You can now sign in with your new password.",
      });

      // Sign out and redirect to login
      await supabase.auth.signOut();
      console.log('🔄 Redirecting to home page');
      navigate('/', { replace: true });
      
    } catch (error) {
      console.log('❌ Unexpected error:', error);
      toast({
        title: "Password reset failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while validating tokens or error state if validation failed
  if (!tokens) {
    if (hasTimedOut || validationError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-destructive">
                {hasTimedOut ? 'Validation Timeout' : 'Reset Link Invalid'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-center">
                {validationError || 'The reset process took too long to complete.'}
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="w-full"
                  variant="outline"
                >
                  Try Again
                </Button>
                <Button 
                  onClick={() => navigate('/')} 
                  className="w-full"
                  variant="secondary"
                >
                  Back to Login
                </Button>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                <p>If this keeps happening:</p>
                <p>1. Check your email for a fresh reset link</p>
                <p>2. Make sure you're clicking the link from the same device/browser</p>
                <p>3. Clear your browser cache and try again</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-muted-foreground">Validating reset link...</p>
            {hasTimedOut && (
              <p className="text-xs text-muted-foreground mt-2">
                This is taking longer than expected...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <p className="text-muted-foreground">Enter your new password below</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !password || !confirmPassword}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Update Password'
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => navigate('/')}
                className="text-sm text-muted-foreground"
              >
                Back to sign in
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;