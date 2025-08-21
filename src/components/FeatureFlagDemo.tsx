import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useUserFeatureFlag } from '@/hooks/useUserFeatureFlag';
import { useVoiceCoachFeatureFlag } from '@/hooks/useVoiceCoachFeatureFlag';

const FEATURE_FLAGS = [
  {
    key: 'voice_coach_mvp',
    name: 'Voice Coach MVP',
    description: 'Enable Voice Coach functionality for your account'
  }
];

export default function FeatureFlagDemo() {
  const { toggleUserFlag, getUserFlags, loading: userFlagLoading } = useUserFeatureFlag();
  const [userFlags, setUserFlags] = useState<any[]>([]);
  const voiceCoach = useVoiceCoachFeatureFlag();

  useEffect(() => {
    const loadUserFlags = async () => {
      const flags = await getUserFlags();
      setUserFlags(flags);
    };
    loadUserFlags();
  }, [getUserFlags]);

  const handleToggle = async (flagKey: string, enabled: boolean) => {
    const success = await toggleUserFlag(flagKey, enabled);
    if (success) {
      // Refresh user flags
      const flags = await getUserFlags();
      setUserFlags(flags);
    }
  };

  const getUserFlagState = (flagKey: string) => {
    return userFlags.find(flag => flag.flag_key === flagKey)?.enabled ?? false;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Feature Flags Demo
            <Badge variant="secondary">Beta</Badge>
          </CardTitle>
          <CardDescription>
            Manage feature flags for your account. These override global settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Voice Coach Status: 
              {voiceCoach.loading ? (
                <span className="ml-2">Loading...</span>
              ) : (
                <Badge className="ml-2" variant={voiceCoach.fullyAvailable ? "default" : "secondary"}>
                  {voiceCoach.fullyAvailable ? 'Available' : 'Disabled'}
                </Badge>
              )}
            </AlertDescription>
          </Alert>

          {FEATURE_FLAGS.map((flag) => {
            const globalFlag = useFeatureFlag(flag.key);
            const userFlagEnabled = getUserFlagState(flag.key);
            
            return (
              <div key={flag.key} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{flag.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      Global: {globalFlag.loading ? 'Loading...' : (globalFlag.enabled ? 'ON' : 'OFF')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {flag.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {userFlagLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Switch
                      checked={userFlagEnabled}
                      onCheckedChange={(checked) => handleToggle(flag.key, checked)}
                      disabled={userFlagLoading}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm font-mono">
            <div>DB Enabled: {voiceCoach.dbEnabled ? '✅' : '❌'}</div>
            <div>Env Enabled: {voiceCoach.envEnabled ? '✅' : '❌'}</div>
            <div>Tier Enabled: {voiceCoach.tierEnabled ? '✅' : '❌'}</div>
            <div>Final Result: {voiceCoach.fullyAvailable ? '✅' : '❌'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}