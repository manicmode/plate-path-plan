import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmojiRainProps {
  emoji: string;
  trigger: boolean;
  onComplete: () => void;
}

interface EmojiParticle {
  id: number;
  x: number;
  delay: number;
  duration: number;
}

export const EmojiRain: React.FC<EmojiRainProps> = ({ emoji, trigger, onComplete }) => {
  const [particles, setParticles] = useState<EmojiParticle[]>([]);

  useEffect(() => {
    if (trigger) {
      // Generate 12-15 emoji particles
      const newParticles: EmojiParticle[] = Array.from({ length: 14 }, (_, i) => ({
        id: i,
        x: Math.random() * 100, // Random x position (0-100%)
        delay: Math.random() * 0.8, // Stagger the start times
        duration: 1.5 + Math.random() * 0.5, // Vary fall speed
      }));
      
      setParticles(newParticles);
      
      // Clear particles after animation
      setTimeout(() => {
        setParticles([]);
        onComplete();
      }, 2500);
    }
  }, [trigger, onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute text-2xl"
            style={{
              left: `${particle.x}%`,
              top: '-2rem',
            }}
            initial={{ y: -32, opacity: 1, rotate: 0 }}
            animate={{ 
              y: window.innerHeight + 32, 
              opacity: 0,
              rotate: 360 * (Math.random() > 0.5 ? 1 : -1)
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              ease: "easeIn"
            }}
          >
            {emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};