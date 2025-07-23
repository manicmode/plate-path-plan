import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Clock, Calendar, Target } from 'lucide-react';

interface PreMadePlan {
  id: number;
  title: string;
  emoji: string;
  type: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  timeCommitment: string;
  gradient: string;
  schedulePreview: string;
  description: string;
  weeks: {
    [key: string]: {
      [day: string]: string;
    };
  };
}

interface PlanPreviewModalProps {
  plan: PreMadePlan | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToRoutines: (plan: PreMadePlan) => void;
}

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'Beginner':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'Intermediate':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'Advanced':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

export const PlanPreviewModal = ({ plan, isOpen, onClose, onAddToRoutines }: PlanPreviewModalProps) => {
  if (!plan) return null;

  const weekNumbers = Object.keys(plan.weeks);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className={`bg-gradient-to-r ${plan.gradient} p-4 rounded-lg mb-4 -mt-2 -mx-6`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-5xl">{plan.emoji}</span>
                <div>
                  <DialogTitle className="text-2xl font-bold text-white drop-shadow-md">
                    {plan.title}
                  </DialogTitle>
                  <p className="text-white/90 font-medium">{plan.type}</p>
                </div>
              </div>
              <Badge className={getDifficultyColor(plan.difficulty)}>
                {plan.difficulty}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Plan Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-semibold">{plan.duration}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Time Commitment</p>
              <p className="font-semibold">{plan.timeCommitment}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Focus</p>
              <p className="font-semibold">{plan.type}</p>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">About This Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{plan.description}</p>
          </CardContent>
        </Card>

        {/* Weekly Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Weekly Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={weekNumbers[0]} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                {weekNumbers.slice(0, 4).map((week) => (
                  <TabsTrigger key={week} value={week}>
                    {week}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {weekNumbers.map((week) => (
                <TabsContent key={week} value={week}>
                  <div className="space-y-3 mt-4">
                    {Object.entries(plan.weeks[week]).map(([day, workout]) => (
                      <div key={day} className="flex items-start justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {day.slice(0, 3).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{day}</p>
                            <p className="text-sm text-muted-foreground">{workout}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* CTA Button */}
        <div className="flex justify-center mt-6 pt-4 border-t border-border">
          <Button
            onClick={() => {
              onAddToRoutines(plan);
              onClose();
            }}
            size="lg"
            className="w-full md:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold px-8"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add This Plan to My Routines
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};