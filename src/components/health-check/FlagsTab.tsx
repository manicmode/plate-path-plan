/**
 * Interactive Flags Tab Component
 * Shows detected flags with actions: feedback and hide preferences
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle, XCircle, Flag, EyeOff, Send, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { detectFlags } from '@/lib/health/flagger';
import type { HealthFlag, NutritionThresholds } from '@/lib/health/flagRules';

interface FlagsTabProps {
  ingredientsText: string;
  nutrition100g: any;
  reportId?: string;
  ocrPreview?: string;
  className?: string;
}

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: string, email?: string) => void;
  flagLabel: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit, flagLabel }) => {
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(feedback, email);
      setFeedback('');
      setEmail('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Flag className="w-5 h-5 text-destructive" />
            <span>Report Issue: {flagLabel}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">
              What's wrong with this flag?
            </label>
            <Textarea
              placeholder="Describe the issue with this flag detection..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="mt-1 min-h-20"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-foreground">
              Email (optional)
            </label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div className="flex space-x-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={!feedback.trim() || isSubmitting}
              className="flex-1"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isSubmitting}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const FlagsTab: React.FC<FlagsTabProps> = ({
  ingredientsText,
  nutrition100g,
  reportId,
  ocrPreview,
  className
}) => {
  const { toast } = useToast();
  const [hiddenFlags, setHiddenFlags] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('hidden-health-flags');
    return new Set(saved ? JSON.parse(saved) : []);
  });
  const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean; flag?: HealthFlag }>({
    isOpen: false
  });

  // Detect flags using existing system
  const detectedFlags = useMemo(() => {
    const nutritionThresholds: NutritionThresholds = {
      sugar_g_100g: nutrition100g?.sugar,
      satfat_g_100g: nutrition100g?.saturated_fat_g || nutrition100g?.fat, // fallback
      fiber_g_100g: nutrition100g?.fiber,
      sodium_mg_100g: nutrition100g?.sodium,
      protein_g_100g: nutrition100g?.protein,
    };
    
    return detectFlags(ingredientsText || '', nutritionThresholds);
  }, [ingredientsText, nutrition100g]);

  // Filter out hidden flags
  const visibleFlags = detectedFlags.filter(flag => !hiddenFlags.has(flag.key));

  const handleHideFlag = (flagKey: string) => {
    const newHiddenFlags = new Set([...hiddenFlags, flagKey]);
    setHiddenFlags(newHiddenFlags);
    localStorage.setItem('hidden-health-flags', JSON.stringify([...newHiddenFlags]));
    
    toast({
      title: "Flag Hidden",
      description: "This flag will no longer appear in your reports.",
    });
  };

  const handleFeedback = async (feedback: string, email?: string) => {
    const flag = feedbackModal.flag;
    if (!flag) return;

    try {
      const payload = {
        reportId: reportId || 'unknown',
        flagKey: flag.key,
        flagLabel: flag.label,
        feedback: feedback.trim(),
        email: email?.trim() || null,
        ocrPreview: ocrPreview?.slice(0, 160),
        timestamp: new Date().toISOString()
      };

      // Submit to feedback endpoint
      const response = await fetch('/functions/v1/support-flag-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Feedback submission failed');

      toast({
        title: "Feedback Sent",
        description: "Thank you for helping us improve our flag detection!",
      });
    } catch (error) {
      console.error('Feedback error:', error);
      toast({
        title: "Feedback Failed",
        description: "Unable to submit feedback. Please try again.",
        variant: "destructive"
      });
      throw error; // Re-throw to keep modal open
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'danger': return { 
        bg: 'bg-destructive/10 border-destructive/30', 
        text: 'text-destructive-foreground', 
        icon: 'text-destructive',
        badge: 'destructive'
      };
      case 'warning': return { 
        bg: 'bg-orange-500/10 border-orange-500/30', 
        text: 'text-orange-600 dark:text-orange-400', 
        icon: 'text-orange-500',
        badge: 'default'
      };
      case 'good': return {
        bg: 'bg-green-500/10 border-green-500/30',
        text: 'text-green-600 dark:text-green-400',
        icon: 'text-green-500',
        badge: 'secondary'
      };
      default: return { 
        bg: 'bg-yellow-500/10 border-yellow-500/30', 
        text: 'text-yellow-600 dark:text-yellow-400', 
        icon: 'text-yellow-500',
        badge: 'secondary'
      };
    }
  };

  return (
    <Card className={`bg-card border-border backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-4">
        <h3 className="text-xl font-bold text-foreground flex items-center">
          <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-3" />
          Detected Flags
          {visibleFlags.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {visibleFlags.length} warning{visibleFlags.length > 1 ? 's' : ''}
            </Badge>
          )}
        </h3>
      </CardHeader>
      
      <CardContent>
        {visibleFlags.length > 0 ? (
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-4 bg-destructive/10 border-l-4 border-destructive rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-destructive mr-2" />
                <p className="text-destructive-foreground font-semibold">
                  {visibleFlags.length} ingredient{visibleFlags.length > 1 ? 's or nutrition values' : ' or nutrition value'} 
                  {' '}flagged for your attention.
                </p>
              </div>
            </div>

            {/* Flag List */}
            <div className="space-y-3">
              {visibleFlags.map((flag, index) => {
                const colors = getSeverityColor(flag.severity);
                
                return (
                  <div 
                    key={flag.key} 
                    className={`p-4 rounded-lg border ${colors.bg}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {flag.severity === 'good' ? (
                          <CheckCircle className={`w-5 h-5 ${colors.icon} mt-0.5 flex-shrink-0`} />
                        ) : (
                          <XCircle className={`w-5 h-5 ${colors.icon} mt-0.5 flex-shrink-0`} />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className={`font-bold ${colors.text} capitalize`}>
                              {flag.label}
                            </h4>
                            <Badge variant={colors.badge as any} className="text-xs">
                              {flag.severity === 'danger' ? 'High risk' : 
                               flag.severity === 'warning' ? 'Medium risk' : 
                               flag.severity === 'good' ? 'Beneficial' : 'Low risk'}
                            </Badge>
                          </div>
                          <p className={`${colors.text} text-sm leading-relaxed`}>
                            {flag.description}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t border-border/30">
                      <Button
                        onClick={() => setFeedbackModal({ isOpen: true, flag })}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        <Flag className="w-3 h-3 mr-1" />
                        Looks wrong
                      </Button>
                      <Button
                        onClick={() => handleHideFlag(flag.key)}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        <EyeOff className="w-3 h-3 mr-1" />
                        Hide this flag
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3 p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <CheckCircle className="w-6 h-6 text-primary" />
            <div>
              <span className="text-primary-foreground dark:text-primary font-medium">
                No concerning ingredients or nutrition flags detected!
              </span>
              <p className="text-primary-foreground dark:text-primary text-sm mt-1">
                This product appears to meet healthy nutrition standards.
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal({ isOpen: false })}
        onSubmit={handleFeedback}
        flagLabel={feedbackModal.flag?.label || ''}
      />
    </Card>
  );
};