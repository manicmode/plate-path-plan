import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mic, AlertTriangle } from "lucide-react";
import { useFeatureFlagOptimized } from "@/hooks/useFeatureFlagOptimized";
import { useAdminRole } from "@/hooks/useAdminRole";

export default function VoiceAgent() {
  const { enabled: killSwitchDisabled } = useFeatureFlagOptimized("voice_coach_disabled");
  const { enabled: mvpEnabled } = useFeatureFlagOptimized("voice_coach_mvp");
  const { isAdmin } = useAdminRole();

  // Feature gating: allow if not kill-switched AND (admin OR MVP enabled)
  const isAllowed = !killSwitchDisabled && (isAdmin || mvpEnabled);

  if (!isAllowed) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Voice Agent (Beta)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-3 bg-muted rounded-lg border text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Access Restricted</span>
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                Voice Agent is currently in beta and access is limited.
              </div>
              {isAdmin && (
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href="/admin/feature-flags" 
                    className="inline-flex items-center gap-1"
                  >
                    Manage Access <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
              {!isAdmin && (
                <div className="text-xs text-muted-foreground">
                  Contact your administrator for access
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Agent (Beta)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-2xl font-semibold mb-2">Coming Soon</h2>
            <p className="text-muted-foreground mb-6">
              The new Voice Agent with real-time conversation capabilities is being built.
            </p>
            <div className="text-sm text-muted-foreground">
              This will replace the legacy Voice Coach with a more advanced real-time conversation system.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}