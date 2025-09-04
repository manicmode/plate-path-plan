import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Dumbbell, Heart, CheckCircle, Plus } from 'lucide-react';

// This component shows only templates, favorites, and habits entries for the Activity tab
export const ActivityTemplatesTab = () => {
  return (
    <div className="space-y-6">
      {/* Exercise Templates */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Dumbbell className="h-5 w-5" />
          Exercise Templates
        </h3>
        <Card>
          <CardContent className="p-4">
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                No exercise templates yet. Create templates in the Exercise section below.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recovery Favorites */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Recovery Favorites
        </h3>
        <Card>
          <CardContent className="p-4">
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                No recovery favorites yet. Create favorites in the Recovery section below.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Habits */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          My Habits
        </h3>
        <Card>
          <CardContent className="p-4">
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                No habits pinned yet. Create habits in the Habits section below.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};