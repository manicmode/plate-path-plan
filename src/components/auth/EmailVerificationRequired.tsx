import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useIsMobile } from '@/hooks/use-mobile';

const EmailVerificationRequired = () => {
  const { signOut, user } = useAuth();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Card className={`w-full max-w-md glass-card border-0 rounded-3xl ${isMobile ? 'mx-4' : ''}`}>
        <CardHeader className="text-center space-y-4 pb-4">
          <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} bg-amber-500 rounded-3xl flex items-center justify-center mx-auto`}>
            <AlertCircle className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white`} />
          </div>
          <div>
            <CardTitle className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent`}>
              Email Verification Required
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-300 font-medium">Please confirm your email to continue</p>
          </div>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0 space-y-4`}>
          <div className="text-center space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <Mail className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <p className="text-amber-800 dark:text-amber-200 font-medium">
                Please check your email and click the confirmation link to complete your registration.
              </p>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>We sent a confirmation email to:</p>
              <p className="font-medium text-emerald-600 dark:text-emerald-400 break-all">
                {user?.email}
              </p>
              <p className="text-xs">
                Can't find the email? Check your spam folder or promotions tab.
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <Button 
                onClick={handleSignOut}
                variant="outline"
                className="w-full"
              >
                Sign Out & Try Again
              </Button>
              
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Once you've confirmed your email, you can sign in normally.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerificationRequired;