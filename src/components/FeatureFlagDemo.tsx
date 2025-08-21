import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Info, Shield, Settings, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useMyFeatureFlags } from '@/hooks/useMyFeatureFlags';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useFeatureFlagActions } from '@/hooks/useFeatureFlagActions';
import { useVoiceCoachFeatureFlag } from '@/hooks/useVoiceCoachFeatureFlag';
import { useFeatureFlagOptimized } from '@/hooks/useFeatureFlagOptimized';

export default function FeatureFlagDemo() {
  const { flags, flagsMap, loading: flagsLoading, refresh } = useMyFeatureFlags();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const { setUserFlag, toggleGlobalFlag, loading: actionLoading } = useFeatureFlagActions();
  const voiceCoach = useVoiceCoachFeatureFlag();
  
  // Use optimized hook for demo
  const voiceCoachOptimized = useFeatureFlagOptimized('voice_coach_mvp');

  const handleUserFlagToggle = async (flagKey: string, enabled: boolean) => {
    const success = await setUserFlag(flagKey, enabled);
    if (success) {
      refresh(); // Refresh the cache
    }
  };

  const handleGlobalFlagToggle = async (flagKey: string, enabled: boolean) => {
    const success = await toggleGlobalFlag(flagKey, enabled);
    if (success) {
      refresh(); // Refresh the cache
    }
  };

  const killSwitchFlag = flags.find(f => f.flag_key === 'voice_coach_disabled');

  if (adminLoading || flagsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Feature Flags Admin Panel
            <Badge variant={isAdmin ? "default" : "secondary"}>
              {isAdmin ? 'Admin' : 'User'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Manage global feature flags and user overrides with real-time updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Overview */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Voice Coach Status: 
              <Badge className="ml-2" variant={voiceCoach.fullyAvailable ? "default" : "secondary"}>
                {voiceCoach.fullyAvailable ? 'Available' : 'Disabled'}
              </Badge>
              <span className="ml-2 text-xs text-muted-foreground">
                (Optimized cache: {voiceCoachOptimized.isFromCache ? '✓' : '✗'})
              </span>
            </AlertDescription>
          </Alert>

          {/* Global Kill Switch - Admin Only */}
          {isAdmin && killSwitchFlag && (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  <h3 className="text-lg font-semibold">Global Kill Switch</h3>
                </div>
                <Card className="border-red-200 dark:border-red-800">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-red-700 dark:text-red-300">
                          Voice Coach Disabled
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Global kill switch - overrides all other settings
                        </p>
                      </div>
                      <Switch
                        checked={killSwitchFlag.global_enabled}
                        onCheckedChange={(enabled) => 
                          handleGlobalFlagToggle('voice_coach_disabled', enabled)
                        }
                        disabled={actionLoading}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Separator />
            </>
          )}

          {/* Feature Flags List */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Feature Flags</h3>
            </div>
            
            {flags.filter(f => f.flag_key !== 'voice_coach_disabled').map((flag) => (
              <Card key={flag.flag_key} className="transition-colors hover:bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium capitalize">
                            {flag.flag_key.replace(/_/g, ' ')}
                          </h4>
                          {flag.has_user_override && (
                            <Badge variant="outline" className="text-xs">
                              User Override
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Resolved: <strong>{flag.resolved_enabled ? 'Enabled' : 'Disabled'}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Admin Global Control */}
                    {isAdmin && (
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <div className="text-sm font-medium">Global Setting</div>
                          <div className="text-xs text-muted-foreground">
                            Controls default state for all users
                          </div>
                        </div>
                        <Switch
                          checked={flag.global_enabled}
                          onCheckedChange={(enabled) => 
                            handleGlobalFlagToggle(flag.flag_key, enabled)
                          }
                          disabled={actionLoading}
                        />
                      </div>
                    )}

                    {/* User Override */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Personal Override</div>
                        <div className="text-xs text-muted-foreground">
                          Override the global setting for your account
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {flag.has_user_override && (
                          <Badge variant="secondary" className="text-xs">
                            {flag.user_enabled ? 'ON' : 'OFF'}
                          </Badge>
                        )}
                        <Switch
                          checked={flag.user_enabled ?? flag.global_enabled}
                          onCheckedChange={(enabled) => 
                            handleUserFlagToggle(flag.flag_key, enabled)
                          }
                          disabled={actionLoading}
                        />
                      </div>
                    </div>

                    {/* Status Display */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-muted-foreground">Global</div>
                        <Badge variant={flag.global_enabled ? "default" : "secondary"} className="text-xs">
                          {flag.global_enabled ? 'ON' : 'OFF'}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">User</div>
                        <Badge 
                          variant={flag.user_enabled === null ? "outline" : (flag.user_enabled ? "default" : "secondary")} 
                          className="text-xs"
                        >
                          {flag.user_enabled === null ? 'DEFAULT' : (flag.user_enabled ? 'ON' : 'OFF')}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Final</div>
                        <Badge variant={flag.resolved_enabled ? "default" : "secondary"} className="text-xs">
                          {flag.resolved_enabled ? 'ON' : 'OFF'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Debug Information */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm font-mono">
            <div className="space-y-1">
              <div className="font-semibold">Voice Coach Checks:</div>
              <div>DB Enabled: {voiceCoach.dbEnabled ? '✅' : '❌'}</div>
              <div>Env Enabled: {voiceCoach.envEnabled ? '✅' : '❌'}</div>
              <div>Tier Enabled: {voiceCoach.tierEnabled ? '✅' : '❌'}</div>
              <div>Final Available: {voiceCoach.fullyAvailable ? '✅' : '❌'}</div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold">Cache Status:</div>
              <div>Optimized Hook: {voiceCoachOptimized.enabled ? '✅' : '❌'}</div>
              <div>From Cache: {voiceCoachOptimized.isFromCache ? '✅' : '❌'}</div>
              <div>Admin Role: {isAdmin ? '✅' : '❌'}</div>
              <div>Flags Loaded: {flags.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}