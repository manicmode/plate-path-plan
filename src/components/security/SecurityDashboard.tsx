import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';
import { useAdvancedThreatDetection } from '@/hooks/useAdvancedThreatDetection';
import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SecurityAuditResult {
  score: number;
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    location?: string;
  }>;
  recommendations: string[];
}

export const SecurityDashboard: React.FC = () => {
  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const { performFullAudit } = useSecurityAudit();
  const { detectAnomalousActivity } = useAdvancedThreatDetection();

  const runSecurityAudit = async () => {
    setIsAuditing(true);
    try {
      await detectAnomalousActivity('security_audit_initiated');
      const result = await performFullAudit();
      setAuditResult(result);
      toast.success('Security audit completed');
    } catch (error) {
      toast.error('Security audit failed');
      console.error('Security audit error:', error);
    } finally {
      setIsAuditing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  useEffect(() => {
    // Run initial audit on component mount
    runSecurityAudit();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Dashboard
          </CardTitle>
          <Button 
            onClick={runSecurityAudit} 
            disabled={isAuditing}
            variant="outline"
          >
            {isAuditing ? 'Running Audit...' : 'Run Security Audit'}
          </Button>
        </CardHeader>
        <CardContent>
          {auditResult ? (
            <div className="space-y-6">
              {/* Security Score */}
              <div className="text-center">
                <div className={`text-4xl font-bold ${getScoreColor(auditResult.score)}`}>
                  {auditResult.score}/100
                </div>
                <p className="text-muted-foreground">Security Score</p>
              </div>

              {/* Issues Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['critical', 'high', 'medium', 'low'].map((severity) => {
                  const count = auditResult.issues.filter(issue => issue.severity === severity).length;
                  return (
                    <Card key={severity}>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {severity} Issues
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Issues List */}
              {auditResult.issues.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Security Issues
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {auditResult.issues.map((issue, index) => (
                        <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={getSeverityColor(issue.severity)}>
                                {issue.severity}
                              </Badge>
                              <span className="font-medium">{issue.type.replace(/_/g, ' ')}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{issue.description}</p>
                            {issue.location && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Location: {issue.location}
                              </p>
                            )}
                          </div>
                          {issue.severity === 'critical' ? (
                            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {auditResult.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {auditResult.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {isAuditing ? 'Running security audit...' : 'Click "Run Security Audit" to start'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};