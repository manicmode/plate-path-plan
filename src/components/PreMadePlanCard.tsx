import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Plus, Clock, Calendar } from 'lucide-react';

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

interface PreMadePlanCardProps {
  plan: PreMadePlan;
  onPreview: (plan: PreMadePlan) => void;
  onStartPlan: (plan: PreMadePlan) => void;
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

export const PreMadePlanCard = ({ plan, onPreview, onStartPlan }: PreMadePlanCardProps) => {
  return (
    <Card className="w-full shadow-lg border-border bg-card hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group overflow-hidden">
      <CardContent className="p-0">
        {/* Gradient Header */}
        <div className={`bg-gradient-to-r ${plan.gradient} p-4 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-all duration-300" />
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl group-hover:scale-110 transition-transform duration-300">
                {plan.emoji}
              </span>
              <div>
                <h3 className="text-xl font-bold text-white drop-shadow-md">
                  {plan.title}
                </h3>
                <p className="text-white/90 text-sm font-medium">
                  {plan.type}
                </p>
              </div>
            </div>
            <Badge className={getDifficultyColor(plan.difficulty)}>
              {plan.difficulty}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Duration and Time Commitment */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{plan.duration}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{plan.timeCommitment}</span>
            </div>
          </div>

          {/* Schedule Preview */}
          <div className="mb-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1 font-medium">
              Weekly Schedule:
            </p>
            <p className="text-sm text-foreground">{plan.schedulePreview}</p>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-6 line-clamp-2">
            {plan.description}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPreview(plan)}
              className="flex-1 hover:bg-accent"
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button
              size="sm"
              onClick={() => onStartPlan(plan)}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Plus className="mr-2 h-4 w-4" />
              Start Plan
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};