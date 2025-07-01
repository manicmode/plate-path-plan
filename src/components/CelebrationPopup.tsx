
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Sparkles } from 'lucide-react';

interface CelebrationPopupProps {
  show: boolean;
  message: string;
  onClose: () => void;
}

const CelebrationPopup = ({ show, message, onClose }: CelebrationPopupProps) => {
  const [fireworks, setFireworks] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    if (show) {
      // Generate random firework positions
      const newFireworks = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2
      }));
      setFireworks(newFireworks);

      // Auto close after 4 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* Fireworks */}
      {fireworks.map((firework) => (
        <div
          key={firework.id}
          className="absolute animate-ping"
          style={{
            left: `${firework.x}%`,
            top: `${firework.y}%`,
            animationDelay: `${firework.delay}s`,
            animationDuration: '1.5s'
          }}
        >
          <Sparkles className="h-8 w-8 text-yellow-400" />
        </div>
      ))}

      {/* Celebration Card */}
      <Card className="visible-card border-0 rounded-3xl max-w-sm mx-4 animate-scale-in">
        <CardContent className="p-8 text-center relative">
          <Button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 p-0 rounded-full glass-button"
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="mb-6">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-2xl font-bold neon-text mb-2">Congratulations!</h2>
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              {message}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You're crushing your wellness goals! Keep up the amazing work! 💪
            </p>
            <Button
              onClick={onClose}
              className="gradient-primary text-white px-8 py-2 rounded-xl font-medium hover:scale-105 transition-transform"
            >
              Awesome! ✨
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CelebrationPopup;
