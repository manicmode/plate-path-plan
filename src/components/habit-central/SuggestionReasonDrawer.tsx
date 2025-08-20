import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ThumbsDown, ThumbsUp } from 'lucide-react';

interface SuggestionReasonDrawerProps {
  habit: {
    title: string;
    score: number;
    reasons: string[];
  } | null;
  open: boolean;
  onClose: () => void;
  onNotHelpful?: () => void;
  onMoreLikeThis?: () => void;
}

export function SuggestionReasonDrawer({
  habit,
  open,
  onClose,
  onNotHelpful,
  onMoreLikeThis
}: SuggestionReasonDrawerProps) {
  if (!habit) return null;

  const confidence = Math.min(100, Math.round((habit.score / 10) * 100));

  const handleNotHelpful = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onNotHelpful?.();
    onClose();
  };

  const handleMoreLikeThis = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMoreLikeThis?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Why we suggested this
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Habit title */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <h3 className="font-semibold">{habit.title}</h3>
          </div>

          {/* Confidence bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Confidence</span>
              <span className="font-medium">{confidence}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all"
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>

          {/* Reasons */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Reasons:</h4>
            <div className="space-y-2">
              {habit.reasons.map((reason, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="text-sm leading-relaxed">
                    {reason.includes('**') ? (
                      reason.split('**').map((part, i) => 
                        i % 2 === 1 ? (
                          <span key={i} className="font-semibold text-primary">
                            {part}
                          </span>
                        ) : (
                          part
                        )
                      )
                    ) : (
                      reason
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNotHelpful}
              className="flex-1 h-10 text-xs"
            >
              <ThumbsDown className="h-3 w-3 mr-1" />
              Not helpful
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMoreLikeThis}
              className="flex-1 h-10 text-xs"
            >
              <ThumbsUp className="h-3 w-3 mr-1" />
              More like this
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}