import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Shield,
  Banknote
} from "lucide-react";

interface PayoutsState {
  connect_account_id: string | null;
  payouts_enabled: boolean;
  default_currency: string | null;
}

interface PayoutsPanelProps {
  stripeStatus?: PayoutsState;
  isLoading?: boolean;
  onSetupPayouts?: () => void;
  onRefreshStatus?: () => void;
  isRefreshing?: boolean;
  isSettingUp?: boolean;
}

export const PayoutsPanel = ({
  stripeStatus,
  isLoading,
  onSetupPayouts,
  onRefreshStatus,
  isRefreshing,
  isSettingUp
}: PayoutsPanelProps) => {
  const handleOpenStripe = () => {
    window.open('https://dashboard.stripe.com', '_blank');
  };

  const getConnectionState = () => {
    if (!stripeStatus?.connect_account_id) {
      return 'not_connected';
    } else if (!stripeStatus.payouts_enabled) {
      return 'connected_not_enabled';
    } else {
      return 'fully_enabled';
    }
  };

  const connectionState = getConnectionState();

  const stateConfig = {
    not_connected: {
      title: "Set up payouts",
      description: "Connect your Stripe account to receive payouts from paid challenges.",
      icon: CreditCard,
      iconColor: "text-muted-foreground",
      badge: { text: "Not Connected", variant: "secondary" as const }
    },
    connected_not_enabled: {
      title: "Complete setup",
      description: "Complete your Stripe onboarding to enable payouts.",
      icon: AlertCircle,
      iconColor: "text-yellow-500",
      badge: { text: "Setup Required", variant: "outline" as const }
    },
    fully_enabled: {
      title: "Payouts enabled",
      description: "Your Stripe account is connected and payouts are enabled.",
      icon: CheckCircle,
      iconColor: "text-green-500",
      badge: { text: "Connected", variant: "default" as const }
    }
  };

  const currentConfig = stateConfig[connectionState];

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur">
        <CardHeader>
          <CardTitle>Stripe Connect Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-6 bg-muted/20 rounded animate-pulse" />
            <div className="h-4 bg-muted/20 rounded animate-pulse w-3/4" />
            <div className="h-10 bg-muted/20 rounded animate-pulse w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <currentConfig.icon className={`h-5 w-5 ${currentConfig.iconColor}`} />
              Stripe Connect Status
            </CardTitle>
            <Badge variant={currentConfig.badge.variant}>
              {currentConfig.badge.text}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status Description */}
          <div>
            <h3 className="font-medium mb-2">{currentConfig.title}</h3>
            <p className="text-muted-foreground text-sm">
              {currentConfig.description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {connectionState === 'not_connected' && (
              <Button 
                onClick={onSetupPayouts}
                disabled={isSettingUp}
                className="w-full gap-2"
              >
                {isSettingUp ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Set up payouts
              </Button>
            )}

            {connectionState === 'connected_not_enabled' && (
              <div className="flex gap-2">
                <Button 
                  onClick={onRefreshStatus}
                  disabled={isRefreshing}
                  variant="outline"
                  className="gap-2"
                >
                  {isRefreshing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh status
                </Button>
                
                <Button 
                  onClick={onSetupPayouts}
                  disabled={isSettingUp}
                  className="flex-1 gap-2"
                >
                  {isSettingUp ? (
                    <Clock className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  Complete onboarding
                </Button>
              </div>
            )}

            {connectionState === 'fully_enabled' && (
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={onRefreshStatus}
                  disabled={isRefreshing}
                  className="gap-2"
                >
                  {isRefreshing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh status
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleOpenStripe}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Stripe
                </Button>
              </div>
            )}
          </div>

          {/* Trust Indicators */}
          <div className="flex items-center gap-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>Bank-level security</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Banknote className="h-3 w-3" />
              <span>Direct deposits</span>
            </div>
          </div>

          {/* Help Text */}
          <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-3">
            <p>
              Payments from paid challenges appear as orders. After Stripe settles funds, 
              payouts go to your connected bank account.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};