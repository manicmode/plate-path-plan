import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Calendar, Send, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface QuickBroadcastProps {
  onSend?: (message: string) => Promise<void>;
  onSchedule?: (message: string, scheduledTime: Date) => Promise<void>;
  maxLength?: number;
}

export const QuickBroadcast = ({ 
  onSend, 
  onSchedule, 
  maxLength = 280 
}: QuickBroadcastProps) => {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const remainingChars = maxLength - message.length;
  const isOverLimit = remainingChars < 0;
  const isEmpty = message.trim().length === 0;

  const handleSendNow = async () => {
    if (isEmpty || isOverLimit) return;
    
    setIsSending(true);
    try {
      await onSend?.(message);
      setMessage("");
      toast({
        title: "Message sent!",
        description: "Your broadcast has been sent to all followers.",
      });
    } catch (error) {
      toast({
        title: "Failed to send",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSchedule = async () => {
    if (isEmpty || isOverLimit) return;
    
    setIsScheduling(true);
    try {
      // For demo purposes, schedule for 1 hour from now
      const scheduledTime = new Date(Date.now() + 60 * 60 * 1000);
      await onSchedule?.(message, scheduledTime);
      setMessage("");
      toast({
        title: "Message scheduled!",
        description: `Your broadcast will be sent in 1 hour.`,
      });
    } catch (error) {
      toast({
        title: "Failed to schedule",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Quick Broadcast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="What would you like to share with your followers?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none rounded-xl border-white/10 bg-white/5 dark:bg-black/10 focus:bg-white/10 dark:focus:bg-black/20"
            />
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                Share updates, tips, or motivational messages
              </span>
              <span className={`font-mono ${isOverLimit ? 'text-red-500' : remainingChars < 20 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                {remainingChars}
              </span>
            </div>
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden sm:flex gap-2">
            <Button
              onClick={handleSendNow}
              disabled={isEmpty || isOverLimit || isSending}
              className="flex-1 gap-2"
            >
              {isSending ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Now
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSchedule}
              disabled={isEmpty || isOverLimit || isScheduling}
              className="gap-2"
            >
              {isScheduling ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
              Schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Sticky Action Bar */}
      <div className="fixed inset-x-3 bottom-3 z-40 flex gap-2 rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur p-2 sm:hidden">
        <Button
          onClick={handleSendNow}
          disabled={isEmpty || isOverLimit || isSending}
          className="flex-1 gap-2"
        >
          {isSending ? (
            <Clock className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send Now
        </Button>
        
        <Button
          variant="outline"
          onClick={handleSchedule}
          disabled={isEmpty || isOverLimit || isScheduling}
          className="flex-1 gap-2"
        >
          {isScheduling ? (
            <Clock className="h-4 w-4 animate-spin" />
          ) : (
            <Calendar className="h-4 w-4" />
          )}
          Schedule
        </Button>
      </div>
    </motion.div>
  );
};