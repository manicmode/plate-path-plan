import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Shield, Users } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';

export const PrivacySettings = () => {
  const isMobile = useIsMobile();
  const { settings, loading, updating, updateSettings } = usePrivacySettings();

  const handleToggle = async (value: boolean) => {
    await updateSettings(value);
  };

  if (loading) {
    return (
      <Card className="animate-slide-up glass-card border-0 rounded-3xl" style={{ animationDelay: '350ms' }}>
        <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
          <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <Shield className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
            <span>Privacy Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up glass-card border-0 rounded-3xl" style={{ animationDelay: '350ms' }}>
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
        <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
          <Shield className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
          <span>Privacy Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0 space-y-4`}>
        <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex-1 flex items-center space-x-3">
            <Users className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
            <div>
              <div className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
                Allow friend requests from challenge members
              </div>
              <div className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Other users in your challenges can send you friend requests
              </div>
            </div>
          </div>
          <Switch
            checked={settings.allow_challenge_friend_requests}
            onCheckedChange={handleToggle}
            disabled={updating}
          />
        </div>
      </CardContent>
    </Card>
  );
};