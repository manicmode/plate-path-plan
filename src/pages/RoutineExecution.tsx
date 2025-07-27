import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const RoutineExecution = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routineId = searchParams.get('routineId');

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3 -mx-4 mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/exercise-hub')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏋️</span>
            <h1 className="text-xl font-bold">Routine Execution</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto">
        <Card className="w-full shadow-lg border-border bg-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Coming Soon!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-6xl mb-4">🚧</div>
            <p className="text-muted-foreground">
              Routine execution for routine ID: <span className="font-mono bg-muted px-2 py-1 rounded">{routineId}</span>
            </p>
            <p className="text-muted-foreground">
              This page will guide you through your workout routine step by step.
            </p>
            <Button
              onClick={() => navigate('/exercise-hub')}
              className="bg-primary hover:bg-primary/90"
            >
              Back to Exercise Hub
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoutineExecution;