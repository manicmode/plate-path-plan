import { useEffect, useState } from 'react';
import { isQaEnabled } from '@/utils/qaGating';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface QAAccessGateProps {
  children: React.ReactNode;
}

export function QAAccessGate({ children }: QAAccessGateProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    isQaEnabled().then(setHasAccess);
  }, []);

  if (hasAccess === null) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-md mx-auto p-6 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Checking QA access...</p>
        </Card>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-md mx-auto p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">QA Access Disabled</h1>
          <p className="text-muted-foreground mb-4">
            Quality Assurance tools are not available for your account.
          </p>
          <p className="text-sm text-muted-foreground">
            Contact an administrator if you need access to QA functionality.
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}