import React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Clock, Target, Zap, Wrench, AlertTriangle } from 'lucide-react';
import { HabitTemplate } from '@/hooks/useHabitTemplatesV2';
import { useToast } from '@/hooks/use-toast';

interface DetailsDrawerProps {
  template: HabitTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DetailsDrawer({ template, open, onOpenChange }: DetailsDrawerProps) {
  const { toast } = useToast();

  if (!template) return null;

  const handleCopySlug = () => {
    navigator.clipboard.writeText(template.slug);
    toast({ title: "Copied slug to clipboard" });
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(template, null, 2));
    toast({ title: "Copied JSON to clipboard" });
  };

  const formatTimeWindows = (timeWindows: any[] | null) => {
    if (!timeWindows || timeWindows.length === 0) return 'No time constraints';
    
    return timeWindows.map((window, idx) => (
      <span key={idx} className="inline-block bg-muted px-2 py-1 rounded text-sm mr-2 mb-1">
        {window.start || '00:00'} - {window.end || '23:59'}
      </span>
    ));
  };

  const formatSuggestedRules = (rules: any[] | null) => {
    if (!rules || rules.length === 0) return 'No suggested rules';
    
    return rules.map((rule, idx) => (
      <Badge key={idx} variant="outline" className="mr-2 mb-1">
        {rule.type === 'daily' ? 'Daily' : 
         rule.type === 'weekly' ? `Weekly (${rule.params?.days_per_week || 'x'} days)` :
         rule.type}
      </Badge>
    ));
  };

  const formatCoachCopy = (coachCopy: any) => {
    if (!coachCopy) return null;

    return (
      <div className="space-y-2">
        {coachCopy.reminder_line && (
          <div>
            <p className="font-medium text-sm">Reminder:</p>
            <p className="text-sm text-muted-foreground">{coachCopy.reminder_line}</p>
          </div>
        )}
        {coachCopy.encourage_line && (
          <div>
            <p className="font-medium text-sm">Encouragement:</p>
            <p className="text-sm text-muted-foreground">{coachCopy.encourage_line}</p>
          </div>
        )}
        {coachCopy.recovery_line && (
          <div>
            <p className="font-medium text-sm">Recovery:</p>
            <p className="text-sm text-muted-foreground">{coachCopy.recovery_line}</p>
          </div>
        )}
        {coachCopy.celebration_line && (
          <div>
            <p className="font-medium text-sm">Celebration:</p>
            <p className="text-sm text-muted-foreground">{coachCopy.celebration_line}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{template.name}</SheetTitle>
          <SheetDescription>
            {template.summary || 'No description available'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Action buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopySlug}>
              <Copy className="mr-1 h-3 w-3" />
              Copy slug
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyJSON}>
              <Copy className="mr-1 h-3 w-3" />
              Copy JSON
            </Button>
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium text-sm">Domain</p>
              <Badge className="mt-1">{template.domain}</Badge>
            </div>
            <div>
              <p className="font-medium text-sm">Category</p>
              <p className="text-sm text-muted-foreground">{template.category || 'None'}</p>
            </div>
            <div>
              <p className="font-medium text-sm">Goal Type</p>
              <p className="text-sm text-muted-foreground">
                {template.goal_type === 'bool' ? 'Yes/No' : 
                 template.goal_type === 'count' ? 'Count' :
                 template.goal_type === 'duration' ? 'Duration' : template.goal_type}
              </p>
            </div>
            <div>
              <p className="font-medium text-sm">Difficulty</p>
              <Badge variant="outline" className="mt-1">{template.difficulty || 'Not specified'}</Badge>
            </div>
          </div>

          {/* Target and timing */}
          {(template.default_target || template.estimated_minutes) && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Target & Timing
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {template.default_target && (
                  <div>
                    <p className="font-medium text-sm">Default Target</p>
                    <p className="text-sm text-muted-foreground">{template.default_target}</p>
                  </div>
                )}
                {template.estimated_minutes && (
                  <div>
                    <p className="font-medium text-sm">Estimated Time</p>
                    <p className="text-sm text-muted-foreground">{template.estimated_minutes} minutes</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Time windows */}
          {template.time_windows && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Windows
              </h4>
              <div>{formatTimeWindows(template.time_windows)}</div>
            </div>
          )}

          {/* Suggested rules */}
          {template.suggested_rules && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Suggested Rules
              </h4>
              <div>{formatSuggestedRules(template.suggested_rules)}</div>
            </div>
          )}

          {/* Min viable */}
          {template.min_viable && (
            <div className="space-y-3">
              <h4 className="font-medium">Min Viable</h4>
              <p className="text-sm text-muted-foreground">{template.min_viable}</p>
            </div>
          )}

          {/* Cues and stacking */}
          {template.cues_and_stacking && (
            <div className="space-y-3">
              <h4 className="font-medium">Cues & Stacking</h4>
              <p className="text-sm text-muted-foreground">{template.cues_and_stacking}</p>
            </div>
          )}

          {/* Equipment */}
          {template.equipment && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Equipment
              </h4>
              <p className="text-sm text-muted-foreground">{template.equipment}</p>
            </div>
          )}

          {/* Contraindications */}
          {template.contraindications && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                Contraindications
              </h4>
              <p className="text-sm text-muted-foreground">{template.contraindications}</p>
            </div>
          )}

          {/* Coach copy */}
          {template.coach_copy && (
            <div className="space-y-3">
              <h4 className="font-medium">Coach Copy</h4>
              {formatCoachCopy(template.coach_copy)}
            </div>
          )}

          {/* Tags */}
          {template.tags && (
            <div className="space-y-3">
              <h4 className="font-medium">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {template.tags.split(',').map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {template.sources && (
            <div className="space-y-3">
              <h4 className="font-medium">Sources</h4>
              <p className="text-sm text-muted-foreground">{template.sources}</p>
            </div>
          )}

          {/* JSON preview */}
          <div className="space-y-3">
            <h4 className="font-medium">JSON Preview</h4>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto font-mono">
              {JSON.stringify(template, null, 2)}
            </pre>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}