import React from 'react';
import { useSecurityAuditContext } from './SecurityAuditProvider';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SecurityStatusIndicatorProps {
  className?: string;
  showText?: boolean;
}

export const SecurityStatusIndicator: React.FC<SecurityStatusIndicatorProps> = ({ 
  className,
  showText = true 
}) => {
  const { lastAuditScore, isAuditRunning, securityMetrics } = useSecurityAuditContext();

  const getSecurityStatus = (): {
    color: "secondary" | "default" | "destructive" | "outline";
    icon: typeof Shield | typeof CheckCircle | typeof AlertTriangle;
    text: string;
    score: number | null;
  } => {
    if (isAuditRunning) {
      return {
        color: 'secondary' as const,
        icon: Shield,
        text: 'Scanning...',
        score: null
      };
    }

    if (lastAuditScore === null) {
      return {
        color: 'secondary' as const,
        icon: Shield,
        text: 'Not Scanned',
        score: null
      };
    }

    if (lastAuditScore >= 90) {
      return {
        color: 'default' as const,
        icon: CheckCircle,
        text: 'Secure',
        score: lastAuditScore
      };
    }

    if (lastAuditScore >= 70) {
      return {
        color: 'secondary' as const,
        icon: Shield,
        text: 'Good',
        score: lastAuditScore
      };
    }

    return {
      color: 'destructive' as const,
      icon: AlertTriangle,
      text: 'At Risk',
      score: lastAuditScore
    };
  };

  const status = getSecurityStatus();
  const IconComponent = status.icon;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge variant={status.color} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {showText && (
          <span>
            {status.text}
            {status.score !== null && ` (${status.score})`}
          </span>
        )}
      </Badge>
      
      {securityMetrics.threatsDetected > 0 && (
        <Badge variant="destructive" className="text-xs">
          {securityMetrics.threatsDetected} threats
        </Badge>
      )}
    </div>
  );
};