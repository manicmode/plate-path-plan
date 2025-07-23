import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Heart, Zap, Target } from 'lucide-react';

interface NudgeNotificationProps {
  senderName: string;
  message: string;
  isVisible: boolean;
  onDismiss: () => void;
  onReply?: () => void;
}

export const NudgeNotification: React.FC<NudgeNotificationProps> = ({
  senderName,
  message,
  isVisible,
  onDismiss,
  onReply
}) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      // Auto-dismiss after 8 seconds
      const timer = setTimeout(onDismiss, 8000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 20,
            duration: 0.5 
          }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md mx-4"
        >
          <Card className="border-2 border-primary bg-gradient-to-r from-primary/10 to-secondary/10 shadow-2xl backdrop-blur-sm">
            <CardContent className="p-4 relative overflow-hidden">
              {/* Animated Background */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />

              {/* Floating Emojis */}
              {showConfetti && (
                <div className="absolute inset-0 pointer-events-none">
                  {['💪', '🔥', '⚡', '🎉', '🌟'].map((emoji, index) => (
                    <motion.span
                      key={index}
                      className="absolute text-2xl"
                      initial={{ 
                        opacity: 0, 
                        scale: 0,
                        x: Math.random() * 300,
                        y: Math.random() * 100 + 50
                      }}
                      animate={{ 
                        opacity: [0, 1, 0], 
                        scale: [0, 1.2, 0],
                        y: [0, -50, -100],
                        rotate: [0, 360]
                      }}
                      transition={{
                        duration: 2,
                        delay: index * 0.2,
                        ease: "easeOut"
                      }}
                    >
                      {emoji}
                    </motion.span>
                  ))}
                </div>
              )}

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, -10, 0]
                      }}
                      transition={{ 
                        duration: 1, 
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                    >
                      <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                    </motion.div>
                    <h3 className="font-bold text-foreground">Motivation Boost!</h3>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDismiss}
                    className="h-6 w-6 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Sender */}
                <motion.p 
                  className="text-sm text-muted-foreground mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="font-semibold text-primary">{senderName}</span> sent you a boost:
                </motion.p>

                {/* Message */}
                <motion.div
                  className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 mb-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-sm font-medium text-foreground italic">
                    "{message}"
                  </p>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  className="flex gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    onClick={onReply}
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Thanks!
                  </Button>
                  
                  <Button
                    onClick={() => {
                      // In real implementation, this would log a workout
                      onDismiss();
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-primary/30 hover:bg-primary/10"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Let's Go!
                  </Button>
                </motion.div>

                {/* Motivational Footer */}
                <motion.div
                  className="mt-3 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <p className="text-xs text-muted-foreground">
                    Your squad believes in you! 🚀
                  </p>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};