import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Calendar, Clock, Target, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { getAppStoreRedirectUrl } from '@/utils/shareUtils';

export function SharedRoutine() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [routineData, setRoutineData] = useState<any>(null);

  useEffect(() => {
    // Extract routine data from URL parameters
    const id = searchParams.get('id');
    const name = searchParams.get('name');
    const goal = searchParams.get('goal');
    const split = searchParams.get('split');
    const days = searchParams.get('days');
    const duration = searchParams.get('duration');

    if (id && name) {
      setRoutineData({
        id,
        name,
        goal: goal || 'General Fitness',
        splitType: split || 'Full Body',
        daysPerWeek: parseInt(days || '3'),
        duration: parseInt(duration || '45')
      });
    }
  }, [searchParams]);

  const handleDownloadApp = () => {
    window.open(getAppStoreRedirectUrl(), '_blank');
  };

  const handleUseRoutine = () => {
    if (user) {
      // User is logged in, navigate to routine creation
      navigate('/exercise-hub');
    } else {
      // User not logged in, redirect to auth
      navigate('/auth');
    }
  };

  if (!routineData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-accent/10 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Invalid Share Link</h2>
            <p className="text-muted-foreground mb-4">
              This shared routine link appears to be invalid or corrupted.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/10 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              🎯 Shared Workout Routine
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold">{routineData.name}</h3>
              <Badge variant="secondary" className="mt-2">
                {routineData.goal.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{routineData.daysPerWeek} days/week</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{routineData.duration} min</span>
              </div>
            </div>

            <div className="p-4 bg-accent/10 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Split Type:</strong> {routineData.splitType}
              </p>
            </div>
          </div>

          {user ? (
            <div className="space-y-3">
              <Button onClick={handleUseRoutine} className="w-full" size="lg">
                <Download className="h-4 w-4 mr-2" />
                Add to My Routines
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                This routine will be added to your Exercise Hub
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-semibold text-primary mb-2">
                  📱 You've received a shared routine!
                </h4>
                <p className="text-sm text-muted-foreground">
                  Download the app to view the complete workout plan and add it to your routines.
                </p>
              </div>

              <div className="space-y-2">
                <Button onClick={handleDownloadApp} className="w-full" size="lg">
                  <Download className="h-4 w-4 mr-2" />
                  Download App
                </Button>
                <Button onClick={handleUseRoutine} variant="outline" className="w-full">
                  Sign In to View
                </Button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Shared via NutriCoach AI 🤖✨
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SharedRoutine;