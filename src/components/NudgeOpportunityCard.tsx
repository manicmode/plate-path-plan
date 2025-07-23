import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Send, Sparkles, Zap, Target } from 'lucide-react';
import { NudgeOpportunity } from '@/hooks/useSocialAccountability';
import { useToast } from '@/hooks/use-toast';

interface NudgeOpportunityCardProps {
  opportunity: NudgeOpportunity;
  onSendNudge: (opportunity: NudgeOpportunity, customMessage?: string) => Promise<{ success: boolean; message: string }>;
  onDismiss: () => void;
}

export const NudgeOpportunityCard: React.FC<NudgeOpportunityCardProps> = ({
  opportunity,
  onSendNudge,
  onDismiss
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const quickMessages = [
    "You got this! 💪",
    "Let's finish this week strong together! 🔥",
    "Missing your energy - ready to crush it? ⚡",
    "Your comeback story starts now! 🌟",
    "We believe in you! One rep at a time 🎯"
  ];

  const handleSendNudge = async (message?: string) => {
    setIsSending(true);
    
    try {
      const result = await onSendNudge(opportunity, message);
      
      if (result.success) {
        toast({
          title: "Nudge sent! 🚀",
          description: `Your motivation boost is on its way to ${opportunity.target_user.display_name}`,
        });
      } else {
        toast({
          title: "Oops!",
          description: result.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const getUrgencyColor = () => {
    switch (opportunity.urgency) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  const getUrgencyEmoji = () => {
    switch (opportunity.urgency) {
      case 'high': return '🆘';
      case 'medium': return '👋';
      case 'low': return '💭';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getUrgencyEmoji()}</span>
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {opportunity.target_user.display_name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {opportunity.days_since_workout} days since last workout
                    </p>
                  </div>
                </div>
              </div>
              <Badge variant={getUrgencyColor()} className="capitalize">
                {opportunity.urgency}
              </Badge>
            </div>

            {/* Suggested Message */}
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-sm text-muted-foreground mb-1">💡 Suggested nudge:</p>
              <p className="text-sm font-medium italic">"{opportunity.suggested_message}"</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => handleSendNudge()}
                disabled={isSending}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                <Heart className="h-4 w-4 mr-2" />
                {isSending ? 'Sending...' : 'Send Nudge'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-3"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                onClick={onDismiss}
                className="px-3"
              >
                ✕
              </Button>
            </div>

            {/* Expanded Options */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3 pt-3 border-t border-border"
                >
                  {/* Quick Messages */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">⚡ Quick sends:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {quickMessages.map((msg, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendNudge(msg)}
                          disabled={isSending}
                          className="justify-start text-left h-auto py-2 text-xs"
                        >
                          {msg}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Message */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">✍️ Custom message:</p>
                    <Textarea
                      placeholder="Write your own motivational message..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="resize-none"
                      rows={2}
                    />
                    {customMessage.trim() && (
                      <Button
                        onClick={() => handleSendNudge(customMessage)}
                        disabled={isSending}
                        className="mt-2 w-full"
                        size="sm"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Custom Message
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};